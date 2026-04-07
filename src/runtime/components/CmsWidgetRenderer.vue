<template>
  <div class="cms-widget-wrapper">
    <label v-if="label" class="widget-label">
      {{ label }}
      <span v-if="required" class="required-marker">*</span>
    </label>
    <p v-if="description" class="widget-description">{{ description }}</p>

    <Component
      :is="widgetComponent"
      v-if="widgetComponent"
      :model-value="modelValue"
      v-bind="widgetProps"
      @update:model-value="$emit('update:modelValue', $event)"
    />

    <div v-else class="widget-error">
      Unknown widget: {{ widget }}
    </div>

    <p v-if="error" class="widget-error-message">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import type { PropType } from 'vue'

interface Props {
  widget: string
  modelValue: any
  label?: string
  description?: string
  required?: boolean
  error?: string
  options?: Record<string, any>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

// Widget component resolution
const widgetComponent = computed(() => {
  // Map widget names to their components
  const widgetMap: Record<string, any> = {
    text: defineAsyncComponent(() => import('../widgets/built-ins/TextWidget.vue')),
    number: defineAsyncComponent(() => import('../widgets/built-ins/NumberWidget.vue')),
    textarea: defineAsyncComponent(() => import('../widgets/built-ins/TextareaWidget.vue')),
    boolean: defineAsyncComponent(() => import('../widgets/built-ins/BooleanWidget.vue')),
    select: defineAsyncComponent(() => import('../widgets/built-ins/SelectWidget.vue')),
  }

  return widgetMap[props.widget] || null
})

// Props to pass to widget component (exclude cms-specific props)
const widgetProps = computed(() => {
  return {
    ...props.options,
    required: props.required,
  }
})
</script>

<style scoped>
.cms-widget-wrapper {
  @apply space-y-1;
}

.widget-label {
  @apply block text-sm font-medium text-gray-700;
}

.required-marker {
  @apply text-red-500 ml-1;
}

.widget-description {
  @apply text-sm text-gray-500;
}

.widget-error {
  @apply p-4 bg-red-50 text-red-600 rounded border border-red-200;
}

.widget-error-message {
  @apply text-sm text-red-600 mt-1;
}
</style>
