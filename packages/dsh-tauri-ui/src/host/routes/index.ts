import { defineRoutes } from 'dsh-tauri'
import resume from './session/resume/post'
import ungrouped from './ungrouped/get'
import imageStatus from './media/image/status/get'
import imageGenerate from './media/image/generate/post'
import videoStatus from './media/video/status/get'
import videoGenerate from './media/video/generate/post'
import videoRefresh from './media/video/refresh/post'
import videoCancel from './media/video/cancel/post'

export const routes = defineRoutes((disposer) => {
  disposer.post({ kind: 'exact', path: '/api/desktop/dsh-tauri-ui/session/resume' }, resume)
  disposer.get({ kind: 'exact', path: '/api/desktop/dsh-tauri-ui/ungrouped' }, ungrouped)
  disposer.get({ kind: 'exact', path: '/api/desktop/dsh-tauri-ui/media/image/status' }, imageStatus)
  disposer.post({ kind: 'exact', path: '/api/desktop/dsh-tauri-ui/media/image/generate' }, imageGenerate)
  disposer.get({ kind: 'exact', path: '/api/desktop/dsh-tauri-ui/media/video/status' }, videoStatus)
  disposer.post({ kind: 'exact', path: '/api/desktop/dsh-tauri-ui/media/video/generate' }, videoGenerate)
  disposer.post({ kind: 'exact', path: '/api/desktop/dsh-tauri-ui/media/video/refresh' }, videoRefresh)
  disposer.post({ kind: 'exact', path: '/api/desktop/dsh-tauri-ui/media/video/cancel' }, videoCancel)
})
