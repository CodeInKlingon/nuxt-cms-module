import { h, defineAsyncComponent, resolveComponent } from 'vue'
import type { BlockItem } from '../types/widgets'

export interface RenderBlocksOptions {
  wrapperClass?: string
  onBlockRender?: (block: BlockItem) => void
}

// Cache for resolved components
const componentCache = new Map<string, any>()

/**
 * Resolve a block component by type
 */
function resolveBlockComponent(blockType: string) {
  // Check cache first
  if (componentCache.has(blockType)) {
    return componentCache.get(blockType)
  }

  // Try to resolve from globally registered components
  try {
    const component = resolveComponent(blockType)
    if (component) {
      componentCache.set(blockType, component)
      return component
    }
  }
  catch {
    // Component not registered globally
  }

  // Fallback: try dynamic import
  const asyncComponent = defineAsyncComponent(() => 
    import(`../../../../playground/cms/blocks/${blockType}.vue`).catch(() => {
      console.error(`Block component not found: ${blockType}`)
      return {
        template: `<div class="p-4 bg-red-50 text-red-600 rounded border border-red-200">Block "${blockType}" not found</div>`,
      }
    })
  )
  
  componentCache.set(blockType, asyncComponent)
  return asyncComponent
}

/**
 * Composable for programmatically rendering blocks
 * 
 * @example
 * ```vue
 * <script setup>
 * const { renderBlocks } = useRenderBlocks()
 * 
 * const blocksVNode = computed(() => {
 *   return renderBlocks(page.value.blocks, {
 *     wrapperClass: 'my-blocks',
 *     onBlockRender: (block) => console.log('Rendered:', block.type)
 *   })
 * })
 * </script>
 * 
 * <template>
 *   <component :is="blocksVNode" />
 * </template>
 * ```
 */
export function useRenderBlocks() {
  /**
   * Render blocks as a Vue VNode
   */
  function renderBlocks(blocks: BlockItem[], options: RenderBlocksOptions = {}) {
    const { wrapperClass = '', onBlockRender } = options

    const children = blocks.map((block) => {
      // Call callback if provided
      if (onBlockRender) {
        onBlockRender(block)
      }

      // Create component vnode
      return h(resolveBlockComponent(block.type), {
        ...block.data,
        key: block.id,
      })
    })

    // Wrap in container div
    return h('div', { class: wrapperClass }, children)
  }

  /**
   * Render a single block
   */
  function renderBlock(block: BlockItem) {
    return h(resolveBlockComponent(block.type), {
      ...block.data,
      key: block.id,
    })
  }

  return {
    renderBlocks,
    renderBlock,
    resolveBlockComponent,
  }
}
