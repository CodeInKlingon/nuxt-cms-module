import { defineCollection } from '../../src/runtime/composables/defineCollection'
import { products } from '../server/database/schema'

export default defineCollection({
  name: 'products',
  schema: products,

  options: {
    label: 'Products',
    icon: 'i-lucide-shopping-cart',
    sortable: true,
    searchable: true,
    defaultSort: { field: 'createdAt', order: 'desc' },
  },

  dashboard: {
    list: {
      columns: [
        { field: 'name', label: 'Product Name', sortable: true },
        { field: 'slug', label: 'Slug' },
        { field: 'price', label: 'Price (cents)', sortable: true },
        { field: 'active', label: 'Active' },
      ],
    },

    form: {
      tabs: [
        {
          label: 'Details',
          icon: 'i-lucide-info',
          sections: [
            {
              label: 'Basic Info',
              fields: [
                {
                  field: 'name',
                  label: 'Product Name',
                  widget: 'text',
                  required: true,
                  validation: [
                    { type: 'min', value: 3, message: 'Name must be at least 3 characters' },
                    { type: 'max', value: 100 },
                  ],
                },
                {
                  field: 'slug',
                  label: 'URL Slug',
                  widget: 'text',
                  required: true,
                  description: 'Lowercase letters, numbers, and hyphens only.',
                  validation: [
                    { type: 'pattern', value: /^[a-z0-9-]+$/, message: 'Only lowercase letters, numbers, and hyphens' },
                  ],
                },
                {
                  field: 'price',
                  label: 'Price (cents)',
                  widget: 'number',
                  required: true,
                  validation: [
                    { type: 'min', value: 0, message: 'Price must be positive' },
                  ],
                },
                {
                  field: 'active',
                  label: 'Active',
                  widget: 'boolean',
                  defaultValue: true,
                },
              ],
            },
          ],
        },
        {
          label: 'Content',
          icon: 'i-lucide-align-left',
          sections: [
            {
              fields: [
                {
                  field: 'description',
                  label: 'Description',
                  widget: 'textarea',
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
      // Auto-generate slug if not provided
      if (!data.slug && data.name) {
        data.slug = data.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      }
      return data
    },

    afterUpdate: async (record) => {
      console.log(`Product ${record.id} updated`)
    },
  },
})
