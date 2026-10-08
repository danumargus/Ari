import type { ClientContext } from 'dsh-tauri/client'
import { defineRegister } from 'dsh-tauri/client'
import { useEffect, useMemo, useState } from 'react'
import { PLUGIN_ID } from '../../shared/constants'
import { SETTINGS_SHELL_OVERLAY_SLOT } from '../constants'

export type AriImageGenerationPhase = 'queued' | 'generating' | 'finalizing' | 'done' | 'error'

export interface AriImageGenerationProgress {
  id?: string
  phase: AriImageGenerationPhase
  progress?: number
  label?: string
  detail?: string
}

export const ARI_IMAGE_PROGRESS_EVENT = 'ari:image-generation-progress'
const OVERLAY_ID = `${PLUGIN_ID}-image-generation-overlay`
const TOOL_NAME = 'generate_image'

function clampProgress(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

export function emitAriImageGenerationProgress(detail: AriImageGenerationProgress): void {
  if (typeof window === 'undefined')
    return
  window.dispatchEvent(new CustomEvent<AriImageGenerationProgress>(ARI_IMAGE_PROGRESS_EVENT, { detail }))
}

function ImageGenerationOverlay() {
  const [state, setState] = useState<AriImageGenerationProgress | null>(null)

  useEffect(() => {
    const onProgress = (event: Event) => {
      const detail = (event as CustomEvent<AriImageGenerationProgress>).detail
      if (!detail)
        return
      setState({ ...detail, progress: clampProgress(detail.progress) })
      if (detail.phase === 'done')
        window.setTimeout(() => setState(current => current?.id === detail.id ? null : current), 900)
      if (detail.phase === 'error')
        window.setTimeout(() => setState(current => current?.id === detail.id ? null : current), 3200)
    }
    window.addEventListener(ARI_IMAGE_PROGRESS_EVENT, onProgress)
    return () => window.removeEventListener(ARI_IMAGE_PROGRESS_EVENT, onProgress)
  }, [])

  useEffect(() => {
    if (!state || (state.phase !== 'queued' && state.phase !== 'generating' && state.phase !== 'finalizing'))
      return
    const ceiling = state.phase === 'queued' ? 12 : state.phase === 'finalizing' ? 98 : 92
    const timer = window.setInterval(() => {
      setState(current => {
        if (!current || current.id !== state.id || current.phase !== state.phase)
          return current
        const now = clampProgress(current.progress)
        if (now >= ceiling)
          return current
        const step = now < 30 ? 3 : now < 65 ? 2 : 1
        return { ...current, progress: Math.min(ceiling, now + step) }
      })
    }, 650)
    return () => window.clearInterval(timer)
  }, [state?.id, state?.phase])

  if (!state)
    return null

  const progress = clampProgress(state.progress)
  const failed = state.phase === 'error'
  const title = state.label ?? (failed ? 'La imagen no pudo generarse' : 'Creando imagen')
  const detail = state.detail ?? (state.phase === 'finalizing' ? 'Aplicando los últimos detalles…' : progress > 78 ? 'Afinando luz, textura y detalle…' : 'Preparando píxeles…')

  return (
    <>
      <style>{`
        @keyframes ari-plasma-drift { 0% { transform: translate3d(-18%, -8%, 0) rotate(0deg) scale(1.05); } 50% { transform: translate3d(12%, 10%, 0) rotate(145deg) scale(1.22); } 100% { transform: translate3d(-18%, -8%, 0) rotate(360deg) scale(1.05); } }
        @keyframes ari-plasma-sheen { 0%,100% { opacity:.34; transform: translateX(-36%) skewX(-18deg); } 50% { opacity:.72; transform: translateX(42%) skewX(-18deg); } }
        @keyframes ari-plasma-pulse { 0%,100% { box-shadow: 0 18px 64px rgba(0,0,0,.32), inset 0 1px 0 rgba(255,255,255,.28); } 50% { box-shadow: 0 22px 78px rgba(150,160,180,.28), inset 0 1px 0 rgba(255,255,255,.46); } }
        [data-ari-image-progress] { position: fixed; inset: 0; z-index: 2147483000; display:flex; align-items:center; justify-content:center; pointer-events:none; background:rgba(8,10,14,.14); backdrop-filter:blur(4px); }
        [data-ari-image-card] { position:relative; width:min(520px, calc(100vw - 36px)); min-height:190px; overflow:hidden; border-radius:26px; border:1px solid rgba(255,255,255,.42); background:linear-gradient(145deg,rgba(238,241,246,.86),rgba(107,114,128,.72) 46%,rgba(35,38,45,.86)); color:#fff; padding:26px 28px 24px; animation:ari-plasma-pulse 2.8s ease-in-out infinite; }
        [data-ari-image-plasma] { position:absolute; inset:-55%; background:conic-gradient(from 30deg,rgba(255,255,255,.9),rgba(142,151,168,.54),rgba(50,55,65,.25),rgba(224,228,236,.82),rgba(92,101,119,.46),rgba(255,255,255,.9)); filter:blur(34px) saturate(.72); animation:ari-plasma-drift 5.8s linear infinite; opacity:.84; }
        [data-ari-image-sheen] { position:absolute; inset:-20% -45%; background:linear-gradient(105deg,transparent 36%,rgba(255,255,255,.48) 50%,transparent 64%); animation:ari-plasma-sheen 2.6s ease-in-out infinite; }
        [data-ari-image-content] { position:relative; z-index:2; }
        [data-ari-image-kicker] { font-size:11px; letter-spacing:.16em; text-transform:uppercase; opacity:.72; }
        [data-ari-image-title] { margin-top:10px; font-size:22px; line-height:1.18; font-weight:650; text-shadow:0 1px 18px rgba(0,0,0,.28); }
        [data-ari-image-detail] { margin-top:8px; font-size:13px; opacity:.82; }
        [data-ari-image-row] { display:flex; align-items:center; gap:14px; margin-top:26px; }
        [data-ari-image-track] { height:9px; flex:1; overflow:hidden; border-radius:999px; background:rgba(10,12,16,.34); box-shadow:inset 0 1px 4px rgba(0,0,0,.32); }
        [data-ari-image-fill] { height:100%; border-radius:inherit; background:linear-gradient(90deg,rgba(246,248,252,.7),#fff,rgba(187,195,209,.92)); transition:width .28s ease; box-shadow:0 0 18px rgba(255,255,255,.68); }
        [data-ari-image-percent] { width:48px; text-align:right; font-variant-numeric:tabular-nums; font-weight:650; font-size:15px; }
      `}</style>
      <div data-ari-image-progress="" role="status" aria-live="polite">
        <div data-ari-image-card="" data-phase={state.phase}>
          <div data-ari-image-plasma="" />
          <div data-ari-image-sheen="" />
          <div data-ari-image-content="">
            <div data-ari-image-kicker="">Ari visual engine</div>
            <div data-ari-image-title="">{title}</div>
            <div data-ari-image-detail="">{detail}</div>
            <div data-ari-image-row="">
              <div data-ari-image-track=""><div data-ari-image-fill="" style={{ width: `${failed ? 100 : progress}%` }} /></div>
              <div data-ari-image-percent="">{failed ? '!' : `${progress}%`}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function imageAttachments(block: any): any[] {
  if (block?.kind !== 'tool-result' || !Array.isArray(block.content))
    return []
  return block.content
    .filter((part: any) => part?.type === 'image' && part?.attachment)
    .map((part: any) => part.attachment)
}

function GeneratedImagePreview({ attachment, loadImage }: { attachment: any, loadImage: any }) {
  const [url, setUrl] = useState<string | undefined>(() => loadImage.peek?.(attachment))
  useEffect(() => {
    let alive = true
    if (!url)
      void loadImage(attachment).then((next: string) => { if (alive) setUrl(next) }).catch(() => {})
    return () => { alive = false }
  }, [attachment, loadImage, url])
  if (!url)
    return <div style={{ padding: '14px 0', opacity: .65 }}>Cargando imagen…</div>
  return <img src={url} alt="Imagen generada por Ari" style={{ display: 'block', maxWidth: 'min(680px, 100%)', maxHeight: '70vh', borderRadius: 16, objectFit: 'contain', boxShadow: '0 10px 36px rgba(0,0,0,.18)' }} />
}

function ImageGenerationToolView(props: any) {
  const { phase, block, callId, loadImage, inspect } = props
  const attachments = useMemo(() => imageAttachments(block), [block])

  useEffect(() => {
    if (phase === 'preparing') {
      emitAriImageGenerationProgress({ id: callId, phase: 'queued', progress: 2, label: 'Preparando imagen', detail: 'Ari está preparando la petición visual…' })
      return
    }
    if (phase === 'start') {
      emitAriImageGenerationProgress({ id: callId, phase: 'generating', progress: 8, label: 'Creando imagen', detail: 'Cloudflare está generando la imagen…' })
      return
    }
    if (phase === 'result') {
      emitAriImageGenerationProgress({
        id: callId,
        phase: block?.isError ? 'error' : 'done',
        progress: block?.isError ? 100 : 100,
        label: block?.isError ? 'La imagen no pudo generarse' : 'Imagen terminada',
        detail: block?.isError ? 'El motor visual devolvió un error.' : 'Lista para verla en la conversación.',
      })
    }
  }, [phase, callId, block?.isError])

  const running = phase !== 'result'
  return (
    <div data-ari-generate-image-tool="" style={{ margin: '4px 0 8px 4px', color: 'var(--dsw-alias-label-secondary)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
        <span aria-hidden="true">✦</span>
        <span>{running ? 'Ari está creando una imagen' : block?.isError ? 'Error al crear la imagen' : 'Imagen generada por Ari'}</span>
        {inspect && <button type="button" onClick={inspect} style={{ border: 0, background: 'transparent', color: 'inherit', opacity: .65, cursor: 'pointer', padding: 0 }}>Detalles</button>}
      </div>
      {!running && !block?.isError && attachments.length > 0 && (
        <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
          {attachments.map((attachment, index) => <GeneratedImagePreview key={attachment.attachmentId ?? index} attachment={attachment} loadImage={loadImage} />)}
        </div>
      )}
      {!running && block?.isError && <div style={{ marginTop: 6, fontSize: 12, opacity: .72 }}>{block?.error?.reason || block?.error?.code || 'image_generation_failed'}</div>}
    </div>
  )
}

export const registerImageGenerationOverlay = defineRegister<ClientContext>((controller, ctx) => {
  controller.add(ctx.slots.inject(SETTINGS_SHELL_OVERLAY_SLOT as never, () =>
    ctx.slots.register(
      { name: SETTINGS_SHELL_OVERLAY_SLOT, id: OVERLAY_ID, registrant: PLUGIN_ID } as never,
      ImageGenerationOverlay as never,
    ),
  ))

  controller.add(ctx.slots.inject('tool.call.toolview' as never, () =>
    ctx.slots.register(
      { name: 'tool.call.toolview', key: TOOL_NAME, registrant: PLUGIN_ID } as never,
      ImageGenerationToolView as never,
    ),
  ))
})