<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { useAsyncData, useFetch, useRoute, useRuntimeConfig } from '#imports'

import type { CollectionDefinition, RelationConfig } from '../../types'
import { getPrimaryKey, getRecordId } from '../../utils/primary-key'

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

const pickerOpen = ref(false)

// Fetch target collection metadata to reuse its list config for cards.
const { data: allCollections } = await useFetch<CollectionDefinition[]>(
  () => `${apiPrefix.value}/collections`,
  { default: (): CollectionDefinition[] => [] },
)

const targetCollection = computed(() =>
  allCollections.value.find(c => c.name === relation.collection),
)

const targetPrimaryKey = computed(() => targetCollection.value ? getPrimaryKey(targetCollection.value) : 'id')

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

  const ids = records.map(r => getRecordId({ name: relation.collection, primaryKey: targetPrimaryKey.value }, r) as string | number)
  loadedIds.value = ids
  emit('update:modelValue', isMultiple ? ids : ids[0] ?? null)
}, { immediate: true })

const listColumns = computed(() =>
  targetCollection.value?.dashboard?.list?.columns ?? [],
)

const displayConfig = computed(() =>
  relation.display ?? targetCollection.value?.options?.display,
)

// Fetch selected target records whenever the selection changes.
const { data: selectedRecords } = await useAsyncData<{ items: Record<string, unknown>[] }>(
  () => `relation-selected-${relation.collection}-${selectedIds.value.join(',')}`,
  async () => {
    if (selectedIds.value.length === 0) return { items: [] }
    const params = new URLSearchParams()
    for (const id of selectedIds.value) {
      params.append(`filter_${targetPrimaryKey.value}`, String(id))
    }
    if (displayConfig.value?.source) {
      params.set('display', JSON.stringify(displayConfig.value))
    }
    return $fetch<{ items: Record<string, unknown>[] }>(`${apiPrefix.value}/${relation.collection}?${params.toString()}`)
  },
  { default: () => ({ items: [] }), watch: [selectedIds] },
)

const recordsById = computed(() => {
  const items = (selectedRecords.value as { items: Record<string, unknown>[] } | null)?.items ?? []
  const map = new Map<string | number, Record<string, unknown>>()
  for (const item of items) {
    map.set(getRecordId({ name: relation.collection, primaryKey: targetPrimaryKey.value }, item) as string | number, item)
  }
  return map
})

const orderedRecords = computed(() => {
  return selectedIds.value
    .map(id => recordsById.value.get(id))
    .filter((item): item is Record<string, unknown> => item !== undefined)
})

const cardColumns = computed(() => {
  const display = displayConfig.value
  if (display?.field || display?.template) return []

  // Use the first 2 list columns for the card display.
  return listColumns.value.slice(0, 2)
})

function displayRelationLabel(record: Record<string, unknown>): string {
  const display = displayConfig.value
  const fallbackField = display?.fallback || targetPrimaryKey.value
  const fallback = record[fallbackField] ?? record[targetPrimaryKey.value]

  if (display?.template) {
    const label = display.template.replace(/\{([^}]+)\}/g, (_, field: string) => {
      const value = record[field.trim()]
      return value === undefined || value === null ? '' : String(value)
    }).trim()
    if (label) return label
  }

  if (display?.field) {
    const value = record[display.field]
    if (value !== undefined && value !== null && value !== '') {
      const parts = [String(value)]
      for (const field of display.secondaryFields ?? []) {
        const secondaryValue = record[field]
        if (secondaryValue !== undefined && secondaryValue !== null && secondaryValue !== '') {
          parts.push(String(secondaryValue))
        }
      }
      return parts.join(' ')
    }
  }

  return fallback === undefined || fallback === null ? '' : String(fallback)
}

function removeId(id: string | number) {
  const idStr = String(id)
  selectedIds.value = selectedIds.value.filter(existing => String(existing) !== idStr)
}

function onPickerSelect(ids: (string | number)[]) {
  selectedIds.value = ids
}

function selectedRecordId(record: Record<string, unknown>): string | number {
  return getRecordId({ name: relation.collection, primaryKey: targetPrimaryKey.value }, record) as string | number
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
        :key="String(selectedRecordId(record))"
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
              v-if="displayConfig"
              class="text-sm text-highlighted"
            >
              {{ displayRelationLabel(record) }}
            </span>
            <span
              v-else-if="cardColumns.length === 0"
              class="text-sm text-highlighted"
            >
              {{ selectedRecordId(record) }}
            </span>
          </div>
        </div>
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="xs"
          @click="removeId(String(selectedRecordId(record)))"
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
      :display="displayConfig"
      @update:model-value="onPickerSelect"
    />
  </div>
</template>
