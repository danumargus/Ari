import type { ClientContext } from 'dsh-tauri/client'
import {
  EXTENSION_PANEL_EFFECT,
  LOCALE_EFFECT,
  PLUGIN_ID,
  SKILL_CREATOR_PREFILL_EFFECT,
} from './constants'
import { locale } from './locales'
import { accountEs } from './locales/account.es'
import { marketEs } from './locales/market.es'
import { pluginManagerEs } from './locales/plugin-manager.es'
import { extensionPanelFeature } from './register/extension-panel'
import { skillCreatorPrefillFeature } from './register/skill-creator-prefill'

export const name = PLUGIN_ID

export const inject = ['slots', 'layout', 'locale', 'sessions', 'workspaces']

export function apply(ctx: ClientContext): void {
  ctx.effect(locale.registerLocale, LOCALE_EFFECT)
  ctx.effect(() => ctx.locale.register('pluginManager', 'es-ES', pluginManagerEs))
  ctx.effect(() => ctx.locale.register('dsh-market', 'es-ES', marketEs))
  ctx.effect(() => ctx.locale.register('settings.account', 'es-ES', accountEs))
  ctx.effect(skillCreatorPrefillFeature, SKILL_CREATOR_PREFILL_EFFECT)
  ctx.effect(extensionPanelFeature, EXTENSION_PANEL_EFFECT)
}
