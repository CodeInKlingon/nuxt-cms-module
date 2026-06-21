

import { defineCustomPage } from '@codeinklingon/nuxt-cms/runtime/composables/defineCustomPage'

export default defineCustomPage({
  name: 'media',
  label: 'Media Library',
  icon: 'i-lucide-image',
  component: './cms/pages/MediaLibrary.vue',
})
