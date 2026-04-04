import { describe, it, expect } from 'vitest'
import { defineCollection } from '../src/runtime/composables/defineCollection'

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
})
