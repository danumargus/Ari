import type { ClientContext } from 'dsh-tauri/client'
import { defineRegister } from 'dsh-tauri/client'
import { useEffect, useState } from 'react'
import { PLUGIN_ID } from '../../shared/constants'
import { SETTINGS_SHELL_OVERLAY_SLOT } from '../constants'

interface VideoProgress {
  id: string
  jobId?: string
  phase: string
  progress: number
  status?: string
  completedShots?: number
  totalShots?: number
  error?: string
}

const EVENT = 'ari:video-generation-progress'
const TOOL_NAME = 'generate_video'
const OVERLAY_ID = `${PLUGIN_ID}-video-generation-overlay`
const TERMINAL = new Set(['complete', 'completed', 'failed', 'cancelled'])

function clamp(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0
}

function emit(detail: VideoProgress): void {
  if (typeof window !== 'undefined')
    window.dispatchEvent(new CustomEvent<VideoProgress>(EVENT, { detail: { ...detail, progress: clamp(detail.progress) } }))
}

function VideoOverlay() {
  const [state, setState] = useState<VideoProgress | null>(null)
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<VideoProgress>).detail
      if (!detail) return
      setState(detail)
      if (TERMINAL.has(String(detail.status || '').toLowerCase()))
        window.setTimeout(() => setState(current => current?.id === detail.id ? null : current), detail.status === 'failed' ? 3500 : 1200)
    }
    window.addEventListener(EVENT, handler)
    return () => window.removeEventListener(EVENT, handler)
  }, [])
  if (!state) return null
  const done = TERMINAL.has(String(state.status || '').toLowerCase())
  const shots = state.totalShots ? `${state.completedShots || 0}/${state.totalShots} planos` : ''
  return (
    <>
      <style>{`
        @keyframes ari-video-flow {0%{transform:translate3d(-14%,-8%,0) rotate(0deg) scale(1.06)}50%{transform:translate3d(13%,8%,0) rotate(170deg) scale(1.18)}100%{transform:translate3d(-14%,-8%,0) rotate(360deg) scale(1.06)}}
        @keyframes ari-video-glint {0%,100%{opacity:.24;transform:translateX(-45%) skewX(-20deg)}50%{opacity:.68;transform:translateX(48%) skewX(-20deg)}}
        [data-ari-video-overlay]{position:fixed;inset:0;z-index:2147482999;display:flex;align-items:center;justify-content:center;pointer-events:none;background:rgba(5,7,12,.18);backdrop-filter:blur(5px)}
        [data-ari-video-card]{position:relative;overflow:hidden;width:min(560px,calc(100vw - 38px));border-radius:28px;border:1px solid rgba(255,255,255,.35);background:linear-gradient(145deg,rgba(20,23,31,.94),rgba(91,99,116,.82) 48%,rgba(215,220,229,.72));color:white;padding:28px;box-shadow:0 24px 90px rgba(0,0,0,.38)}
        [data-ari-video-plasma]{position:absolute;inset:-55%;background:conic-gradient(from 20deg,rgba(255,255,255,.76),rgba(107,116,137,.46),rgba(14,17,24,.62),rgba(210,217,230,.64),rgba(58,65,81,.58),rgba(255,255,255,.76));filter:blur(38px);animation:ari-video-flow 7.2s linear infinite}
        [data-ari-video-glint]{position:absolute;inset:-20% -50%;background:linear-gradient(105deg,transparent 38%,rgba(255,255,255,.46) 50%,transparent 62%);animation:ari-video-glint 3s ease-in-out infinite}
        [data-ari-video-content]{position:relative;z-index:2}
        [data-ari-video-kicker]{font-size:11px;letter-spacing:.17em;text-transform:uppercase;opacity:.7}
        [data-ari-video-title]{font-size:22px;font-weight:650;margin-top:10px}
        [data-ari-video-detail]{font-size:13px;opacity:.8;margin-top:8px}
        [data-ari-video-track]{height:9px;border-radius:999px;background:rgba(4,6,10,.42);overflow:hidden;margin-top:25px}
        [data-ari-video-fill]{height:100%;border-radius:inherit;background:linear-gradient(90deg,rgba(180,189,205,.78),white,rgba(212,217,227,.9));box-shadow:0 0 20px rgba(255,255,255,.65);transition:width .35s ease}
        [data-ari-video-footer]{display:flex;justify-content:space-between;gap:16px;margin-top:9px;font-size:13px;font-variant-numeric:tabular-nums}
      `}</style>
      <div data-ari-video-overlay="" role="status" aria-live="polite">
        <div data-ari-video-card="">
          <div data-ari-video-plasma=""/><div data-ari-video-glint=""/>
          <div data-ari-video-content="">
            <div data-ari-video-kicker="">Ari video engine · Colab</div>
            <div data-ari-video-title="">{state.error ? 'Error al crear vídeo' : done ? 'Vídeo terminado' : 'Creando vídeo'}</div>
            <div data-ari-video-detail="">{state.error || state.phase || state.status || 'Preparando trabajo…'}</div>
            <div data-ari-video-track=""><div data-ari-video-fill="" style={{ width: `${state.progress}%` }}/></div>
            <div data-ari-video-footer=""><span>{shots}</span><strong>{state.progress}%</strong></div>
          </div>
        </div>
      </div>
    </>
  )
}

function videoMeta(block: any): any {
  return block?.meta?.ariVideoJob ?? null
}

async function post(path: string, body: unknown): Promise<any> {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await response.json()
  if (!response.ok || data?.ok === false) throw new Error(String(data?.error || `http_${response.status}`))
  return data
}

function VideoToolView(props: any) {
  const { phase, block, callId, inspect } = props
  const initial = videoMeta(block)
  const [job, setJob] = useState<any>(initial)
  const jobId = String(job?.jobId || initial?.jobId || '')

  useEffect(() => {
    if (phase === 'preparing') emit({ id: callId, phase: 'Preparando petición', progress: 0, status: 'preparing' })
    else if (phase === 'start') emit({ id: callId, phase: 'Creando trabajo en Colab', progress: 0, status: 'dispatching' })
  }, [phase, callId])

  useEffect(() => {
    if (phase !== 'result' || !jobId || block?.isError) return
    let stopped = false
    let timer = 0
    const poll = async () => {
      try {
        const next = await post('/api/desktop/dsh-tauri-ui/media/video/refresh', { jobId })
        if (stopped) return
        setJob(next)
        const status = String(next?.status || '').toLowerCase()
        emit({ id: callId, jobId, phase: String(next?.currentPhase || status || 'Procesando'), progress: clamp(next?.progress), status, completedShots: next?.completedShots, totalShots: next?.totalShots, error: next?.error })
        if (!TERMINAL.has(status)) timer = window.setTimeout(poll, 5000)
      }
      catch (error) {
        if (!stopped) {
          const message = error instanceof Error ? error.message : String(error)
          emit({ id: callId, jobId, phase: 'Error de seguimiento', progress: clamp(job?.progress), status: 'failed', error: message })
          setJob((current: any) => ({ ...current, error: message, status: 'failed' }))
        }
      }
    }
    emit({ id: callId, jobId, phase: String(job?.currentPhase || 'waiting_worker'), progress: clamp(job?.progress), status: String(job?.status || 'submitted'), completedShots: job?.completedShots, totalShots: job?.totalShots })
    timer = window.setTimeout(poll, 1200)
    return () => { stopped = true; window.clearTimeout(timer) }
  }, [phase, jobId, callId, block?.isError])

  const cancel = async () => {
    if (!jobId) return
    try {
      const next = await post('/api/desktop/dsh-tauri-ui/media/video/cancel', { jobId })
      setJob(next)
    }
    catch (error) {
      setJob((current: any) => ({ ...current, error: error instanceof Error ? error.message : String(error) }))
    }
  }

  if (phase !== 'result')
    return <div style={{ margin: '4px 0 8px 4px', fontSize: 13, opacity: .78 }}>◈ Ari está preparando el vídeo en Colab…</div>

  if (block?.isError)
    return <div style={{ margin: '4px 0 8px 4px', fontSize: 13, color: 'var(--dsw-alias-state-error-primary)' }}>Error al iniciar el vídeo.</div>

  const progress = clamp(job?.progress)
  const status = String(job?.status || 'submitted')
  const terminal = TERMINAL.has(status.toLowerCase())
  return (
    <div data-ari-video-tool="" style={{ margin: '5px 0 10px 4px', maxWidth: 680, border: '.5px solid var(--dsw-alias-border-l2)', borderRadius: 14, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><strong>◈ Vídeo Ari · Colab</strong><span style={{ opacity: .65 }}>{status}</span></div>
      <div style={{ marginTop: 9, height: 7, borderRadius: 999, overflow: 'hidden', background: 'var(--dsw-alias-bg-layer-3)' }}><div style={{ height: '100%', width: `${progress}%`, background: 'currentColor', opacity: .72, transition: 'width .35s ease' }}/></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, fontSize: 12, opacity: .76 }}><span>{job?.currentPhase || 'waiting_worker'}{job?.totalShots ? ` · ${job?.completedShots || 0}/${job.totalShots} planos` : ''}</span><span>{progress}%</span></div>
      {job?.error && <div style={{ marginTop: 8, color: 'var(--dsw-alias-state-error-primary)', fontSize: 12 }}>{job.error}</div>}
      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
        {!terminal && <button type="button" onClick={cancel} style={{ cursor: 'pointer' }}>Cancelar</button>}
        {inspect && <button type="button" onClick={inspect} style={{ cursor: 'pointer' }}>Detalles</button>}
      </div>
    </div>
  )
}

export const registerVideoGenerationOverlay = defineRegister<ClientContext>((controller, ctx) => {
  controller.add(ctx.slots.inject(SETTINGS_SHELL_OVERLAY_SLOT as never, () => ctx.slots.register(
    { name: SETTINGS_SHELL_OVERLAY_SLOT, id: OVERLAY_ID, registrant: PLUGIN_ID } as never,
    VideoOverlay as never,
  )))
  controller.add(ctx.slots.inject('tool.call.toolview' as never, () => ctx.slots.register(
    { name: 'tool.call.toolview', key: TOOL_NAME, registrant: PLUGIN_ID } as never,
    VideoToolView as never,
  )))
})