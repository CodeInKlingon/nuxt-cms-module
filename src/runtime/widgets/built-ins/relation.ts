import { defineWidget } from '../../composables/defineWidget'
import type { RelationConfig } from '../../types'
import type { BaseFieldOptions, PropTypeConstructor } from '../../types/widgets'

export interface RelationOptions extends BaseFieldOptions, RelationConfig {}

export type RelationValue = string | number | Array<string | number>

export const relationWidget = defineWidget<RelationValue, RelationOptions>({
  name: 'relation',
  component: () => import('./RelationWidget.vue'),
  propType: Object as unknown as PropTypeConstructor,
  validate: (value, options) => {
    if (options.required) {
      if (value === undefined || value === null) return 'Relation is required'
      if (Array.isArray(value) && value.length === 0) return 'Relation is required'
    }
    return true
  },
})

export const relationField = relationWidget
