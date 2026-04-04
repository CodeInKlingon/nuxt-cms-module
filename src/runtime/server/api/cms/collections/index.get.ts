import { defineEventHandler } from 'h3'
import type { DashboardConfig, FormFieldConfig, ValidationRule } from '../../../../types'
import { getAllCollectionDefinitions } from '../../../plugins/database'

/**
 * Recursively serialize validation rules within a FormFieldConfig array,
 * converting RegExp to strings and stripping custom fn references so the
 * config can safely cross the server → client boundary.
 */
function serializeFields(fields: FormFieldConfig[]): FormFieldConfig[] {
  return fields.map((fieldConfig) => {
    const validation = fieldConfig.validation?.map((rule: ValidationRule) => {
      if (rule.type === 'pattern' && rule.value instanceof RegExp) {
        return {
          ...rule,
          value: rule.value.toString(),
          _isRegex: true,
        }
      }
      // Strip function-based rules — functions cannot cross the wire.
      // Cast because we intentionally omit `fn` for serialisation only.
      if (rule.type === 'custom') {
        return { type: 'custom' as const, message: rule.message } as ValidationRule
      }
      return rule
    })
    return { ...fieldConfig, validation }
  })
}

/**
 * Serialize the dashboard config for wire transmission.
 * Walks all tabs/sections to sanitize validation rules.
 */
function serializeDashboard(dashboard: DashboardConfig | undefined): DashboardConfig | undefined {
  if (!dashboard) return undefined

  const form = dashboard.form
    ? {
        ...dashboard.form,
        tabs: dashboard.form.tabs?.map(tab => ({
          ...tab,
          sections: tab.sections.map(section => ({
            ...section,
            fields: serializeFields(section.fields),
          })),
        })),
        sections: dashboard.form.sections?.map(section => ({
          ...section,
          fields: serializeFields(section.fields),
        })),
      }
    : undefined

  return { list: dashboard.list, form }
}

/**
 * GET /api/cms/collections
 *
 * Returns serialized metadata for all registered collections.
 * Only name, dashboard config, and options are returned — hooks and
 * the Drizzle schema are server-only and are never sent to the client.
 */
export default defineEventHandler(() => {
  return getAllCollectionDefinitions().map(definition => ({
    name: definition.name,
    dashboard: serializeDashboard(definition.dashboard),
    options: definition.options,
  }))
})
