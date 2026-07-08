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

    // Relation config may contain Drizzle table objects, which cannot be
    // serialized to the client.
    let relation = fieldConfig.relation
    if (relation && typeof relation === 'object' && 'junctionTable' in relation) {
      relation = {
        ...relation,
        junctionTable: typeof relation.junctionTable === 'string'
          ? relation.junctionTable
          : undefined,
      } as FormFieldConfig['relation']
    }
    if (relation?.display?.source && 'table' in relation.display.source) {
      relation = {
        ...relation,
        display: {
          ...relation.display,
          source: {
            ...relation.display.source,
            table: typeof relation.display.source.table === 'string'
              ? relation.display.source.table
              : undefined,
          },
        },
      } as FormFieldConfig['relation']
    }

    return { ...fieldConfig, validation, relation }
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
    primaryKey: definition.primaryKey || 'id',
    dashboard: serializeDashboard(definition.dashboard),
    options: definition.options
      ? {
          ...definition.options,
          display: serializeDisplay(definition.options.display),
        }
      : undefined,
    blocks: definition.blocks,
  }))
})

function serializeDisplay<T extends { source?: { table?: string | unknown } } | undefined>(display: T): T {
  if (!display?.source || !('table' in display.source)) return display

  return {
    ...display,
    source: {
      ...display.source,
      table: typeof display.source.table === 'string' ? display.source.table : undefined,
    },
  }
}
