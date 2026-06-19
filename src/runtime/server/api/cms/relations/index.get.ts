import { defineEventHandler, getRouterParams, createError } from 'h3'
import { getCollectionDefinition, getDrizzleConnection } from '../../../utils/drizzle-adapter'
import { getRelationFields, readRelation, validateRelationConfig } from '../../../services/relations'

/**
 * GET /api/cms/:collection/:id/relations/:field
 *
 * Returns the related target record(s) for a single relation field.
 * Resolution follows the relation config (inline, inverse, or junction).
 */
export default defineEventHandler(async (event) => {
  const { collection: collectionName, id, field: fieldName } = getRouterParams(event)

  if (!collectionName || !id || !fieldName) {
    throw createError({
      statusCode: 400,
      message: 'Collection name, record id, and relation field are required',
    })
  }

  const collection = getCollectionDefinition(collectionName)
  if (!collection) {
    throw createError({
      statusCode: 404,
      message: `Collection "${collectionName}" not found`,
    })
  }

  const field = getRelationFields(collection).find(f => f.field === fieldName)
  if (!field) {
    throw createError({
      statusCode: 404,
      message: `Relation field "${fieldName}" not found in collection "${collectionName}"`,
    })
  }

  try {
    validateRelationConfig(field)
  }
  catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid relation configuration'
    throw createError({
      statusCode: 500,
      message,
    })
  }

  try {
    const db = getDrizzleConnection()
    const records = await readRelation(db, collection, id, fieldName)
    return records
  }
  catch (err: unknown) {
    const error = err as { statusCode?: number, message?: string }
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to read relation',
    })
  }
})
