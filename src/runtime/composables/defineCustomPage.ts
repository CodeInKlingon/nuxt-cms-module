import type { CustomPageDefinition } from '../types'

/**
 * Define a custom admin page rendered inside the CMS layout.
 *
 * Custom pages are registered in `nuxt.config` under `cms.customPages`
 * and are reachable at `<admin-route>/page/<name>`.
 *
 * @example
 * ```ts
 * import { defineCustomPage } from '#cms'
 *
 * export default defineCustomPage({
 *   name: 'media',
 *   label: 'Media Library',
 *   icon: 'i-lucide-image',
 *   component: './cms/pages/MediaLibrary.vue',
 * })
 * ```
 */
export function defineCustomPage(
  definition: CustomPageDefinition,
): CustomPageDefinition {
  if (!definition.name) {
    throw new Error('Custom page must have a name')
  }

  if (!definition.label) {
    throw new Error(`Custom page "${definition.name}" must have a label`)
  }

  if (!definition.component) {
    throw new Error(`Custom page "${definition.name}" must have a component path`)
  }

  return definition
}
