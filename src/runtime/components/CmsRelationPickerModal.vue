<script setup lang="ts">
const props = defineProps<{
  collectionName: string
  selectionMode?: 'single' | 'multiple'
}>()

const open = defineModel<boolean>('open', { default: false })
const selectedIds = defineModel<(string | number)[]>('modelValue', { default: () => [] })

const {
  collection,
  collectionLabel,
  search,
  page,
  pageSize,
  activeFilters,
  items,
  total,
  pending,
  columns,
  cellColumns,
  onSortingChange,
} = useCollectionList(toRef(props, 'collectionName'), { initialPageSize: 10 })

function confirm() {
  open.value = false
}

function cancel() {
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="`Select ${collectionLabel}`"
    :ui="{ content: 'sm:max-w-4xl' }"
  >
    <template #body>
      <CmsListToolbar
        v-if="collection?.options?.searchable || collection?.dashboard?.list?.filters"
        v-model:search="search"
        v-model:filters="activeFilters"
        :collection="collection"
      />

      <CmsListTable
        :columns="columns"
        :items="items"
        :total="total"
        :page="page"
        :page-size="pageSize"
        :loading="pending"
        :cell-columns="cellColumns"
        selectable
        :selection-mode="selectionMode || 'multiple'"
        :selected-ids="selectedIds"
        @update:selected-ids="selectedIds = $event"
        @update:sort="onSortingChange"
        @update:page="page = $event"
      />
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          @click="cancel"
        >
          Cancel
        </UButton>
        <UButton
          color="primary"
          @click="confirm"
        >
          Confirm
        </UButton>
      </div>
    </template>
  </UModal>
</template>
