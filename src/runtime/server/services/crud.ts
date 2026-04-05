import type { H3Event } from 'h3'
import { eq, like, or } from 'drizzle-orm'
import type { CollectionDefinition, CrudContext, PaginatedResult, QueryOptions } from '../../types'
import { getDrizzleConnection, getCollectionSchema } from '../utils/drizzle-adapter'
import { executeHooks } from './hooks'
import { validateAndCoerce } from './validation'

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
   * Find many records with pagination, filtering, and search
   */
  async findMany(query: QueryOptions = {}): Promise<PaginatedResult> {
    const {
      page = 1,
      perPage = this.collection.options?.perPage || 25,
      filter,
      search,
    } = query

    let dbQuery = this.db.select().from(this.schema)

    // Apply filters
    // TODO: Implement filtering based on filter object

    // Apply search
    if (search && this.collection.options?.searchable) {
      const searchColumns = this.collection.options?.searchColumns
      if (searchColumns && searchColumns.length > 0) {
        dbQuery = this.applySearchFilter(dbQuery, search, searchColumns)
      }
    }

    // Apply sorting
    // TODO: Implement sorting based on sort field

    // Apply pagination
    const offset = (Number(page) - 1) * Number(perPage)
    dbQuery = dbQuery.limit(Number(perPage)).offset(offset)

    const items = await dbQuery
    const total = await this.count(filter, search)

    return {
      items,
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
      .where(eq(this.schema.id, id))
      .limit(1)

    return results[0] || null
  }

  /**
   * Create a new record
   */
  async create(data: any): Promise<any> {
    const context: CrudContext = { ...this.context, operation: 'create' }

    // Execute beforeCreate hook
    if (this.collection.hooks?.beforeCreate) {
      data = await executeHooks(
        this.collection.hooks.beforeCreate,
        data,
        context,
      )
    }

    // Validate and coerce data
    const result = await validateAndCoerce(this.collection, data)
    if (!result.success) {
      throw new Error(`Validation failed: ${JSON.stringify(result.errors)}`)
    }

    // Insert record
    const [record] = await this.db
      .insert(this.schema)
      .values(result.data)
      .returning()

    // Execute afterCreate hook
    if (this.collection.hooks?.afterCreate) {
      await executeHooks(
        this.collection.hooks.afterCreate,
        record,
        context,
      )
    }

    return record
  }

  /**
   * Update an existing record
   */
  async update(id: any, data: any): Promise<any> {
    const context: CrudContext = { ...this.context, operation: 'update' }

    // Execute beforeUpdate hook
    if (this.collection.hooks?.beforeUpdate) {
      data = await executeHooks(
        this.collection.hooks.beforeUpdate,
        { id, ...data },
        context,
      )
    }

    // Validate and coerce data
    const result = await validateAndCoerce(this.collection, data)
    if (!result.success) {
      throw new Error(`Validation failed: ${JSON.stringify(result.errors)}`)
    }

    // Update record
    const [record] = await this.db
      .update(this.schema)
      .set(result.data)
      .where(eq(this.schema.id, id))
      .returning()

    // Execute afterUpdate hook
    if (this.collection.hooks?.afterUpdate) {
      await executeHooks(
        this.collection.hooks.afterUpdate,
        record,
        context,
      )
    }

    return record
  }

  /**
   * Delete a record
   */
  async delete(id: any): Promise<{ success: boolean }> {
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

    // Delete record
    await this.db
      .delete(this.schema)
      .where(eq(this.schema.id, id))

    // Execute afterDelete hook
    if (this.collection.hooks?.afterDelete) {
      await executeHooks(
        this.collection.hooks.afterDelete,
        id,
        context,
      )
    }

    return { success: true }
  }

  /**
   * Count total records with optional filters
   */
  private async count(filter?: any, search?: string): Promise<number> {
    let countQuery = this.db.select().from(this.schema)

    // Apply search filter to count as well
    if (search && this.collection.options?.searchable) {
      const searchColumns = this.collection.options?.searchColumns
      if (searchColumns && searchColumns.length > 0) {
        countQuery = this.applySearchFilter(countQuery, search, searchColumns)
      }
    }

    // TODO: Implement proper count with filters
    const results = await countQuery
    return results.length
  }

  /**
   * Apply search filter across specified columns using partial matching with OR logic
   */
  private applySearchFilter(query: any, searchTerm: string, columns: string[]) {
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
}
