import { defineWidget } from '../../composables/defineWidget'
import type { LinkOptions, LinkValue } from '../../types/widgets'

export const linkWidget = defineWidget<LinkValue, LinkOptions>({
  name: 'link',
  component: () => import('./LinkWidget.vue'),
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
        // eslint-disable-next-line no-new
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
