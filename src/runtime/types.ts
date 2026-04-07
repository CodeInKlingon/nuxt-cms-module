import type { H3Event } from 'h3'

// Collection definition
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface CollectionDefinition<T = any> {
  name: string
  schema: T // Drizzle table reference
  dashboard?: DashboardConfig
  options?: CollectionOptions
  hooks?: CollectionHooks
  blocks?: CollectionBlocksConfig
}

// Collection blocks configuration
export interface CollectionBlocksConfig {
  enabled: boolean
  allowedBlocks?: string[] // Block names allowed in this collection
  fieldName?: string // DB column name (default: 'blocks')
}

// ---------------------------------------------------------------------------
// Dashboard — list + form configuration
// ---------------------------------------------------------------------------

/** Top-level dashboard config attached to a collection definition. */
export interface DashboardConfig {
  list?: ListConfig
  form?: FormConfig
}

// --- List view ---

/** A single option for a filter dropdown. */
export interface FilterOption {
  label: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any
}

/** Configuration for a single filter in the list view. */
export interface ListFilterConfig {
  field: string
  label?: string
  options: FilterOption[]
  /** Allow selecting multiple values (OR logic). Default: false. */
  multiple?: boolean
}

/** Configuration for the collection list/table view. */
export interface ListConfig {
  columns: ListColumnConfig[]
  filters?: ListFilterConfig[]
  // Future: searchFields, rowActions, etc.
}

/** A single column definition in the list view. */
export interface ListColumnConfig {
  field: string
  label?: string
  sortable?: boolean
  width?: number
}

// --- Form view ---

/**
 * Top-level form layout config. Use `tabs` for a tabbed layout or `sections`
 * for a flat single-page layout. If neither is provided the admin falls back
 * to auto-generating one section from the schema columns.
 */
export interface FormConfig {
  tabs?: FormTab[]
  sections?: FormSection[]
}

/** A top-level tab in the form. */
export interface FormTab {
  label: string
  icon?: string
  sections: FormSection[]
}

/** A labelled group of fields within a tab (or at the top level). */
export interface FormSection {
  label?: string
  description?: string
  fields: FormFieldConfig[]
}

/** Widget types the admin UI knows how to render. */
// eslint-disable-next-line @stylistic/operator-linebreak
export type WidgetType =
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
  | 'json'
  | 'array'
  | 'custom'
  | 'random-boolean'
  | 'blocks'

/** A single field entry inside a form section. */
export interface FormFieldConfig {
  field: string
  label?: string
  description?: string
  widget?: WidgetType
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props?: Record<string, any>
  required?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultValue?: any
  validation?: ValidationRule[]
  relation?: RelationConfig
  span?: 1 | 2 | 3 | 4
}

/** Configuration for a relation field in a form. */
export interface RelationConfig {
  type: 'one' | 'many'
  collection: string
  displayField: string
  foreignKey?: string
  localKey?: string
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

// eslint-disable-next-line @stylistic/operator-linebreak
export type ValidationRule =
  | { type: 'required', message?: string }
  | { type: 'min', value: number, message?: string }
  | { type: 'max', value: number, message?: string }
  | { type: 'pattern', value: RegExp | string, message?: string }
  | { type: 'email', message?: string }
  | { type: 'url', message?: string }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | { type: 'custom', fn: (value: any) => boolean | Promise<boolean>, message?: string }

export interface ValidationError {
  field: string
  message: string
  type: string
}

// ---------------------------------------------------------------------------
// Collection options
// ---------------------------------------------------------------------------

export interface CollectionOptions {
  label?: string
  description?: string
  icon?: string
  sortable?: boolean
  searchable?: boolean
  searchColumns?: string[]
  defaultSort?: { field: string, order: 'asc' | 'desc' }
  perPage?: number
  public?: boolean
}

// ---------------------------------------------------------------------------
// Lifecycle hooks
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface CollectionHooks<T = any> {
  beforeCreate?: (data: Partial<T>, context: CrudContext) => Promise<Partial<T>> | Partial<T>
  afterCreate?: (record: T, context: CrudContext) => Promise<void> | void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeUpdate?: (id: any, data: Partial<T>, context: CrudContext) => Promise<Partial<T>> | Partial<T>
  afterUpdate?: (record: T, context: CrudContext) => Promise<void> | void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeDelete?: (id: any, context: CrudContext) => Promise<boolean> | boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  afterDelete?: (id: any, context: CrudContext) => Promise<void> | void
  validate?: (data: Partial<T>) => Promise<ValidationError[]> | ValidationError[]
}

// ---------------------------------------------------------------------------
// CRUD / query
// ---------------------------------------------------------------------------

export interface CrudContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user?: any
  collection: string
  operation: 'create' | 'read' | 'update' | 'delete'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface PaginatedResult<T = any> {
  items: T[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

export interface QueryOptions {
  page?: number
  perPage?: number
  sort?: string
  order?: 'asc' | 'desc'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filter?: Record<string, any>
  search?: string
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

/**
 * Credentials structure for CMS login.
 * Users can augment this interface to include custom fields.
 */
export interface CmsLoginCredentials {
  username?: string
  email?: string
  password?: string
  [key: string]: unknown
}

/**
 * Verify function signature for custom auth handlers.
 * Return the user object to store in the session, or null to reject.
 */
export type CmsAuthVerifyFn = (
  event: H3Event,
  credentials: CmsLoginCredentials,
) => Promise<Record<string, unknown> | null> | Record<string, unknown> | null
