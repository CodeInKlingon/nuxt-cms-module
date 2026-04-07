import { randomBooleanWidget } from './cms/widgets/random-boolean'

export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@nuxt/icon',
    'nuxt-cms',
  ],
  devtools: { enabled: true },
  compatibilityDate: 'latest',

  cms: {
    database: './server/database/index.ts',

    collections: {
      products: './cms/collections/products.ts',
      pages: './cms/collections/pages.ts',
    },

    widgets: [
      randomBooleanWidget,
    ],

    auth: {
      // handler: './server/cms-auth.ts',
      // loginPage: './app/components/CustomLoginForm.vue',
    },

    admin: {
      enabled: true,
      password: process.env.CMS_PASSWORD || 'admin123',
      title: 'CMS Demo',
    },

    features: {
      versioning: false,
      media: true,
    },
  },
})
