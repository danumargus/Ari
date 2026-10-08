import type { EventHandlerRequest } from 'dsh-tauri'
import { defineEventHandler, readBody } from 'dsh-tauri'
import { createAndDispatchVideo } from '../../../../service/colab-video'

export default defineEventHandler<EventHandlerRequest>(async (event) => {
  const body = (await readBody<Record<string, unknown>>(event)) ?? {}
  return createAndDispatchVideo({
    prompt: String(body.prompt ?? ''),
    title: typeof body.title === 'string' ? body.title : undefined,
    durationSeconds: Number(body.duration_seconds ?? body.durationSeconds ?? 5),
    type: typeof body.type === 'string' ? body.type : undefined,
    seed: body.seed == null ? undefined : Number(body.seed),
  })
})