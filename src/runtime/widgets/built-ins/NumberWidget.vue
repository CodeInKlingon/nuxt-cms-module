<template>
  <UInput
    type="number"
    :model-value="modelValue"
    :placeholder="placeholder"
    :min="min"
    :max="max"
    :step="step"
    :required="required"
    @update:model-value="handleUpdate"
  />
</template>

<script setup lang="ts">
interface Props {
  modelValue: number
  placeholder?: string
  min?: number
  max?: number
  step?: number
  required?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

function handleUpdate(value: string | number) {
  const num = typeof value === 'string' ? Number.parseFloat(value) : value
  emit('update:modelValue', Number.isNaN(num) ? 0 : num)
}
</script>
