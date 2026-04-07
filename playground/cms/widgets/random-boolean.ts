import { defineWidget } from '../../../src/runtime/composables/defineWidget'
import type { BooleanOptions } from '../../../src/runtime/types/widgets'

export const randomBooleanWidget = defineWidget<boolean, BooleanOptions>({
  name: 'random-boolean',
  component: () => import('./RandomBooleanWidget.vue'),
  defaultOptions: {
    default: false,
  },
  validate: (_value, options) => {
    // Boolean fields are rarely required, but support it if needed
    if (options.required) {
      return 'This field must be checked'
    }
    return true
  },
})

// Export field helper
export const randomBooleanField = randomBooleanWidget
