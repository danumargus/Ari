export const DEFAULT_CLOUDFLARE_IMAGE_MODEL = '@cf/black-forest-labs/flux-2-klein-4b'

export interface ImageGenerateRequest {
  prompt: string
  width?: number
  height?: number
  seed?: number
  model?: string
}

export interface ImageGenerateResult {
  ok: boolean
  provider: 'cloudflare'
  model: string
  mimeType?: string
  imageBase64?: string
  error?: string
}

function credential(name: string): string {
  return String(process.env[name] ?? '').trim()
}

export async function cloudflareImageStatus() {
  let photoOnline = false
  let photoConfigured = false
  let photoModel: string | undefined
  try {
    const health = await fetch('http://127.0.0.1:8787/health', { signal: AbortSignal.timeout(2500) })
    photoOnline = health.ok
    if (photoOnline) {
      const providers = await fetch('http://127.0.0.1:8787/api/providers', { signal: AbortSignal.timeout(3500) })
      if (providers.ok) {
        const json = await providers.json() as any
        const visual = json?.visual ?? {}
        photoConfigured = Boolean(visual?.configured)
        photoModel = typeof visual?.model === 'string' ? visual.model : undefined
      }
    }
  }
  catch {}

  const accountId = credential('CLOUDFLARE_ACCOUNT_ID')
  const token = credential('CLOUDFLARE_API_TOKEN')
  return {
    ok: true,
    provider: 'cloudflare' as const,
    engine: photoOnline ? 'photo_studio' : 'cloudflare_direct',
    online: photoOnline || Boolean(accountId && token),
    configured: photoConfigured || Boolean(accountId && token),
    model: photoModel || credential('ARI_CLOUDFLARE_IMAGE_MODEL') || DEFAULT_CLOUDFLARE_IMAGE_MODEL,
  }
}

function dimension(value: unknown, fallback: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  const rounded = Math.round(n)
  return Math.max(256, Math.min(2048, rounded))
}

async function generateViaPhotoStudio(input: ImageGenerateRequest): Promise<ImageGenerateResult | undefined> {
  try {
    const response = await fetch('http://127.0.0.1:8787/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        prompt: String(input.prompt || '').trim().slice(0, 4000),
        mode: 'Generate',
        character: null,
        width: dimension(input.width, 1024),
        height: dimension(input.height, 1024),
        seed: Number.isFinite(Number(input.seed)) ? Math.max(0, Math.trunc(Number(input.seed))) : null,
        prepared_prompt: null,
      }),
      signal: AbortSignal.timeout(245000),
    })
    if (!response.ok) return undefined
    const json = await response.json() as any
    const base64 = json?.image_base64 ?? json?.image ?? json?.b64_json
    if (typeof base64 !== 'string' || base64.length < 100) return undefined
    return {
      ok: true,
      provider: 'cloudflare',
      model: String(json?.model || DEFAULT_CLOUDFLARE_IMAGE_MODEL),
      mimeType: String(json?.mime_type || 'image/png'),
      imageBase64: base64,
    }
  }
  catch {
    return undefined
  }
}
export async function generateCloudflareImage(input: ImageGenerateRequest): Promise<ImageGenerateResult> {
  const prompt = String(input.prompt || '').trim()
  const requestedModel = String(input.model || credential('ARI_CLOUDFLARE_IMAGE_MODEL') || DEFAULT_CLOUDFLARE_IMAGE_MODEL).trim()
  if (!prompt) return { ok: false, provider: 'cloudflare', model: requestedModel, error: 'prompt_required' }

  const viaPhotoStudio = await generateViaPhotoStudio({ ...input, prompt })
  if (viaPhotoStudio) return viaPhotoStudio
  const accountId = credential('CLOUDFLARE_ACCOUNT_ID')
  const token = credential('CLOUDFLARE_API_TOKEN')
  const model = requestedModel
  if (!accountId || !token) return { ok: false, provider: 'cloudflare', model, error: 'cloudflare_not_configured' }

  const payload: Record<string, unknown> = {
    prompt: prompt.slice(0, 4000),
    width: dimension(input.width, 1024),
    height: dimension(input.height, 1024),
  }
  if (Number.isFinite(Number(input.seed))) payload.seed = Math.max(0, Math.trunc(Number(input.seed)))

  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }
  catch (error) {
    return { ok: false, provider: 'cloudflare', model, error: `network:${error instanceof Error ? error.message : String(error)}` }
  }

  const contentType = response.headers.get('content-type') || ''
  if (!response.ok) {
    let detail = `http_${response.status}`
    try { const body = await response.text(); if (body) detail += `:${body.slice(0, 500)}` } catch {}
    return { ok: false, provider: 'cloudflare', model, error: detail }
  }

  if (contentType.startsWith('image/')) {
    const bytes = Buffer.from(await response.arrayBuffer())
    return { ok: true, provider: 'cloudflare', model, mimeType: contentType.split(';')[0], imageBase64: bytes.toString('base64') }
  }

  try {
    const json = await response.json() as any
    const result = json?.result ?? json
    const base64 = result?.image ?? result?.image_base64 ?? result?.b64_json ?? result?.data?.[0]?.b64_json
    if (typeof base64 === 'string' && base64.length > 100)
      return { ok: true, provider: 'cloudflare', model, mimeType: result?.mime_type || 'image/png', imageBase64: base64 }
    return { ok: false, provider: 'cloudflare', model, error: 'cloudflare_response_without_image' }
  }
  catch (error) {
    return { ok: false, provider: 'cloudflare', model, error: `invalid_response:${error instanceof Error ? error.message : String(error)}` }
  }
}