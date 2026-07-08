import { describe, it, expect } from 'vitest'
import { defineCollection } from '../src/runtime/composables/defineCollection'
import { getIdColumn, getPrimaryKey, getRecordId } from '../src/runtime/utils/primary-key'

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('defineCollection', () => {
  it('should create a valid collection definition', () => {
    const collection = defineCollection({
      name: 'test',
      schema: {} as any,
      dashboard: {
        form: {
          sections: [
            {
              fields: [
                {
                  field: 'title',
                  label: 'Title',
                  widget: 'text',
                  required: true,
                },
              ],
            },
          ],
        },
      },
    })

    expect(collection.name).toBe('test')
    expect(collection.dashboard?.form?.sections?.[0]?.fields).toHaveLength(1)
    expect(collection.dashboard?.form?.sections?.[0]?.fields[0]?.field).toBe('title')
    expect(collection.options?.sortable).toBe(true)
    expect(collection.options?.searchable).toBe(true)
    expect(collection.primaryKey).toBe('id')
  })

  it('should preserve a custom primary key', () => {
    const collection = defineCollection({
      name: 'products',
      schema: { productId: {} } as any,
      primaryKey: 'productId',
    })

    expect(collection.primaryKey).toBe('productId')
    expect(getPrimaryKey(collection)).toBe('productId')
    expect(getRecordId(collection, { productId: 123 })).toBe(123)
  })

  it('should throw a clear error when primary key is missing from schema', () => {
    const collection = defineCollection({
      name: 'products',
      schema: { id: {} } as any,
      primaryKey: 'productId',
    })

    expect(() => getIdColumn(collection, collection.schema as any))
      .toThrow('Primary key "productId" not found on schema for collection "products"')
  })

  it('should merge custom options with defaults', () => {
    const collection = defineCollection({
      name: 'test',
      schema: {} as any,
      options: {
        label: 'Custom Label',
        perPage: 50,
      },
    })

    expect(collection.options?.label).toBe('Custom Label')
    expect(collection.options?.perPage).toBe(50)
    expect(collection.options?.sortable).toBe(true) // default
  })

  it('should work with no dashboard config', () => {
    const collection = defineCollection({
      name: 'test',
      schema: {} as any,
    })

    expect(collection.name).toBe('test')
    expect(collection.dashboard).toBeUndefined()
    expect(collection.options?.sortable).toBe(true)
  })

  it('should work with a tabbed dashboard form', () => {
    const collection = defineCollection({
      name: 'test',
      schema: {} as any,
      dashboard: {
        list: {
          columns: [
            { field: 'name', label: 'Name', sortable: true },
          ],
        },
        form: {
          tabs: [
            {
              label: 'Details',
              sections: [
                {
                  label: 'Basic Info',
                  fields: [
                    { field: 'name', widget: 'text', required: true },
                    { field: 'active', widget: 'boolean', defaultValue: true },
                  ],
                },
              ],
            },
            {
              label: 'Content',
              sections: [
                {
                  fields: [
                    { field: 'body', widget: 'richtext' },
                  ],
                },
              ],
            },
          ],
        },
      },
    })

    expect(collection.dashboard?.list?.columns).toHaveLength(1)
    expect(collection.dashboard?.form?.tabs).toHaveLength(2)
    expect(collection.dashboard?.form?.tabs?.[0]?.sections[0]?.fields).toHaveLength(2)
  })

  it('should throw error if name is missing', () => {
    expect(() => {
      defineCollection({
        name: '',
        schema: {} as any,
      })
    }).toThrow('Collection must have a name')
  })

  it('should throw error if schema is missing', () => {
    expect(() => {
      defineCollection({
        name: 'test',
        schema: null as any,
      })
    }).toThrow('must have a schema')
  })

  it('should support list filters in dashboard config', () => {
    const collection = defineCollection({
      name: 'test',
      schema: {} as any,
      dashboard: {
        list: {
          columns: [
            { field: 'name', label: 'Name', sortable: true },
            { field: 'status', label: 'Status' },
          ],
          filters: [
            {
              field: 'status',
              label: 'Status Filter',
              options: [
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
              ],
            },
            {
              field: 'category',
              label: 'Category',
              multiple: true,
              options: [
                { label: 'Electronics', value: 'electronics' },
                { label: 'Clothing', value: 'clothing' },
              ],
            },
          ],
        },
      },
    })

    expect(collection.dashboard?.list?.filters).toHaveLength(2)
    expect(collection.dashboard?.list?.filters?.[0]?.field).toBe('status')
    expect(collection.dashboard?.list?.filters?.[0]?.options).toHaveLength(2)
    expect(collection.dashboard?.list?.filters?.[1]?.multiple).toBe(true)
  })

  it('should preserve relation display configuration', () => {
    const collection = defineCollection({
      name: 'posts',
      schema: {} as any,
      dashboard: {
        form: {
          sections: [
            {
              fields: [
                {
                  field: 'category',
                  widget: 'relation',
                  relation: {
                    type: 'one',
                    storage: 'inline',
                    collection: 'categories',
                    sourceColumn: 'categoryId',
                    display: {
                      template: '{name} ({categoryId})',
                      searchFields: ['name', 'categoryId'],
                      fallback: 'categoryId',
                    },
                  },
                },
              ],
            },
          ],
        },
      },
    })

    const relation = collection.dashboard?.form?.sections?.[0]?.fields[0]?.relation

    expect(relation?.display?.template).toBe('{name} ({categoryId})')
    expect(relation?.display?.searchFields).toEqual(['name', 'categoryId'])
    expect(relation?.display?.fallback).toBe('categoryId')
  })

  it('should preserve joined relation display source configuration', () => {
    const collection = defineCollection({
      name: 'posts',
      schema: {} as any,
      dashboard: {
        form: {
          sections: [
            {
              fields: [
                {
                  field: 'author',
                  widget: 'relation',
                  relation: {
                    type: 'one',
                    storage: 'inline',
                    collection: 'authors',
                    sourceColumn: 'authorId',
                    display: {
                      source: {
                        collection: 'authorProfiles',
                        localColumn: 'id',
                        foreignColumn: 'authorId',
                        where: { locale: 'en' },
                      },
                      field: 'displayName',
                      searchFields: ['displayName'],
                      fallback: 'id',
                    },
                  },
                },
              ],
            },
          ],
        },
      },
    })

    const display = collection.dashboard?.form?.sections?.[0]?.fields[0]?.relation?.display

    expect(display?.source).toEqual({
      collection: 'authorProfiles',
      localColumn: 'id',
      foreignColumn: 'authorId',
      where: { locale: 'en' },
    })
    expect(display?.field).toBe('displayName')
    expect(display?.searchFields).toEqual(['displayName'])
  })
})
