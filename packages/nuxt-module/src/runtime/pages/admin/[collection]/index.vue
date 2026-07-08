<script setup lang="ts">
import { computed } from 'vue'

import { definePageMeta, useHead, useRoute, useRuntimeConfig } from '#imports'

import { useCollectionList } from '../../../composables/useCollectionList'

const route = useRoute()
const config = useRuntimeConfig()
const collectionName = computed(() => route.params.collection as string)
const adminRoute = computed(() => config.public.cms.admin?.route || '/admin')

const {
  collection,
  collectionLabel,
  search,
  page,
  pageSize,
  sortField,
  sortOrder,
  activeFilters,
  items,
  total,
  pending,
  refresh,
  columns,
  cellColumns,
  primaryKey,
  onSortingChange,
  deleteItem,
} = useCollectionList(collectionName)

const rowId = (row: Record<string, unknown>) => row[primaryKey.value]

const pageTitle = computed(() => {
  const baseTitle = config.public.cms.admin?.title || 'CMS Admin'
  return `${baseTitle} | ${collectionLabel.value}`
})

useHead(() => ({
  title: pageTitle.value,
}))

definePageMeta({
  layout: 'cms-admin',
})
</script>

<template>
  <UDashboardPanel :id="`cms-${collectionName}`">
    <template #header>
      <UDashboardNavbar :title="collectionLabel">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            icon="i-lucide-plus"
            :to="`${adminRoute}/${collectionName}/create`"
            size="sm"
          >
            New {{ collectionLabel }}
          </UButton>
        </template>
      </UDashboardNavbar>

      <CmsListToolbar
        v-model:search="search"
        v-model:filters="activeFilters"
        :collection="collection"
      />
    </template>

    <template #body>
      <CmsListTable
        :columns="columns"
        :items="items"
        :total="total"
        :page="page"
        :page-size="pageSize"
        :loading="pending"
        :sort-field="sortField"
        :sort-order="sortOrder"
        :cell-columns="cellColumns"
        :primary-key="primaryKey"
        @update:sort="onSortingChange"
        @update:page="page = $event"
        @refresh="refresh"
      >
        <template #actions="{ row }">
          <div class="flex justify-end gap-1">
            <UTooltip text="Edit">
              <UButton
                icon="i-lucide-pencil"
                size="xs"
                color="neutral"
                variant="ghost"
                :to="`${adminRoute}/${collectionName}/${rowId(row as Record<string, unknown>)}`"
              />
            </UTooltip>
            <UTooltip text="Delete">
              <UButton
                icon="i-lucide-trash"
                size="xs"
                color="error"
                variant="ghost"
                @click="deleteItem(String(rowId(row as Record<string, unknown>)))"
              />
            </UTooltip>
          </div>
        </template>
      </CmsListTable>
    </template>
  </UDashboardPanel>
</template>
