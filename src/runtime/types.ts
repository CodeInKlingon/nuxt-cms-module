import type { Table } from 'drizzle-orm'

// Collection definition
export interface CollectionDefinition<T = any> {
  name: string
  schema: T
  fields: FieldDefinition[]
  options?: CollectionOptions
  hooks?: CollectionHooks
}

// Field definition
export interface FieldDefinition {
  name: string
  type: FieldType
  label?: string
  description?: string
  required?: boolean
  validation?: ValidationRule[]
  widget?: WidgetConfig
  defaultValue?: any
}

// Field types
export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'richtext'
  | 'file'
  | 'image'
  | 'relation'
  | 'json'
  | 'array'

// Widget configuration
export interface WidgetConfig {
  component?: string                    // Custom widget component
  props?: Record<string, any>           // Widget props
  [key: string]: any                    // Widget-specific config
}

// Validation rules
export type ValidationRule =
  | { type: 'required'; message?: string }
  | { type: 'min'; value: number; message?: string }
  | { type: 'max'; value: number; message?: string }
  | { type: 'pattern'; value: RegExp | string; message?: string }
  | { type: 'email'; message?: string }
  | { type: 'url'; message?: string }
  | { type: 'custom'; fn: (value: any) => boolean | Promise<boolean>; message?: string }

// Collection options
export interface CollectionOptions {
  label?: string                        // Display name
  description?: string
  icon?: string                         // Icon for admin UI
  sortable?: boolean                    // Enable sorting
  searchable?: boolean                  // Enable search
  defaultSort?: { field: string; order: 'asc' | 'desc' }
  perPage?: number                      // Pagination
}

// Lifecycle hooks
export interface CollectionHooks<T = any> {
  beforeCreate?: (data: Partial<T>, context: CrudContext) => Promise<Partial<T>> | Partial<T>
  afterCreate?: (record: T, context: CrudContext) => Promise<void> | void
  beforeUpdate?: (id: any, data: Partial<T>, context: CrudContext) => Promise<Partial<T>> | Partial<T>
  afterUpdate?: (record: T, context: CrudContext) => Promise<void> | void
  beforeDelete?: (id: any, context: CrudContext) => Promise<boolean> | boolean
  afterDelete?: (id: any, context: CrudContext) => Promise<void> | void
  validate?: (data: Partial<T>) => Promise<ValidationError[]> | ValidationError[]
}

// Validation error
export interface ValidationError {
  field: string
  message: string
  type: string
}

// CRUD context
export interface CrudContext {
  user?: any                            // Authenticated user
  collection: string
  operation: 'create' | 'read' | 'update' | 'delete'
}

// Pagination result
export interface PaginatedResult<T = any> {
  items: T[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

// Query options
export interface QueryOptions {
  page?: number
  perPage?: number
  sort?: string
  order?: 'asc' | 'desc'
  filter?: Record<string, any>
  search?: string
}
