import {
  defineNuxtModule,
  addPlugin,
  createResolver,
  addServerHandler,
  addTemplate,
  addTypeTemplate,
  addComponentsDir,
  extendPages,
  useLogger,
} from '@nuxt/kit'
import { joinURL } from 'ufo'
import { resolve } from 'pathe'
import type { CollectionDefinition } from './runtime/types'

// Module options TypeScript interface definition
export interface ModuleOptions {
  // Collection registration
  collections?: Record<string, string>  // { name: path }

  // Database configuration
  database?: {
    connection: () => any  // User-provided Drizzle instance factory
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

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-cms',
    configKey: 'cms',
  },

  // Default configuration options of the Nuxt module
  defaults: {
    collections: {},
    admin: {
      enabled: true,
      route: '/admin',
      title: 'CMS Admin',
    },
    api: {
      prefix: '/api/cms',
    },
    features: {
      versioning: false,
      media: true,
    },
    media: {
      uploadDir: 'public/uploads',
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/*', 'application/pdf'],
    },
  },

  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)
    const logger = useLogger('nuxt-cms')

    // 1. Validate configuration
    if (!options.database?.connection) {
      logger.warn('CMS module: database.connection not configured. Collections will not work until configured.')
    }

    // 2. Load and validate collections
    const collections = await loadCollections(options, nuxt, logger)

    logger.info(`Loaded ${collections.length} collection(s): ${collections.map(c => c.name).join(', ')}`)

    // 3. Generate virtual module with collections
    addTemplate({
      filename: 'cms-collections.mjs',
      getContents: () => generateCollectionsModule(collections),
      write: true,
    })

    // 4. Generate TypeScript types
    addTypeTemplate({
      filename: 'types/cms.d.ts',
      getContents: () => generateTypes(resolver),
    })

    // 5. Add server handlers for API
    addServerHandler({
      route: joinURL(options.api?.prefix || '/api/cms', '/**'),
      handler: resolver.resolve('./runtime/server/api/cms/[...collection]'),
    })

    if (options.features?.media) {
      addServerHandler({
        route: joinURL(options.api?.prefix || '/api/cms', '/media/**'),
        handler: resolver.resolve('./runtime/server/api/cms/media/[...path]'),
      })
    }

    // 6. Add admin pages if enabled
    if (options.admin?.enabled) {
      // We'll add pages in a later step
      logger.info(`Admin panel will be available at ${options.admin.route}`)

      // Add components directory for admin UI
      addComponentsDir({
        path: resolver.resolve('./runtime/components'),
        prefix: 'Cms',
      })
    }

    // 7. Store options in runtime config
    nuxt.options.runtimeConfig.cms = {
      admin: {
        password: options.admin?.password,
      },
      collections: collections.map(c => ({
        name: c.name,
        fields: c.fields,
        options: c.options,
      })),
    } as any

    nuxt.options.runtimeConfig.public.cms = {
      admin: {
        route: options.admin?.route || '/admin',
        title: options.admin?.title || 'CMS Admin',
      },
      api: {
        prefix: options.api?.prefix || '/api/cms',
      },
      collections: collections.map(c => ({
        name: c.name,
        fields: c.fields.map(f => ({
          ...f,
          validation: f.validation?.map(rule => {
            // Serialize regex to string for pattern rules
            if ('value' in rule && rule.value instanceof RegExp) {
              return {
                ...rule,
                value: rule.value.toString(), // Convert to full string format "/pattern/flags"
                _isRegex: true, // Mark for deserialization
              }
            }
            return rule
          }),
        })),
        options: c.options,
      })),
    }

    // Do not add the extension since the `.ts` will be transpiled to `.mjs` after `npm run prepack`
    addPlugin(resolver.resolve('./runtime/plugin'))
  },
})

/**
 * Load collection definitions from configured paths
 */
async function loadCollections(
  options: ModuleOptions,
  nuxt: any,
  logger: any,
): Promise<CollectionDefinition[]> {
  const collections: CollectionDefinition[] = []

  if (!options.collections || Object.keys(options.collections).length === 0) {
    logger.warn('No collections configured')
    return collections
  }

  for (const [name, path] of Object.entries(options.collections)) {
    const fullPath = resolve(nuxt.options.rootDir, path)

    try {
      // Dynamically import the collection file
      const mod = await import(fullPath).catch((err) => {
        logger.error(`Failed to import collection "${name}" from ${fullPath}:`, err.message)
        return null
      })

      if (!mod) continue

      const collection = mod.default

      if (!collection) {
        logger.warn(`Collection file "${path}" does not have a default export`)
        continue
      }

      // Ensure collection has a name
      if (!collection.name) {
        collection.name = name
      }

      // Validate collection structure
      if (!collection.schema) {
        logger.warn(`Collection "${name}" is missing a schema`)
        continue
      }

      if (!collection.fields || collection.fields.length === 0) {
        logger.warn(`Collection "${name}" has no fields defined`)
        continue
      }

      collections.push(collection)
      logger.success(`Loaded collection: ${collection.name}`)
    }
    catch (err: any) {
      logger.error(`Failed to load collection "${name}":`, err.message)
    }
  }

  return collections
}

/**
 * Generate the virtual module content for collections
 */
function generateCollectionsModule(collections: CollectionDefinition[]): string {
  return `
export const collections = ${JSON.stringify(
    collections.map(c => ({
      name: c.name,
      options: c.options,
      fields: c.fields,
    })),
    null,
    2,
  )}

export function getCollection(name) {
  return collections.find(c => c.name === name)
}

export function getAllCollections() {
  return collections
}
`
}

/**
 * Generate TypeScript type definitions
 */
function generateTypes(resolver: any): string {
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
      collections: Array<{
        name: string
        fields: any[]
        options?: any
      }>
    }
  }
}

export {}
`
}
