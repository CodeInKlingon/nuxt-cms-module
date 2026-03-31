import { describe, it, expect } from 'vitest'
import { defineCollection } from '../src/runtime/composables/defineCollection'

describe('defineCollection', () => {
  it('should create a valid collection definition', () => {
    const collection = defineCollection({
      name: 'test',
      schema: {} as any,
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Title',
          required: true,
        },
      ],
    })

    expect(collection.name).toBe('test')
    expect(collection.fields).toHaveLength(1)
    expect(collection.fields[0]!.name).toBe('title')
    expect(collection.options?.sortable).toBe(true)
    expect(collection.options?.searchable).toBe(true)
  })

  it('should merge custom options with defaults', () => {
    const collection = defineCollection({
      name: 'test',
      schema: {} as any,
      fields: [{ name: 'title', type: 'text' }],
      options: {
        label: 'Custom Label',
        perPage: 50,
      },
    })

    expect(collection.options?.label).toBe('Custom Label')
    expect(collection.options?.perPage).toBe(50)
    expect(collection.options?.sortable).toBe(true) // default
  })

  it('should throw error if name is missing', () => {
    expect(() => {
      defineCollection({
        name: '',
        schema: {} as any,
        fields: [],
      })
    }).toThrow('Collection must have a name')
  })

  it('should throw error if schema is missing', () => {
    expect(() => {
      defineCollection({
        name: 'test',
        schema: null as any,
        fields: [],
      })
    }).toThrow('must have a schema')
  })

  it('should throw error if fields are empty', () => {
    expect(() => {
      defineCollection({
        name: 'test',
        schema: {} as any,
        fields: [],
      })
    }).toThrow('must have at least one field')
  })
})
