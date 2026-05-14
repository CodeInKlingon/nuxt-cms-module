<script setup lang="ts">
import { textField, textareaField } from '../../../src/runtime/widgets/built-ins'
import { randomBooleanField } from '../widgets/random-boolean'

const props = defineProps({
  title: textField({
    label: 'Card Title',
    required: true,
  }),
  description: textareaField({
    label: 'Description',
    required: true,
  }),
  highlighted: randomBooleanField({
    label: 'Highlight Card',
    description: 'Toggle to randomly highlight this card',
  }),
})
</script>

<template>
  <div
    class="p-6 rounded-lg border-2 transition-all"
    :class="highlighted 
      ? 'border-primary-500 bg-primary-50 shadow-lg' 
      : 'border-gray-200 bg-white'"
  >
    <h3 
      class="text-xl font-bold mb-2"
      :class="highlighted ? 'text-primary-700' : 'text-gray-800'"
    >
      {{ title }}
    </h3>
    <p 
      class="text-base leading-relaxed"
      :class="highlighted ? 'text-primary-600' : 'text-gray-600'"
    >
      {{ description }}
    </p>
    <div 
      v-if="highlighted" 
      class="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
      :class="'bg-primary-100 text-primary-700'"
    >
      <span class="i-lucide-star w-4 h-4" />
      Featured
    </div>
  </div>
</template>
