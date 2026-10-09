import { defineLocale } from 'dsh-tauri/client'
import { PLUGIN_ID } from '../../shared/constants'
import { es } from './es'

export const locale = defineLocale(PLUGIN_ID, {
  es,
  zh: {
    uiComponents: 'UI 组件',
  },
  en: {
    uiComponents: 'UI components',
  },
})
