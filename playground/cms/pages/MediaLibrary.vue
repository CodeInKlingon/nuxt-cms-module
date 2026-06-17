<script setup lang="ts">
import type { PaginatedResult } from '../../../src/runtime/types'

const config = useRuntimeConfig()
const apiPrefix = computed(() => config.public.cms.api?.prefix || '/api/cms')

const { data: medias } = await useFetch<PaginatedResult>(
  () => `${apiPrefix.value}/medias`,
  { default: () => ({ items: [], total: 0, page: 1, perPage: 25, totalPages: 0 }) },
)

const items = computed(() => medias.value?.items || [])
</script>

<template>
  <div class="p-4 lg:p-6 space-y-6">
    <div>
      <h2 class="text-xl font-semibold text-highlighted">
        Media Library
      </h2>
      <p class="mt-1 text-sm text-muted">
        Manage uploaded images and files
      </p>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
      <UCard
        v-for="media in items"
        :key="media.id"
        :ui="{ body: 'p-0' }"
      >
        <div class="aspect-square bg-muted flex items-center justify-center overflow-hidden rounded-t-lg">
          <img
            v-if="media.filepath"
            :src="media.filepath as string"
            :alt="(media.altText as string) || (media.filename as string)"
            class="h-full w-full object-cover"
          >
          <UIcon
            v-else
            name="i-lucide-file"
            class="size-10 text-muted"
          />
        </div>

        <div class="p-3">
          <p class="text-sm font-medium text-highlighted truncate">
            {{ media.filename }}
          </p>
          <p
            v-if="media.altText"
            class="text-xs text-muted truncate"
          >
            {{ media.altText }}
          </p>
        </div>
      </UCard>
    </div>

    <div
      v-if="!items.length"
      class="flex flex-col items-center justify-center py-16 text-center"
    >
      <UIcon
        name="i-lucide-image-off"
        class="size-12 text-muted mb-4"
      />
      <p class="text-base font-medium text-highlighted">
        No media yet
      </p>
      <p class="mt-1 text-sm text-muted">
        Upload files from the form view to see them here.
      </p>
    </div>
  </div>
</template>
