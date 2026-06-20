# Playground Custom Widget - Random Boolean

This is a demonstration of creating custom widgets for the nuxt-cms module.

## What It Does

The `random-boolean-widget` provides:
- A toggle switch for boolean values (same as the built-in `boolean` widget)
- A "Random" button that randomly sets the value to true or false
- Useful for testing or demo purposes

## Files

- `cms/widgets/random-boolean.ts` - Widget definition using `defineWidget()`
- `cms/widgets/RandomBooleanWidget.vue` - Vue component for the widget

## Usage

### 1. Create the Widget Component

```vue
<!-- cms/widgets/RandomBooleanWidget.vue -->
<template>
  <div class="flex items-center gap-3">
    <UToggle
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
      Random
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
```

### 2. Define the Widget

```typescript
// cms/widgets/random-boolean.ts
import { defineWidget } from 'nuxt-cms'
import type { BooleanOptions } from 'nuxt-cms'

export const randomBooleanWidget = defineWidget<boolean, BooleanOptions>({
  name: 'random-boolean',
  component: () => import('./RandomBooleanWidget.vue'),
  defaultOptions: {
    default: false,
  },
  validate: (value, options) => {
    if (options.required && !value) {
      return 'This field must be checked'
    }
    return true
  },
})

export const randomBooleanField = randomBooleanWidget
```

### 3. Register in nuxt.config.ts

```typescript
// nuxt.config.ts
import { randomBooleanWidget } from './cms/widgets/random-boolean'

export default defineNuxtConfig({
  modules: ['nuxt-cms'],
  cms: {
    widgets: [
      randomBooleanWidget,
    ],
    // ... other config
  },
})
```

### 4. Use in Collection Form

```typescript
// cms/collections/products.ts
export default defineCollection({
  name: 'products',
  // ...
  dashboard: {
    form: {
      tabs: [
        {
          sections: [
            {
              fields: [
                {
                  field: 'active',
                  label: 'Active',
                  widget: 'random-boolean-widget',  // Use kebab-case version of component filename
                  defaultValue: true,
                },
              ],
            },
          ],
        },
      ],
    },
  },
})
```

### 5. Use in Block Components

```vue
<script setup lang="ts">
const props = defineProps({
  isHighlighted: randomBooleanField({
    label: 'Highlight Product',
  }),
})
</script>
```

## How It Works

1. The widget Vue component is placed in `cms/widgets/` directory (e.g., `RandomBooleanWidget.vue`)
2. The module auto-discovers and registers widgets from this directory
3. Widgets are registered using kebab-case version of the filename (e.g., `RandomBooleanWidget.vue` → `random-boolean-widget`)
4. The widget component receives `modelValue` prop and emits `update:modelValue`
5. The CMS form uses `CmsWidgetRenderer` to dynamically load and render the widget via the virtual widget registry

**Note:** Widgets passed via `cms.widgets` in `nuxt.config.ts` still work, but their Vue components should also be placed in `cms/widgets/` for auto-registration.

## Testing

To test the custom widget:

1. Run `npm run dev` in the playground
2. Navigate to the admin panel at `/admin`
3. Go to Products → Create New or Edit an existing product
4. The "Active" field should show a toggle with a "Random" button
5. Click "Random" to see the toggle switch randomly
