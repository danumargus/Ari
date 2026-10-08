export interface AriVideoRequest {
  prompt: string
  title?: string
  durationSeconds?: number
  type?: string
  seed?: number
}

export interface AriVideoJobResult {
  ok: boolean
  localJobId?: string
  status?: string
  progress?: number
  currentPhase?: string
  completedShots?: number
  totalShots?: number
  estimatedRemainingS?: number
  result?: unknown
  error?: string
}

function bridgeUrl(): string {
  return String(process.env.ARI_VIDEO_BRIDGE_URL || 'http://127.0.0.1:8812').replace(/\/+$/, '')
}

async function request(path: string, init?: RequestInit, timeoutMs = 15000): Promise<any> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${bridgeUrl()}${path}`, { ...init, signal: controller.signal })
    const text = await response.text()
    let data: any = {}
    try { data = text ? JSON.parse(text) : {} } catch { data = { ok: false, error: 'invalid_json', detail: text.slice(0, 500) } }
    if (!response.ok)
      throw new Error(String(data?.detail || data?.error || `http_${response.status}`))
    return data
  }
  finally {
    clearTimeout(timer)
  }
}

export async function videoStatus() {
  try {
    const data = await request('/engine/status', undefined, 10000)
    let cliSession: any = null
    try {
      cliSession = await request('/cli/session/status', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ name: 'ariadna-video' }),
      }, 35000)
    }
    catch {}
    const sessionText = (String(cliSession?.stdout || '') + ' ' + String(cliSession?.stderr || '')).toLowerCase()
    const sessionReady = Boolean(cliSession?.ok) && !sessionText.includes('not found')
    return {
      ok: true,
      online: Boolean(data?.online) && sessionReady,
      configured: Boolean(data?.configured),
      sessionReady,
      transport: data?.transport ?? 'colab_cli',
      name: data?.name ?? 'Colab Video Engine',
      models: Array.isArray(data?.models) ? data.models : [],
      runtime: data?.runtime ?? null,
    }
  }
  catch (error) {
    return { ok: false, online: false, configured: false, sessionReady: false, error: error instanceof Error ? error.message : String(error) }
  }
}

function normalizeJob(data: any): AriVideoJobResult {
  const job = data?.job ?? data ?? {}
  return {
    ok: Boolean(data?.ok ?? true),
    localJobId: String(job?.id || data?.local_job_id || ''),
    status: String(job?.status || data?.status || ''),
    progress: Number(job?.progress ?? 0),
    currentPhase: String(job?.current_phase || ''),
    completedShots: Number(job?.completed_shots ?? 0),
    totalShots: Number(job?.total_shots ?? 0),
    estimatedRemainingS: Number(job?.estimated_remaining_s ?? 0) || undefined,
    result: job?.result,
    error: job?.error ? String(job.error) : undefined,
  }
}

export async function createAndDispatchVideo(input: AriVideoRequest): Promise<AriVideoJobResult> {
  const prompt = String(input.prompt || '').trim()
  if (!prompt) return { ok: false, error: 'video_prompt_required' }
  const state = await videoStatus()
  if (!state.online) return { ok: false, error: 'colab_session_unavailable' }
  const body = {
    prompt,
    brief: prompt,
    title: String(input.title || 'Ari Video').slice(0, 160),
    duration_seconds: Math.max(5, Math.min(3600, Math.trunc(Number(input.durationSeconds) || 5))),
    type: String(input.type || 'cinematic'),
    engine: 'wan22_ti2v_5b',
    seed: Number.isFinite(Number(input.seed)) ? Math.trunc(Number(input.seed)) : undefined,
  }
  const created = await request('/jobs/create', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body),
  }, 20000)
  const localJobId = String(created?.job?.id || '')
  if (!localJobId) return { ok: false, error: 'video_job_id_missing' }
  const dispatched = await request('/jobs/dispatch', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ id: localJobId }),
  }, 70000)
  const snapshot = await request(`/jobs/${encodeURIComponent(localJobId)}`, undefined, 10000)
  const out = normalizeJob(snapshot)
  out.localJobId = localJobId
  if (dispatched?.ok === false) out.error = String(dispatched?.error || 'video_dispatch_failed')
  return out
}

export async function refreshVideoJob(localJobId: string): Promise<AriVideoJobResult> {
  const id = String(localJobId || '').trim()
  if (!id) return { ok: false, error: 'video_job_id_required' }
  await request('/jobs/refresh', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ id }),
  }, 55000)
  return normalizeJob(await request(`/jobs/${encodeURIComponent(id)}`, undefined, 10000))
}

export async function cancelVideoJob(localJobId: string): Promise<AriVideoJobResult> {
  const id = String(localJobId || '').trim()
  if (!id) return { ok: false, error: 'video_job_id_required' }
  await request('/jobs/cancel', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ id }),
  }, 55000)
  return normalizeJob(await request(`/jobs/${encodeURIComponent(id)}`, undefined, 10000))
}