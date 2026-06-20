import { defineWidget } from '../../composables/defineWidget'
import type { TextareaOptions } from '../../types/widgets'

export const textareaWidget = defineWidget<string, TextareaOptions>({
  name: 'textarea',
  component: () => import('./TextareaWidget.vue'),
  propType: String,
  defaultOptions: {
    default: '',
    rows: 4,
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

export const textareaField = textareaWidget
