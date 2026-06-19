<template>
  <div class="file-picker-widget flex flex-col gap-3">
    <div
      v-if="modelValue"
      class="text-sm text-muted truncate"
    >
      {{ modelValue }}
    </div>
    <div class="flex items-center gap-3">
      <UButton
        size="sm"
        color="neutral"
        variant="soft"
        icon="i-lucide-image"
        @click="isOpen = true"
      >
        {{ modelValue ? 'Replace file' : 'Select file' }}
      </UButton>
    </div>

    <UModal
      :open="isOpen"
      :ui="{ content: 'sm:max-w-4xl' }"
      title="Media Library"
      @update:open="isOpen = $event"
    >
      <template #body>
        <MediaLibrary
          picker-mode
          :accept="accept"
          :max-size="maxSize"
          @select="handleSelect"
        />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import MediaLibrary from '../pages/MediaLibrary.vue'

interface Props {
  modelValue: string
  accept?: string
  maxSize?: number
}

defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const isOpen = ref(false)

function handleSelect(item: { url?: string, path: string }) {
  const filepath = item.url || `/uploads/${item.path}`
  emit('update:modelValue', filepath)
  isOpen.value = false
}
</script>
