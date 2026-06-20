import { defineWidget } from '../../composables/defineWidget'
import type { BlockItem } from '../../types/widgets'

export interface BlocksOptions {
  label?: string
  description?: string
  required?: boolean
  allowedBlocks?: string[]
  default?: BlockItem[] | (() => BlockItem[])
}

export const blocksWidget = defineWidget<BlockItem[], BlocksOptions>({
  name: 'blocks',
  component: () => import('./BlocksWidget.vue'),
  propType: Array,
  defaultOptions: {
    default: () => [],
  },
  validate: (value, options) => {
    if (options.required && (!value || value.length === 0)) {
      return 'At least one block is required'
    }
    return true
  },
})

export const blocksField = blocksWidget
