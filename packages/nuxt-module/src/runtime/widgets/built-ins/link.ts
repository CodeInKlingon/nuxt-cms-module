import { defineWidget } from '../../composables/defineWidget'
import type { LinkOptions, LinkValue } from '../../types/widgets'

export const linkWidget = defineWidget<LinkValue, LinkOptions>({
  name: 'link',
  component: '',
  propType: Object,
  defaultOptions: {
    default: (): LinkValue => ({ url: '', target: '_self' }),
    allowExternal: true,
    allowInternal: true,
  },
  validate: (value, options) => {
    if (options.required && (!value?.url || value.url.trim() === '')) {
      return 'Link URL is required'
    }
    if (value?.url) {
      try {
        new URL(value.url)
      }
      catch {
        return 'Please enter a valid URL'
      }
    }
    return true
  },
})

export const linkField = linkWidget
