import { defineCollection } from '../../src/runtime/composables/defineCollection'
import { pages } from '../server/database/schema'

export default defineCollection({
  name: 'pages',
  schema: pages,

  options: {
    label: 'Pages',
    icon: 'i-lucide-file-text',
    sortable: true,
    searchable: true,
  },

  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Page Title',
      required: true,
      validation: [
        { type: 'min', value: 3 },
        { type: 'max', value: 200 },
      ],
    },
    {
      name: 'slug',
      type: 'text',
      label: 'URL Slug',
      required: true,
      validation: [
        { type: 'pattern', value: /^[a-z0-9-/]+$/, message: 'Only lowercase letters, numbers, hyphens, and slashes' },
      ],
    },
    {
      name: 'content',
      type: 'textarea',
      label: 'Content',
    },
    {
      name: 'published',
      type: 'boolean',
      label: 'Published',
      defaultValue: false,
    },
  ],

  hooks: {
    beforeCreate: async (data) => {
      // Auto-generate slug from title if not provided
      if (!data.slug && data.title) {
        data.slug = data.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      }
      return data
    },
  },
})
