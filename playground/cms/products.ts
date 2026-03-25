import { defineCollection } from '../../src/runtime/composables/defineCollection'
import { products } from '../server/database/schema'

export default defineCollection({
  name: 'products',
  schema: products,

  options: {
    label: 'Products',
    icon: 'shopping-cart',
    sortable: true,
    searchable: true,
    defaultSort: { field: 'createdAt', order: 'desc' },
  },

  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Product Name',
      required: true,
      validation: [
        { type: 'min', value: 3, message: 'Name must be at least 3 characters' },
        { type: 'max', value: 100 },
      ],
    },
    {
      name: 'slug',
      type: 'text',
      label: 'URL Slug',
      required: true,
      validation: [
        { type: 'pattern', value: /^[a-z0-9-]+$/, message: 'Only lowercase letters, numbers, and hyphens' },
      ],
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
    },
    {
      name: 'price',
      type: 'number',
      label: 'Price (cents)',
      required: true,
      validation: [
        { type: 'min', value: 0, message: 'Price must be positive' },
      ],
    },
    {
      name: 'active',
      type: 'boolean',
      label: 'Active',
      defaultValue: true,
    },
  ],

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
