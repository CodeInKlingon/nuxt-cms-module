import {
  defineNuxtModule,
  addPlugin,
  createResolver,
  addServerHandler,
  addServerTemplate,
  addTemplate,
  addTypeTemplate,
  addComponentsDir,
  extendPages,
  useLogger,
  addLayout,
  addRouteMiddleware,
  addServerPlugin,
} from '@nuxt/kit'
import { joinURL } from 'ufo'
import { resolve, dirname } from 'pathe'
import type { CollectionDefinition } from './runtime/types'
import { registerCollections, setDrizzleConnection } from './runtime/server/plugins/database'

// Module options TypeScript interface definition
export interface ModuleOptions {
  // Path to the user's Drizzle database file (must have a default export of the db instance)
  database?: string

  // Collection registration
  collections?: Record<string, string>  // { name: path }

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
    compatibility: {
      nuxt: '>=4.0.0',
    },
  },

  moduleDependencies(nuxt) {
    const dependencies: Record<string, any> = {}

    // Only require UI modules if admin panel is enabled
    const cmsOptions = (nuxt.options as any).cms as ModuleOptions | undefined
    if (cmsOptions?.admin?.enabled !== false) {
      dependencies['@nuxt/ui'] = {
        version: '>=4.0.0',
      }
      dependencies['@nuxt/icon'] = {
        version: '>=2.0.0',
      }
      dependencies['nuxt-auth-utils'] = {
        version: '>=0.5.0',
      }
    }

    return dependencies
  },

  // Default configuration options of the Nuxt module
  defaults: {
    database: undefined,
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

    // const collections = await loadCollections(options, nuxt, logger)

    // logger.info(`Loaded ${collections.length} collection(s): ${collections.map(c => c.name).join(', ')}`)


    // If collections are defined, generate virtual server barrel export file
    if (options.collections && Object.keys(options.collections).length > 0) {
      const toPath = (p: string) => p.replace(/\\/g, '/')

      const colImports = Object.entries(options.collections).map(([, relPath], i) => {
        const absPath = resolve(nuxt.options.rootDir, relPath)
        return `import _col${i} from '${toPath(absPath)}'`
      })
      .join('\n')

      const colArray = Object.entries(options.collections).map((_, i) => `_col${i}`).join(', ')

      addServerTemplate({
        filename: '#my-module/collections.mjs',
        getContents: () => `${colImports}
        export const collections = [${colArray}]`
      });
    }

    if (options.database) {
      addServerTemplate({
        filename: '#my-module/db.mjs',
        getContents: () => `export { default } from '${resolve(nuxt.options.rootDir, options.database!)}'`,
      })
    }
    else {
      logger.warn(
        'No `database` path configured for nuxt-cms. '
        + 'The CMS API will not function until a Drizzle db connection is provided. '
        + 'Add `cms.database` to your nuxt.config.ts pointing to a file with a default export of your Drizzle db instance.',
      )
    }

    // // 4. Generate virtual module with collections
    // addTemplate({
    //   filename: 'cms-collections.mjs',
    //   getContents: () => generateCollectionsModule(collections),
    //   write: true,
    // })

    // 5. Generate TypeScript types
    addTypeTemplate({
      filename: 'types/cms.d.ts',
      getContents: () => generateTypes(resolver),
    })

    // 6. Add server handlers for API
    // Explicitly register auth middleware (Nitro won't auto-discover middleware from module source)
    addServerHandler({
      middleware: true,
      handler: resolver.resolve('./runtime/server/middleware/cms-auth'),
    })

    // Auth endpoints (must be registered before the catch-all /** route)
    addServerHandler({
      route: joinURL(options.api?.prefix || '/api/cms', '/auth/login'),
      handler: resolver.resolve('./runtime/server/api/cms/auth/login'),
    })
    addServerHandler({
      route: joinURL(options.api?.prefix || '/api/cms', '/auth/logout'),
      handler: resolver.resolve('./runtime/server/api/cms/auth/logout'),
    })

    // Collections metadata endpoint — must be before the catch-all
    addServerHandler({
      route: joinURL(options.api?.prefix || '/api/cms', '/collections'),
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/cms/collections/index.get'),
    })

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

    // 7. Add admin pages if enabled
    if (options.admin?.enabled) {
      logger.info(`Admin panel will be available at ${options.admin.route}`)

      // Add admin pages
      extendPages((pages) => {
        const adminRoute = options.admin?.route || '/admin'

        pages.push(
          {
            name: 'cms-admin-dashboard',
            path: adminRoute,
            file: resolver.resolve('./runtime/pages/admin/index.vue'),
          },
          {
            name: 'cms-admin-login',
            path: `${adminRoute}/login`,
            file: resolver.resolve('./runtime/pages/admin/login.vue'),
          },
          {
            name: 'cms-admin-collection-list',
            path: `${adminRoute}/:collection`,
            file: resolver.resolve('./runtime/pages/admin/[collection]/index.vue'),
          },
          {
            name: 'cms-admin-collection-create',
            path: `${adminRoute}/:collection/create`,
            file: resolver.resolve('./runtime/pages/admin/[collection]/create.vue'),
          },
          {
            name: 'cms-admin-collection-edit',
            path: `${adminRoute}/:collection/:id`,
            file: resolver.resolve('./runtime/pages/admin/[collection]/[id].vue'),
          },
        )
      })

      // Add components directory for admin UI
      addComponentsDir({
        path: resolver.resolve('./runtime/components'),
        prefix: 'Cms',
      })

      // Add admin layouts
      addLayout(
        resolver.resolve('./runtime/layouts/cms-admin.vue'),
        'cms-admin',
      )
      addLayout(
        resolver.resolve('./runtime/layouts/cms-login.vue'),
        'cms-login',
      )

      // Add client-side route guard middleware
      addRouteMiddleware({
        name: 'cms-admin-auth',
        path: resolver.resolve('./runtime/middleware/cms-admin-auth'),
        global: true,
      })
    }

    // 8. Store options in runtime config
    nuxt.options.runtimeConfig.cms = {
      admin: {
        password: options.admin?.password,
      },
    } as any

    nuxt.options.runtimeConfig.public.cms = {
      admin: {
        route: options.admin?.route || '/admin',
        title: options.admin?.title || 'CMS Admin',
      },
      api: {
        prefix: options.api?.prefix || '/api/cms',
      },
    }

    // Do not add the extension since the `.ts` will be transpiled to `.mjs` after `npm run prepack`
    addPlugin(resolver.resolve('./runtime/plugin'))

    addServerPlugin(resolver.resolve('./runtime/server/plugins/db.ts'))
  },
})

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
    }
  }
}

export {}
`
}
