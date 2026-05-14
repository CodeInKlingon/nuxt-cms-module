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
import { computed, defineAsyncComponent, h } from 'vue'

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

// Error component using render function (no template compilation needed)
const ErrorComponent = {
  setup() {
    return () => h('div', { 
      class: 'p-4 bg-red-50 text-red-600 rounded border border-red-200' 
    }, 'Error loading widget')
  }
}

// Widget component resolution
const widgetComponent = computed(() => {
  // Built-in widgets map
  const widgetMap: Record<string, ReturnType<typeof defineAsyncComponent>> = {
    text: defineAsyncComponent(() => import('../widgets/built-ins/TextWidget.vue')),
    number: defineAsyncComponent(() => import('../widgets/built-ins/NumberWidget.vue')),
    textarea: defineAsyncComponent(() => import('../widgets/built-ins/TextareaWidget.vue')),
    boolean: defineAsyncComponent(() => import('../widgets/built-ins/BooleanWidget.vue')),
    select: defineAsyncComponent(() => import('../widgets/built-ins/SelectWidget.vue')),
    link: defineAsyncComponent(() => import('../widgets/built-ins/LinkWidget.vue')),
    blocks: defineAsyncComponent(() => import('../widgets/built-ins/BlocksWidget.vue')),
  }

  // Check built-in widgets first
  if (widgetMap[props.widget]) {
    return widgetMap[props.widget]
  }

  // For custom widgets, try to load from the virtual widget registry
  return defineAsyncComponent({
    loader: async () => {
      try {
        // @ts-expect-error - Virtual module
        const widgetsModule = await import('#cms/widgets')
        const loader = widgetsModule.getWidget(props.widget)
        if (loader) {
          const module = await loader()
          return module.default || module
        }
      }
      catch {
        // Virtual module not available or widget not found
      }

      // Return error component if widget not found (using render function)
      return {
        setup() {
          return () => h('div', { 
            class: 'p-4 bg-red-50 text-red-600 rounded border border-red-200' 
          }, `Widget "${props.widget}" not found`)
        }
      }
    },
    errorComponent: ErrorComponent,
  })
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
