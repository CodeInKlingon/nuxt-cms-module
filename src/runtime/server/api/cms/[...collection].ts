import { defineEventHandler, getRouterParams, getMethod, readBody, getQuery, createError } from 'h3'
import { useRuntimeConfig } from '#imports'
import { CrudService } from '../../services/crud'
import { checkAuth } from '../../middleware/cms-auth'
import { getCollectionDefinition } from '../../utils/drizzle-adapter'
import type { CollectionDefinition } from '../../../types'

export default defineEventHandler(async (event) => {
  // Check authentication
  await checkAuth(event)

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
          return await crudService.findMany(query as any)
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
  catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error',
    })
  }
})
