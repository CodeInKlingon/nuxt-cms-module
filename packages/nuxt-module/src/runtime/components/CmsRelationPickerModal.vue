<script setup lang="ts">
import { ref, toRef, watch } from 'vue'

import { useCollectionList } from '../composables/useCollectionList'
import type { RelationDisplayConfig } from '../types'

const props = defineProps<{
  collectionName: string
  selectionMode?: 'single' | 'multiple'
  display?: RelationDisplayConfig
}>()

const open = defineModel<boolean>('open', { default: false })
const selectedIds = defineModel<(string | number)[]>('modelValue', { default: () => [] })

const localSelectedIds = ref<(string | number)[]>([])

watch(open, (isOpen) => {
  if (isOpen) {
    localSelectedIds.value = [...selectedIds.value]
  }
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const modalContent: any = { style: { maxWidth: '1280px' } }

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
  primaryKey,
  onSortingChange,
} = useCollectionList(toRef(props, 'collectionName'), {
  initialPageSize: 10,
  display: toRef(props, 'display'),
})

function confirm() {
  selectedIds.value = [...localSelectedIds.value]
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
    :content="modalContent"
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
        :primary-key="primaryKey"
        selectable
        :selection-mode="selectionMode || 'multiple'"
        :selected-ids="localSelectedIds"
        @update:selected-ids="localSelectedIds = $event"
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
