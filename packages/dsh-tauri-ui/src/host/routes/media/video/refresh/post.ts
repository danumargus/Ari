import type { EventHandlerRequest } from 'dsh-tauri'
import { defineEventHandler, readBody } from 'dsh-tauri'
import { refreshVideoJob } from '../../../../service/colab-video'

export default defineEventHandler<EventHandlerRequest>(async (event) => {
  const body = (await readBody<Record<string, unknown>>(event)) ?? {}
  return refreshVideoJob(String(body.jobId ?? body.id ?? ''))
})