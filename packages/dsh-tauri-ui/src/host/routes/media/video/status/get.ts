import type { EventHandlerRequest } from 'dsh-tauri'
import { defineEventHandler } from 'dsh-tauri'
import { videoStatus } from '../../../../service/colab-video'

export default defineEventHandler<EventHandlerRequest>(() => videoStatus())