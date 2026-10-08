import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'

interface ProviderConfig {
  id: string
  name?: string
  env?: string
  baseUrl?: string
  enabled?: boolean
  contextWindow?: number
  maxTokens?: number
  keepAlive?: string
  models?: string[]
  configFile?: string
}

interface PluginConfig { providers?: ProviderConfig[] }

function envValue(name?: string): string {
  return name ? String(process.env[name] || '').trim() : ''
}

function normalizeBase(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

function expandPath(value?: string): string {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (raw === '~') return homedir()
  if (raw.startsWith('~/') || raw.startsWith('~\\')) return resolve(homedir(), raw.slice(2))
  return resolve(raw)
}

function runtimeConfig(cfg: ProviderConfig): { baseUrl: string, token: string, models: string[] } {
  let file: any = {}
  const path = expandPath(cfg.configFile)
  if (path && existsSync(path)) {
    try { file = JSON.parse(readFileSync(path, 'utf8')) } catch {}
  }
  const baseUrl = normalizeBase(envValue(cfg.env) || String(file.baseUrl || cfg.baseUrl || ''))
  const token = String(file.token || '').trim()
  const models = Array.isArray(file.models) ? file.models.map((x: any) => String(x)).filter(Boolean) : (cfg.models || [])
  return { baseUrl, token, models }
}

function llmError(message: string, code: string): Error {
  const error = new Error(message) as Error & { code?: string }
  error.code = code
  return error
}
function textOf(content: any): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content.filter((b: any) => b?.type === 'text' && typeof b.text === 'string').map((b: any) => b.text).join('')
}

function ollamaMessages(messages: readonly any[]): any[] {
  const out: any[] = []
  for (const message of messages || []) {
    if (!message) continue
    const role = String(message.role || '')
    if (!['system', 'user', 'assistant'].includes(role)) continue
    const content = textOf(message.content)
    const blocks = Array.isArray(message.content) ? message.content : []
    const toolCalls = role === 'assistant'
      ? blocks.filter((b: any) => b?.type === 'tool-call').map((b: any) => ({
          function: {
            name: String(b.name || ''),
            arguments: typeof b.arguments === 'string' ? safeJson(b.arguments) : (b.arguments || {}),
          },
        }))
      : []
    if (content || toolCalls.length) out.push({ role, content, ...(toolCalls.length ? { tool_calls: toolCalls } : {}) })
    if (role === 'user') {
      for (const block of blocks) {
        if (block?.type !== 'tool-result') continue
        const body = Array.isArray(block.content)
          ? block.content.filter((x: any) => x?.type === 'text').map((x: any) => String(x.text || '')).join('\n')
          : String(block.content || '')
        out.push({ role: 'tool', content: body })
      }
    }
  }
  return out
}

function safeJson(value: string): any {
  try { return JSON.parse(value) } catch { return {} }
}

function ollamaTools(tools: readonly any[] | undefined): any[] | undefined {
  if (!Array.isArray(tools) || !tools.length) return undefined
  return tools.map((tool: any) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description || '',
      parameters: tool.parameters || { type: 'object', properties: {} },
    },
  }))
}

class OllamaRemoteAdapter {
  constructor(private cfg: ProviderConfig) {}

  private connection() { return runtimeConfig(this.cfg) }

  providerInfo(provider: string) {
    return { id: provider, name: this.cfg.name || provider }
  }

  providerRetryPolicy(_provider: string) { return undefined }

  private describe(provider: string, id: string) {
    return {
      provider,
      id,
      name: id,
      contextWindow: Math.max(512, Number(this.cfg.contextWindow || 4096)),
      maxTokens: Math.max(64, Number(this.cfg.maxTokens || 1024)),
      input: ['text'],
    }
  }

  async listModels(provider: string) {
    const conn = this.connection()
    const base = conn.baseUrl
    if (!base) return conn.models.map(id => this.describe(provider, id))
    try {
      const res = await fetch(base + '/api/tags', { headers: conn.token ? { Authorization: 'Bearer ' + conn.token } : {}, signal: AbortSignal.timeout(8000) })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const data: any = await res.json()
      const ids = Array.isArray(data?.models)
        ? data.models.map((x: any) => String(x?.name || x?.model || '').trim()).filter(Boolean)
        : []
      return [...new Set(ids)].map(id => this.describe(provider, String(id)))
    } catch {
      return conn.models.map(id => this.describe(provider, id))
    }
  }

  async resolveModel(provider: string, model: string) {
    return this.describe(provider, model)
  }

  async *stream(options: any) {
    const conn = this.connection()
    const base = conn.baseUrl
    if (!base) throw llmError('Ollama remote endpoint is not configured', 'SERVER')

    const tools = ollamaTools(options.tools)
    const body = {
      model: options.model,
      messages: ollamaMessages(options.messages),
      stream: false,
      think: false,
      keep_alive: this.cfg.keepAlive || '45m',
      ...(tools ? { tools } : {}),
      options: {
        num_ctx: Math.max(512, Number(this.cfg.contextWindow || 4096)),
        num_predict: Math.max(16, Math.min(Number(options.maxTokens || this.cfg.maxTokens || 1024), Number(this.cfg.maxTokens || 1024))),
        ...(options.temperature === undefined ? {} : { temperature: Number(options.temperature) }),
      },
    }

    let res: Response
    try {
      res = await fetch(base + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(conn.token ? { Authorization: 'Bearer ' + conn.token } : {}) },
        body: JSON.stringify(body),
        signal: options.signal,
      })
    } catch (error) {
      if (options.signal?.aborted) throw llmError('Request aborted', 'ABORTED')
      throw llmError('Ollama remote connection failed: ' + String(error), 'SERVER')
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw llmError('Ollama remote HTTP ' + res.status + ': ' + detail.slice(0, 400), res.status >= 500 ? 'SERVER' : 'INVALID_REQUEST')
    }

    const data: any = await res.json()
    const message = data?.message || {}
    const text = String(message.content || '')
    let index = 0
    if (text) {
      yield { type: 'block-start', index, blockType: 'text' }
      yield { type: 'text-delta', index, text }
      yield { type: 'block-end', index, block: { type: 'text', text } }
      index += 1
    }

    const calls = Array.isArray(message.tool_calls) ? message.tool_calls : []
    for (const call of calls) {
      const name = String(call?.function?.name || '')
      const args = call?.function?.arguments || {}
      const id = String(call?.id || ('ollama-call-' + index))
      const argText = typeof args === 'string' ? args : JSON.stringify(args)
      yield { type: 'block-start', index, blockType: 'tool-call' }
      yield { type: 'tool-call-delta', index, id, name, argumentsDelta: argText }
      yield { type: 'block-end', index, block: { type: 'tool-call', id, name, arguments: argText || '{}' } }
      index += 1
    }

    const inputTokens = Number(data?.prompt_eval_count || 0)
    const outputTokens = Number(data?.eval_count || 0)
    yield { type: 'usage', usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens } }
    if (!text && !calls.length) {
      yield { type: 'finish', reason: { kind: 'error', failure: { message: 'Ollama returned an empty response', code: 'EMPTY_RESPONSE' } } }
      return
    }
    yield { type: 'finish', reason: { kind: calls.length ? 'tool-calls' : 'stop' } }
  }
}

export const name = 'dsh-ollama-remote'
export const inject = ['llm']

export function apply(ctx: any, entryConfig: PluginConfig = {}) {
  const providers = Array.isArray(entryConfig.providers) ? entryConfig.providers : []
  const disposers: Array<() => void> = []
  for (const cfg of providers) {
    if (!cfg || cfg.enabled === false || !cfg.id) continue
    const adapter = new OllamaRemoteAdapter(cfg)
    try {
      disposers.push(ctx.llm.registerAdapter([cfg.id], adapter))
      ctx.logger?.info?.(`[dsh-ollama-remote] registered ${cfg.id}`)
    } catch (error) {
      ctx.logger?.warn?.(`[dsh-ollama-remote] failed to register ${cfg.id}: ${String(error)}`)
    }
  }
  return () => { for (const dispose of disposers.reverse()) { try { dispose() } catch {} } }
}