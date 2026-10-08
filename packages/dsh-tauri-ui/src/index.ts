import { PLUGIN_ID } from './shared/constants'

export const name = PLUGIN_ID

export const inject = ['webServer', 'connection', 'agents', 'tools']

export { apply } from './host/apply'
