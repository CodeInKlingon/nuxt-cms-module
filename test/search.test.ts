import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils'
import { fileURLToPath } from 'node:url'
import { defineCollection } from '../src/runtime/composables/defineCollection'

/* eslint-disable @typescript-eslint/no-explicit-any */

describe.skip('collection search', async () => {
  // TODO: These integration tests require authentication bypass or mock setup
  // Skipping for now - manual testing via playground recommended
  await setup({
    rootDir: fileURLToPath(new URL('../playground', import.meta.url)),
  })

  const productIds: number[] = []

  beforeAll(async () => {
    // Create test products with specific searchable content
    const testProducts = [
      { name: 'Laptop Pro', slug: 'laptop-pro', description: 'High-performance laptop', price: 150000, active: true },
      { name: 'Desktop Tower', slug: 'desktop-tower', description: 'Powerful desktop computer', price: 200000, active: true },
      { name: 'Gaming Mouse', slug: 'gaming-mouse', description: 'Precision gaming peripheral', price: 5000, active: true },
      { name: 'Wireless Keyboard', slug: 'wireless-keyboard', description: 'Ergonomic keyboard for laptop use', price: 8000, active: true },
      { name: 'Monitor Stand', slug: 'monitor-stand', description: 'Adjustable stand for your display', price: 3000, active: false },
    ]

    for (const product of testProducts) {
      const response = await $fetch<any>('/api/cms/products', {
        method: 'POST',
        body: product,
      })
      productIds.push(response.id)
    }
  })

  afterAll(async () => {
    // Clean up test products
    for (const id of productIds) {
      await $fetch(`/api/cms/products/${id}`, {
        method: 'DELETE',
      })
    }
  })

  it('should find records matching search term in name column', async () => {
    const response = await $fetch<any>('/api/cms/products', {
      query: { search: 'Laptop' },
    })

    expect(response.items).toBeDefined()
    expect(response.items.length).toBeGreaterThan(0)
    expect(response.items.some((item: any) => item.name.includes('Laptop'))).toBe(true)
  })

  it('should find records matching search term in slug column', async () => {
    const response = await $fetch<any>('/api/cms/products', {
      query: { search: 'gaming-mouse' },
    })

    expect(response.items).toBeDefined()
    expect(response.items.length).toBeGreaterThan(0)
    expect(response.items.some((item: any) => item.slug === 'gaming-mouse')).toBe(true)
  })

  it('should find records matching search term in description column', async () => {
    const response = await $fetch<any>('/api/cms/products', {
      query: { search: 'peripheral' },
    })

    expect(response.items).toBeDefined()
    expect(response.items.length).toBeGreaterThan(0)
    expect(response.items.some((item: any) => item.description?.includes('peripheral'))).toBe(true)
  })

  it('should use OR logic across multiple columns', async () => {
    // 'laptop' appears in both name and description of different products
    const response = await $fetch<any>('/api/cms/products', {
      query: { search: 'laptop' },
    })

    expect(response.items).toBeDefined()
    expect(response.items.length).toBeGreaterThanOrEqual(2)

    const hasNameMatch = response.items.some((item: any) => item.name.toLowerCase().includes('laptop'))
    const hasDescMatch = response.items.some((item: any) => item.description?.toLowerCase().includes('laptop'))

    expect(hasNameMatch || hasDescMatch).toBe(true)
  })

  it('should return empty results when no match found', async () => {
    const response = await $fetch<any>('/api/cms/products', {
      query: { search: 'nonexistentproduct12345' },
    })

    expect(response.items).toBeDefined()
    expect(response.items.length).toBe(0)
    expect(response.total).toBe(0)
  })

  it('should handle empty search term gracefully', async () => {
    const response = await $fetch<any>('/api/cms/products', {
      query: { search: '' },
    })

    expect(response.items).toBeDefined()
    // Empty search should return all results (no filter applied)
    expect(response.items.length).toBeGreaterThan(0)
  })

  it('should handle whitespace-only search term', async () => {
    const response = await $fetch<any>('/api/cms/products', {
      query: { search: '   ' },
    })

    expect(response.items).toBeDefined()
    // Whitespace search likely won't match anything
    expect(response.total).toBeDefined()
  })

  it('should be case-insensitive', async () => {
    const upperResponse = await $fetch<any>('/api/cms/products', {
      query: { search: 'LAPTOP' },
    })

    const lowerResponse = await $fetch<any>('/api/cms/products', {
      query: { search: 'laptop' },
    })

    expect(upperResponse.items.length).toBe(lowerResponse.items.length)
    expect(upperResponse.total).toBe(lowerResponse.total)
  })

  it('should apply search filter to total count', async () => {
    const searchResponse = await $fetch<any>('/api/cms/products', {
      query: { search: 'Laptop' },
    })

    const allResponse = await $fetch<any>('/api/cms/products')

    expect(searchResponse.total).toBeLessThan(allResponse.total)
    expect(searchResponse.total).toBe(searchResponse.items.length)
  })

  it('should work with pagination', async () => {
    const response = await $fetch<any>('/api/cms/products', {
      query: { search: 'laptop', page: 1, perPage: 1 },
    })

    expect(response.items).toBeDefined()
    expect(response.items.length).toBeLessThanOrEqual(1)
    expect(response.page).toBe(1)
    expect(response.perPage).toBe(1)
  })

  it('should handle special characters safely', async () => {
    // Test that SQL special characters don't break the query
    const response = await $fetch<any>('/api/cms/products', {
      query: { search: 'laptop\'s%' },
    })

    expect(response.items).toBeDefined()
    // Should not throw error, even if no results
  })

  it('should support partial matching', async () => {
    // Search for partial word
    const response = await $fetch<any>('/api/cms/products', {
      query: { search: 'Lap' },
    })

    expect(response.items).toBeDefined()
    expect(response.items.length).toBeGreaterThan(0)
    expect(response.items.some((item: any) => item.name.includes('Laptop'))).toBe(true)
  })
})

describe('collection search configuration', () => {
  it('should accept searchColumns in collection definition', () => {
    const collection = defineCollection({
      name: 'test',
      schema: {} as any,
      options: {
        searchable: true,
        searchColumns: ['name', 'description', 'slug'],
      },
    })

    expect(collection.options?.searchable).toBe(true)
    expect(collection.options?.searchColumns).toEqual(['name', 'description', 'slug'])
  })

  it('should work without searchColumns defined', () => {
    const collection = defineCollection({
      name: 'test',
      schema: {} as any,
      options: {
        searchable: true,
      },
    })

    expect(collection.options?.searchable).toBe(true)
    expect(collection.options?.searchColumns).toBeUndefined()
  })

  it('should work with empty searchColumns array', () => {
    const collection = defineCollection({
      name: 'test',
      schema: {} as any,
      options: {
        searchable: true,
        searchColumns: [],
      },
    })

    expect(collection.options?.searchable).toBe(true)
    expect(collection.options?.searchColumns).toEqual([])
  })
})
