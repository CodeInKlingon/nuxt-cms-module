import { defineWidget } from '../../composables/defineWidget'
import type { SelectOptions } from '../../types/widgets'

export const selectWidget = defineWidget<string | string[], SelectOptions>({
  name: 'select',
  component: () => import('./SelectWidget.vue'),
  defaultOptions: {
    default: '',
  },
  validate: (value, options) => {
    if (options.required) {
      if (options.multiple) {
        if (!Array.isArray(value) || value.length === 0) {
          return 'Please select at least one option'
        }
      }
      else {
        if (!value || value === '') {
          return 'Please select an option'
        }
      }
    }
    return true
  },
})

export const selectField = selectWidget
