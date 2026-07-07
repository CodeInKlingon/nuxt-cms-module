<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { useAsyncData, useFetch, useRoute, useRuntimeConfig } from '#imports'

import type { CollectionDefinition, RelationConfig } from '../../types'

const props = defineProps<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modelValue: any
  relation?: RelationConfig
  relationField?: string
  required?: boolean
}>()

const emit = defineEmits<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  'update:modelValue': [value: any]
}>()

const config = useRuntimeConfig()
const apiPrefix = computed(() => config.public.cms.api?.prefix || '/api/cms')
const route = useRoute()

if (!props.relation) {
  throw new Error('RelationWidget requires a relation config')
}

const relation = props.relation
const isMultiple = relation.type === 'many'

// ---------------------------------------------------------------------------
// Saved-relation loading for edit mode
// ---------------------------------------------------------------------------

const sourceCollection = computed(() => route.params.collection as string | undefined)
const recordId = computed(() => route.params.id as string | undefined)
const isEditMode = computed(() => Boolean(sourceCollection.value && recordId.value))

const loadedIds = ref<(string | number)[]>([])
const savedLoaded = ref(false)

const selectedIds = computed<(string | number)[]>({
  get: () => {
    const propValue = props.modelValue
    const propIds = isMultiple
      ? (Array.isArray(propValue) ? propValue : [])
      : (propValue !== undefined && propValue !== null ? [propValue] : [])
    if (propIds.length > 0) return propIds
    if (savedLoaded.value) return loadedIds.value
    return []
  },
  set: (ids) => {
    loadedIds.value = ids
    emit('update:modelValue', isMultiple ? ids : ids[0] ?? null)
  },
})

const shouldLoadSaved = computed(() => {
  if (!isEditMode.value || !props.relationField) return false
  if (savedLoaded.value) return false
  return selectedIds.value.length === 0
})

// Reset saved-relation state when the underlying record changes so navigating
// between records reloads the correct relations.
watch([sourceCollection, recordId], () => {
  savedLoaded.value = false
  loadedIds.value = []
})

const savedRelationsKey = computed(() =>
  `saved-relations-${sourceCollection.value}-${recordId.value}-${props.relationField}`,
)

const { data: savedRelations, pending: loadingSaved } = await useAsyncData<Record<string, unknown>[]>(
  () => savedRelationsKey.value,
  async () => {
    if (!shouldLoadSaved.value) return []
    return $fetch<Record<string, unknown>[]>(
      `${apiPrefix.value}/${sourceCollection.value}/${recordId.value}/relations/${props.relationField}`,
    )
  },
  { default: () => [], watch: [sourceCollection, recordId, () => props.relationField] },
)

watch([savedRelations, loadingSaved], ([records, pending]) => {
  if (pending || savedLoaded.value) return

  // If the user has already made a selection while the fetch was in flight,
  // don't overwrite it.
  const propValue = props.modelValue
  const propIds = isMultiple
    ? (Array.isArray(propValue) ? propValue : [])
    : (propValue !== undefined && propValue !== null ? [propValue] : [])
  if (propIds.length > 0) {
    savedLoaded.value = true
    return
  }

  savedLoaded.value = true
  if (!records || records.length === 0) return

  const ids = records.map(r => r.id as string | number)
  loadedIds.value = ids
  emit('update:modelValue', isMultiple ? ids : ids[0] ?? null)
}, { immediate: true })

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
const { data: selectedRecords } = await useAsyncData<{ items: Record<string, unknown>[] }>(
  () => `relation-selected-${relation.collection}-${selectedIds.value.join(',')}`,
  async () => {
    if (selectedIds.value.length === 0) return { items: [] }
    const params = new URLSearchParams()
    for (const id of selectedIds.value) {
      params.append('filter_id', String(id))
    }
    return $fetch<{ items: Record<string, unknown>[] }>(`/api/cms/${relation.collection}?${params.toString()}`)
  },
  { default: () => ({ items: [] }), watch: [selectedIds] },
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
