import { defineWidget } from '../../../src/runtime/composables/defineWidget'
import type { TextOptions } from '../../../src/runtime/types/widgets'

export const fileUploadWidget = defineWidget<string, TextOptions>({
  name: 'file-upload',
  component: () => import('./FileUpload.vue'),
  defaultOptions: {
    default: '',
  },
  validate: (value, options) => {
    if (options.required && (!value || value.length === 0)) {
      return 'This field is required'
    }
    return true
  },
})

// Export field helper
export const fileUploadField = fileUploadWidget
