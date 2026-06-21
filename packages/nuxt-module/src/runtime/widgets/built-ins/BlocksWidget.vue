<template>
  <CmsBlockEditor
    :model-value="modelValue"
    :allowed-blocks="allowedBlocks"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import type { BlockItem } from '../../types/widgets'

interface Props {
  modelValue: BlockItem[]
  allowedBlocks?: string[]
}

defineProps<Props>()

defineEmits<{
  'update:modelValue': [value: BlockItem[]]
}>()
</script>
