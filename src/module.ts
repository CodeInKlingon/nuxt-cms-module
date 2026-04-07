import {
  defineNuxtModule,
  addPlugin,
  createResolver,
  addServerHandler,
  addServerTemplate,
  addTypeTemplate,
  addComponentsDir,
  addComponent,
  extendPages,
  useLogger,
  addLayout,
  addRouteMiddleware,
  addServerPlugin,
  addImports,
} from '@nuxt/kit'
import { joinURL } from 'ufo'
import { resolve } from 'pathe'

// Module options TypeScript interface definition
export interface ModuleOptions {
  // Path to the user's Drizzle database file (must have a default export of the db instance)
  database?: string

  // Collection registration
  collections?: Record<string, string> // { name: path }

  // Admin panel configuration
  admin?: {
    enabled?: boolean // Default: true
    route?: string // Default: '/admin'
    password?: string // Basic auth password
    title?: string // Admin panel title
  }

  // Authentication configuration
  auth?: {
    handler?: string // Path to custom auth handler (server file)
    loginPage?: string // Path to custom login form component (.vue file)
  }

  // API configuration
  api?: {
    prefix?: string // Default: '/api/cms'
    rateLimit?: number // Requests per minute
  }

  // Feature flags
  features?: {
    versioning?: boolean // Default: false
    media?: boolean // Default: true
  }

  // Media configuration
  media?: {
    uploadDir?: string // Default: 'public/uploads'
    maxSize?: number // Max file size in bytes
    allowedTypes?: string[] // MIME types
  }

  // Widget configuration
  widgets?: Array<() => any> // User-defined widgets from defineWidget()
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
export const collections = [${colArray}]`,
      })
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

    // Auth handler virtual template (stub or user-provided)
    if (options.auth?.handler) {
      addServerTemplate({
        filename: '#my-module/auth-handler.mjs',
        getContents: () => `export { default } from '${resolve(nuxt.options.rootDir, options.auth!.handler!)}'`,
      })
    }
    else {
      addServerTemplate({
        filename: '#my-module/auth-handler.mjs',
        getContents: () => 'export default null',
      })
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

      // Add custom login form component if provided
      if (options.auth?.loginPage) {
        addComponent({
          name: 'CmsCustomLoginForm',
          filePath: resolve(nuxt.options.rootDir, options.auth.loginPage),
          priority: 10, // Ensure it takes precedence over any default component with the same name
        })
      }

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nuxt.options.runtimeConfig.cms = {
      admin: {
        password: options.admin?.password,
      },
      auth: {
        hasCustomHandler: !!options.auth?.handler,
      },
    } as any

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nuxt.options.runtimeConfig.public.cms = {
      admin: {
        route: options.admin?.route || '/admin',
        title: options.admin?.title || 'CMS Admin',
      },
      api: {
        prefix: options.api?.prefix || '/api/cms',
      },
      auth: {
        hasCustomLoginPage: !!options.auth?.loginPage,
      },
    } as any

    // Do not add the extension since the `.ts` will be transpiled to `.mjs` after `npm run prepack`
    addPlugin(resolver.resolve('./runtime/plugin'))

    addServerPlugin(resolver.resolve('./runtime/server/plugins/db.ts'))

    // 9. Widget system setup
    setupWidgets(options, nuxt, resolver, logger)
  },
})

/**
 * Setup widget system - auto-imports and registry
 */
function setupWidgets(
  options: ModuleOptions,
  nuxt: any,
  resolver: ReturnType<typeof createResolver>,
  logger: ReturnType<typeof useLogger>,
) {
  // Auto-import widget composables
  addImports([
    { name: 'defineWidget', from: resolver.resolve('./runtime/composables/defineWidget') },
    { name: 'textField', from: resolver.resolve('./runtime/widgets/built-ins') },
    { name: 'numberField', from: resolver.resolve('./runtime/widgets/built-ins') },
    { name: 'textareaField', from: resolver.resolve('./runtime/widgets/built-ins') },
    { name: 'booleanField', from: resolver.resolve('./runtime/widgets/built-ins') },
    { name: 'selectField', from: resolver.resolve('./runtime/widgets/built-ins') },
    { name: 'linkField', from: resolver.resolve('./runtime/widgets/built-ins') },
  ])

  // Collect user-defined widgets
  const userWidgets = options.widgets || []

  // Generate virtual widget registry
  addServerTemplate({
    filename: '#cms/widgets.mjs',
    getContents: () => generateWidgetRegistry(resolver, userWidgets),
  })

  logger.info(`Widget system initialized with ${userWidgets.length} custom widget(s)`)
}

/**
 * Generate widget registry virtual module
 */
function generateWidgetRegistry(
  resolver: ReturnType<typeof createResolver>,
  userWidgets: Array<() => any>,
): string {
  const lines: string[] = [
    '// Auto-generated widget registry',
    '',
    'export const widgetRegistry = {',
    "  text: () => import('${resolver.resolve('./runtime/widgets/built-ins/TextWidget.vue')}'),",
    "  number: () => import('${resolver.resolve('./runtime/widgets/built-ins/NumberWidget.vue')}'),",
    "  textarea: () => import('${resolver.resolve('./runtime/widgets/built-ins/TextareaWidget.vue')}'),",
    "  boolean: () => import('${resolver.resolve('./runtime/widgets/built-ins/BooleanWidget.vue')}'),",
    "  select: () => import('${resolver.resolve('./runtime/widgets/built-ins/SelectWidget.vue')}'),",
  ]

  // Add user-defined widgets if any
  // Note: This is a simplified version - in reality, we'd need to extract
  // widget info from the field functions
  if (userWidgets.length > 0) {
    lines.push('  // User-defined widgets')
    // User widgets would be added here based on their configuration
  }

  lines.push('}')
  lines.push('')
  lines.push('export function getWidget(name) {')
  lines.push('  return widgetRegistry[name]')
  lines.push('}')

  return lines.join('\n')
}

/**
 * Generate TypeScript type definitions
 */
function generateTypes(resolver: ReturnType<typeof createResolver>): string {
  return `
declare module '#cms' {
  import type { CollectionDefinition, CmsAuthVerifyFn, CmsLoginCredentials } from '${resolver.resolve('./runtime/types')}'
  import type { defineWidget, textField, numberField, textareaField, booleanField, selectField } from '${resolver.resolve('./runtime/widgets/built-ins')}'

  export const collections: CollectionDefinition[]
  export function getCollection(name: string): CollectionDefinition | undefined
  export function getAllCollections(): CollectionDefinition[]

  export { defineCollection } from '${resolver.resolve('./runtime/composables/defineCollection')}'
  export { defineWidget, textField, numberField, textareaField, booleanField, selectField }
  export type { CmsAuthVerifyFn, CmsLoginCredentials }
}

declare module '#my-module/auth-handler.mjs' {
  const authHandler: any
  export default authHandler
}

declare module '#my-module/collections.mjs' {
  export const collections: any[]
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
      auth?: {
        hasCustomLoginPage: boolean
      }
    }
  }
}

export {}
`
}
