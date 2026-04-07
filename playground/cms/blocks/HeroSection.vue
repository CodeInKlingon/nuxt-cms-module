<template>
  <section
    class="hero-section py-16 px-8 text-center"
    :style="{ backgroundColor: backgroundColor || '#f3f4f6' }"
  >
    <h1 class="text-4xl font-bold mb-4">
      {{ title }}
    </h1>
    <p
      v-if="subtitle"
      class="text-xl text-gray-600 mb-6"
    >
      {{ subtitle }}
    </p>
    <a
      v-if="ctaLink?.url"
      :href="ctaLink.url"
      :target="ctaLink.target"
      class="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      {{ ctaLink.label || 'Learn More' }}
    </a>
  </section>
</template>

<script setup lang="ts">
import { textField, linkField } from '../../../src/runtime/widgets/built-ins'

const props = defineProps({
  title: textField({
    label: 'Title',
    required: true,
  }),
  subtitle: textField({
    label: 'Subtitle',
  }),
  backgroundColor: textField({
    label: 'Background Color',
  }),
  ctaLink: linkField({
    label: 'Call to Action Link',
  }),
})
</script>
