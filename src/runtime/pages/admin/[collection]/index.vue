<script setup lang="ts">
const route = useRoute()
const config = useRuntimeConfig()
const collectionName = computed(() => route.params.collection as string)
const adminRoute = computed(() => config.public.cms.admin?.route || '/admin')
const toast = useToast()

// Get collection definition
const collection = computed(() => {
  return config.public.cms.collections.find((c: any) => c.name === collectionName.value)
})

const collectionLabel = computed(() => collection.value?.options?.label || collectionName.value)

// State
const search = ref('')
const page = ref(1)
const pageSize = ref(25)

// Fetch data
const { data: response, pending, refresh } = await useFetch(`/api/cms/${collectionName.value}`, {
  query: {
    page,
    perPage: pageSize,
    search,
  },
  watch: [page, search],
})

const items = computed(() => response.value?.items || [])
const total = computed(() => response.value?.total || 0)

// Table columns based on collection fields
const columns = computed(() => {
  if (!collection.value) return []

  return collection.value.fields
    .filter((field: any) => ['text', 'number', 'date', 'boolean'].includes(field.type))
    .slice(0, 5)
    .map((field: any) => ({
      id: field.name,
      key: field.name,
      label: field.label || field.name,
    }))
    .concat([
      {
        id: 'actions',
        key: 'actions',
        label: '',
      },
    ])
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
        :rows="items"
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
        <template #actions-data="{ row }">
          <div class="flex justify-end gap-1">
            <UTooltip text="Edit">
              <UButton
                icon="i-lucide-pencil"
                size="xs"
                color="neutral"
                variant="ghost"
                :to="`${adminRoute}/${collectionName}/${row.id}`"
              />
            </UTooltip>
            <UTooltip text="Delete">
              <UButton
                icon="i-lucide-trash"
                size="xs"
                color="error"
                variant="ghost"
                @click="deleteItem(row.id)"
              />
            </UTooltip>
          </div>
        </template>

        <template #empty-state>
          <div class="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <UIcon name="i-lucide-inbox" class="size-10 text-muted" />
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
