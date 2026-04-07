<template>
  <div
    class="space-y-1"
  >
    <label
      v-if="label"
      class="block text-sm font-medium text-gray-700"
    >
      {{ label }}
      <span
        v-if="required"
        class="text-red-500 ml-1"
      >*</span>
    </label>
    <p
      v-if="description"
      class="text-sm text-gray-500"
    >
      {{ description }}
    </p>

    <Component
      :is="widgetComponent"
      v-if="widgetComponent"
      :model-value="modelValue"
      v-bind="widgetProps"
      @update:model-value="handleUpdate"
    />

    <div
      v-else
      class="p-4 bg-red-50 text-red-600 rounded border border-red-200"
    >
      Unknown widget: {{ widget }}
    </div>

    <p
      v-if="error"
      class="text-sm text-red-600 mt-1"
    >
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Props {
  widget: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modelValue: any
  label?: string
  description?: string
  required?: boolean
  error?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: Record<string, any>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  'update:modelValue': [value: any]
}>()

// Widget component resolution
const widgetComponent = computed(() => {
  // Map widget names to their components
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const widgetMap: Record<string, any> = {
    text: defineAsyncComponent(() => import('../widgets/built-ins/TextWidget.vue')),
    number: defineAsyncComponent(() => import('../widgets/built-ins/NumberWidget.vue')),
    textarea: defineAsyncComponent(() => import('../widgets/built-ins/TextareaWidget.vue')),
    boolean: defineAsyncComponent(() => import('../widgets/built-ins/BooleanWidget.vue')),
    select: defineAsyncComponent(() => import('../widgets/built-ins/SelectWidget.vue')),
    link: defineAsyncComponent(() => import('../widgets/built-ins/LinkWidget.vue')),
  }

  // Support for custom widgets from user land
  // Custom widgets can be registered by adding them to the widgetMap
  // or by using the widget registry system
  if (props.widget === 'random-boolean') {
    // @ts-expect-error - Dynamic import for playground custom widget
    return defineAsyncComponent(() => import('../../../../playground/cms/widgets/RandomBooleanWidget.vue'))
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleUpdate(value: any) {
  emit('update:modelValue', value)
}
</script>

