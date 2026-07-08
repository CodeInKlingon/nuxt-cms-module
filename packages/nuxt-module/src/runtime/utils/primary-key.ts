import type { CollectionDefinition } from '../types'

export function getPrimaryKey(collection: Pick<CollectionDefinition, 'name' | 'primaryKey'>): string {
  return collection.primaryKey || 'id'
}

export function getRecordId(
  collection: Pick<CollectionDefinition, 'name' | 'primaryKey'>,
  record: Record<string, unknown> | null | undefined,
): unknown {
  return record?.[getPrimaryKey(collection)]
}

export function getIdColumn(
  collection: Pick<CollectionDefinition, 'name' | 'primaryKey'>,
  schema: Record<string, unknown>,
): unknown {
  const primaryKey = getPrimaryKey(collection)
  const column = schema[primaryKey]

  if (!column) {
    throw new Error(`Primary key "${primaryKey}" not found on schema for collection "${collection.name}"`)
  }

  return column
}
