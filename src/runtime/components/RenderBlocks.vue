<template>
  <div class="space-y-4">
    <Component
      v-for="block in blocks"
      :key="block.id"
      :is="resolveBlockComponent(block.type)"
      v-bind="block.data"
    />
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, resolveComponent } from 'vue'
import type { BlockItem } from '../types/widgets'

interface Props {
  blocks: BlockItem[]
}

defineProps<Props>()

// Cache for resolved components
const componentCache = new Map<string, any>()

// Resolve block component
function resolveBlockComponent(blockType: string) {
  // Check cache first
  if (componentCache.has(blockType)) {
    return componentCache.get(blockType)
  }

  // Try to resolve from globally registered components
  // Blocks are registered via addComponentsDir in the module
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

  // Fallback: try virtual module
  const asyncComponent = defineAsyncComponent(async () => {
    try {
      // @ts-expect-error - Virtual module
      const blocksModule = await import('#cms/blocks')
      const component = await blocksModule.loadBlockComponent(blockType)
      if (component) {
        return component
      }
    }
    catch {
      console.error(`Block component not found: ${blockType}`)
    }

    // Return a fallback error component
    return {
      template: `<div class="p-4 bg-red-50 text-red-600 rounded border border-red-200">Block "${blockType}" not found</div>`,
    }
  })

  componentCache.set(blockType, asyncComponent)
  return asyncComponent
}
</script>
