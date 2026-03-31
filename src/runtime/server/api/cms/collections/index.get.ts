import { defineEventHandler } from 'h3'
import type { FieldDefinition, ValidationRule } from '../../../../types'
import { getAllCollectionDefinitions } from '../../../plugins/database'

/**
 * GET /api/cms/collections
 *
 * Returns serialized metadata for all registered collections.
 * Only name, fields and options are returned — hooks and schema
 * are server-only and are never sent to the client.
 */
export default defineEventHandler(() => {
  return getAllCollectionDefinitions().map(definition => ({
    name: definition.name,
    fields: (definition.fields || []).map((field: FieldDefinition) => {
      const validation = field.validation?.map((rule: ValidationRule) => {
        if (rule.type === 'pattern' && rule.value instanceof RegExp) {
          return {
            ...rule,
            value: rule.value.toString(),
            _isRegex: true,
          }
        }
        // Strip custom function-based rules — functions cannot cross the wire
        if (rule.type === 'custom') {
          return { type: 'custom' as const, message: rule.message }
        }
        return rule
      })
      return { ...field, validation }
    }),
    options: definition.options,
  }))
})
