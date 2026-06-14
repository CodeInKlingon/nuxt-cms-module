import { computed, ref } from 'vue'
import type { CollectionDefinition, ListColumnConfig, PaginatedResult } from '../types'

export interface UseCollectionListOptions {
  initialPageSize?: number
}

export interface CollectionListColumn {
  accessorKey?: string
  accessorFn?: (row: Record<string, unknown>) => unknown
  id?: string
  header: string
  enableSorting?: boolean
  meta?: {
    cellConfig?: ListColumnConfig['cell']
  }
}

export function useCollectionList(
  collectionName: MaybeRefOrGetter<string>,
  options: UseCollectionListOptions = {},
) {
  const config = useRuntimeConfig()
  const apiPrefix = computed(() => config.public.cms.api?.prefix || '/api/cms')

  const {
    data: allCollections,
  } = useFetch<CollectionDefinition[]>(
    () => `${apiPrefix.value}/collections`,
    { default: (): CollectionDefinition[] => [] },
  )

  const collection = computed(() =>
    allCollections.value.find(c => c.name === toValue(collectionName)) ?? null,
  )

  const collectionLabel = computed(() =>
    collection.value?.options?.label || toValue(collectionName),
  )

  // State
  const search = ref('')
  const page = ref(1)
  const pageSize = ref(options.initialPageSize || 25)
  const sortField = ref<string | undefined>(undefined)
  const sortOrder = ref<'asc' | 'desc'>('asc')
  const activeFilters = ref<Record<string, unknown>>({})

  watch(() => toValue(collectionName), () => {
    search.value = ''
    page.value = 1
    sortField.value = undefined
    sortOrder.value = 'asc'
    activeFilters.value = {}
  })

  const availableFilters = computed(() =>
    collection.value?.dashboard?.list?.filters ?? [],
  )

  const queryParams = computed(() => {
    const params: Record<string, unknown> = {
      page: page.value,
      perPage: pageSize.value,
    }
    if (search.value) params.search = search.value
    if (sortField.value) {
      params.sort = sortField.value
      params.order = sortOrder.value
    }
    for (const [key, value] of Object.entries(activeFilters.value)) {
      if (value !== undefined && value !== null && value !== '') {
        params[`filter_${key}`] = value
      }
    }
    return params
  })

  const {
    data: response,
    pending,
    refresh,
  } = useFetch<PaginatedResult>(
    () => `/api/cms/${toValue(collectionName)}`,
    {
      query: queryParams,
      watch: [() => toValue(collectionName), queryParams],
    },
  )

  const items = computed(() => response.value?.items || [])
  const total = computed(() => response.value?.total || 0)

  // Columns that have a custom cell renderer config
  const cellColumns = computed(() =>
    collection.value?.dashboard?.list?.columns?.filter(col => col.cell) ?? [],
  )

  const columns = computed<CollectionListColumn[]>(() => {
    const listColumns = collection.value?.dashboard?.list?.columns
    const fieldCols: CollectionListColumn[] = []

    if (listColumns?.length) {
      for (const col of listColumns) {
        const isSortable = col.sortable === true
        const label = col.label || col.field

        fieldCols.push({
          accessorKey: col.field,
          header: label,
          enableSorting: isSortable,
          meta: { cellConfig: col.cell },
        })
      }
    }
    else {
      // Fallback: derive columns from the first record's keys (max 5)
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

    return fieldCols
  })

  const onSortingChange = (sorting: { id?: string, desc?: boolean }[]) => {
    if (sorting.length === 0) {
      sortField.value = undefined
      sortOrder.value = 'asc'
      return
    }
    const sort = sorting[0]
    sortField.value = sort?.id ?? undefined
    sortOrder.value = sort?.desc ? 'desc' : 'asc'
  }

  const deleteItem = async (id: string | number) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    const toast = useToast()
    try {
      await $fetch(`/api/cms/${toValue(collectionName)}/${id}`, {
        method: 'DELETE',
      })
      toast.add({ title: 'Item deleted', color: 'success', icon: 'i-lucide-check-circle' })
      await refresh()
    }
    catch {
      toast.add({ title: 'Failed to delete item', color: 'error', icon: 'i-lucide-x-circle' })
    }
  }

  return {
    allCollections,
    collection,
    collectionLabel,
    search,
    page,
    pageSize,
    sortField,
    sortOrder,
    activeFilters,
    availableFilters,
    queryParams,
    items,
    total,
    pending,
    refresh,
    columns,
    cellColumns,
    onSortingChange,
    deleteItem,
  }
}
