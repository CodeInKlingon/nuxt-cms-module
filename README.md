# Nuxt CMS Module

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

A powerful, type-safe CMS module for Nuxt with Drizzle ORM integration. Build content management systems with ease using TypeScript-first approach.

- [✨ &nbsp;Release Notes](/CHANGELOG.md)
- [📖 &nbsp;Implementation Plan](/IMPLEMENTATION_PLAN.md)

## Features

- 🗃️ &nbsp;**Drizzle ORM Integration** - Full TypeScript type safety with Drizzle
- 🎨 &nbsp;**Flexible Collections** - Define custom content types with validation
- 🔒 &nbsp;**Built-in Authentication** - Simple password protection for admin routes
- ⚡ &nbsp;**REST API** - Auto-generated CRUD endpoints for all collections
- 🪝 &nbsp;**Lifecycle Hooks** - beforeCreate, afterUpdate, and more
- ✅ &nbsp;**Validation** - Field-level validation with custom rules
- 📦 &nbsp;**TypeScript First** - Fully typed API with excellent DX

## Quick Setup

1. Install the module dependencies:

```bash
npm install @codeinklingon/nuxt-cms drizzle-orm @nuxt/ui @nuxt/icon
```

2. Add the modules to your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@nuxt/icon',
    '@codeinklingon/nuxt-cms',
  ],

  cms: {
    // Define your collections
    collections: {
      products: './cms/products.ts',
      pages: './cms/pages.ts',
    },

    // Configure admin panel
    admin: {
      password: process.env.CMS_PASSWORD || 'admin123',
      title: 'My CMS',
    },
  },
})
```

3. Create a server plugin to provide the database connection (`server/plugins/cms-database.ts`):

```ts
import { setDrizzleConnection } from '@codeinklingon/nuxt-cms/server'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'

const client = createClient({ url: process.env.DATABASE_URL || 'file:cms.db' })
const db = drizzle(client)

export default defineNitroPlugin(() => {
  setDrizzleConnection(db)
})
```

4. Create your first collection (`cms/products.ts`):

```ts
import { defineCollection } from '@codeinklingon/nuxt-cms/runtime/composables/defineCollection'
import { products } from '~/server/database/schema'

export default defineCollection({
  name: 'products',
  schema: products,

  options: {
    label: 'Products',
    sortable: true,
    searchable: true,
    searchColumns: ['name', 'description'],
  },

  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Product Name',
      required: true,
      validation: [
        { type: 'min', value: 3 },
        { type: 'max', value: 100 },
      ],
    },
    {
      name: 'price',
      type: 'number',
      label: 'Price',
      required: true,
      validation: [
        { type: 'min', value: 0 },
      ],
    },
  ],

  hooks: {
    beforeCreate: async (data) => {
      // Auto-generate slug
      if (!data.slug && data.name) {
        data.slug = data.name.toLowerCase().replace(/\s+/g, '-')
      }
      return data
    },
  },
})
```

4. Use the CMS API in your app:

```vue
<script setup>
const { data: products } = await useFetch('/api/cms/products')
</script>

<template>
  <div v-for="product in products.items" :key="product.id">
    <h2>{{ product.name }}</h2>
    <p>${{ product.price }}</p>
  </div>
</template>
```

## API Endpoints

The module automatically creates REST endpoints for each collection:

- `GET /api/cms/:collection` - List all records (with pagination)
- `GET /api/cms/:collection/:id` - Get single record
- `POST /api/cms/:collection` - Create new record
- `PUT /api/cms/:collection/:id` - Update record
- `DELETE /api/cms/:collection/:id` - Delete record

### Query Parameters

- `page` - Page number (default: 1)
- `perPage` - Items per page (default: 25)
- `sort` - Field to sort by
- `order` - Sort order ('asc' or 'desc')
- `search` - Search query (searches across `searchColumns` if defined)
- `filter` - Filter object

### Search Configuration

Enable search on specific columns by adding `searchColumns` to your collection options:

```ts
options: {
  searchable: true,
  searchColumns: ['name', 'slug', 'description'],
}
```

The search input will appear in the admin dashboard with a placeholder showing which fields are searchable. The search uses partial matching (case-insensitive) with OR logic across all specified columns.

**API Usage:**

```bash
# Search for 'laptop' in name, slug, or description fields
GET /api/cms/products?search=laptop
```

**Notes:**
- Search uses SQL `LIKE` with `%term%` pattern for partial matching
- Results match if the search term appears in ANY of the searchColumns
- The total count in pagination reflects the filtered search results
- If `searchable: true` but no `searchColumns` defined, the search input will be visible but non-functional

## Field Types

Supported field types:

- `text` - Single line text input
- `textarea` - Multi-line text input
- `number` - Numeric input
- `date` - Date picker
- `datetime` - Date and time picker
- `boolean` - Checkbox
- `select` - Dropdown select
- `multiselect` - Multiple choice select
- `richtext` - Rich text editor (coming soon)
- `file` - File upload (coming soon)
- `image` - Image upload (coming soon)
- `relation` - Foreign key relation (coming soon)
- `json` - JSON editor (coming soon)
- `array` - Array field (coming soon)

## Validation Rules

Built-in validation rules:

- `required` - Field is required
- `min` - Minimum value/length
- `max` - Maximum value/length
- `pattern` - Regex pattern match
- `email` - Valid email address
- `url` - Valid URL
- `custom` - Custom validation function

Example:

```ts
{
  name: 'email',
  type: 'text',
  validation: [
    { type: 'required', message: 'Email is required' },
    { type: 'email', message: 'Must be a valid email' },
  ],
}
```

## Lifecycle Hooks

Add custom logic with lifecycle hooks:

```ts
hooks: {
  beforeCreate: async (data, context) => {
    // Modify data before creation
    return data
  },

  afterCreate: async (record, context) => {
    // Run after record is created
    console.log('Created:', record.id)
  },

  beforeUpdate: async (id, data, context) => {
    // Modify data before update
    return data
  },

  afterUpdate: async (record, context) => {
    // Run after record is updated
  },

  beforeDelete: async (id, context) => {
    // Return false to cancel deletion
    return true
  },

  afterDelete: async (id, context) => {
    // Run after record is deleted
  },

  validate: async (data) => {
    // Custom validation logic
    const errors = []
    // ... validation logic
    return errors
  },
}
```
## Custom Admin Pages

You can register custom pages inside the CMS admin panel. This is useful for screens that do not fit the standard collection CRUD pattern, such as a media library or analytics dashboard.

1. Create a page definition file (`cms/pages/media.ts`):

```ts
import { defineCustomPage } from '@codeinklingon/nuxt-cms/runtime/composables/defineCustomPage'

export default defineCustomPage({
  name: 'media',
  label: 'Media Library',
  icon: 'i-lucide-image',
  component: './cms/pages/MediaLibrary.vue',
})
```

2. Create the Vue component that renders the page (`cms/pages/MediaLibrary.vue`). The component receives `pageName`, `adminRoute`, and `apiPrefix` props and is rendered inside the CMS admin layout.

3. Register the page in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  cms: {
    customPages: {
      media: './cms/pages/media.ts',
    },
  },
})
```

Custom pages are reachable at `<admin-route>/page/<name>` and automatically appear in the admin sidebar.

## Configuration

Complete module options:

```ts
{
  cms: {
    // Collection files
    collections: {
      products: './cms/products.ts',
    },

    // Database connection
    database: {
      connection: () => drizzleInstance,
    },

    // Admin panel
    admin: {
      enabled: true,
      route: '/admin',
      password: 'your-password',
      title: 'CMS Admin',
    },

    // API configuration
    api: {
      prefix: '/api/cms',
    },

    // Feature flags
    features: {
      versioning: false,
      media: true,
    },

    // Media settings
    media: {
      uploadDir: 'public/uploads',
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/*', 'application/pdf'],
    },
  },
}
```

## Development

This is a Turborepo monorepo with the module package at `packages/nuxt-module/` and the playground at `apps/playground/`.

<details>
  <summary>Setup</summary>

  ```bash
  # Install dependencies (from root)
  npm install

  # Generate type stubs and prepare the module
  npm run dev:prepare
  ```

</details>

<details>
  <summary>Dev workflow</summary>

  The `npm run dev` command uses Turborepo to build the module first, then start the playground dev server:

  ```bash
  # Build module + start playground dev server
  npm run dev

  # Build playground for production (builds module first)
  npm run dev:build
  ```

  > **Windows note**: turbo 2.9.18 has a regression where spawned npm child processes produce no output and silently exit with code 1. Pin turbo to `^2.3.0` if you encounter this.

</details>

<details>
  <summary>Lint & Test</summary>

  ```bash
  # Run ESLint across all packages
  npm run lint

  # Run Vitest
  npm run test

  # Watch mode
  npm run test:watch
  ```

</details>

<details>
  <summary>Import conventions</summary>

  Import module runtime utilities using subpath exports. Do **not** import from the module entry point or via relative paths to source:

  ```ts
  // ✅ Correct — uses package.json exports
  import { defineCollection } from '@codeinklingon/nuxt-cms/runtime/composables/defineCollection'
  import { defineCustomPage } from '@codeinklingon/nuxt-cms/runtime/composables/defineCustomPage'
  import { defineWidget } from '@codeinklingon/nuxt-cms/runtime/composables/defineWidget'
  import type { CollectionDefinition } from '@codeinklingon/nuxt-cms/runtime/types'
  import type { WidgetDefinition } from '@codeinklingon/nuxt-cms/runtime/types/widgets'

  // ❌ Incorrect — direct module entry
  import { defineCollection } from '@codeinklingon/nuxt-cms'

  // ❌ Incorrect — relative path to source (will break after build)
  import { defineCollection } from '../../src/runtime/composables/defineCollection'

  // ❌ Incorrect — #cms is type-only (no runtime virtual module)
  import { defineCustomPage } from '#cms'
  ```

  This is required because Nuxt 4's `impound` plugin blocks direct module entry-point imports during bundling, and relative source paths break after the module is published.

</details>

## Roadmap

- [ ] Admin UI dashboard
- [ ] Rich text editor widget
- [ ] File/image upload handling
- [ ] Media library
- [ ] Relation field support
- [ ] Full-text search
- [ ] Advanced filtering
- [ ] Content versioning
- [ ] Role-based permissions
- [ ] GraphQL API option

## Contributing

Contributions are welcome! Please read the [implementation plan](./IMPLEMENTATION_PLAN.md) for development guidelines.

## License

MIT

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/@codeinklingon/nuxt-cms/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/@codeinklingon/nuxt-cms

[npm-downloads-src]: https://img.shields.io/npm/dm/@codeinklingon/nuxt-cms.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npm.chart.dev/@codeinklingon/nuxt-cms

[license-src]: https://img.shields.io/npm/l/@codeinklingon/nuxt-cms.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/@codeinklingon/nuxt-cms

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt
[nuxt-href]: https://nuxt.com
