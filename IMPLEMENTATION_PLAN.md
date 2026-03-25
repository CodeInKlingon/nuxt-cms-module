# Nuxt CMS Module - Implementation Plan

## 📋 Project Overview

**Goal:** Build a Nuxt module that extends applications with CMS capabilities through collection definitions in the `cms/` folder, integrated with Drizzle ORM, REST APIs, admin UI, and advanced features.

**Requirements:**
- Database: Drizzle ORM with full TypeScript inference
- Admin UI: Nuxt pages/components at `/admin`
- Discovery: Explicit registration via nuxt.config
- API: REST endpoints (`/api/cms/:collection`)
- Fields: UI metadata + validation rules
- Auth: Basic password protection
- Media: Full media library (local filesystem to start)
- Features: Hooks, versioning, extensible widgets

---

## 📦 Dependencies to Add

```json
{
  "dependencies": {
    "drizzle-orm": "^0.36.0",
    "zod": "^3.24.0",
    "pathe": "^1.1.2"
  },
  "devDependencies": {
    "drizzle-kit": "^0.31.0"
  },
  "peerDependencies": {
    "drizzle-orm": ">=0.30.0"
  }
}
```

**Note:** h3 (v1.15.10) is already available through Nuxt.

---

## 🏗️ File Structure

```
src/
├── module.ts                           # Main module setup
├── runtime/
│   ├── types.ts                        # Shared types & interfaces
│   ├── composables/
│   │   ├── defineCollection.ts         # Collection factory
│   │   └── useCmsData.ts               # Data fetching composable
│   │
│   ├── components/                     # Admin UI components
│   │   ├── CmsLayout.vue               # Main admin layout
│   │   ├── CollectionList.vue          # List/table view
│   │   ├── CollectionForm.vue          # Create/edit form
│   │   ├── FieldRenderer.vue           # Dynamic field widget renderer
│   │   ├── widgets/                    # Field widgets
│   │   │   ├── TextWidget.vue
│   │   │   ├── TextareaWidget.vue
│   │   │   ├── NumberWidget.vue
│   │   │   ├── DateWidget.vue
│   │   │   ├── BooleanWidget.vue
│   │   │   ├── SelectWidget.vue
│   │   │   ├── RichTextWidget.vue
│   │   │   ├── FileWidget.vue
│   │   │   ├── RelationWidget.vue
│   │   │   └── JsonWidget.vue
│   │   └── MediaLibrary.vue            # Media browser
│   │
│   ├── pages/                          # Admin pages
│   │   └── admin/
│   │       ├── index.vue               # Dashboard
│   │       ├── login.vue               # Login page
│   │       ├── [collection]/
│   │       │   ├── index.vue           # List view
│   │       │   ├── create.vue          # Create form
│   │       │   └── [id].vue            # Edit form
│   │       └── media/
│   │           └── index.vue           # Media library
│   │
│   └── server/
│       ├── api/
│       │   └── cms/
│       │       ├── [...collection].ts  # Dynamic CRUD API
│       │       └── media/
│       │           ├── upload.ts       # File upload
│       │           └── [...path].ts    # File serving
│       │
│       ├── middleware/
│       │   └── cms-auth.ts             # Auth middleware
│       │
│       ├── services/
│       │   ├── collection-registry.ts  # Collection management
│       │   ├── crud.ts                 # CRUD operations
│       │   ├── validation.ts           # Validation logic
│       │   ├── hooks.ts                # Hook execution
│       │   ├── versioning.ts           # Version control
│       │   ├── media.ts                # Media handling
│       │   └── auth.ts                 # Auth service
│       │
│       └── utils/
│           ├── drizzle-adapter.ts      # Drizzle integration
│           ├── type-inference.ts       # Type utilities
│           └── query-builder.ts        # Query helpers
│
└── templates/                          # Build-time templates
    ├── cms-collections.mjs             # Virtual module for collections
    └── cms-types.d.ts                  # Generated types
```

---

## 🔧 Implementation Details

### **Phase 1: Core System** (Priority: HIGH)

#### 1.1 Module Options Interface

```typescript
// src/module.ts
export interface ModuleOptions {
  // Collection registration
  collections?: Record<string, string>  // { name: path }
  
  // Database configuration
  database: {
    connection: () => DrizzleInstance  // User-provided function
  }
  
  // Admin panel configuration
  admin?: {
    enabled?: boolean                   // Default: true
    route?: string                      // Default: '/admin'
    password?: string                   // Basic auth password
    title?: string                      // Admin panel title
  }
  
  // API configuration
  api?: {
    prefix?: string                     // Default: '/api/cms'
    rateLimit?: number                  // Requests per minute
  }
  
  // Feature flags
  features?: {
    versioning?: boolean                // Default: false
    media?: boolean                     // Default: true
  }
  
  // Media configuration
  media?: {
    uploadDir?: string                  // Default: 'public/uploads'
    maxSize?: number                    // Max file size in bytes
    allowedTypes?: string[]             // MIME types
  }
}
```

#### 1.2 Core Types (`src/runtime/types.ts`)

```typescript
import type { Table } from 'drizzle-orm'
import type { z } from 'zod'

// Collection definition
export interface CollectionDefinition<T extends Table = any> {
  name: string
  schema: T
  fields: FieldDefinition[]
  options?: CollectionOptions
  hooks?: CollectionHooks
}

// Field definition
export interface FieldDefinition {
  name: string
  type: FieldType
  label?: string
  description?: string
  required?: boolean
  validation?: ValidationRule[]
  widget?: WidgetConfig
  defaultValue?: any
}

// Field types
export type FieldType = 
  | 'text' 
  | 'textarea' 
  | 'number' 
  | 'date' 
  | 'datetime'
  | 'boolean' 
  | 'select' 
  | 'multiselect'
  | 'richtext' 
  | 'file' 
  | 'image'
  | 'relation' 
  | 'json'
  | 'array'

// Widget configuration
export interface WidgetConfig {
  component?: string                    // Custom widget component
  props?: Record<string, any>           // Widget props
  [key: string]: any                    // Widget-specific config
}

// Validation rules
export type ValidationRule = 
  | { type: 'required'; message?: string }
  | { type: 'min'; value: number; message?: string }
  | { type: 'max'; value: number; message?: string }
  | { type: 'pattern'; value: RegExp | string; message?: string }
  | { type: 'email'; message?: string }
  | { type: 'url'; message?: string }
  | { type: 'custom'; fn: (value: any) => boolean | Promise<boolean>; message?: string }

// Collection options
export interface CollectionOptions {
  label?: string                        // Display name
  description?: string
  icon?: string                         // Icon for admin UI
  sortable?: boolean                    // Enable sorting
  searchable?: boolean                  // Enable search
  defaultSort?: { field: string; order: 'asc' | 'desc' }
  perPage?: number                      // Pagination
}

// Lifecycle hooks
export interface CollectionHooks<T = any> {
  beforeCreate?: (data: Partial<T>) => Promise<Partial<T>> | Partial<T>
  afterCreate?: (record: T) => Promise<void> | void
  beforeUpdate?: (id: any, data: Partial<T>) => Promise<Partial<T>> | Partial<T>
  afterUpdate?: (record: T) => Promise<void> | void
  beforeDelete?: (id: any) => Promise<boolean> | boolean
  afterDelete?: (id: any) => Promise<void> | void
  validate?: (data: Partial<T>) => Promise<ValidationError[]> | ValidationError[]
}

// Validation error
export interface ValidationError {
  field: string
  message: string
  type: string
}

// CRUD context
export interface CrudContext {
  user?: any                            // Authenticated user
  collection: string
  operation: 'create' | 'read' | 'update' | 'delete'
}
```

#### 1.3 Collection Factory (`src/runtime/composables/defineCollection.ts`)

```typescript
import type { CollectionDefinition } from '../types'

export function defineCollection<T>(
  definition: CollectionDefinition<T>
): CollectionDefinition<T> {
  // Validate collection definition
  if (!definition.name || !definition.schema) {
    throw new Error('Collection must have name and schema')
  }
  
  // Return validated definition
  return {
    ...definition,
    options: {
      sortable: true,
      searchable: true,
      perPage: 25,
      ...definition.options
    }
  }
}
```

#### 1.4 Module Setup (`src/module.ts`)

**Key steps:**
1. Load collection files from config
2. Generate virtual module with collections
3. Add type definitions
4. Register server handlers
5. Add admin pages
6. Configure authentication

```typescript
import { defineNuxtModule, createResolver, addServerHandler, 
         extendPages, addTemplate, addTypeTemplate, addComponent,
         addComponentsDir } from '@nuxt/kit'
import { joinURL } from 'ufo'
import { resolve } from 'pathe'

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-cms',
    configKey: 'cms'
  },
  
  defaults: {
    collections: {},
    admin: {
      enabled: true,
      route: '/admin',
      title: 'CMS Admin'
    },
    api: {
      prefix: '/api/cms'
    },
    features: {
      versioning: false,
      media: true
    },
    media: {
      uploadDir: 'public/uploads',
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/*', 'application/pdf']
    }
  },
  
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)
    
    // 1. Validate configuration
    if (!options.database?.connection) {
      throw new Error('CMS module requires database.connection option')
    }
    
    // 2. Load and validate collections
    const collections = await loadCollections(options, nuxt)
    
    // 3. Generate virtual module with collections
    addTemplate({
      filename: 'cms-collections.mjs',
      getContents: () => generateCollectionsModule(collections, options),
      write: true
    })
    
    // 4. Generate TypeScript types
    addTypeTemplate({
      filename: 'types/cms.d.ts',
      getContents: () => generateTypes(collections)
    })
    
    // 5. Add server handlers
    addServerHandler({
      route: joinURL(options.api.prefix, '/**'),
      handler: resolver.resolve('./runtime/server/api/cms/[...collection]')
    })
    
    if (options.features.media) {
      addServerHandler({
        route: joinURL(options.api.prefix, '/media/**'),
        handler: resolver.resolve('./runtime/server/api/cms/media/[...path]')
      })
    }
    
    // 6. Add admin pages
    if (options.admin?.enabled) {
      extendPages((pages) => {
        pages.push(
          {
            name: 'cms-admin',
            path: options.admin.route,
            file: resolver.resolve('./runtime/pages/admin/index.vue')
          },
          // ... more pages
        )
      })
      
      // Add components
      addComponentsDir({
        path: resolver.resolve('./runtime/components'),
        prefix: 'Cms'
      })
    }
    
    // 7. Store options in runtime config
    nuxt.options.runtimeConfig.cms = {
      ...options,
      database: undefined // Don't expose connection
    }
    
    nuxt.options.runtimeConfig.public.cms = {
      admin: {
        route: options.admin.route,
        title: options.admin.title
      },
      api: {
        prefix: options.api.prefix
      }
    }
  }
})

async function loadCollections(options, nuxt) {
  const collections = []
  
  for (const [name, path] of Object.entries(options.collections || {})) {
    const fullPath = resolve(nuxt.options.rootDir, path)
    try {
      const mod = await import(fullPath)
      const collection = mod.default
      
      if (!collection.name) {
        collection.name = name
      }
      
      collections.push(collection)
    } catch (err) {
      console.error(`Failed to load collection "${name}":`, err)
    }
  }
  
  return collections
}

function generateCollectionsModule(collections, options) {
  return `
export const collections = ${JSON.stringify(
    collections.map(c => ({ 
      name: c.name, 
      options: c.options,
      fields: c.fields
    })),
    null,
    2
  )}

export function getCollection(name) {
  return collections.find(c => c.name === name)
}

export function getAllCollections() {
  return collections
}
`
}

function generateTypes(collections) {
  return `
declare module '#cms' {
  import type { CollectionDefinition } from '${resolver.resolve('./runtime/types')}'
  
  export const collections: CollectionDefinition[]
  export function getCollection(name: string): CollectionDefinition | undefined
  export function getAllCollections(): CollectionDefinition[]
  
  export { defineCollection } from '${resolver.resolve('./runtime/composables/defineCollection')}'
}

declare module 'nuxt/schema' {
  interface PublicRuntimeConfig {
    cms: {
      admin: {
        route: string
        title: string
      }
      api: {
        prefix: string
      }
    }
  }
}

export {}
`
}
```

#### 1.5 REST API Handler (`src/runtime/server/api/cms/[...collection].ts`)

```typescript
import { defineEventHandler, getRouterParams, getMethod, 
         readBody, getQuery, createError } from 'h3'
import { getCollection } from '#cms'
import { CrudService } from '../../services/crud'
import { checkAuth } from '../../middleware/cms-auth'

export default defineEventHandler(async (event) => {
  // Check authentication
  await checkAuth(event)
  
  const params = getRouterParams(event)
  const path = params.collection?.split('/') || []
  const collectionName = path[0]
  const id = path[1]
  
  // Get collection
  const collection = getCollection(collectionName)
  if (!collection) {
    throw createError({
      statusCode: 404,
      message: `Collection "${collectionName}" not found`
    })
  }
  
  const crudService = new CrudService(collection, event)
  const method = getMethod(event)
  
  try {
    switch (method) {
      case 'GET':
        if (id) {
          return await crudService.findOne(id)
        } else {
          const query = getQuery(event)
          return await crudService.findMany(query)
        }
        
      case 'POST':
        const createData = await readBody(event)
        return await crudService.create(createData)
        
      case 'PUT':
      case 'PATCH':
        if (!id) {
          throw createError({ statusCode: 400, message: 'ID required' })
        }
        const updateData = await readBody(event)
        return await crudService.update(id, updateData)
        
      case 'DELETE':
        if (!id) {
          throw createError({ statusCode: 400, message: 'ID required' })
        }
        return await crudService.delete(id)
        
      default:
        throw createError({
          statusCode: 405,
          message: `Method ${method} not allowed`
        })
    }
  } catch (error) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
```

#### 1.6 CRUD Service (`src/runtime/server/services/crud.ts`)

```typescript
import type { H3Event } from 'h3'
import type { CollectionDefinition, CrudContext } from '../../types'
import { getDrizzleConnection } from '../utils/drizzle-adapter'
import { executeHooks } from './hooks'
import { validateData } from './validation'

export class CrudService {
  constructor(
    private collection: CollectionDefinition,
    private event: H3Event
  ) {}
  
  private get db() {
    return getDrizzleConnection()
  }
  
  private get context(): CrudContext {
    return {
      collection: this.collection.name,
      operation: 'read',
      user: this.event.context.user
    }
  }
  
  async findMany(query: any = {}) {
    const { page = 1, perPage = 25, sort, filter, search } = query
    
    let dbQuery = this.db.select().from(this.collection.schema)
    
    // Apply filters
    if (filter) {
      // TODO: Implement filtering
    }
    
    // Apply search
    if (search && this.collection.options?.searchable) {
      // TODO: Implement search
    }
    
    // Apply sorting
    if (sort) {
      // TODO: Implement sorting
    }
    
    // Apply pagination
    const offset = (page - 1) * perPage
    dbQuery = dbQuery.limit(perPage).offset(offset)
    
    const items = await dbQuery
    const total = await this.count(filter, search)
    
    return {
      items,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage)
    }
  }
  
  async findOne(id: any) {
    const results = await this.db
      .select()
      .from(this.collection.schema)
      .where(eq(this.collection.schema.id, id))
      .limit(1)
    
    return results[0] || null
  }
  
  async create(data: any) {
    const context = { ...this.context, operation: 'create' as const }
    
    // Execute beforeCreate hook
    if (this.collection.hooks?.beforeCreate) {
      data = await executeHooks(
        this.collection.hooks.beforeCreate,
        data,
        context
      )
    }
    
    // Validate data
    const errors = await validateData(this.collection, data)
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${JSON.stringify(errors)}`)
    }
    
    // Insert record
    const [record] = await this.db
      .insert(this.collection.schema)
      .values(data)
      .returning()
    
    // Execute afterCreate hook
    if (this.collection.hooks?.afterCreate) {
      await executeHooks(
        this.collection.hooks.afterCreate,
        record,
        context
      )
    }
    
    return record
  }
  
  async update(id: any, data: any) {
    const context = { ...this.context, operation: 'update' as const }
    
    // Execute beforeUpdate hook
    if (this.collection.hooks?.beforeUpdate) {
      data = await executeHooks(
        this.collection.hooks.beforeUpdate,
        { id, ...data },
        context
      )
    }
    
    // Validate data
    const errors = await validateData(this.collection, data)
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${JSON.stringify(errors)}`)
    }
    
    // Update record
    const [record] = await this.db
      .update(this.collection.schema)
      .set(data)
      .where(eq(this.collection.schema.id, id))
      .returning()
    
    // Execute afterUpdate hook
    if (this.collection.hooks?.afterUpdate) {
      await executeHooks(
        this.collection.hooks.afterUpdate,
        record,
        context
      )
    }
    
    return record
  }
  
  async delete(id: any) {
    const context = { ...this.context, operation: 'delete' as const }
    
    // Execute beforeDelete hook
    if (this.collection.hooks?.beforeDelete) {
      const shouldContinue = await executeHooks(
        this.collection.hooks.beforeDelete,
        id,
        context
      )
      if (shouldContinue === false) {
        throw new Error('Delete operation cancelled by hook')
      }
    }
    
    // Delete record
    await this.db
      .delete(this.collection.schema)
      .where(eq(this.collection.schema.id, id))
    
    // Execute afterDelete hook
    if (this.collection.hooks?.afterDelete) {
      await executeHooks(
        this.collection.hooks.afterDelete,
        id,
        context
      )
    }
    
    return { success: true }
  }
  
  private async count(filter?: any, search?: string) {
    // TODO: Implement count with filters
    return 0
  }
}
```

---

### **Phase 2: Validation & Hooks** (Priority: MEDIUM)

#### 2.1 Validation Service (`src/runtime/server/services/validation.ts`)

```typescript
import type { CollectionDefinition, FieldDefinition, ValidationError } from '../../types'
import { z } from 'zod'

export async function validateData(
  collection: CollectionDefinition,
  data: any
): Promise<ValidationError[]> {
  const errors: ValidationError[] = []
  
  // Validate each field
  for (const field of collection.fields) {
    const value = data[field.name]
    
    // Check required
    if (field.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field: field.name,
        message: `${field.label || field.name} is required`,
        type: 'required'
      })
      continue
    }
    
    // Skip validation if no value
    if (value === undefined || value === null) continue
    
    // Validate against rules
    if (field.validation) {
      for (const rule of field.validation) {
        const error = await validateRule(field, value, rule)
        if (error) {
          errors.push(error)
        }
      }
    }
  }
  
  // Execute custom validation hook
  if (collection.hooks?.validate) {
    const customErrors = await collection.hooks.validate(data)
    errors.push(...customErrors)
  }
  
  return errors
}

async function validateRule(
  field: FieldDefinition,
  value: any,
  rule: any
): Promise<ValidationError | null> {
  switch (rule.type) {
    case 'required':
      // Already checked above
      return null
      
    case 'min':
      if (typeof value === 'number' && value < rule.value) {
        return {
          field: field.name,
          message: rule.message || `Must be at least ${rule.value}`,
          type: 'min'
        }
      }
      if (typeof value === 'string' && value.length < rule.value) {
        return {
          field: field.name,
          message: rule.message || `Must be at least ${rule.value} characters`,
          type: 'min'
        }
      }
      break
      
    case 'max':
      if (typeof value === 'number' && value > rule.value) {
        return {
          field: field.name,
          message: rule.message || `Must be at most ${rule.value}`,
          type: 'max'
        }
      }
      if (typeof value === 'string' && value.length > rule.value) {
        return {
          field: field.name,
          message: rule.message || `Must be at most ${rule.value} characters`,
          type: 'max'
        }
      }
      break
      
    case 'pattern':
      const regex = typeof rule.value === 'string' 
        ? new RegExp(rule.value) 
        : rule.value
      if (!regex.test(value)) {
        return {
          field: field.name,
          message: rule.message || 'Invalid format',
          type: 'pattern'
        }
      }
      break
      
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        return {
          field: field.name,
          message: rule.message || 'Invalid email address',
          type: 'email'
        }
      }
      break
      
    case 'url':
      try {
        new URL(value)
      } catch {
        return {
          field: field.name,
          message: rule.message || 'Invalid URL',
          type: 'url'
        }
      }
      break
      
    case 'custom':
      const isValid = await rule.fn(value)
      if (!isValid) {
        return {
          field: field.name,
          message: rule.message || 'Validation failed',
          type: 'custom'
        }
      }
      break
  }
  
  return null
}
```

#### 2.2 Hooks Service (`src/runtime/server/services/hooks.ts`)

```typescript
import type { CrudContext } from '../../types'

export async function executeHooks<T>(
  hook: Function,
  data: T,
  context: CrudContext
): Promise<T> {
  try {
    const result = await hook(data, context)
    return result !== undefined ? result : data
  } catch (error) {
    console.error(`Hook execution failed in ${context.collection}:`, error)
    throw error
  }
}
```

---

### **Phase 3: Admin UI** (Priority: MEDIUM)

#### 3.1 Basic Authentication (`src/runtime/server/middleware/cms-auth.ts`)

```typescript
import { defineEventHandler, getCookie, setCookie, 
         getHeader, createError } from 'h3'
import { useRuntimeConfig } from '#imports'

const SESSION_COOKIE = 'cms-session'

export async function checkAuth(event: H3Event) {
  const config = useRuntimeConfig()
  
  // Skip if no password configured
  if (!config.cms.admin?.password) {
    return true
  }
  
  // Check session cookie
  const session = getCookie(event, SESSION_COOKIE)
  if (session === config.cms.admin.password) {
    return true
  }
  
  // Check authorization header
  const auth = getHeader(event, 'authorization')
  if (auth === `Bearer ${config.cms.admin.password}`) {
    // Set session cookie
    setCookie(event, SESSION_COOKIE, config.cms.admin.password, {
      httpOnly: true,
      secure: true,
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })
    return true
  }
  
  throw createError({
    statusCode: 401,
    message: 'Unauthorized'
  })
}

export default defineEventHandler(async (event) => {
  // Apply to admin routes and API
  const path = event.path
  const config = useRuntimeConfig()
  
  if (path.startsWith(config.public.cms.admin.route) || 
      path.startsWith(config.public.cms.api.prefix)) {
    await checkAuth(event)
  }
})
```

#### 3.2 Admin Pages (Structure only - detailed implementation in execution phase)

**Key pages:**
- `/admin` - Dashboard showing all collections
- `/admin/login` - Login form
- `/admin/:collection` - List view with filters/search
- `/admin/:collection/create` - Create new record
- `/admin/:collection/:id` - Edit existing record
- `/admin/media` - Media library browser

---

### **Phase 4: Advanced Features** (Priority: LOW)

Will be implemented after core system is working. Includes:
- Extensible widget system
- Media library with upload/browse
- Versioning and revision history

---

## 📝 Example Usage

### 1. Install Dependencies

```bash
npm install drizzle-orm zod pathe
npm install -D drizzle-kit
```

### 2. Configure Module

```typescript
// nuxt.config.ts
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'

const sqlite = new Database('cms.db')
const db = drizzle(sqlite)

export default defineNuxtConfig({
  modules: ['nuxt-cms'],
  
  cms: {
    collections: {
      products: './cms/products.ts',
      pages: './cms/pages.ts',
      categories: './cms/categories.ts'
    },
    
    database: {
      connection: () => db
    },
    
    admin: {
      password: process.env.CMS_PASSWORD || 'admin123'
    },
    
    features: {
      versioning: true,
      media: true
    }
  }
})
```

### 3. Define Collections

```typescript
// cms/products.ts
import { defineCollection } from '#cms'
import { products } from '~/server/database/schema'

export default defineCollection({
  name: 'products',
  schema: products,
  
  options: {
    label: 'Products',
    icon: 'shopping-cart',
    sortable: true,
    searchable: true,
    defaultSort: { field: 'createdAt', order: 'desc' }
  },
  
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Product Name',
      required: true,
      validation: [
        { type: 'min', value: 3, message: 'Name must be at least 3 characters' },
        { type: 'max', value: 100 }
      ]
    },
    {
      name: 'slug',
      type: 'text',
      label: 'URL Slug',
      required: true,
      validation: [
        { type: 'pattern', value: /^[a-z0-9-]+$/, message: 'Only lowercase letters, numbers, and hyphens' }
      ]
    },
    {
      name: 'description',
      type: 'richtext',
      label: 'Description',
      widget: {
        toolbar: ['bold', 'italic', 'link', 'bulletList', 'orderedList']
      }
    },
    {
      name: 'price',
      type: 'number',
      label: 'Price',
      required: true,
      validation: [
        { type: 'min', value: 0, message: 'Price must be positive' }
      ]
    },
    {
      name: 'image',
      type: 'image',
      label: 'Product Image'
    },
    {
      name: 'category',
      type: 'relation',
      label: 'Category',
      widget: {
        collection: 'categories',
        displayField: 'name'
      }
    },
    {
      name: 'tags',
      type: 'array',
      label: 'Tags',
      widget: {
        itemType: 'text'
      }
    },
    {
      name: 'active',
      type: 'boolean',
      label: 'Active',
      defaultValue: true
    }
  ],
  
  hooks: {
    beforeCreate: async (data) => {
      // Auto-generate slug if not provided
      if (!data.slug && data.name) {
        data.slug = data.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      }
      return data
    },
    
    afterUpdate: async (record) => {
      // Clear cache or trigger rebuild
      console.log(`Product ${record.id} updated`)
    },
    
    validate: async (data) => {
      const errors = []
      
      // Check for duplicate slug
      if (data.slug) {
        // TODO: Check database for existing slug
      }
      
      return errors
    }
  }
})
```

### 4. Use in Application

```vue
<!-- pages/products/index.vue -->
<script setup lang="ts">
const { data: products } = await useFetch('/api/cms/products')
</script>

<template>
  <div>
    <h1>Products</h1>
    <div v-for="product in products.items" :key="product.id">
      <h2>{{ product.name }}</h2>
      <p>{{ product.price }}</p>
    </div>
  </div>
</template>
```

---

## ✅ Testing Strategy

### Basic Vitest Tests

```typescript
// test/collection-definition.test.ts
import { describe, it, expect } from 'vitest'
import { defineCollection } from '../src/runtime/composables/defineCollection'

describe('defineCollection', () => {
  it('should create a valid collection', () => {
    const collection = defineCollection({
      name: 'test',
      schema: {} as any,
      fields: []
    })
    
    expect(collection.name).toBe('test')
    expect(collection.options.sortable).toBe(true)
  })
})

// test/validation.test.ts
import { describe, it, expect } from 'vitest'
import { validateData } from '../src/runtime/server/services/validation'

describe('validateData', () => {
  it('should validate required fields', async () => {
    const collection = {
      name: 'test',
      fields: [
        { name: 'title', type: 'text', required: true }
      ]
    }
    
    const errors = await validateData(collection as any, {})
    expect(errors).toHaveLength(1)
    expect(errors[0].field).toBe('title')
  })
})
```

---

## 🚀 Implementation Order

1. **Setup** (30 min)
   - Add dependencies
   - Update package.json
   - Create folder structure

2. **Core Types & Factory** (1 hour)
   - Create types.ts
   - Implement defineCollection
   - Test with basic examples

3. **Module Registration** (2 hours)
   - Update module.ts
   - Implement collection loading
   - Generate virtual modules
   - Add type generation

4. **CRUD Services** (3 hours)
   - Drizzle adapter
   - CRUD service implementation
   - REST API handler
   - Test with playground

5. **Validation & Hooks** (2 hours)
   - Validation service
   - Hook execution
   - Integration tests

6. **Basic Auth** (1 hour)
   - Auth middleware
   - Session management
   - Test protection

7. **Admin UI Foundation** (4 hours)
   - Layout component
   - Dashboard page
   - List view
   - Form generation

8. **Advanced Features** (Later)
   - Custom widgets
   - Media library
   - Versioning

---

## ❓ Design Decisions

1. **Drizzle Instance:** Factory function for lazy initialization via `database.connection: () => db`

2. **Type Safety:** Field names validated against Drizzle schema at build time with warnings

3. **Playground Example:** Full working example with SQLite database included

---

## 📌 Next Steps

Follow the implementation order above, starting with:
1. Add dependencies to package.json
2. Create core types and interfaces
3. Implement defineCollection factory
4. Build module registration system
5. Create CRUD services and REST API
6. Add validation and hooks
7. Build admin UI foundation
