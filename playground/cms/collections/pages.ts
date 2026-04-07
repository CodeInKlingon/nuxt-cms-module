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
    description: 'Generic webpages with block content',
  },

  blocks: {
    enabled: true,
    allowedBlocks: ['HeroSection', 'TextBlock', 'ImageBlock'],
    fieldName: 'blocks',
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
      tabs: [
        {
          label: 'Page Details',
          icon: 'i-lucide-info',
          sections: [
            {
              label: 'Basic Info',
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
          ],
        },
        {
          label: 'Content',
          icon: 'i-lucide-layout',
          sections: [
            {
              label: 'Page Content',
              fields: [
                {
                  field: 'content',
                  label: 'Legacy Content',
                  widget: 'textarea',
                  description: 'This is the old content field. Use Blocks below for new content.',
                },
                {
                  field: 'blocks',
                  label: 'Block Content',
                  widget: 'blocks',
                  props: {
                    allowedBlocks: ['HeroSection', 'TextBlock', 'ImageBlock'],
                  },
                },
              ],
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
