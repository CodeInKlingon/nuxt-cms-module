import { describe, it, expect } from 'vitest'
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { validateData, validateAndCoerce } from '../src/runtime/server/services/validation'
import type { CollectionDefinition } from '../src/runtime/types'

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal CollectionDefinition with a flat sections form layout.
 * Used by the legacy validateData tests to replicate the old fields[] behaviour.
 */
const mockCollection: CollectionDefinition = {
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
              validation: [
                { type: 'min', value: 3 },
                { type: 'max', value: 100 },
              ],
            },
            {
              field: 'email',
              label: 'Email',
              widget: 'text',
              required: false,
              validation: [
                { type: 'email' },
              ],
            },
            {
              field: 'age',
              label: 'Age',
              widget: 'number',
              validation: [
                { type: 'min', value: 18 },
                { type: 'max', value: 120 },
              ],
            },
          ],
        },
      ],
    },
  },
}

// ---------------------------------------------------------------------------
// Legacy validateData tests (field-level validation, no schema introspection)
// ---------------------------------------------------------------------------
describe('validation service (legacy validateData)', () => {
  it('should pass validation for valid data', async () => {
    const data = {
      title: 'Test Title',
      email: 'test@example.com',
      age: 25,
    }

    const errors = await validateData(mockCollection, data)
    expect(errors).toHaveLength(0)
  })

  it('should fail validation for missing required field', async () => {
    const data = {
      email: 'test@example.com',
    }

    const errors = await validateData(mockCollection, data)
    expect(errors).toHaveLength(1)
    expect(errors[0]!.field).toBe('title')
    expect(errors[0]!.type).toBe('required')
  })

  it('should fail validation for min length', async () => {
    const data = {
      title: 'AB', // too short
    }

    const errors = await validateData(mockCollection, data)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some(e => e.field === 'title' && e.type === 'min')).toBe(true)
  })

  it('should fail validation for max length', async () => {
    const data = {
      title: 'A'.repeat(101), // too long
    }

    const errors = await validateData(mockCollection, data)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some(e => e.field === 'title' && e.type === 'max')).toBe(true)
  })

  it('should fail validation for invalid email', async () => {
    const data = {
      title: 'Test Title',
      email: 'not-an-email',
    }

    const errors = await validateData(mockCollection, data)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some(e => e.field === 'email' && e.type === 'email')).toBe(true)
  })

  it('should fail validation for numeric min/max', async () => {
    const data = {
      title: 'Test Title',
      age: 15, // too young
    }

    const errors = await validateData(mockCollection, data)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some(e => e.field === 'age' && e.type === 'min')).toBe(true)
  })

  it('should skip validation for undefined optional fields', async () => {
    const data = {
      title: 'Test Title',
      // email is optional and undefined
    }

    const errors = await validateData(mockCollection, data)
    expect(errors).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// New validateAndCoerce tests (drizzle-zod schema + coercion)
// ---------------------------------------------------------------------------

// Minimal Drizzle table used only by validation tests
const testProducts = sqliteTable('test_products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  price: integer('price').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

const productCollection: CollectionDefinition = {
  name: 'test_products',
  schema: testProducts,
  dashboard: {
    form: {
      tabs: [
        {
          label: 'Details',
          sections: [
            {
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
}

describe('validateAndCoerce (drizzle-zod)', () => {
  it('should pass and return coerced data for valid input', async () => {
    const data = {
      name: 'Widget',
      slug: 'widget',
      price: 999,
      active: true,
    }

    const result = await validateAndCoerce(productCollection, data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Widget')
      expect(result.data.price).toBe(999)
    }
  })

  it('should coerce date strings to Date objects', async () => {
    const data = {
      name: 'Widget',
      slug: 'widget',
      price: 999,
      active: true,
      createdAt: '2025-01-15T12:00:00.000Z',
      updatedAt: '2025-01-15T12:00:00.000Z',
    }

    const result = await validateAndCoerce(productCollection, data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.createdAt).toBeInstanceOf(Date)
      expect(result.data.updatedAt).toBeInstanceOf(Date)
    }
  })

  it('should fail validation when a required column receives no value', async () => {
    const data = {
      // name is missing (notNull in schema)
      slug: 'widget',
      price: 999,
    }

    const result = await validateAndCoerce(productCollection, data)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.some(e => e.field === 'name')).toBe(true)
    }
  })

  it('should fail validation for min length rule', async () => {
    const data = {
      name: 'AB', // too short (min 3)
      slug: 'ab',
      price: 999,
    }

    const result = await validateAndCoerce(productCollection, data)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.some(e => e.field === 'name' && e.type === 'min')).toBe(true)
    }
  })

  it('should fail validation for pattern rule', async () => {
    const data = {
      name: 'Widget',
      slug: 'INVALID SLUG!',
      price: 999,
    }

    const result = await validateAndCoerce(productCollection, data)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.some(e => e.field === 'slug')).toBe(true)
    }
  })

  it('should fail validation for numeric min rule', async () => {
    const data = {
      name: 'Widget',
      slug: 'widget',
      price: -1, // below min 0
    }

    const result = await validateAndCoerce(productCollection, data)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.some(e => e.field === 'price')).toBe(true)
      expect(result.errors.some(e => e.message === 'Price must be positive')).toBe(true)
    }
  })

  it('should run hooks.validate and surface custom errors', async () => {
    const collectionWithHook: CollectionDefinition = {
      ...productCollection,
      hooks: {
        validate: (data: Record<string, unknown>) => {
          if (data.name === 'forbidden') {
            return [{ field: 'name', message: 'Name is forbidden', type: 'custom' }]
          }
          return []
        },
      },
    }

    const data = {
      name: 'forbidden',
      slug: 'forbidden',
      price: 100,
    }

    const result = await validateAndCoerce(collectionWithHook, data)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]!.message).toBe('Name is forbidden')
    }
  })

  it('should allow optional fields to be omitted', async () => {
    const data = {
      name: 'Widget',
      slug: 'widget',
      price: 999,
      // description, active, createdAt, updatedAt all omitted
    }

    const result = await validateAndCoerce(productCollection, data)
    expect(result.success).toBe(true)
  })
})
