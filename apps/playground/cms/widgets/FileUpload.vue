<template>
  <div class="file-upload-widget flex flex-col gap-3">
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
        icon="i-lucide-upload"
        :loading="uploading"
        @click="fileInput?.click()"
      >
        {{ modelValue ? 'Replace file' : 'Upload file' }}
      </UButton>
      <input
        ref="fileInput"
        type="file"
        class="hidden"
        @change="handleFileChange"
      >
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
}>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const config = useRuntimeConfig()
const apiPrefix = computed(() => config.public.cms.api?.prefix || '/api/cms')
const toast = useToast()

const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  uploading.value = true

  try {
    const formData = new FormData()
    formData.append('file', file)

    const result = await $fetch<{ filepath: string }>(`${apiPrefix.value}/media/upload`, {
      method: 'POST',
      body: formData,
    })

    emit('update:modelValue', result.filepath)
    toast.add({ title: 'File uploaded', color: 'success', icon: 'i-lucide-check-circle' })
  }
  catch (error) {
    console.error('Upload failed:', error)
    toast.add({ title: 'Upload failed', color: 'error', icon: 'i-lucide-x-circle' })
  }
  finally {
    uploading.value = false
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}
</script>
