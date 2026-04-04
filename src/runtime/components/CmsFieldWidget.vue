<script setup lang="ts">
import type { FormFieldConfig } from '../../types'

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
    .replace(/^./, s => s.toUpperCase())
})
</script>

<template>
  <!-- Skip relation fields — rendered separately -->
  <template v-if="field.relation">
    <UFormField
      :label="label"
      :help="field.description"
    >
      <p class="text-sm text-muted italic">
        Relation field ({{ field.relation.type }}: {{ field.relation.collection }}) — inline editing coming soon.
      </p>
    </UFormField>
  </template>

  <!-- text / default -->
  <UFormField
    v-else-if="!field.widget || field.widget === 'text'"
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

  <!-- textarea -->
  <UFormField
    v-else-if="field.widget === 'textarea'"
    :label="label"
    :required="field.required"
    :error="error"
    :help="field.description"
  >
    <UTextarea
      v-model="value"
      :placeholder="label"
      :rows="(field.props?.rows as number | undefined) ?? 5"
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

  <!-- number -->
  <UFormField
    v-else-if="field.widget === 'number'"
    :label="label"
    :required="field.required"
    :error="error"
    :help="field.description"
  >
    <UInput
      v-model.number="value"
      type="number"
      :placeholder="label"
    />
  </UFormField>

  <!-- boolean -->
  <UFormField
    v-else-if="field.widget === 'boolean'"
    :label="label"
    :error="error"
    :help="field.description"
  >
    <UToggle v-model="value" />
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

  <!-- select -->
  <UFormField
    v-else-if="field.widget === 'select'"
    :label="label"
    :required="field.required"
    :error="error"
    :help="field.description"
  >
    <USelect
      v-model="value"
      :items="field.props?.options ?? []"
      :placeholder="`Select ${label}`"
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
