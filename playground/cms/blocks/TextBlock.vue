<template>
  <div class="text-block py-8 px-8">
    <h2
      v-if="heading"
      class="text-2xl font-bold mb-4"
    >
      {{ heading }}
    </h2>
    <div class="prose max-w-none">
      {{ content }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { textField, textareaField } from '../../../src/runtime/widgets/built-ins'

defineProps({
  heading: textField({
    label: 'Heading',
  }),
  content: textareaField({
    label: 'Content',
    required: true,
  }),
})
</script>
