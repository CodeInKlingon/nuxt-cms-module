import { defineWidget } from '../../composables/defineWidget'
import type { BooleanOptions } from '../../types/widgets'

export const booleanWidget = defineWidget<boolean, BooleanOptions>({
  name: 'boolean',
  component: () => import('./BooleanWidget.vue'),
  defaultOptions: {
    default: false,
  },
  validate: (value, options) => {
    // Boolean fields are rarely required, but support it if needed
    if (options.required && value !== true) {
      return 'This field must be checked'
    }
    return true
  },
})

export const booleanField = booleanWidget
