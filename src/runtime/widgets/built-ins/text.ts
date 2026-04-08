import { defineWidget } from '../../composables/defineWidget'
import type { TextOptions } from '../../types/widgets'

export const textWidget = defineWidget<string, TextOptions>({
  name: 'text',
  component: () => import('./TextWidget.vue'),
  propType: String,
  defaultOptions: {
    default: '',
  },
  validate: (value, options) => {
    if (options.required && (!value || value.trim() === '')) {
      return 'This field is required'
    }
    if (options.minLength && value.length < options.minLength) {
      return `Minimum ${options.minLength} characters required`
    }
    if (options.maxLength && value.length > options.maxLength) {
      return `Maximum ${options.maxLength} characters allowed`
    }
    return true
  },
})

// Export field function directly
export const textField = textWidget
