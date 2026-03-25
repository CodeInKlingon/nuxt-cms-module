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
npm install nuxt-cms drizzle-orm
```

2. Add the module to your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-cms'],

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
import { setDrizzleConnection } from 'nuxt-cms/server'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'

const sqlite = new Database('cms.db')
const db = drizzle(sqlite)

export default defineNitroPlugin(() => {
  setDrizzleConnection(db)
})
```

4. Create your first collection (`cms/products.ts`):

```ts
import { defineCollection } from '../../src/runtime/composables/defineCollection'
import { products } from '~/server/database/schema'

export default defineCollection({
  name: 'products',
  schema: products,

  options: {
    label: 'Products',
    sortable: true,
    searchable: true,
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
- `search` - Search query
- `filter` - Filter object

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

<details>
  <summary>Local development</summary>

  ```bash
  # Install dependencies
  npm install

  # Generate type stubs
  npm run dev:prepare

  # Develop with the playground
  npm run dev

  # Build the playground
  npm run dev:build

  # Run ESLint
  npm run lint

  # Run Vitest
  npm run test
  npm run test:watch

  # Release new version
  npm run release
  ```

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
[npm-version-src]: https://img.shields.io/npm/v/nuxt-cms/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/nuxt-cms

[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-cms.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npm.chart.dev/nuxt-cms

[license-src]: https://img.shields.io/npm/l/nuxt-cms.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/nuxt-cms

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt
[nuxt-href]: https://nuxt.com
