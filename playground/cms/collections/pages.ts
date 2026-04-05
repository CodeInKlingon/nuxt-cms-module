import { defineCollection } from '../../../src/runtime/composables/defineCollection'
import { pages } from '../../server/database/schema'

export default defineCollection({
  name: 'pages',
  schema: pages,
  options: {
    label: 'Pages',
    icon: 'i-lucide-file-text',
    sortable: true,
    searchable: false,
    description: 'Generic webpages',
  },

  dashboard: {
    list: {
      columns: [
        { field: 'title', label: 'Page Title', sortable: true },
        { field: 'slug', label: 'Slug' },
        { field: 'published', label: 'Published' },
      ],
    },

    form: {
      sections: [
        {
          label: 'Page Details',
          fields: [
            {
              field: 'title',
              label: 'Page Title',
              widget: 'text',
              required: true,
              validation: [
                { type: 'min', value: 3 },
                { type: 'max', value: 200 },
              ],
            },
            {
              field: 'slug',
              label: 'URL Slug',
              widget: 'text',
              required: true,
              description: 'Lowercase letters, numbers, hyphens, and slashes.',
              validation: [
                { type: 'pattern', value: /^[a-z0-9-/]+$/, message: 'Only lowercase letters, numbers, hyphens, and slashes' },
              ],
            },
            {
              field: 'published',
              label: 'Published',
              widget: 'boolean',
              defaultValue: false,
            },
          ],
        },
        {
          label: 'Content',
          fields: [
            {
              field: 'content',
              label: 'Content',
              widget: 'textarea',
            },
          ],
        },
      ],
    },
  },

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
