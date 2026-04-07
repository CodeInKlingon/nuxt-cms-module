<template>
  <div class="link-widget space-y-2">
    <UInput
      v-model="url"
      type="url"
      placeholder="https://..."
      :required="required"
    />
    <UInput
      v-model="label"
      placeholder="Link label (optional)"
    />
    <USelect
      v-model="target"
      :options="targetOptions"
      placeholder="Target"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface LinkValue {
  url: string
  label?: string
  target?: '_blank' | '_self'
}

interface Props {
  modelValue: LinkValue
  required?: boolean
  allowExternal?: boolean
  allowInternal?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: LinkValue]
}>()

const url = computed({
  get: () => props.modelValue?.url || '',
  set: (v) => {
    emit('update:modelValue', { ...props.modelValue, url: v })
  },
})

const label = computed({
  get: () => props.modelValue?.label || '',
  set: (v) => {
    emit('update:modelValue', { ...props.modelValue, label: v })
  },
})

const target = computed({
  get: () => props.modelValue?.target || '_self',
  set: (v) => {
    emit('update:modelValue', { ...props.modelValue, target: v as '_blank' | '_self' })
  },
})

const targetOptions = [
  { label: 'Same window', value: '_self' },
  { label: 'New window', value: '_blank' },
]
</script>
