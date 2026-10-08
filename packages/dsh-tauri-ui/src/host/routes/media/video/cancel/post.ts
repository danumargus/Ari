import type { EventHandlerRequest } from 'dsh-tauri'
import { defineEventHandler, readBody } from 'dsh-tauri'
import { cancelVideoJob } from '../../../../service/colab-video'

export default defineEventHandler<EventHandlerRequest>(async (event) => {
  const body = (await readBody<Record<string, unknown>>(event)) ?? {}
  return cancelVideoJob(String(body.jobId ?? body.id ?? ''))
})