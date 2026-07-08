<script setup lang="ts">
import { computed } from 'vue'

import type { ListColumnConfig } from '../types'
import type { CollectionListColumn } from '../composables/useCollectionList'

const props = withDefaults(defineProps<{
  columns: CollectionListColumn[]
  items: Record<string, unknown>[]
  total: number
  page: number
  pageSize: number
  loading?: boolean
  sortField?: string
  sortOrder?: 'asc' | 'desc'
  cellColumns?: ListColumnConfig[]
  selectable?: boolean
  selectionMode?: 'single' | 'multiple'
  selectedIds?: (string | number)[]
  primaryKey?: string
}>(), {
  cellColumns: () => [],
  selectionMode: 'multiple',
  selectedIds: () => [],
  primaryKey: 'id',
})

const emit = defineEmits<{
  'update:selectedIds': [ids: (string | number)[]]
  'update:sort': [sorting: { id?: string, desc?: boolean }[]]
  'update:page': [page: number]
  'refresh': []
}>()

const selected = computed({
  get: () => props.selectedIds,
  set: (ids) => {
    emit('update:selectedIds', ids)
  },
})

const tableColumns = computed(() => {
  const cols = [...props.columns]

  if (props.selectable) {
    cols.unshift({
      id: 'selection',
      header: '',
      enableSorting: false,
      accessorFn: (row: Record<string, unknown>) => row[props.primaryKey],
      meta: {
        style: {
          th: { width: '48px' },
          td: { width: '48px' },
        },
      },
    })
  }
  else {
    cols.push({
      id: 'actions',
      header: '',
      enableSorting: false,
    })
  }

  return cols
})

const sorting = computed(() => {
  if (!props.sortField) return []
  return [{ id: props.sortField, desc: props.sortOrder === 'desc' }]
})

function toggleSelection(id: string | number) {
  if (props.selectionMode === 'single') {
    selected.value = [id]
    return
  }

  const current = new Set(selected.value)
  if (current.has(id)) {
    current.delete(id)
  }
  else {
    current.add(id)
  }
  selected.value = Array.from(current)
}

function isSelected(id: string | number): boolean {
  return selected.value.includes(id)
}

function rowId(row: Record<string, unknown>): string | number {
  return row[props.primaryKey] as string | number
}

function onSortingChange(sorting: { id?: string, desc?: boolean }[]) {
  emit('update:sort', sorting)
}
</script>

<template>
  <div>
    <UTable
      :data="items"
      :columns="(tableColumns as any)"
      :loading="loading"
      :sorting="sorting"
      :ui="{
        base: 'table-fixed border-separate border-spacing-0 w-full',
        thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
        tbody: '[&>tr]:last:[&>td]:border-b-0',
        th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
        td: 'border-b border-default',
      }"
      @sorting-change="onSortingChange"
    >
      <template #empty>
        <div class="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <UIcon
            name="i-lucide-inbox"
            class="size-10 text-muted"
          />
          <div>
            <p class="font-medium text-highlighted">
              No results
            </p>
            <p class="text-sm text-muted mt-0.5">
              Try adjusting your search or filters.
            </p>
          </div>
        </div>
      </template>

      <template
        v-if="selectable"
        #selection-cell="{ row }: any"
      >
        <input
          :type="selectionMode === 'single' ? 'radio' : 'checkbox'"
          :checked="isSelected(rowId(row.original))"
          class="size-4 accent-primary"
          @change="toggleSelection(rowId(row.original))"
        >
      </template>

      <template
        v-for="col in cellColumns"
        :key="col.field"
        #[`${col.field}-cell`]="{ row }"
      >
        <CmsCellRenderer
          :config="typeof col.cell === 'string' ? { type: col.cell } : col.cell"
          :value="(row.original as Record<string, unknown>)[col.field]"
          :row="(row.original as Record<string, unknown>)"
        />
      </template>

      <template #actions-cell="{ row }">
        <slot
          name="actions"
          :row="row.original"
        />
      </template>
    </UTable>

    <div class="flex items-center justify-between gap-3 border-t border-default px-4 py-3 mt-auto">
      <p class="text-sm text-muted">
        {{ total }} result{{ total === 1 ? '' : 's' }}
      </p>
      <UPagination
        v-if="total > pageSize"
        :model-value="page"
        :total="total"
        :items-per-page="pageSize"
        size="sm"
        @update:page="emit('update:page', $event)"
      />
    </div>
  </div>
</template>
