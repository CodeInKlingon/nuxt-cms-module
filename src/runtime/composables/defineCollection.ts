import type { CollectionDefinition } from '../types'

/**
 * Define a CMS collection with schema, dashboard config, and options.
 *
 * The Drizzle `schema` table is the source of field truth. The optional
 * `dashboard` key configures how the admin UI presents and edits records —
 * list columns, form tabs/sections, per-field widgets and validation rules.
 *
 * @example
 * ```ts
 * import { defineCollection } from '#cms'
 * import { products } from '~/server/database/schema'
 *
 * export default defineCollection({
 *   name: 'products',
 *   schema: products,
 *   options: {
 *     label: 'Products',
 *     icon: 'i-lucide-shopping-cart',
 *   },
 *   dashboard: {
 *     list: {
 *       columns: [
 *         { field: 'name', label: 'Product Name', sortable: true },
 *         { field: 'price', sortable: true },
 *         { field: 'active' },
 *       ],
 *     },
 *     form: {
 *       tabs: [
 *         {
 *           label: 'Details',
 *           sections: [
 *             {
 *               label: 'Basic Info',
 *               fields: [
 *                 { field: 'name', widget: 'text', required: true },
 *                 { field: 'price', widget: 'number', required: true },
 *                 { field: 'active', widget: 'boolean', defaultValue: true },
 *               ],
 *             },
 *           ],
 *         },
 *       ],
 *     },
 *   },
 * })
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function defineCollection<T = any>(
  definition: CollectionDefinition<T>,
): CollectionDefinition<T> {
  if (!definition.name) {
    throw new Error('Collection must have a name')
  }

  if (!definition.schema) {
    throw new Error(`Collection "${definition.name}" must have a schema`)
  }

  return {
    ...definition,
    options: {
      label: definition.name,
      sortable: true,
      searchable: true,
      perPage: 25,
      ...definition.options,
    },
  }
}
