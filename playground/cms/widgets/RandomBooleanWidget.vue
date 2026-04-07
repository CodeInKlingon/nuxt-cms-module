<template>
  <div class="random-boolean-widget flex items-center gap-3">
    <USwitch
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
    />
    <UButton
      size="sm"
      color="neutral"
      variant="soft"
      icon="i-lucide-shuffle"
      @click="randomize"
    >
      Randomize
    </UButton>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function randomize() {
  const randomValue = Math.random() >= 0.5
  emit('update:modelValue', randomValue)
}
</script>
