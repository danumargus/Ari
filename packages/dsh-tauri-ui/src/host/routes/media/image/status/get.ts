import type { EventHandlerRequest } from 'dsh-tauri'
import { defineEventHandler } from 'dsh-tauri'
import { cloudflareImageStatus } from '../../../../service/cloudflare-image'

export default defineEventHandler<EventHandlerRequest>(() => cloudflareImageStatus())