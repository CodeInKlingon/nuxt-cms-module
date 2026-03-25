import { describe, it, expect } from 'vitest'
import { validateData } from '../src/runtime/server/services/validation'
import type { CollectionDefinition } from '../src/runtime/types'

describe('validation service', () => {
  const mockCollection: CollectionDefinition = {
    name: 'test',
    schema: {} as any,
    fields: [
      {
        name: 'title',
        type: 'text',
        label: 'Title',
        required: true,
        validation: [
          { type: 'min', value: 3 },
          { type: 'max', value: 100 },
        ],
      },
      {
        name: 'email',
        type: 'text',
        label: 'Email',
        required: false,
        validation: [
          { type: 'email' },
        ],
      },
      {
        name: 'age',
        type: 'number',
        label: 'Age',
        validation: [
          { type: 'min', value: 18 },
          { type: 'max', value: 120 },
        ],
      },
    ],
  }

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
    expect(errors[0].field).toBe('title')
    expect(errors[0].type).toBe('required')
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
