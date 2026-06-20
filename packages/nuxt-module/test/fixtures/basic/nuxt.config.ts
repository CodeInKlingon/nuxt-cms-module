import MyModule from '../../../src/module'
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@nuxt/icon',
    'nuxt-auth-utils',
    MyModule,
  ],
})
