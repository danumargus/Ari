import type { EventHandlerRequest } from 'dsh-tauri'
import { defineEventHandler, readBody } from 'dsh-tauri'
import { generateCloudflareImage } from '../../../../service/cloudflare-image'

export default defineEventHandler<EventHandlerRequest>(async (event) => {
  const body = (await readBody<Record<string, unknown>>(event)) ?? {}
  const result = await generateCloudflareImage({
    prompt: String(body.prompt ?? ''),
    width: Number(body.width ?? 1024),
    height: Number(body.height ?? 1024),
    seed: body.seed == null ? undefined : Number(body.seed),
    model: typeof body.model === 'string' ? body.model : undefined,
  })
  if (!result.ok) event.res.status = result.error === 'prompt_required' ? 400 : result.error === 'cloudflare_not_configured' ? 503 : 502
  return result
})