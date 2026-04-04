<script setup lang="ts">
import type { CollectionDefinition, PaginatedResult } from '../../../types'

const route = useRoute()
const config = useRuntimeConfig()
const collectionName = computed(() => route.params.collection as string)
const adminRoute = computed(() => config.public.cms.admin?.route || '/admin')
const apiPrefix = computed(() => config.public.cms.api?.prefix || '/api/cms')
const toast = useToast()

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

// State — reset when switching collections so stale pagination/search don't carry over
const search = ref('')
const page = ref(1)
const pageSize = ref(25)

watch(collectionName, () => {
  search.value = ''
  page.value = 1
})

// Fetch data
const { data: response, pending, refresh } = await useFetch<PaginatedResult>(
  () => `/api/cms/${collectionName.value}`,
  {
    query: { page, perPage: pageSize, search },
    watch: [collectionName, page, search],
  },
)

const items = computed(() => response.value?.items || [])
const total = computed(() => response.value?.total || 0)

// Table columns — driven by dashboard.list.columns when defined,
// otherwise fall back to the first 5 columns of the first record.
const columns = computed(() => {
  type Col = { accessorKey?: string, id?: string, header: string }

  const listColumns = collection.value?.dashboard?.list?.columns
  let fieldCols: Col[]

  if (listColumns?.length) {
    fieldCols = listColumns.map(col => ({
      accessorKey: col.field,
      header: col.label || col.field,
    }))
  }
  else {
    // Fallback: derive columns from the first record's keys (max 5)
    const firstItem = items.value[0]
    const keys = firstItem
      ? Object.keys(firstItem).filter(k => k !== 'id').slice(0, 5)
      : []
    fieldCols = keys.map(key => ({ accessorKey: key, header: key }))
  }

  return [...fieldCols, { id: 'actions', header: '' }] as Col[]
})

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
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Search..."
            class="max-w-sm"
          />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UTable
        :data="items"
        :columns="columns"
        :loading="pending"
        :ui="{
          base: 'table-fixed border-separate border-spacing-0 w-full',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
          td: 'border-b border-default',
        }"
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
