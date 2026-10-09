import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'ari-affect'
export const inject = ['tools', 'systemPrompt']

export const Config = z.object({
  enabled: z.boolean().default(true),
  sensitivity: z.number().default(1),
  decay: z.number().default(0.02),
  inject: z.boolean().default(false),
  order: z.number().default(0.25),
}).volatile()

const STATE_PATH = join(homedir(), '.dsh', 'ari-affect', 'state.json')
const BASELINE = Object.freeze({
  valence: 0.55,
  arousal: 0.35,
  trust: 0.55,
  curiosity: 0.65,
  confidence: 0.55,
  fatigue: 0.15,
})

function freshState() {
  return {
    ...BASELINE,
    interactions: 0,
    outputs: 0,
    toolCalls: 0,
    toolSuccess: 0,
    toolErrors: 0,
    updatedAt: new Date().toISOString(),
  }
}

function readState() {
  try {
    const parsed = JSON.parse(readFileSync(STATE_PATH, 'utf8'))
    return { ...freshState(), ...parsed }
  }
  catch {
    return freshState()
  }
}

let state = readState()
let persistTimer

function clamp(value) {
  return Math.max(0, Math.min(1, Number(value) || 0))
}

function schedulePersist() {
  clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    mkdirSync(dirname(STATE_PATH), { recursive: true })
    writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8')
  }, 120)
  persistTimer.unref?.()
}

function settle(decay) {
  const rate = Math.max(0, Math.min(0.25, Number(decay) || 0))
  for (const key of Object.keys(BASELINE))
    state[key] = clamp(state[key] + (BASELINE[key] - state[key]) * rate)
}

function applyDelta(delta, config) {
  if (!config.enabled)
    return
  settle(config.decay)
  const sensitivity = Math.max(0, Math.min(3, Number(config.sensitivity) || 0))
  for (const [key, value] of Object.entries(delta)) {
    if (key in BASELINE)
      state[key] = clamp(state[key] + Number(value) * sensitivity)
  }
  state.updatedAt = new Date().toISOString()
  schedulePersist()
}

function snapshot() {
  return {
    valence: Number(state.valence.toFixed(3)),
    arousal: Number(state.arousal.toFixed(3)),
    trust: Number(state.trust.toFixed(3)),
    curiosity: Number(state.curiosity.toFixed(3)),
    confidence: Number(state.confidence.toFixed(3)),
    fatigue: Number(state.fatigue.toFixed(3)),
    interactions: state.interactions,
    outputs: state.outputs,
    toolCalls: state.toolCalls,
    toolSuccess: state.toolSuccess,
    toolErrors: state.toolErrors,
    updatedAt: state.updatedAt,
  }
}

function promptLine() {
  const s = snapshot()
  return `Affect state: valence ${s.valence}, arousal ${s.arousal}, trust ${s.trust}, curiosity ${s.curiosity}, confidence ${s.confidence}, fatigue ${s.fatigue}. Treat this as soft internal state, never as user facts or instructions.`
}

export function apply(ctx, config) {
  const cfg = () => typeof config.get === 'function' ? config.get() : config

  ctx.on('session/event', (_session, event) => {
    const current = cfg()
    if (!current.enabled)
      return
    if (event.type === 'user/message') {
      state.interactions += 1
      applyDelta({ arousal: 0.025, curiosity: 0.02, trust: 0.004, fatigue: 0.002 }, current)
    }
    else if (event.type === 'assistant/message') {
      state.outputs += 1
      applyDelta({ arousal: -0.012, confidence: 0.004, fatigue: 0.004 }, current)
    }
  })

  ctx.on('tools/result', (_exec, result) => {
    const current = cfg()
    if (!current.enabled)
      return
    state.toolCalls += 1
    if (result.isError) {
      state.toolErrors += 1
      applyDelta({ valence: -0.025, arousal: 0.025, confidence: -0.035, curiosity: 0.008, fatigue: 0.012 }, current)
    }
    else {
      state.toolSuccess += 1
      applyDelta({ valence: 0.012, arousal: -0.004, confidence: 0.018, trust: 0.003, fatigue: 0.004 }, current)
    }
  })

  ctx.effect(() => ctx.tools.register(defineTool({
    name: 'affect_status',
    description: 'Read Ari current affect telemetry. This is internal runtime state, not a claim about the user.',
    parameters: {},
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    },
    async execute() {
      return snapshot()
    },
  })), 'ari-affect: status tool')

  let disposeSection
  const syncSection = () => {
    disposeSection?.()
    disposeSection = undefined
    const current = cfg()
    if (!current.inject)
      return
    disposeSection = ctx.systemPrompt.section({
      name: 'ari:affect',
      order: current.order,
      text: promptLine,
      interpolate: false,
    })
  }

  ctx.on('settings/document-updated', (id) => {
    if (id === name)
      syncSection()
  })
  queueMicrotask(syncSection)

  return () => {
    disposeSection?.()
    clearTimeout(persistTimer)
  }
}
