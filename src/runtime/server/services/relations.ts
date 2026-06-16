/* eslint-disable @typescript-eslint/no-explicit-any -- Drizzle table/transaction shapes are intentionally dynamic here. */
import { eq, inArray } from 'drizzle-orm'
import type { CollectionDefinition, FormFieldConfig, RelationConfig } from '../../types'
import { getCollectionSchema, getSchemaTable } from '../utils/drizzle-adapter'
import { flattenFormFields } from './validation'

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Return all form fields that define a relation.
 */
export function getRelationFields(collection: CollectionDefinition): FormFieldConfig[] {
  return flattenFormFields(collection).filter(field => field.relation)
}

/**
 * Validate a relation field configuration.
 * Throws an actionable error for invalid combinations or missing columns.
 */
export function validateRelationConfig(field: FormFieldConfig): asserts field is FormFieldConfig & { relation: RelationConfig } {
  const relation = field.relation
  if (!relation) {
    throw new Error(`Expected relation config for field "${field.field}"`)
  }

  if (relation.type === 'one' && relation.storage === 'inverse') {
    throw new Error(
      `Invalid relation for field "${field.field}": type "one" with storage "inverse" is not supported. Use "inline" or "junction".`,
    )
  }

  if (relation.type === 'many' && relation.storage === 'inline') {
    throw new Error(
      `Invalid relation for field "${field.field}": type "many" with storage "inline" is not supported. Use "inverse" or "junction".`,
    )
  }

  if (relation.storage === 'inline' && !relation.sourceColumn) {
    throw new Error(`Relation field "${field.field}" with storage "inline" requires "sourceColumn".`,
    )
  }

  if (relation.storage === 'inverse' && !relation.targetColumn) {
    throw new Error(`Relation field "${field.field}" with storage "inverse" requires "targetColumn".`,
    )
  }

  if (relation.storage === 'junction') {
    if (!relation.junctionTable) {
      throw new Error(`Relation field "${field.field}" with storage "junction" requires "junctionTable".`,
      )
    }
    if (!relation.sourceJunctionColumn) {
      throw new Error(`Relation field "${field.field}" with storage "junction" requires "sourceJunctionColumn".`,
      )
    }
    if (!relation.targetJunctionColumn) {
      throw new Error(`Relation field "${field.field}" with storage "junction" requires "targetJunctionColumn".`,
      )
    }
    if (relation.sortable && !relation.orderColumn) {
      throw new Error(`Relation field "${field.field}" is sortable but missing "orderColumn".`,
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Payload normalisation
// ---------------------------------------------------------------------------

export interface ExtractRelationsResult {
  /** Cleaned payload that can be validated against the source table schema. */
  mainData: Record<string, unknown>
  /** Relation values keyed by form field name. */
  relationValues: Record<string, unknown>
}

/**
 * Extract relation values from the raw payload and prepare the main-record payload.
 *
 * - Inline relations are mapped to their source column in `mainData`.
 * - Inverse and junction relation fields are removed from `mainData` and returned
 *   separately for later persistence.
 */
export function extractRelations(
  collection: CollectionDefinition,
  data: Record<string, unknown>,
): ExtractRelationsResult {
  let mainData: Record<string, unknown> = { ...data }
  const relationValues: Record<string, unknown> = {}

  for (const field of getRelationFields(collection)) {
    validateRelationConfig(field)
    const relation = field.relation
    const value = mainData[field.field]

    // Remove the relation field from the main-record payload.
    const { [field.field]: _removed, ...rest } = mainData
    mainData = rest

    if (relation.storage === 'inline') {
      // Map the relation field value to the source column.
      mainData[relation.sourceColumn] = value
      continue
    }

    relationValues[field.field] = value
  }

  return { mainData, relationValues }
}

// ---------------------------------------------------------------------------
// Table / schema resolution
// ---------------------------------------------------------------------------

function resolveJunctionTable(config: Extract<RelationConfig, { storage: 'junction' }>): any {
  if (typeof config.junctionTable === 'string') {
    const table = getSchemaTable(config.junctionTable)
    if (!table) {
      throw new Error(`Junction table "${config.junctionTable}" not found. Make sure your database file exports it as part of the schema object.`)
    }
    return table
  }
  return config.junctionTable
}

function resolveTargetSchema(collectionName: string): any {
  const schema = getCollectionSchema(collectionName)
  if (!schema) {
    throw new Error(`Target collection schema "${collectionName}" not found.`)
  }
  return schema
}

function normaliseIds(value: unknown, multiple: boolean): (string | number)[] {
  if (multiple) {
    if (Array.isArray(value)) return value as (string | number)[]
    return []
  }
  if (value === null || value === undefined) return []
  return [value as string | number]
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Persist all relation values for a record inside the given transaction.
 */
export async function writeRelations(
  tx: any,
  collection: CollectionDefinition,
  recordId: string | number,
  relationValues: Record<string, unknown>,
): Promise<void> {
  for (const field of getRelationFields(collection)) {
    validateRelationConfig(field)
    const value = relationValues[field.field]
    if (value === undefined) continue

    const relation = field.relation

    if (relation.storage === 'inline') {
      // Already persisted as part of the main record payload.
      continue
    }

    if (relation.storage === 'inverse') {
      await writeInverseRelation(tx, collection, recordId, field, value)
      continue
    }

    await writeJunctionRelation(tx, collection, recordId, field, value)
  }
}

async function writeInverseRelation(
  tx: any,
  collection: CollectionDefinition,
  sourceId: string | number,
  field: FormFieldConfig,
  value: unknown,
): Promise<void> {
  const relation = field.relation as Extract<RelationConfig, { storage: 'inverse' }>
  const targetSchema = resolveTargetSchema(relation.collection)
  const targetColumn = relation.targetColumn

  // Clear any existing link from this source.
  await tx
    .update(targetSchema)
    .set({ [targetColumn]: null })
    .where(eq(targetSchema[targetColumn], sourceId))

  const selectedIds = normaliseIds(value, relation.type === 'many')
  if (selectedIds.length === 0) return

  await tx
    .update(targetSchema)
    .set({ [targetColumn]: sourceId })
    .where(inArray(targetSchema.id, selectedIds))
}

async function writeJunctionRelation(
  tx: any,
  collection: CollectionDefinition,
  sourceId: string | number,
  field: FormFieldConfig,
  value: unknown,
): Promise<void> {
  const relation = field.relation as Extract<RelationConfig, { storage: 'junction' }>
  const junctionTable = resolveJunctionTable(relation)
  const sourceColumn = relation.sourceJunctionColumn
  const targetColumn = relation.targetJunctionColumn

  // Remove existing junction rows for this source.
  await tx
    .delete(junctionTable)
    .where(eq(junctionTable[sourceColumn], sourceId))

  const selectedIds = normaliseIds(value, relation.type === 'many')
  if (selectedIds.length === 0) return

  const rows = selectedIds.map((targetId, index) => {
    const row: Record<string, unknown> = {
      [sourceColumn]: sourceId,
      [targetColumn]: targetId,
    }
    if (relation.sortable && relation.orderColumn) {
      row[relation.orderColumn] = index
    }
    return row
  })

  await tx.insert(junctionTable).values(rows)
}

// ---------------------------------------------------------------------------
// Deletes
// ---------------------------------------------------------------------------

/**
 * Clear or remove all relations for a record inside the given transaction.
 * Called before the main record is deleted.
 */
export async function deleteRelations(
  tx: any,
  collection: CollectionDefinition,
  recordId: string | number,
): Promise<void> {
  for (const field of getRelationFields(collection)) {
    validateRelationConfig(field)
    const relation = field.relation

    if (relation.storage === 'inline') {
      continue
    }

    if (relation.storage === 'inverse') {
      const targetSchema = resolveTargetSchema(relation.collection)
      await tx
        .update(targetSchema)
        .set({ [relation.targetColumn]: null })
        .where(eq(targetSchema[relation.targetColumn], recordId))
      continue
    }

    const junctionTable = resolveJunctionTable(relation)
    await tx
      .delete(junctionTable)
      .where(eq(junctionTable[relation.sourceJunctionColumn], recordId))
  }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * Read the related target record(s) for a single relation field.
 */
export async function readRelation(
  db: any,
  collection: CollectionDefinition,
  recordId: string | number,
  fieldName: string,
): Promise<Record<string, unknown>[]> {
  const field = getRelationFields(collection).find(f => f.field === fieldName)
  if (!field) {
    throw new Error(`Relation field "${fieldName}" not found in collection "${collection.name}".`)
  }
  validateRelationConfig(field)
  const relation = field.relation

  if (relation.storage === 'inline') {
    const sourceSchema = getCollectionSchema(collection.name)
    const rows = await db
      .select({ [relation.sourceColumn]: sourceSchema[relation.sourceColumn] })
      .from(sourceSchema)
      .where(eq(sourceSchema.id, recordId))
      .limit(1)

    const targetId = rows[0]?.[relation.sourceColumn]
    if (targetId === null || targetId === undefined) return []

    const targetSchema = resolveTargetSchema(relation.collection)
    return db
      .select()
      .from(targetSchema)
      .where(eq(targetSchema.id, targetId))
      .limit(1)
  }

  if (relation.storage === 'inverse') {
    const targetSchema = resolveTargetSchema(relation.collection)
    return db
      .select()
      .from(targetSchema)
      .where(eq(targetSchema[relation.targetColumn], recordId))
  }

  const junctionTable = resolveJunctionTable(relation)
  const targetSchema = resolveTargetSchema(relation.collection)

  const junctionSelection: Record<string, any> = {
    targetId: junctionTable[relation.targetJunctionColumn],
  }
  if (relation.sortable && relation.orderColumn) {
    junctionSelection.order = junctionTable[relation.orderColumn]
  }

  const junctionRows = await db
    .select(junctionSelection)
    .from(junctionTable)
    .where(eq(junctionTable[relation.sourceJunctionColumn], recordId))

  const targetIds = junctionRows.map((row: Record<string, unknown>) => row.targetId)
  if (targetIds.length === 0) return []

  const query = db
    .select()
    .from(targetSchema)
    .where(inArray(targetSchema.id, targetIds))

  if (relation.sortable && relation.orderColumn) {
    const orderMap = new Map(
      junctionRows.map((row: Record<string, unknown>) => [row.targetId, row.order]),
    )
    const results = await query
    results.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      return Number(orderMap.get(a.id) ?? 0) - Number(orderMap.get(b.id) ?? 0)
    })
    return results
  }

  return query
}
