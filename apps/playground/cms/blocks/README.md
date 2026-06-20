# Playground Blocks

These are sample block components for testing the block editor in the playground.

## Available Blocks

### HeroSection
A hero banner block with title, subtitle, background color, and call-to-action link.

**Fields:**
- `title` (text) - Required
- `subtitle` (text)
- `backgroundColor` (text) - CSS color value
- `ctaLink` (link) - URL, label, and target

### TextBlock
A simple text content block with optional heading.

**Fields:**
- `heading` (text)
- `content` (textarea) - Required

### ImageBlock
An image block with alt text, caption, and alignment options.

**Fields:**
- `imageUrl` (text) - Required, URL to image
- `altText` (text) - Accessibility text
- `caption` (text) - Optional caption below image
- `alignment` (select) - 'full' or 'center'

## Creating New Blocks

1. Create a new `.vue` file in this directory
2. Use field helper functions from `nuxt-cms` in `defineProps()`
3. Register the block in your collection's `allowedBlocks` array

Example:

```vue
<template>
  <div class="my-block">
    <h2>{{ title }}</h2>
    <p>{{ content }}</p>
  </div>
</template>

<script setup lang="ts">
import { textField, textareaField } from '../../../src/runtime/widgets/built-ins'

defineProps({
  title: textField({
    label: 'Title',
    required: true,
  }),
  content: textareaField({
    label: 'Content',
  }),
})
</script>
```

## Testing the Block Editor

1. Run `npm run dev` in the playground
2. Navigate to `/admin`
3. Go to Pages → Create New
4. Switch to the "Content" tab
5. Use the "Block Content" field to add and edit blocks
