import { defineWidget } from '@codeinklingon/nuxt-cms/runtime/composables/defineWidget'
import type { BaseFieldOptions } from '@codeinklingon/nuxt-cms/runtime/types/widgets'

export interface FilePickerOptions extends BaseFieldOptions {
  default?: string
  accept?: string
  maxSize?: number
}

export const filePickerWidget = defineWidget<string, FilePickerOptions>({
  name: 'file-picker',
  component: () => import('./FilePicker.vue'),
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
export const filePickerField = filePickerWidget
