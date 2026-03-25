import type { CollectionDefinition } from '../types'

/**
 * Define a CMS collection with schema, fields, and options
 * 
 * @example
 * ```ts
 * import { defineCollection } from '#cms'
 * import { products } from '~/server/database/schema'
 * 
 * export default defineCollection({
 *   name: 'products',
 *   schema: products,
 *   fields: [
 *     {
 *       name: 'name',
 *       type: 'text',
 *       label: 'Product Name',
 *       required: true
 *     }
 *   ]
 * })
 * ```
 */
export function defineCollection<T = any>(
  definition: CollectionDefinition<T>,
): CollectionDefinition<T> {
  // Validate collection definition
  if (!definition.name) {
    throw new Error('Collection must have a name')
  }

  if (!definition.schema) {
    throw new Error(`Collection "${definition.name}" must have a schema`)
  }

  if (!definition.fields || definition.fields.length === 0) {
    throw new Error(`Collection "${definition.name}" must have at least one field`)
  }

  // Return validated definition with defaults
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
