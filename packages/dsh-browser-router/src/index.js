import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { defineTool } from '@deepseek-ai/dsh-tools'

const CONFIG_PATH = join(homedir(), '.dsh', 'browser-router.json')
const sessions = new Map()

function loadConfig() {
  let stored = {}
  try { stored = JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) } catch {}
  return {
    active: ['local', 'mobile', 'cloud'].includes(stored.active) ? stored.active : 'mobile',
    local: { endpoint: String(stored.local?.endpoint || 'http://127.0.0.1:9223').trim() },
    mobile: { endpoint: String(stored.mobile?.endpoint || 'http://127.0.0.1:9222').trim() },
    cloud: { endpoint: String(stored.cloud?.endpoint || '').trim() },
    timeoutMs: Math.max(3000, Number(stored.timeoutMs || 30000)),
  }
}

function saveActiveMode(active) {
  if (!['local', 'mobile', 'cloud'].includes(active)) throw new Error('BROWSER_INVALID_BACKEND')
  let stored = {}
  try { stored = JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) } catch {}
  const next = { ...stored, active }
  mkdirSync(dirname(CONFIG_PATH), { recursive: true })
  writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2), 'utf8')
  return active
}

function endpointFor(config, backend) {
  return config[backend]?.endpoint || ''
}

async function browserWebSocket(endpoint, timeoutMs) {
  if (!endpoint) throw new Error('BROWSER_BACKEND_NOT_CONFIGURED')
  if (/^wss?:\/\//i.test(endpoint)) return endpoint
  const base = endpoint.replace(/\/+$/, '')
  const response = await fetch(`${base}/json/version`, { signal: AbortSignal.timeout(timeoutMs) })
  if (!response.ok) throw new Error(`BROWSER_CDP_HTTP_${response.status}`)
  const data = await response.json()
  if (typeof data.webSocketDebuggerUrl !== 'string' || data.webSocketDebuggerUrl.length === 0)
    throw new Error('BROWSER_CDP_WEBSOCKET_MISSING')
  return data.webSocketDebuggerUrl
}

class CdpClient {
  constructor(url, timeoutMs) {
    this.url = url
    this.timeoutMs = timeoutMs
    this.nextId = 1
    this.pending = new Map()
  }

  async connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return
    this.ws = new WebSocket(this.url)
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('BROWSER_CDP_CONNECT_TIMEOUT')), this.timeoutMs)
      this.ws.addEventListener('open', () => { clearTimeout(timer); resolve() }, { once: true })
      this.ws.addEventListener('error', () => { clearTimeout(timer); reject(new Error('BROWSER_CDP_CONNECT_FAILED')) }, { once: true })
    })
    this.ws.addEventListener('message', (event) => {
      let message
      try { message = JSON.parse(String(event.data)) } catch { return }
      if (typeof message.id !== 'number') return
      const pending = this.pending.get(message.id)
      if (!pending) return
      this.pending.delete(message.id)
      clearTimeout(pending.timer)
      if (message.error) pending.reject(new Error(message.error.message || 'BROWSER_CDP_ERROR'))
      else pending.resolve(message.result || {})
    })
    this.ws.addEventListener('close', () => {
      for (const pending of this.pending.values()) {
        clearTimeout(pending.timer)
        pending.reject(new Error('BROWSER_CDP_CLOSED'))
      }
      this.pending.clear()
    })
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`BROWSER_CDP_TIMEOUT:${method}`))
      }, this.timeoutMs)
      this.pending.set(id, { resolve, reject, timer })
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
    })
  }

  close() {
    try { this.ws?.close() } catch {}
  }
}

async function probeBackend(endpoint, timeoutMs) {
  if (!endpoint) return { configured: false, online: false }
  try {
    const ws = await browserWebSocket(endpoint, Math.min(timeoutMs, 4000))
    return { configured: true, online: true, websocket: /^wss?:\/\//i.test(ws) }
  }
  catch (error) {
    return { configured: true, online: false, error: String(error?.message || error) }
  }
}

async function browserStatus() {
  const config = loadConfig()
  return {
    active: config.active,
    local: await probeBackend(config.local.endpoint, config.timeoutMs),
    mobile: await probeBackend(config.mobile.endpoint, config.timeoutMs),
    cloud: await probeBackend(config.cloud.endpoint, config.timeoutMs),
  }
}

async function ensureSession(backend, config) {
  const endpoint = endpointFor(config, backend)
  const existing = sessions.get(backend)
  if (existing && existing.endpoint === endpoint && existing.client.ws?.readyState === WebSocket.OPEN)
    return existing
  if (existing) existing.client.close()
  const wsUrl = await browserWebSocket(endpoint, config.timeoutMs)
  const client = new CdpClient(wsUrl, config.timeoutMs)
  await client.connect()
  const created = await client.send('Target.createTarget', { url: 'about:blank' })
  const attached = await client.send('Target.attachToTarget', { targetId: created.targetId, flatten: true })
  const session = { endpoint, client, sessionId: attached.sessionId, targetId: created.targetId }
  await client.send('Page.enable', {}, session.sessionId)
  await client.send('Runtime.enable', {}, session.sessionId)
  sessions.set(backend, session)
  return session
}

async function evaluate(session, expression, returnByValue = true) {
  const result = await session.client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue,
    userGesture: true,
  }, session.sessionId)
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'BROWSER_EVAL_FAILED')
  return result.result?.value
}

async function waitReady(session, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const state = await evaluate(session, 'document.readyState').catch(() => '')
    if (state === 'interactive' || state === 'complete') return
    await new Promise(resolve => setTimeout(resolve, 150))
  }
  throw new Error('BROWSER_PAGE_READY_TIMEOUT')
}

const snapshotExpression = `(() => {
  const selector = 'button,a,input,textarea,select,[role="button"],[role="link"],[role="textbox"],[role="tab"],[contenteditable="true"]';
  const elements = [...document.querySelectorAll(selector)];
  let index = 0;
  const refs = [];
  for (const el of elements) {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    if ((rect.width <= 0 && rect.height <= 0) || style.visibility === 'hidden' || style.display === 'none') continue;
    const ref = String(++index);
    el.setAttribute('data-ari-browser-ref', ref);
    const text = (el.innerText || el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 100);
    refs.push({
      ref: '@' + ref,
      tag: el.tagName.toLowerCase(),
      text,
      name: el.getAttribute('name') || '',
      placeholder: el.getAttribute('placeholder') || '',
      type: el.getAttribute('type') || ''
    });
  }
  return { title: document.title, url: location.href, refs };
})()`

async function snapshot(session) {
  return await evaluate(session, snapshotExpression)
}

function activeSession() {
  const config = loadConfig()
  return { config, backend: config.active }
}

async function withActiveSession(operation) {
  const { config, backend } = activeSession()
  const session = await ensureSession(backend, config)
  return await operation(session, config, backend)
}

async function browserOpen(url) {
  if (!/^https?:\/\//i.test(url)) throw new Error('BROWSER_URL_MUST_BE_HTTP')
  return await withActiveSession(async (session, config, backend) => {
    await session.client.send('Page.navigate', { url }, session.sessionId)
    await waitReady(session, config.timeoutMs)
    return { backend, ...(await snapshot(session)) }
  })
}

function renderJson(value) {
  return [{ type: 'text', text: JSON.stringify(value, null, 2) }]
}

export const name = 'dsh-browser-router'
export const inject = ['tools']

export function apply(ctx) {
  const disposers = []
  disposers.push(ctx.tools.register(defineTool({
    name: 'browser_status',
    description: 'Show the active Ari browser backend and availability of local, mobile and cloud navigation.',
    parameters: {},
    output: { schema: { type: 'object', additionalProperties: true }, render: (_args, value) => renderJson(value) },
    async execute() {
      return await browserStatus()
    },
  })))

  disposers.push(ctx.tools.register(defineTool({
    name: 'browser_open',
    description: 'Open a URL using the browser backend selected by Ari (local, mobile or cloud) and return interactive @refs.',
    parameters: { url: { type: 'string', required: true, description: 'HTTP or HTTPS URL.' } },
    output: { schema: { type: 'object', additionalProperties: true }, render: (_args, value) => renderJson(value) },
    async execute({ url }) {
      return await browserOpen(url)
    },
  })))

  disposers.push(ctx.tools.register(defineTool({
    name: 'browser_extract',
    description: 'Read rendered text from the current page on the selected browser backend.',
    parameters: { maxChars: { type: 'number', description: 'Maximum text length, default 12000.' } },
    output: { schema: { type: 'object', additionalProperties: true }, render: (_args, value) => renderJson(value) },
    async execute({ maxChars }) {
      const limit = Math.max(500, Math.min(50000, Number(maxChars || 12000)))
      return await withActiveSession(async (session, _config, backend) => ({
        backend,
        url: await evaluate(session, 'location.href'),
        title: await evaluate(session, 'document.title'),
        text: await evaluate(session, `((document.body?.innerText || document.body?.textContent || '').trim().slice(0, ${limit}))`),
      }))
    },
  })))

  disposers.push(ctx.tools.register(defineTool({
    name: 'browser_click',
    description: 'Click an interactive element by @ref from browser_open on the selected browser backend.',
    parameters: { ref: { type: 'string', required: true, description: 'Element reference such as @3.' } },
    output: { schema: { type: 'object', additionalProperties: true }, render: (_args, value) => renderJson(value) },
    async execute({ ref }) {
      const match = /^@(\d+)$/.exec(String(ref).trim())
      if (!match) throw new Error('BROWSER_INVALID_REF')
      return await withActiveSession(async (session, _config, backend) => {
        const ok = await evaluate(session, `(() => { const el = document.querySelector('[data-ari-browser-ref="${match[1]}"]'); if (!el) return false; el.scrollIntoView({block:'center'}); el.click(); return true; })()`)
        if (!ok) throw new Error('BROWSER_REF_NOT_FOUND')
        await new Promise(resolve => setTimeout(resolve, 250))
        return { backend, ref, ...(await snapshot(session)) }
      })
    },
  })))

  disposers.push(ctx.tools.register(defineTool({
    name: 'browser_type',
    description: 'Replace text in an input by @ref from browser_open and optionally submit its form.',
    parameters: {
      ref: { type: 'string', required: true, description: 'Element reference such as @5.' },
      text: { type: 'string', required: true, description: 'Text to enter.' },
      submit: { type: 'boolean', description: 'Submit the nearest form after entering text.' },
    },
    output: { schema: { type: 'object', additionalProperties: true }, render: (_args, value) => renderJson(value) },
    async execute({ ref, text, submit }) {
      const match = /^@(\d+)$/.exec(String(ref).trim())
      if (!match) throw new Error('BROWSER_INVALID_REF')
      const encoded = JSON.stringify(String(text))
      return await withActiveSession(async (session, _config, backend) => {
        const ok = await evaluate(session, `(() => { const el = document.querySelector('[data-ari-browser-ref="${match[1]}"]'); if (!el) return false; el.focus(); const value = ${encoded}; const proto = Object.getPrototypeOf(el); const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set; if (setter) setter.call(el, value); else el.value = value; el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true})); ${submit === true ? "if (el.form?.requestSubmit) el.form.requestSubmit();" : ''} return true; })()`)
        if (!ok) throw new Error('BROWSER_REF_NOT_FOUND')
        return { backend, ref, submitted: submit === true }
      })
    },
  })))

  disposers.push(ctx.tools.register(defineTool({
    name: 'browser_screenshot',
    description: 'Capture the current page from the selected browser backend to a PNG file.',
    parameters: {},
    output: { schema: { type: 'object', additionalProperties: true }, render: (_args, value) => renderJson(value) },
    async execute() {
      return await withActiveSession(async (session, _config, backend) => {
        const shot = await session.client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, session.sessionId)
        const path = join(tmpdir(), `ari-browser-${backend}-${Date.now()}.png`)
        mkdirSync(dirname(path), { recursive: true })
        writeFileSync(path, Buffer.from(shot.data, 'base64'))
        return { backend, path }
      })
    },
  })))

  return () => {
    for (const session of sessions.values()) session.client.close()
    sessions.clear()
    for (const dispose of disposers.reverse()) {
      try { dispose() } catch {}
    }
  }
}
