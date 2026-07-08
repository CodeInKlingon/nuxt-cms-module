import { computed, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

import { useFetch, useRuntimeConfig, useToast } from '#imports'

import type { CollectionDefinition, ListColumnConfig, PaginatedResult, RelationDisplayConfig } from '../types'
import { getPrimaryKey } from '../utils/primary-key'

export interface UseCollectionListOptions {
  initialPageSize?: number
  display?: MaybeRefOrGetter<RelationDisplayConfig | undefined>
}

export interface CollectionListColumn {
  accessorKey?: string
  accessorFn?: (row: Record<string, unknown>) => unknown
  id?: string
  header: string
  enableSorting?: boolean
  meta?: {
    cellConfig?: ListColumnConfig['cell']
    class?: {
      th?: string | ((arg: unknown) => string)
      td?: string | ((arg: unknown) => string)
    }
    style?: {
      th?: Record<string, string> | ((arg: unknown) => Record<string, string>)
      td?: Record<string, string> | ((arg: unknown) => Record<string, string>)
    }
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
  const primaryKey = computed(() => collection.value ? getPrimaryKey(collection.value) : 'id')

  // State
  const search = ref('')
  const page = ref(1)
  const pageSize = ref(options.initialPageSize || 25)
  const sortField = ref<string | undefined>(undefined)
  const sortOrder = ref<'asc' | 'desc'>('asc')
  const activeFilters = ref<Record<string, unknown>>({})

  const displayConfig = computed(() =>
    toValue(options.display) ?? collection.value?.options?.display,
  )

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
    if (displayConfig.value?.searchFields?.length) {
      params.searchColumns = displayConfig.value.searchFields.join(',')
    }
    if (displayConfig.value?.source) {
      params.display = JSON.stringify(displayConfig.value)
    }
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
    const display = displayConfig.value
    if (display?.field || display?.template) {
      return [{
        id: '__cmsDisplayLabel',
        accessorFn: displayRelationLabel,
        header: 'Label',
        enableSorting: false,
      }]
    }

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
        ? Object.keys(firstItem).filter(k => k !== primaryKey.value).slice(0, 5)
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

  function displayRelationLabel(row: Record<string, unknown>): string {
    const display = displayConfig.value
    const fallbackField = display?.fallback || primaryKey.value
    const fallback = row[fallbackField] ?? row[primaryKey.value]

    if (display?.template) {
      const label = display.template.replace(/\{([^}]+)\}/g, (_, field: string) => {
        const value = row[field.trim()]
        return value === undefined || value === null ? '' : String(value)
      }).trim()
      if (label) return label
    }

    if (display?.field) {
      const value = row[display.field]
      if (value !== undefined && value !== null && value !== '') {
        const parts = [String(value)]
        for (const field of display.secondaryFields ?? []) {
          const secondaryValue = row[field]
          if (secondaryValue !== undefined && secondaryValue !== null && secondaryValue !== '') {
            parts.push(String(secondaryValue))
          }
        }
        return parts.join(' ')
      }
    }

    return fallback === undefined || fallback === null ? '' : String(fallback)
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
    primaryKey,
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
