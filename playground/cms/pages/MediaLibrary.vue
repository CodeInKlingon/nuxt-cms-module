<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMutation } from '@tanstack/vue-query'
import type { FileSystemItem, PaginatedFileSystemItems } from '../../types/files'

interface Props {
  pickerMode?: boolean
  accept?: string
  maxSize?: number
}

const props = withDefaults(defineProps<Props>(), {
  pickerMode: false,
})

const emit = defineEmits<{
  select: [item: FileSystemItem]
}>()

const config = useRuntimeConfig()
const toast = useToast()
const apiPrefix = computed(() => config.public.cms.api?.prefix || '/api/cms')

const currentPath = ref('')
const currentPage = ref(1)
const pageSize = 20

watch(currentPath, () => {
  currentPage.value = 1
})

const breadcrumbs = computed(() => {
  const parts = currentPath.value.split('/').filter(Boolean)
  return [
    { label: 'Uploads', path: '' },
    ...parts.map((part, index) => ({
      label: part,
      path: parts.slice(0, index + 1).join('/'),
    })),
  ]
})

const { data, status, refresh } = useFetch<PaginatedFileSystemItems>(
  () => `${apiPrefix.value}/files?path=${encodeURIComponent(currentPath.value)}&page=${currentPage.value}&limit=${pageSize}`,
  { default: () => ({ items: [], total: 0 }) },
)

const items = computed(() => data.value?.items ?? [])
const totalItems = computed(() => data.value?.total ?? 0)
const totalPages = computed(() => Math.ceil(totalItems.value / pageSize))
const isLoading = computed(() => status.value === 'pending')

function openDirectory(path: string) {
  currentPath.value = path
}

function navigateUp() {
  const parts = currentPath.value.split('/').filter(Boolean)
  parts.pop()
  currentPath.value = parts.join('/')
}

function isImage(name: string): boolean {
  return /\.(?:jpg|jpeg|png|gif|webp|svg|avif)$/i.test(name)
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}

const extensionToMimeType: Record<string, string> = {
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'gif': 'image/gif',
  'webp': 'image/webp',
  'svg': 'image/svg+xml',
  'avif': 'image/avif',
  'mp4': 'video/mp4',
  'webm': 'video/webm',
  'mov': 'video/quicktime',
  'mp3': 'audio/mpeg',
  'wav': 'audio/wav',
  'ogg': 'audio/ogg',
  'pdf': 'application/pdf',
  'doc': 'application/msword',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'xls': 'application/vnd.ms-excel',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'ppt': 'application/vnd.ms-powerpoint',
  'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'zip': 'application/zip',
  'rar': 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',
  'txt': 'text/plain',
  'csv': 'text/csv',
  'json': 'application/json',
  'js': 'text/javascript',
  'ts': 'application/typescript',
  'css': 'text/css',
  'html': 'text/html',
}

function getMimeTypeFromName(name: string): string | undefined {
  const extension = name.split('.').pop()?.toLowerCase()
  if (!extension) return undefined
  return extensionToMimeType[extension]
}

function matchesMimeType(name: string, accept: string): boolean {
  const mimeType = getMimeTypeFromName(name)
  if (!mimeType) return false

  const patterns = accept.split('|').map(pattern => pattern.trim()).filter(Boolean)
  if (patterns.length === 0) return true

  return patterns.some((pattern) => {
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\//g, '\\/')
    const regex = new RegExp(`^${regexPattern}$`, 'i')
    return regex.test(mimeType)
  })
}

function isItemSelectable(item: FileSystemItem): boolean {
  if (item.type === 'directory') return true

  if (props.accept && !matchesMimeType(item.name, props.accept)) {
    return false
  }

  if (props.maxSize && item.size > props.maxSize) {
    return false
  }

  return true
}

function handleItemClick(item: FileSystemItem) {
  if (item.type === 'directory') {
    openDirectory(item.path)
    return
  }

  if (props.pickerMode && isItemSelectable(item)) {
    emit('select', item)
  }
}

const uploadDialog = ref(false)
const newFolderDialog = ref(false)
const newFolderName = ref('')
const selectedFile = ref<File | null>(null)

const isCreatingFolder = ref(false)

const { mutate: uploadFile, isPending: isUploading } = useMutation({
  mutationFn: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    return await $fetch<unknown>(`${apiPrefix.value}/media/upload`, {
      method: 'POST',
      body: formData,
    })
  },
  onSuccess: async () => {
    await refresh()
    uploadDialog.value = false
    selectedFile.value = null
  },
  onError: (error) => {
    console.error('Upload failed:', error)
    toast.add({
      title: 'Upload failed',
      description: error instanceof Error ? error.message : 'Unable to upload file',
      color: 'error',
      icon: 'i-lucide-x-circle',
    })
  },
})

function handleUpload() {
  if (!selectedFile.value) return
  uploadFile(selectedFile.value)
}

const { mutate: deleteItem } = useMutation({
  mutationFn: async (item: FileSystemItem) => {
    return await $fetch<unknown>(`${apiPrefix.value}/files?path=${encodeURIComponent(item.path)}`, {
      method: 'DELETE',
    })
  },
  onSuccess: async () => {
    await refresh()
  },
  onError: (error) => {
    console.error('Failed to delete:', error)
    toast.add({
      title: 'Delete failed',
      description: error instanceof Error ? error.message : 'Unable to delete item',
      color: 'error',
      icon: 'i-lucide-x-circle',
    })
  },
})

function getItemMenuItems(item: FileSystemItem) {
  return [
    [{
      label: 'Delete',
      icon: 'i-lucide-trash-2',
      color: 'error' as const,
      onSelect: () => deleteItem(item),
    }],
  ]
}

async function createFolder() {
  if (!newFolderName.value) return

  isCreatingFolder.value = true
  try {
    const folderPath = currentPath.value ? `${currentPath.value}/${newFolderName.value}` : newFolderName.value

    await $fetch(`${apiPrefix.value}/files?path=${encodeURIComponent(folderPath)}`, {
      method: 'POST',
    })

    await refresh()
    newFolderDialog.value = false
    newFolderName.value = ''
  }
  catch (error) {
    console.error('Failed to create folder:', error)
    toast.add({
      title: 'Failed to create folder',
      description: error instanceof Error ? error.message : 'Unable to create folder',
      color: 'error',
      icon: 'i-lucide-x-circle',
    })
  }
  finally {
    isCreatingFolder.value = false
  }
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    selectedFile.value = target.files[0]
  }
}
</script>

<template>
  <div class="p-4 lg:p-6 space-y-6">
    <div>
      <h2 class="text-xl font-semibold text-highlighted">
        {{ pickerMode ? 'Select a file' : 'Media Library' }}
      </h2>
      <p class="mt-1 text-sm text-muted">
        {{ pickerMode ? 'Choose a file from the library' : 'Browse files in the uploads directory' }}
      </p>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex flex-wrap items-center gap-2">
        <UButton
          icon="i-lucide-arrow-up"
          variant="ghost"
          :disabled="!currentPath"
          @click="navigateUp"
        />

        <UBreadcrumb
          :items="breadcrumbs.map(crumb => ({
            label: crumb.label,
            onSelect: () => openDirectory(crumb.path),
          }))"
        />
      </div>

      <div class="flex gap-2">
        <UButton
          icon="i-lucide-folder-plus"
          color="primary"
          @click="newFolderDialog = true"
        >
          New Folder
        </UButton>

        <UButton
          icon="i-lucide-upload"
          color="primary"
          @click="uploadDialog = true"
        >
          Upload
        </UButton>
      </div>
    </div>

    <div
      v-if="isLoading"
      class="py-16 text-center"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="size-8 animate-spin text-muted"
      />
    </div>

    <div
      v-else-if="!items?.length"
      class="flex flex-col items-center justify-center py-16 text-center"
    >
      <UIcon
        name="i-lucide-folder-open"
        class="size-12 text-muted mb-4"
      />
      <p class="text-base font-medium text-highlighted">
        This folder is empty
      </p>
      <p class="mt-1 text-sm text-muted">
        Upload files to the server to see them here.
      </p>
    </div>

    <!--
      TODO: Tailwind grid utilities are not generated for components in
      playground/cms/pages. Using inline CSS as a hotfix. Revert to
      Tailwind grid-cols-* classes once Tailwind content scanning covers
      custom component directories.
    -->
    <div
      v-else
      class="grid gap-3"
      style="grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));"
    >
      <UCard
        v-for="item in items"
        :key="item.path"
        :ui="{ body: 'p-0' }"
        class="transition-all"
        :class="{
          'cursor-pointer hover:ring-primary/50': !pickerMode || isItemSelectable(item),
          'cursor-not-allowed opacity-50': pickerMode && item.type === 'file' && !isItemSelectable(item),
          'ring-primary/50': pickerMode && item.type === 'file' && isItemSelectable(item),
        }"
        @click="handleItemClick(item)"
      >
        <div
          class="bg-muted flex items-center justify-center overflow-hidden rounded-t-lg"
          style="aspect-ratio: 4 / 3;"
        >
          <img
            v-if="item.type === 'file' && isImage(item.name) && item.url"
            :src="item.url"
            :alt="item.name"
            class="h-full w-full object-cover"
          >
          <UIcon
            v-else-if="item.type === 'directory'"
            name="i-lucide-folder"
            class="size-8 text-primary"
          />
          <UIcon
            v-else
            name="i-lucide-file"
            class="size-6 text-muted"
          />
        </div>

        <div class="p-2 relative">
          <p class="text-xs font-medium text-highlighted truncate">
            {{ item.name }}
          </p>
          <p
            v-if="item.type === 'file'"
            class="text-[10px] text-muted"
          >
            {{ formatBytes(item.size) }}
          </p>
          <UDropdownMenu :items="getItemMenuItems(item)">
            <UButton
              icon="i-lucide-more-vertical"
              size="xs"
              color="neutral"
              variant="ghost"
              class="absolute top-1 right-1"
              @click.stop
            />
          </UDropdownMenu>
        </div>
      </UCard>
    </div>

    <div
      v-if="totalPages > 1"
      class="flex justify-center pt-2"
    >
      <UPagination
        v-model:page="currentPage"
        :total="totalItems"
        :items-per-page="pageSize"
        :sibling-count="1"
        show-edges
      />
    </div>

    <UModal
      :open="uploadDialog"
      title="Upload File"
      @update:open="uploadDialog = $event"
    >
      <template #body>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-highlighted mb-2">
              Select File
            </label>
            <input
              type="file"
              class="w-full"
              @change="handleFileSelect"
            >
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex gap-2">
          <UButton
            variant="ghost"
            @click="uploadDialog = false"
          >
            Cancel
          </UButton>
          <UButton
            color="primary"
            :loading="isUploading"
            :disabled="!selectedFile"
            @click="handleUpload"
          >
            Upload
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal
      :open="newFolderDialog"
      title="New Folder"
      @update:open="newFolderDialog = $event"
    >
      <template #body>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-highlighted mb-2">
              Folder Name
            </label>
            <UInput
              v-model="newFolderName"
              type="text"
              placeholder="Enter folder name"
              class="w-full"
            />
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex gap-2">
          <UButton
            variant="ghost"
            @click="newFolderDialog = false"
          >
            Cancel
          </UButton>
          <UButton
            color="primary"
            :loading="isCreatingFolder"
            :disabled="!newFolderName"
            @click="createFolder"
          >
            Create
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
