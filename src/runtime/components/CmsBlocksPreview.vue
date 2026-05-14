<template>
  <div class="cms-blocks-preview flex flex-col h-full">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b bg-gray-50">
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-eye"
          class="text-gray-500"
        />
        <h3 class="font-medium text-sm">
          Preview
        </h3>
      </div>
      <UButton
        icon="i-lucide-refresh-cw"
        size="xs"
        variant="ghost"
        :loading="refreshing"
        @click="refresh"
      >
        Refresh
      </UButton>
    </div>

    <!-- Preview Content -->
    <div class="flex-1 overflow-auto p-4 bg-white">
      <!-- Empty State -->
      <div
        v-if="!blocks || blocks.length === 0"
        class="flex flex-col items-center justify-center h-full text-gray-400"
      >
        <UIcon
          name="i-lucide-layout-template"
          class="text-4xl mb-2"
        />
        <p class="text-sm">
          No blocks to preview
        </p>
        <p class="text-xs mt-1">
          Add blocks to see them rendered here
        </p>
      </div>

      <!-- Rendered Blocks -->
      <div
        v-else
        :key="previewKey"
      >
        <RenderBlocks :blocks="blocks" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BlockItem } from '../types/widgets'

interface Props {
  blocks: BlockItem[]
}

defineProps<Props>()

const previewKey = ref(0)
const refreshing = ref(false)

function refresh() {
  refreshing.value = true
  previewKey.value++
  setTimeout(() => {
    refreshing.value = false
  }, 300)
}
</script>

<style scoped>
.cms-blocks-preview {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  min-height: 400px;
}
</style>
