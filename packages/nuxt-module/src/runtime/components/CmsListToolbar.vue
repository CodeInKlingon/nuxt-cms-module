<script setup lang="ts">
import { computed } from 'vue'

import type { CollectionDefinition } from '../types'

const props = defineProps<{
  collection: CollectionDefinition | null
}>()

const search = defineModel<string>('search', { default: '' })
const activeFilters = defineModel<Record<string, unknown>>('filters', { default: () => ({}) })

const searchPlaceholder = computed(() => {
  const searchCols = props.collection?.options?.searchColumns
  if (searchCols && searchCols.length > 0) {
    return `Search ${searchCols.join(', ')}...`
  }
  return 'Search...'
})

const availableFilters = computed(() =>
  props.collection?.dashboard?.list?.filters ?? [],
)

const isSearchable = computed(() =>
  props.collection?.options?.searchable === true,
)
</script>

<template>
  <UDashboardToolbar>
    <template #left>
      <div class="flex items-center gap-3">
        <UInput
          v-if="isSearchable"
          v-model="search"
          icon="i-lucide-search"
          :placeholder="searchPlaceholder"
          class="max-w-sm"
        />
        <!-- Filter dropdowns -->
        <USelectMenu
          v-for="filterConfig in availableFilters"
          :key="filterConfig.field"
          v-model="activeFilters[filterConfig.field]"
          :placeholder="filterConfig.label || filterConfig.field"
          :items="filterConfig.options"
          :multiple="filterConfig.multiple"
          value-key="value"
          label-key="label"
          clear
          class="w-44"
        />
      </div>
    </template>
  </UDashboardToolbar>
</template>
