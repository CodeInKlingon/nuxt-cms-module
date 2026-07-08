/* eslint-disable @typescript-eslint/no-explicit-any */

import { defineEventHandler, getMethod, readBody, getQuery, createError } from 'h3'
import type { RelationDisplayConfig } from '../../../types'
import { CrudService } from '../../services/crud'
import { getCollectionDefinition } from '../../utils/drizzle-adapter'

export default defineEventHandler(async (event) => {
  // Parse the URL path to extract collection name and ID
  const url = event.path || event.node.req.url || ''
  const apiPrefix = '/api/cms'
  const pathAfterPrefix = url.replace(apiPrefix, '').split('?')[0] || '' // Remove query string
  const pathParts = pathAfterPrefix.split('/').filter(Boolean)

  const collectionName = pathParts[0]
  const id = pathParts[1]

  if (!collectionName) {
    throw createError({
      statusCode: 400,
      message: 'Collection name is required',
    })
  }

  // Get collection from the registry (not runtime config)
  // This ensures we have the full collection definition with hooks and validation rules
  const collection = getCollectionDefinition(collectionName)

  if (!collection) {
    throw createError({
      statusCode: 404,
      message: `Collection "${collectionName}" not found`,
    })
  }

  const crudService = new CrudService(collection, event)
  const method = getMethod(event)

  try {
    switch (method) {
      case 'GET':
        if (id) {
          return await crudService.findOne(id)
        }
        else {
          const query = getQuery(event)
          // Extract flattened filter params (e.g., filter_active, filter_status)
          // and build a filter object
          const filter: Record<string, any> = {}
          for (const [key, value] of Object.entries(query)) {
            if (key.startsWith('filter_')) {
              // Handle both filter_field and filter_field[] (for arrays)
              const fieldName = key.slice(7).replace(/\[\]$/, '') // Remove 'filter_' prefix and optional '[]'
              filter[fieldName] = value
            }
          }
          const order = firstQueryValue(query.order)
          return await crudService.findMany({
            page: parseNumberQueryValue(query.page),
            perPage: parseNumberQueryValue(query.perPage),
            sort: firstQueryValue(query.sort),
            order: order === 'desc' ? 'desc' : order === 'asc' ? 'asc' : undefined,
            search: firstQueryValue(query.search),
            searchColumns: parseSearchColumns(query.searchColumns),
            display: parseDisplayQueryValue(query.display),
            filter: Object.keys(filter).length > 0 ? filter : undefined,
          })
        }

      case 'POST':
      {
        const createData = await readBody(event)
        return await crudService.create(createData)
      }

      case 'PUT':
      case 'PATCH':
        if (!id) {
          throw createError({ statusCode: 400, message: 'ID required' })
        }
        {
          const updateData = await readBody(event)
          return await crudService.update(id, updateData)
        }

      case 'DELETE':
        if (!id) {
          throw createError({ statusCode: 400, message: 'ID required' })
        }
        return await crudService.delete(id)

      default:
        throw createError({
          statusCode: 405,
          message: `Method ${method} not allowed`,
        })
    }
  }
  catch (error: unknown) {
    const err = error as { statusCode?: number, message?: string }
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'Internal server error',
    })
  }
})

function firstQueryValue(value: unknown): string | undefined {
  if (Array.isArray(value)) return firstQueryValue(value[0])
  return typeof value === 'string' ? value : undefined
}

function parseNumberQueryValue(value: unknown): number | undefined {
  const stringValue = firstQueryValue(value)
  if (!stringValue) return undefined

  const numberValue = Number(stringValue)
  return Number.isNaN(numberValue) ? undefined : numberValue
}

function parseSearchColumns(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.flatMap(item => parseSearchColumns(item) ?? [])
  }
  if (typeof value !== 'string') return undefined

  const columns = value
    .split(',')
    .map(column => column.trim())
    .filter(Boolean)

  return columns.length > 0 ? columns : undefined
}

function parseDisplayQueryValue(value: unknown): RelationDisplayConfig | undefined {
  const stringValue = firstQueryValue(value)
  if (!stringValue) return undefined

  try {
    const display = JSON.parse(stringValue) as RelationDisplayConfig
    if (!display || typeof display !== 'object') return undefined
    return display
  }
  catch {
    return undefined
  }
}
