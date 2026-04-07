<template>
  <USelect
    :model-value="modelValue"
    :options="normalizedOptions"
    :multiple="multiple"
    :required="required"
    :placeholder="placeholder || 'Select an option'"
    @update:model-value="handleUpdate"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface SelectOption {
  label: string
  value: string
}

interface Props {
  modelValue: string | string[]
  options: SelectOption[] | Record<string, string>
  multiple?: boolean
  required?: boolean
  placeholder?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string | string[] | undefined | null]
}>()

const normalizedOptions = computed(() => {
  if (Array.isArray(props.options)) {
    return props.options
  }
  // Convert Record<string, string> to SelectOption[]
  return Object.entries(props.options).map(([value, label]) => ({
    label,
    value,
  }))
})

function handleUpdate(value: unknown) {
  // Cast to expected type - USelect may emit numbers or other types
  if (value === null || value === undefined) {
    emit('update:modelValue', value as null | undefined)
  }
  else if (typeof value === 'string') {
    emit('update:modelValue', value)
  }
  else if (Array.isArray(value)) {
    emit('update:modelValue', value as string[])
  }
  else {
    // Convert other types to string
    emit('update:modelValue', String(value))
  }
}
</script>
