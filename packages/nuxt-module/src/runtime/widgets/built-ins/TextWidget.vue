<template>
  <UInput
    :model-value="modelValue"
    :placeholder="placeholder"
    :maxlength="maxLength"
    :required="required"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
interface Props {
  modelValue: string
  placeholder?: string
  maxLength?: number
  required?: boolean
}

defineProps<Props>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>
