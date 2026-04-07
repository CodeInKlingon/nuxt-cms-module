import { defineWidget } from '../../composables/defineWidget'
import type { NumberOptions } from '../../types/widgets'

export const numberWidget = defineWidget<number, NumberOptions>({
  name: 'number',
  component: () => import('./NumberWidget.vue'),
  defaultOptions: {
    default: 0,
  },
  validate: (value, options) => {
    if (options.required && (value === undefined || value === null)) {
      return 'This field is required'
    }
    if (options.min !== undefined && value < options.min) {
      return `Minimum value is ${options.min}`
    }
    if (options.max !== undefined && value > options.max) {
      return `Maximum value is ${options.max}`
    }
    return true
  },
})

export const numberField = numberWidget
