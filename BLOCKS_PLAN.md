# Blocks System Implementation Plan

## Quick Summary

The blocks system enables **content blocks** defined as Vue SFCs that use field helper functions (e.g., `textField()`, `linkField()`) in `defineProps()`. These helpers serve **dual purposes**:

1. **Vue Prop Types** - Define component props with TypeScript types
2. **CMS UI Configuration** - Embed metadata (`cms` object) that the block editor uses to render form fields

**No build-time AST parsing needed** - We use Vue's runtime component introspection to extract field definitions from component props.

> **Implementation Order Note**: The widget system (including custom widgets) must be implemented and integrated into collection forms **before** block components are built. This ensures a solid foundation for the block editor which will reuse the same widget rendering infrastructure.

---

## Key Decisions Made

### 1. Widget Architecture (`defineWidget`)

**Decision**: Widgets are defined using `defineWidget<TValue, TOptions>()` which returns a field function.

```typescript
const colorPickerField = defineWidget<ColorValue, ColorOptions>({
  name: 'color-picker',
  component: () => import('./ColorPicker.vue'),
  defaultOptions: { allowAlpha: false },
  validate: (value, options) => true | string,
})
```

**Usage**:
```typescript
// In blocks
const props = defineProps({
  background: colorPickerField({ allowAlpha: true }),
})

// In collections
{ field: 'color', widget: 'color-picker' }
```

**Field Function Returns**:
```typescript
{
  type: String | Number | Object | ...,  // Vue prop type
  required: boolean,
  default: any,
  cms: {
    widget: string,      // Widget name
    options: object,     // Merged options
  }
}
```

---

### 2. Widget Registration (Option B - Explicit)

**Decision**: User-defined widgets are explicitly registered in `nuxt.config.ts`.

```typescript
// nuxt.config.ts
import { colorPickerField } from './cms/widgets/color-picker'

export default defineNuxtConfig({
  modules: ['nuxt-cms'],
  cms: {
    widgets: [colorPickerField, gradientField],
  },
})
```

**Rationale**: Explicit is clearer than magic file scanning. Built-in widgets are automatically available.

---

### 3. Widget Registry (Virtual Generated File)

**Decision**: Module generates a virtual file `#internal/cms/widgets` at build time containing all widget component imports.

```typescript
// Generated: #internal/cms/widgets.ts
export const widgetRegistry = {
  // Built-ins
  text: () => import('nuxt-cms/runtime/widgets/TextWidget.vue'),
  number: () => import('nuxt-cms/runtime/widgets/NumberWidget.vue'),
  // ...
  
  // User-defined
  'color-picker': () => import('/cms/widgets/ColorPicker.vue'),
  gradient: () => import('/cms/widgets/Gradient.vue'),
}
```

---

### 4. Widget Component Interface

**Decision**: Minimal props interface - just `modelValue`.

```typescript
// Widget component receives:
interface WidgetProps<T> {
  modelValue: T
  // All other options passed via v-bind
}

// Emits:
interface WidgetEmits<T> {
  'update:modelValue': [value: T]
}
```

**Example**:
```vue
<template>
  <UInput
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :placeholder="placeholder"
    :maxlength="maxLength"
  />
</template>
```

---

### 5. Built-in Widgets (Yes, use defineWidget internally)

**Decision**: Built-in widgets use the same `defineWidget` pattern internally for consistency.

```typescript
// src/runtime/widgets/built-ins/text.ts
export const textWidget = defineWidget<string, TextOptions>({ ... })
export const textField = textWidget  // Export field function directly
```

**Built-in widgets to implement**:
- `text` - Single line text
- `textarea` - Multi-line text
- `number` - Numeric input
- `boolean` - Toggle/switch
- `select` - Dropdown (single/multiple)
- `link` - URL + label + target object
- `relation` - Reference to collection records
- `repeater` - Array of nested fields

---

### 6. Repeater Field (Option A - Fields in Options)

**Decision**: Repeater fields defined inline in options.

```typescript
repeaterField({
  label: 'Items',
  fields: {
    title: textField({ label: 'Title' }),
    image: imageField({ label: 'Image' }),
  },
  minItems: 1,
  maxItems: 10,
})
```

---

### 7. Validation Integration (Yes)

**Decision**: Widgets define their own validation function.

```typescript
defineWidget<string>({
  name: 'email',
  component: () => import('./EmailWidget.vue'),
  validate: (value, options) => {
    if (options.required && !value) return 'Email is required'
    if (value && !value.includes('@')) return 'Invalid email'
    return true  // Valid
  },
})
```

**Validation rules can also be passed in field options**:
```typescript
textField({
  label: 'Username',
  validation: [
    { type: 'required' },
    { type: 'minLength', value: 3 },
    { type: 'pattern', value: /^[a-z0-9]+$/ },
  ],
})
```

---

### 8. Block Data Structure (Option B - With Metadata)

**Decision**: Block data includes metadata wrapper.

```typescript
interface BlockItem {
  id: string           // UUID for stable identity
  type: string         // Block component name
  data: Record<string, any>  // Field values
  meta?: {
    createdAt: Date
    updatedAt: Date
  }
}

// Example:
[
  {
    id: 'abc123',
    type: 'HeroSection',
    data: {
      title: 'Welcome',
      backgroundColor: { hex: '#ffffff' },
    },
    meta: {
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T11:00:00Z',
    },
  },
]
```

---

## Integration Points

### With Collections

Blocks are enabled per-collection via the `blocks` configuration:

```typescript
defineCollection({
  name: 'pages',
  blocks: {
    enabled: true,
    allowedBlocks: ['HeroSection', 'TextBlock'],  // Optional restriction
    fieldName: 'content',  // DB column name (default: 'blocks')
  },
})
```

### With Form System

`CmsBlockEditor` is a widget type that can be used in forms:

```typescript
{ 
  field: 'content',
  widget: 'blocks',
  props: {
    allowedBlocks: ['HeroSection', 'TextBlock'],
  },
}
```

### With Database

**Storage Strategy: Single JSON Column**

Blocks are stored in a single JSON column on the collection table. This is the simplest and most portable approach:

```typescript
// User's collection schema
export const pages = sqliteTable('pages', {
  id: integer('id').primaryKey(),
  title: text('title'),
  // ... other fields
  blocks: text('blocks', { mode: 'json' }).$type<BlockItem[]>(),
})
```

**Database-Specific Types:**
- **SQLite**: `text('blocks', { mode: 'json' })`
- **PostgreSQL**: `jsonb('blocks')`
- **MySQL**: `json('blocks')`

All databases support the same `BlockItem[]` data structure. No schema factory needed - users simply add the column to their existing Drizzle schema.

**Benefits:**
- Simple - no complex factory functions or multiple tables
- Portable - works with any Drizzle-supported database
- Flexible - block structure can evolve without migrations
- Atomic - blocks are part of the collection record

---

### Frontend Rendering

**`renderBlocks()` Function**

The module provides a `renderBlocks()` function that consuming Nuxt apps can call in their frontend to render block data:

```vue
<template>
  <div class="page-content">
    <RenderBlocks :blocks="page.blocks" />
  </div>
</template>

<script setup>
const { data: page } = await useFetch('/api/pages/my-page')
</script>
```

**Features:**
- **Lazy Loading**: Only loads block components that are actually used in the data
- **Prop Binding**: Automatically sets props from the block data
- **Type Safety**: Full TypeScript support for block props

**Implementation:**
```typescript
// Composable for rendering
export function useRenderBlocks() {
  return {
    renderBlocks: (blocks: BlockItem[]) => {
      // Returns Vue h() function that:
      // 1. Dynamically imports only needed block components
      // 2. Maps block.data to component props
      // 3. Renders in order
    }
  }
}

// Component wrapper
export const RenderBlocks = defineComponent({
  props: {
    blocks: {
      type: Array as PropType<BlockItem[]>,
      required: true
    }
  },
  setup(props) {
    return () => h('div', { class: 'blocks-container' },
      props.blocks.map(block => {
        const component = defineAsyncComponent(() => 
          import(`~/cms/blocks/${block.type}.vue`)
        )
        return h(component, { ...block.data })
      })
    )
  }
})
```

**Usage with Custom Block Resolution:**
```vue
<template>
  <RenderBlocks 
    :blocks="page.blocks" 
    :resolve="resolveBlock"
  />
</template>

<script setup>
// Custom resolution logic
const resolveBlock = (blockType) => {
  // Return component or import function
  return defineAsyncComponent(() => import(`~/blocks/${blockType}.vue`))
}
</script>
```

---

## Implementation Phases

### Phase 1: Widget System Core
- `defineWidget<TValue, TOptions>()` composable
- Virtual widget registry generation (`#internal/cms/widgets`)
- Widget validation system
- 3-4 basic built-in widgets (text, number, boolean)
- **Custom widget support** - Users can define and register their own widgets

### Phase 2: Collection Forms Migration
- **Update existing collection forms** to use the new widget system
- Refactor `CmsFieldWidget.vue` to use `CmsWidgetRenderer`
- Ensure all existing form functionality works with new widget architecture
- Add widget configuration to collection field definitions
- Test custom widgets in collection forms

### Phase 3: Block Field Helpers
- Built-in widgets complete (8 total)
- Field helper functions (textField, numberField, etc.)
- `CmsWidgetRenderer` component (if not already done in Phase 2)

### Phase 4: Block Editor
- `CmsBlockEditor` component
- Block discovery (from component names)
- Runtime prop introspection
- Add/move/remove/reorder blocks
- Block-level validation

### Phase 5: Collection Blocks Integration
- Collection blocks configuration (`blocks.enabled`, `allowedBlocks`, etc.)
- Database storage for blocks (JSON column approach)
- API endpoints for block data
- Frontend `RenderBlocks` component with lazy loading
- `useRenderBlocks()` composable for programmatic rendering

### Phase 6: Advanced Features
- Drag-and-drop sorting
- Repeater nested fields
- Custom widget documentation
- Validation error display
- Block preview in editor

---

## Open Questions

1. **Options merging**: Shallow `Object.assign()` or deep merge for nested options?
2. **Block ID**: Simple random string or UUID library?
3. **Widget errors**: Show error placeholder, fail silently, or throw?
4. **Drag-and-drop**: Add for block sorting? (VueUse sortable vs native)
5. **Repeater validation**: Inline or on-save validation for nested items?
6. **Block component discovery**: Should `RenderBlocks` auto-discover components from a directory (e.g., `~/cms/blocks/`), require explicit component mapping, or support both?

---

## Usage Examples

### Custom Widget Definition

```typescript
// cms/widgets/color-picker.ts
import { defineWidget } from '#imports'

export interface ColorValue {
  hex: string
  rgb?: { r: number; g: number; b: number }
  alpha?: number
}

export interface ColorOptions {
  label?: string
  description?: string
  required?: boolean
  default?: string
  allowAlpha?: boolean
  presetColors?: string[]
}

export const colorPickerField = defineWidget<ColorValue, ColorOptions>({
  name: 'color-picker',
  component: () => import('./ColorPicker.vue'),
  defaultOptions: {
    default: '#000000',
    allowAlpha: false,
  },
  validate: (value, options) => {
    if (options.required && !value?.hex) {
      return 'Color is required'
    }
    if (value?.hex && !/^#[0-9A-F]{6}$/i.test(value.hex)) {
      return 'Invalid color format'
    }
    return true
  },
})
```

### Block Component

```vue
<template>
  <section class="hero" :style="{ backgroundColor: backgroundColor?.hex }">
    <h1>{{ title }}</h1>
    <p v-if="subtitle">{{ subtitle }}</p>
    <a v-if="ctaLink?.url" :href="ctaLink.url">
      {{ ctaLink.label || 'Learn More' }}
    </a>
  </section>
</template>

<script setup lang="ts">
import { 
  textField, 
  textareaField, 
  linkField, 
  colorPickerField  // User's custom widget
} from '#imports'

const props = defineProps({
  title: textField({
    label: 'Hero Title',
    required: true,
    maxLength: 100,
  }),
  
  subtitle: textareaField({
    label: 'Subtitle',
    maxLength: 250,
  }),
  
  backgroundColor: colorPickerField({
    label: 'Background Color',
    allowAlpha: true,
    presetColors: ['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff'],
  }),
  
  ctaLink: linkField({
    label: 'Call to Action',
    allowExternal: true,
  }),
})
</script>
```

### Collection Configuration

```typescript
// cms/collections/pages.ts
import { defineCollection } from '#imports'
import { pages } from '../schema'

export default defineCollection({
  name: 'pages',
  schema: pages,
  
  blocks: {
    enabled: true,
    allowedBlocks: ['HeroSection', 'TextBlock', 'ImageGallery'],
    fieldName: 'content',
  },
  
  dashboard: {
    form: {
      tabs: [
        {
          title: 'Content',
          sections: [
            {
              title: 'Page Details',
              fields: [
                { field: 'title', widget: 'text', required: true },
                { field: 'slug', widget: 'text', required: true },
              ],
            },
            {
              title: 'Blocks',
              fields: [
                { 
                  field: 'content',
                  widget: 'blocks',
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

### Frontend Rendering

```vue
<!-- pages/[slug].vue -->
<template>
  <article>
    <h1>{{ page.title }}</h1>
    
    <!-- Render blocks from JSON column -->
    <RenderBlocks :blocks="page.blocks" />
  </article>
</template>

<script setup lang="ts">
const route = useRoute()
const { data: page } = await useFetch(`/api/pages/${route.params.slug}`)
</script>
```

**Advanced Usage with Custom Block Resolution:**

```vue
<template>
  <RenderBlocks 
    :blocks="page.blocks" 
    :resolve="resolveBlock"
  />
</template>

<script setup lang="ts">
// Custom resolution for different block sources
const resolveBlock = (blockType: string) => {
  // Can use dynamic imports, component mapping, etc.
  if (blockType.startsWith('Custom')) {
    return defineAsyncComponent(() => 
      import(`~/custom-blocks/${blockType}.vue`)
    )
  }
  // Default resolution
  return defineAsyncComponent(() => 
    import(`~/cms/blocks/${blockType}.vue`)
  )
}
</script>
```

**Programmatic Rendering:**

```typescript
// Using composable directly
const { renderBlocks } = useRenderBlocks()

const blocksComponent = computed(() => {
  return renderBlocks(page.value.blocks, {
    // Options for rendering
    wrapperClass: 'my-blocks',
    onBlockRender: (block) => console.log('Rendered:', block.type)
  })
})
```
