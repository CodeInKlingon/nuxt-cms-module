<script setup lang="ts">
import type { CollectionDefinition, RelationConfig } from '../../types'

const props = defineProps<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modelValue: any
  relation?: RelationConfig
  required?: boolean
}>()

const emit = defineEmits<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  'update:modelValue': [value: any]
}>()

const config = useRuntimeConfig()
const apiPrefix = computed(() => config.public.cms.api?.prefix || '/api/cms')

if (!props.relation) {
  throw new Error('RelationWidget requires a relation config')
}

const relation = props.relation
const isMultiple = relation.type === 'many'

const selectedIds = computed<(string | number)[]>({
  get: () => {
    if (isMultiple) return Array.isArray(props.modelValue) ? props.modelValue : []
    return props.modelValue !== undefined && props.modelValue !== null ? [props.modelValue] : []
  },
  set: (ids) => {
    if (isMultiple) {
      emit('update:modelValue', ids)
    }
    else {
      emit('update:modelValue', ids[0] ?? null)
    }
  },
})

const pickerOpen = ref(false)

// Fetch target collection metadata to reuse its list config for cards.
const { data: allCollections } = await useFetch<CollectionDefinition[]>(
  () => `${apiPrefix.value}/collections`,
  { default: (): CollectionDefinition[] => [] },
)

const targetCollection = computed(() =>
  allCollections.value.find(c => c.name === relation.collection),
)

const listColumns = computed(() =>
  targetCollection.value?.dashboard?.list?.columns ?? [],
)

// Fetch selected target records whenever the selection changes.
const { data: selectedRecords } = await useFetch(
  () => {
    if (selectedIds.value.length === 0) return null
    const params = new URLSearchParams()
    for (const id of selectedIds.value) {
      params.append('filter_id', String(id))
    }
    return `/api/cms/${relation.collection}?${params.toString()}`
  },
  { watch: [selectedIds], default: () => ({ items: [] }) },
)

const recordsById = computed(() => {
  const items = (selectedRecords.value as { items: Record<string, unknown>[] } | null)?.items ?? []
  const map = new Map<string | number, Record<string, unknown>>()
  for (const item of items) {
    map.set(item.id as string | number, item)
  }
  return map
})

const orderedRecords = computed(() => {
  return selectedIds.value
    .map(id => recordsById.value.get(id))
    .filter((item): item is Record<string, unknown> => item !== undefined)
})

const cardColumns = computed(() => {
  // Use the first 2 list columns for the card display.
  return listColumns.value.slice(0, 2)
})

function removeId(id: string | number) {
  const idStr = String(id)
  selectedIds.value = selectedIds.value.filter(existing => String(existing) !== idStr)
}

function onPickerSelect(ids: (string | number)[]) {
  selectedIds.value = ids
}
</script>

<template>
  <div class="space-y-3">
    <!-- Selected cards -->
    <div
      v-if="orderedRecords.length > 0"
      class="space-y-2"
    >
      <div
        v-for="record in orderedRecords"
        :key="String(record.id)"
        class="flex items-center justify-between gap-3 p-3 rounded-lg border border-default bg-elevated/50"
      >
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <CmsCellRenderer
              v-for="col in cardColumns"
              :key="col.field"
              :config="typeof col.cell === 'string' ? { type: col.cell } : col.cell"
              :value="record[col.field]"
              :row="record"
            />
            <span
              v-if="cardColumns.length === 0"
              class="text-sm text-highlighted"
            >
              {{ record.id }}
            </span>
          </div>
        </div>
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="xs"
          @click="removeId(String(record.id))"
        />
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else
      class="flex items-center justify-between gap-3 p-3 rounded-lg border border-dashed border-default"
    >
      <span class="text-sm text-muted italic">
        No items selected
      </span>
    </div>

    <!-- Add button -->
    <UButton
      icon="i-lucide-plus"
      size="sm"
      color="neutral"
      variant="outline"
      @click="pickerOpen = true"
    >
      Select {{ targetCollection?.options?.label || relation.collection }}
    </UButton>

    <CmsRelationPickerModal
      v-model:open="pickerOpen"
      v-model="selectedIds"
      :collection-name="relation.collection"
      :selection-mode="isMultiple ? 'multiple' : 'single'"
      @update:model-value="onPickerSelect"
    />
  </div>
</template>
