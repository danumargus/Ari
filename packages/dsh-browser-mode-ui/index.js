import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { defineEventHandler, defineRoutes, readBody } from 'dsh-tauri'

export const name = 'dsh-browser-mode-ui'
export const inject = ['webServer', 'connection']

const CONFIG_PATH = join(homedir(), '.dsh', 'browser-router.json')
const MODES = new Set(['local', 'mobile', 'cloud'])

function readConfig() {
  try {
    const raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'))
    return { ...raw, active: MODES.has(raw.active) ? raw.active : 'mobile' }
  }
  catch {
    return { active: 'mobile' }
  }
}

function writeMode(active) {
  if (!MODES.has(active)) throw new Error('invalid_browser_mode')
  const current = readConfig()
  const next = { ...current, active }
  mkdirSync(dirname(CONFIG_PATH), { recursive: true })
  writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2), 'utf8')
  return next
}

const routes = defineRoutes((disposer) => {
  disposer.get({ kind: 'exact', path: '/api/desktop/ari-browser-mode' }, defineEventHandler(() => readConfig()))
  disposer.post({ kind: 'exact', path: '/api/desktop/ari-browser-mode' }, defineEventHandler(async (event) => {
    const body = await readBody(event, { type: 'json' })
    return writeMode(String(body?.active || ''))
  }))
})

export function apply(ctx) {
  ctx.effect(() => routes(ctx), 'ari-browser-mode-ui: routes')
}
