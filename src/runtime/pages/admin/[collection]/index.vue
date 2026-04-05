<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { CollectionDefinition, PaginatedResult } from '../../../types'

const route = useRoute()
const config = useRuntimeConfig()
const collectionName = computed(() => route.params.collection as string)
const adminRoute = computed(() => config.public.cms.admin?.route || '/admin')
const apiPrefix = computed(() => config.public.cms.api?.prefix || '/api/cms')
const toast = useToast()
const UButton = resolveComponent('UButton')

// Fetch the full collections list once. The active collection is derived
// synchronously via computed below so there is no async gap on navigation.
const { data: allCollections } = await useFetch<CollectionDefinition[]>(
  () => `${apiPrefix.value}/collections`,
  { default: (): CollectionDefinition[] => [] },
)

const collection = computed(() =>
  allCollections.value.find(c => c.name === collectionName.value) ?? null,
)

const collectionLabel = computed(() => collection.value?.options?.label || collectionName.value)

const searchPlaceholder = computed(() => {
  const searchCols = collection.value?.options?.searchColumns
  if (searchCols && searchCols.length > 0) {
    return `Search ${searchCols.join(', ')}...`
  }
  return 'Search...'
})

// State — reset when switching collections so stale pagination/search don't carry over
const search = ref('')
const page = ref(1)
const pageSize = ref(25)

// Sorting state
const sortField = ref<string | undefined>(undefined)
const sortOrder = ref<'asc' | 'desc'>('asc')

// Filter state — keyed by field name
const activeFilters = ref<Record<string, any>>({})

// Available filters from collection config
const availableFilters = computed(() => {
  return collection.value?.dashboard?.list?.filters ?? []
})

watch(collectionName, () => {
  search.value = ''
  page.value = 1
  sortField.value = undefined
  sortOrder.value = 'asc'
  activeFilters.value = {}
})

// Build query params including flattened filters
const queryParams = computed(() => {
  const params: Record<string, any> = {
    page: page.value,
    perPage: pageSize.value,
  }
  if (search.value) params.search = search.value
  if (sortField.value) {
    params.sort = sortField.value
    params.order = sortOrder.value
  }
  // Flatten filter fields into individual query params
  for (const [key, value] of Object.entries(activeFilters.value)) {
    if (value !== undefined && value !== null && value !== '') {
      params[`filter_${key}`] = value
    }
  }
  return params
})

// Fetch data
const { data: response, pending, refresh } = await useFetch<PaginatedResult>(
  () => `/api/cms/${collectionName.value}`,
  {
    query: queryParams,
    watch: [collectionName, queryParams],
  },
)

const items = computed(() => response.value?.items || [])
const total = computed(() => response.value?.total || 0)

// Table columns — driven by dashboard.list.columns when defined,
// otherwise fall back to the first 5 columns of the first record.
const columns = computed(() => {
  const listColumns = collection.value?.dashboard?.list?.columns
  const fieldCols = []

    if (listColumns?.length) {
    for (const col of listColumns) {
      // Determine if this column is sortable
      // Only sortable when explicitly set to true
      const isSortable = col.sortable === true
      const label = col.label || col.field

      fieldCols.push({
        accessorKey: col.field,
        header: isSortable
          ? ({ column }: { column: { getIsSorted: () => false | 'asc' | 'desc', toggleSorting: (desc?: boolean) => void } }) => {
              const isSorted = column.getIsSorted()
              return h(UButton, {
                color: 'neutral',
                variant: 'ghost',
                label,
                icon: isSorted
                  ? (isSorted === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow')
                  : 'i-lucide-arrow-up-down',
                class: '-mx-2.5',
                ui: { base: 'font-semibold' },
                onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
              })
            }
          : label,
        enableSorting: isSortable,
      })
    }
  }
  else {
    // Fallback: derive columns from the first record's keys (max 5)
    // When falling back, columns are not sortable by default
    const firstItem = items.value[0]
    const keys = firstItem
      ? Object.keys(firstItem).filter(k => k !== 'id').slice(0, 5)
      : []
    for (const key of keys) {
      fieldCols.push({
        accessorKey: key,
        header: key,
        enableSorting: false,
      })
    }
  }

  // Add actions column
  fieldCols.push({
    id: 'actions',
    header: '',
    enableSorting: false,
  })

  return fieldCols
})

// Handle sort changes from the table
const onSortingChange = (sorting: { id?: string, desc?: boolean }[]) => {
  if (sorting.length === 0) {
    sortField.value = undefined
    sortOrder.value = 'asc'
    return
  }

  const sort = sorting[0]
  if (!sort) {
    sortField.value = undefined
    sortOrder.value = 'asc'
    return
  }

  sortField.value = sort.id ?? undefined
  sortOrder.value = sort.desc ? 'desc' : 'asc'
}

// Delete item
const deleteItem = async (id: string) => {
  if (!confirm('Are you sure you want to delete this item?')) return

  try {
    await $fetch(`/api/cms/${collectionName.value}/${id}`, {
      method: 'DELETE',
    })
    toast.add({ title: 'Item deleted', color: 'success', icon: 'i-lucide-check-circle' })
    await refresh()
  }
  catch {
    toast.add({ title: 'Failed to delete item', color: 'error', icon: 'i-lucide-x-circle' })
  }
}

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

      <UDashboardToolbar>
        <template #left>
          <div class="flex items-center gap-3">
            <UInput
              v-if="collection?.options?.searchable"
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

    <template #body>
      <UTable
        :data="items"
        :columns="columns"
        :loading="pending"
        :sorting="sortField ? [{ id: sortField, desc: sortOrder === 'desc' }] : []"
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
                No {{ collectionLabel }} yet
              </p>
              <p class="text-sm text-muted mt-0.5">
                Create your first entry to get started.
              </p>
            </div>
            <UButton
              icon="i-lucide-plus"
              :to="`${adminRoute}/${collectionName}/create`"
              size="sm"
            >
              New {{ collectionLabel }}
            </UButton>
          </div>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex justify-end gap-1">
            <UTooltip text="Edit">
              <UButton
                icon="i-lucide-pencil"
                size="xs"
                color="neutral"
                variant="ghost"
                :to="`${adminRoute}/${collectionName}/${(row.original as Record<string, unknown>).id}`"
              />
            </UTooltip>
            <UTooltip text="Delete">
              <UButton
                icon="i-lucide-trash"
                size="xs"
                color="error"
                variant="ghost"
                @click="deleteItem(String((row.original as Record<string, unknown>).id))"
              />
            </UTooltip>
          </div>
        </template>
      </UTable>

      <div class="flex items-center justify-between gap-3 border-t border-default px-4 py-3 mt-auto">
        <p class="text-sm text-muted">
          {{ total }} result{{ total === 1 ? '' : 's' }}
        </p>
        <UPagination
          v-if="total > pageSize"
          v-model="page"
          :total="total"
          :page-count="pageSize"
          size="sm"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
