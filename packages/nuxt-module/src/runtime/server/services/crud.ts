/* eslint-disable @typescript-eslint/no-explicit-any */

import type { H3Event } from 'h3'
import { eq, like, or, and, asc, desc, inArray } from 'drizzle-orm'
import type { CollectionDefinition, CrudContext, PaginatedResult, QueryOptions, RelationDisplayConfig, RelationDisplaySourceConfig } from '../../types'
import { getIdColumn, getRecordId } from '../../utils/primary-key'
import { getDrizzleConnection, getCollectionSchema, getSchemaTable } from '../utils/drizzle-adapter'
import { executeHooks } from './hooks'
import { validateAndCoerce } from './validation'
import { deleteRelations, extractRelations, writeRelations } from './relations'

/**
 * CRUD service for managing collection data
 */
export class CrudService {
  constructor(
    private collection: CollectionDefinition,
    private event: H3Event,
  ) {}

  private get db() {
    return getDrizzleConnection()
  }

  private get schema() {
    const schema = getCollectionSchema(this.collection.name)
    if (!schema) {
      throw new Error(`Schema not found for collection: ${this.collection.name}. Make sure to register it in your server plugin.`)
    }
    return schema
  }

  private get context(): CrudContext {
    return {
      collection: this.collection.name,
      operation: 'read',
      user: this.event.context.user,
    }
  }

  /**
   * Find many records with pagination, filtering, search, and sorting
   */
  async findMany(query: QueryOptions = {}): Promise<PaginatedResult> {
    const {
      page = 1,
      perPage = this.collection.options?.perPage || 25,
      filter,
      search,
      searchColumns,
      sort,
      order = 'asc',
      display,
    } = query
    const displayConfig = display ?? this.collection.options?.display

    let dbQuery = this.db.select().from(this.schema)

    // Apply filters
    if (filter && Object.keys(filter).length > 0) {
      dbQuery = this.applyFilters(dbQuery, filter)
    }

    // Apply search
    if (search && this.collection.options?.searchable) {
      const columns = searchColumns ?? this.collection.options?.searchColumns ?? displayConfig?.searchFields
      if (columns && columns.length > 0) {
        dbQuery = await this.applySearchFilter(dbQuery, search, columns, displayConfig)
      }
    }

    // Apply sorting
    if (sort) {
      dbQuery = this.applySorting(dbQuery, sort, order)
    }

    // Apply pagination
    const offset = (Number(page) - 1) * Number(perPage)
    dbQuery = dbQuery.limit(Number(perPage)).offset(offset)

    const items = await dbQuery
    const displayItems = displayConfig?.source
      ? await this.resolveDisplaySourceRows(items, displayConfig)
      : items
    const total = await this.count(filter, search, searchColumns, displayConfig)

    return {
      items: displayItems,
      total,
      page: Number(page),
      perPage: Number(perPage),
      totalPages: Math.ceil(total / Number(perPage)),
    }
  }

  /**
   * Find a single record by ID
   */
  async findOne(id: any): Promise<any> {
    const results = await this.db
      .select()
      .from(this.schema)
      .where(eq(getIdColumn(this.collection, this.schema), id))
      .limit(1)

    return results[0] || null
  }

  /**
   * Create a new record
   */
  async create(data: any): Promise<any> {
    return await this.db.transaction(async (tx: any) => {
      const context: CrudContext = { ...this.context, operation: 'create' }

      // Execute beforeCreate hook
      if (this.collection.hooks?.beforeCreate) {
        data = await executeHooks(
          this.collection.hooks.beforeCreate,
          data,
          context,
        )
      }

      // Separate relation values from the main-record payload
      const { mainData, relationValues } = extractRelations(this.collection, data)

      // Validate and coerce data
      const result = await validateAndCoerce(this.collection, mainData)
      if (!result.success) {
        throw new Error(`Validation failed: ${JSON.stringify(result.errors)}`)
      }

      // Insert record
      const [record] = await tx
        .insert(this.schema)
        .values(result.data)
        .returning()

      // Persist relations inside the same transaction
      await writeRelations(tx, this.collection, getRecordId(this.collection, record) as string | number, relationValues)

      // Execute afterCreate hook
      if (this.collection.hooks?.afterCreate) {
        await executeHooks(
          this.collection.hooks.afterCreate,
          record,
          context,
        )
      }

      return record
    })
  }

  /**
   * Update an existing record
   */
  async update(id: any, data: any): Promise<any> {
    return await this.db.transaction(async (tx: any) => {
      const context: CrudContext = { ...this.context, operation: 'update' }

      // Execute beforeUpdate hook
      if (this.collection.hooks?.beforeUpdate) {
        data = await executeHooks(
          this.collection.hooks.beforeUpdate,
          { id, ...data },
          context,
        )
      }

      // Separate relation values from the main-record payload
      const { mainData, relationValues } = extractRelations(this.collection, data)

      // Validate and coerce data
      const result = await validateAndCoerce(this.collection, mainData)
      if (!result.success) {
        throw new Error(`Validation failed: ${JSON.stringify(result.errors)}`)
      }

      // Update record
      const [record] = await tx
        .update(this.schema)
        .set(result.data)
        .where(eq(getIdColumn(this.collection, this.schema), id))
        .returning()

      // Persist relations inside the same transaction
      await writeRelations(tx, this.collection, id, relationValues)

      // Execute afterUpdate hook
      if (this.collection.hooks?.afterUpdate) {
        await executeHooks(
          this.collection.hooks.afterUpdate,
          record,
          context,
        )
      }

      return record
    })
  }

  /**
   * Delete a record
   */
  async delete(id: any): Promise<{ success: boolean }> {
    return await this.db.transaction(async (tx: any) => {
      const context: CrudContext = { ...this.context, operation: 'delete' }

      // Execute beforeDelete hook
      if (this.collection.hooks?.beforeDelete) {
        const shouldContinue = await executeHooks(
          this.collection.hooks.beforeDelete,
          id,
          context,
        )
        if (shouldContinue === false) {
          throw new Error('Delete operation cancelled by hook')
        }
      }

      // Clean up related records inside the same transaction
      await deleteRelations(tx, this.collection, id)

      // Delete record
      await tx
        .delete(this.schema)
        .where(eq(getIdColumn(this.collection, this.schema), id))

      // Execute afterDelete hook
      if (this.collection.hooks?.afterDelete) {
        await executeHooks(
          this.collection.hooks.afterDelete,
          id,
          context,
        )
      }

      return { success: true }
    })
  }

  /**
   * Count total records with optional filters
   */
  private async count(
    filter?: Record<string, any>,
    search?: string,
    querySearchColumns?: string[],
    displayConfig: RelationDisplayConfig | undefined = this.collection.options?.display,
  ): Promise<number> {
    let countQuery = this.db.select().from(this.schema)

    // Apply filters
    if (filter && Object.keys(filter).length > 0) {
      countQuery = this.applyFilters(countQuery, filter)
    }

    // Apply search filter to count as well
    if (search && this.collection.options?.searchable) {
      const searchColumns = querySearchColumns ?? this.collection.options?.searchColumns ?? displayConfig?.searchFields
      if (searchColumns && searchColumns.length > 0) {
        countQuery = await this.applySearchFilter(countQuery, search, searchColumns, displayConfig)
      }
    }

    const results = await countQuery
    return results.length
  }

  /**
   * Apply search filter across specified columns using partial matching with OR logic
   */
  private async applySearchFilter(query: any, searchTerm: string, columns: string[], displayConfig?: RelationDisplayConfig) {
    const displaySource = displayConfig?.source
    if (displaySource) {
      return await this.applyDisplaySourceSearchFilter(query, searchTerm, columns, displaySource)
    }

    const searchPattern = `%${searchTerm}%`
    const conditions = columns
      .map((col) => {
        // Validate column exists in schema to avoid runtime errors
        if (!(col in this.schema)) {
          console.warn(`Search column "${col}" not found in schema for collection "${this.collection.name}"`)
          return null
        }
        return like(this.schema[col], searchPattern)
      })
      .filter((condition): condition is ReturnType<typeof like> => condition !== null)

    if (conditions.length === 0) {
      return query
    }

    return query.where(or(...conditions))
  }

  private async applyDisplaySourceSearchFilter(
    query: any,
    searchTerm: string,
    columns: string[],
    source: RelationDisplaySourceConfig,
  ) {
    const sourceTable = this.resolveDisplaySourceTable(source)
    this.validateDisplaySourceColumns(sourceTable, source)
    const searchPattern = `%${searchTerm}%`
    const searchConditions = columns
      .map((col) => {
        if (!(col in sourceTable)) {
          console.warn(`Display search column "${col}" not found for collection "${this.collection.name}"`)
          return null
        }
        return like(sourceTable[col], searchPattern)
      })
      .filter((condition): condition is ReturnType<typeof like> => condition !== null)

    if (searchConditions.length === 0) return query

    const sourceConditions = [or(...searchConditions), ...this.buildDisplaySourceWhere(sourceTable, source.where)]
    const sourceRows = await this.db
      .select({ value: sourceTable[source.foreignColumn] })
      .from(sourceTable)
      .where(and(...sourceConditions))

    const ids = sourceRows
      .map((row: Record<string, unknown>) => row.value)
      .filter((value: unknown): value is string | number => typeof value === 'string' || typeof value === 'number')

    if (ids.length === 0) {
      return query.where(inArray(this.schema[source.localColumn], []))
    }

    return query.where(inArray(this.schema[source.localColumn], ids))
  }

  private async resolveDisplaySourceRows(items: Record<string, unknown>[], display: RelationDisplayConfig): Promise<Record<string, unknown>[]> {
    if (!display.source || items.length === 0) return items

    const source = display.source
    const sourceTable = this.resolveDisplaySourceTable(source)
    this.validateDisplaySourceColumns(sourceTable, source)

    return await Promise.all(items.map(async (item) => {
      const localValue = item[source.localColumn]
      if (localValue === undefined || localValue === null) return item

      const conditions = [
        eq(sourceTable[source.foreignColumn], localValue),
        ...this.buildDisplaySourceWhere(sourceTable, source.where),
      ]
      const rows = await this.db
        .select()
        .from(sourceTable)
        .where(and(...conditions))
        .limit(1)

      return rows[0] ? { ...item, ...rows[0] } : item
    }))
  }

  private resolveDisplaySourceTable(source: RelationDisplaySourceConfig): any {
    if (source.collection) {
      const schema = getCollectionSchema(source.collection)
      if (!schema) {
        throw new Error(`Display source collection "${source.collection}" not found.`)
      }
      return schema
    }

    if (typeof source.table === 'string') {
      const table = getSchemaTable(source.table)
      if (!table) {
        throw new Error(`Display source table "${source.table}" not found.`)
      }
      return table
    }

    if (source.table) return source.table

    throw new Error('Display source requires either "collection" or "table".')
  }

  private buildDisplaySourceWhere(sourceTable: any, where: RelationDisplaySourceConfig['where'] = {}) {
    return Object.entries(where)
      .map(([field, value]) => {
        if (!(field in sourceTable)) {
          throw new Error(`Display source where column "${field}" not found.`)
        }
        return eq(sourceTable[field], value)
      })
  }

  private validateDisplaySourceColumns(sourceTable: any, source: RelationDisplaySourceConfig): void {
    if (!(source.localColumn in this.schema)) {
      throw new Error(`Display source localColumn "${source.localColumn}" not found in collection "${this.collection.name}".`)
    }
    if (!(source.foreignColumn in sourceTable)) {
      throw new Error(`Display source foreignColumn "${source.foreignColumn}" not found.`)
    }
  }

  /**
   * Apply sorting to the query based on the sort field and order
   */
  private applySorting(query: any, sortField: string, order: 'asc' | 'desc' = 'asc') {
    // Validate that the sort field exists in the schema
    if (!(sortField in this.schema)) {
      throw new Error(
        `Sort field "${sortField}" not found in schema for collection "${this.collection.name}"`,
      )
    }

    // Check if the field is marked as sortable in the dashboard config
    const listColumns = this.collection.dashboard?.list?.columns
    if (listColumns && listColumns.length > 0) {
      const columnConfig = listColumns.find(col => col.field === sortField)
      if (columnConfig && columnConfig.sortable === false) {
        throw new Error(
          `Field "${sortField}" is not sortable in collection "${this.collection.name}"`,
        )
      }
    }

    // Apply the sort order
    const sortFn = order === 'desc' ? desc : asc
    return query.orderBy(sortFn(this.schema[sortField]))
  }

  /**
   * Apply filter conditions to the query
   */
  private applyFilters(query: any, filter: Record<string, any>) {
    const conditions = Object.entries(filter)
      .map(([field, value]) => {
        // Skip if field doesn't exist in schema
        if (!(field in this.schema)) {
          console.warn(`Filter field "${field}" not found in schema for collection "${this.collection.name}"`)
          return null
        }

        // Skip empty values
        if (value === undefined || value === null || value === '') {
          return null
        }

        // Coerce value types based on schema column type
        const coercedValue = this.coerceFilterValue(value, field)

        // Handle array values (OR logic for multiple selection)
        if (Array.isArray(coercedValue) && coercedValue.length > 0) {
          return inArray(this.schema[field], coercedValue)
        }

        // Handle single value
        return eq(this.schema[field], coercedValue)
      })
      .filter((condition): condition is ReturnType<typeof eq> => condition !== null)

    if (conditions.length === 0) {
      return query
    }

    return query.where(and(...conditions))
  }

  /**
   * Coerce filter value to match the schema column type
   */
  private coerceFilterValue(value: any, field: string): any {
    // Handle arrays recursively
    if (Array.isArray(value)) {
      return value.map(v => this.coerceFilterValue(v, field))
    }

    // Get the column from schema to check its type
    const column = this.schema[field]
    if (!column) return value

    // Check column type and coerce accordingly
    const columnType = column.getSQLType?.() || ''

    // Boolean fields (SQLite stores booleans as integers with mode: 'boolean')
    if (columnType === 'boolean' || columnType.includes('bool')) {
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true' ? 1 : 0
      }
      return value ? 1 : 0
    }

    // Integer fields - check if this might be a boolean column by config
    if (columnType === 'integer' || columnType === 'int' || columnType === 'serial') {
      // Check if value looks like a boolean string
      if (typeof value === 'string' && (value.toLowerCase() === 'true' || value.toLowerCase() === 'false')) {
        return value.toLowerCase() === 'true' ? 1 : 0
      }
      const num = Number.parseInt(value, 10)
      return Number.isNaN(num) ? value : num
    }

    // Real/Float fields
    if (columnType === 'real' || columnType === 'float' || columnType === 'double' || columnType === 'decimal') {
      const num = Number.parseFloat(value)
      return Number.isNaN(num) ? value : num
    }

    return value
  }
}
