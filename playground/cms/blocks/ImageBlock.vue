<template>
  <div class="image-block py-8 px-8">
    <img
      v-if="imageUrl"
      :src="imageUrl"
      :alt="altText || ''"
      class="w-full rounded-lg"
      :class="{ 'max-w-2xl mx-auto': alignment === 'center' }"
    >
    <p
      v-if="caption"
      class="text-center text-sm text-gray-500 mt-2"
    >
      {{ caption }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { textField, selectField } from '../../../src/runtime/widgets/built-ins'

defineProps({
  imageUrl: textField({
    label: 'Image URL',
    required: true,
  }),
  altText: textField({
    label: 'Alt Text',
  }),
  caption: textField({
    label: 'Caption',
  }),
  alignment: selectField({
    label: 'Alignment',
    options: [
      { label: 'Full Width', value: 'full' },
      { label: 'Center', value: 'center' },
    ],
  }),
})
</script>
