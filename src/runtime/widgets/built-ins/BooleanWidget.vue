<template>
  <UToggle
    :model-value="modelValue"
    :required="required"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean
  required?: boolean
}

defineProps<Props>()

defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>
