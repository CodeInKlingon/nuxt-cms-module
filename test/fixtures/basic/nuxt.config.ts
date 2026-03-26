import MyModule from '../../../src/module'

export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@nuxt/icon',
    MyModule,
  ],
})
