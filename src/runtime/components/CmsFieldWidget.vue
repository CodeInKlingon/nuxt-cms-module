<script setup lang="ts">
import type { FormFieldConfig } from '../types'

const props = defineProps<{
  field: FormFieldConfig
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modelValue: any
  error?: string
}>()

const emit = defineEmits<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  'update:modelValue': [value: any]
}>()

const value = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v),
})

// Infer a display label — prefer explicit label, fall back to humanising the field name
const label = computed(() => {
  if (props.field.label) return props.field.label
  return props.field.field
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\s/, '')
    .replace(/^./, (s: string) => s.toUpperCase())
})

// All widgets now go through the new widget system (including auto-discovered custom widgets)
const useNewWidgetSystem = computed(() => {
  // Skip special handling widgets that have their own rendering logic
  const specialWidgets = ['richtext', 'date', 'datetime', 'multiselect', 'image', 'file', 'json', 'array']
  const widget = props.field.widget || 'text'
  return !specialWidgets.includes(widget)
})

// Merge relation config into widget options so relation widgets receive it.
const widgetOptions = computed(() => {
  if (props.field.widget === 'relation' && props.field.relation) {
    return { ...(props.field.props || {}), relation: props.field.relation }
  }
  return props.field.props
})
</script>

<template>
  <!-- Use new widget system for supported widgets -->
  <UFormField
    v-if="useNewWidgetSystem"
    :label="label"
    :required="field.required"
    :error="error"
    :help="field.description"
  >
    <CmsWidgetRenderer
      :widget="field.widget || 'text'"
      :model-value="value"
      :options="widgetOptions"
      @update:model-value="value = $event"
    />
  </UFormField>

  <!-- richtext — textarea fallback until a rich editor is wired up -->
  <UFormField
    v-else-if="field.widget === 'richtext'"
    :label="label"
    :required="field.required"
    :error="error"
    :help="field.description"
  >
    <UTextarea
      v-model="value"
      :placeholder="label"
      :rows="(field.props?.rows as number | undefined) ?? 8"
    />
  </UFormField>

  <!-- date -->
  <UFormField
    v-else-if="field.widget === 'date'"
    :label="label"
    :required="field.required"
    :error="error"
    :help="field.description"
  >
    <UInput
      v-model="value"
      type="date"
    />
  </UFormField>

  <!-- datetime -->
  <UFormField
    v-else-if="field.widget === 'datetime'"
    :label="label"
    :required="field.required"
    :error="error"
    :help="field.description"
  >
    <UInput
      v-model="value"
      type="datetime-local"
    />
  </UFormField>

  <!-- multiselect -->
  <UFormField
    v-else-if="field.widget === 'multiselect'"
    :label="label"
    :required="field.required"
    :error="error"
    :help="field.description"
  >
    <USelectMenu
      v-model="value"
      :items="field.props?.options ?? []"
      multiple
      :placeholder="`Select ${label}`"
    />
  </UFormField>

  <!-- image / file — placeholder until media library is implemented -->
  <UFormField
    v-else-if="field.widget === 'image' || field.widget === 'file'"
    :label="label"
    :required="field.required"
    :error="error"
    :help="field.description"
  >
    <UInput
      v-model="value"
      type="url"
      :placeholder="`Enter ${label} URL`"
    />
  </UFormField>

  <!-- json -->
  <UFormField
    v-else-if="field.widget === 'json'"
    :label="label"
    :required="field.required"
    :error="error"
    :help="field.description"
  >
    <UTextarea
      v-model="value"
      :placeholder="`JSON value for ${label}`"
      :rows="(field.props?.rows as number | undefined) ?? 5"
      class="font-mono text-sm"
    />
  </UFormField>

  <!-- array -->
  <UFormField
    v-else-if="field.widget === 'array'"
    :label="label"
    :required="field.required"
    :error="error"
    :help="field.description"
  >
    <UTextarea
      v-model="value"
      :placeholder="`Comma-separated values for ${label}`"
      :rows="3"
    />
  </UFormField>

  <!-- blocks -->
  <UFormField
    v-else-if="field.widget === 'blocks'"
    :label="label"
    :required="field.required"
    :error="error"
    :help="field.description"
  >
    <CmsBlockEditor
      v-model="value"
      :allowed-blocks="field.props?.allowedBlocks"
    />
  </UFormField>

  <!-- custom — rendered as a raw text input fallback -->
  <UFormField
    v-else
    :label="label"
    :required="field.required"
    :error="error"
    :help="field.description"
  >
    <UInput
      v-model="value"
      :placeholder="label"
    />
  </UFormField>
</template>
