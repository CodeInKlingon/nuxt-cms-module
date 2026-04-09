// Vue prop type constructors
export type PropTypeConstructor = StringConstructor | NumberConstructor | BooleanConstructor | ArrayConstructor | ObjectConstructor

// Widget definition options
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface WidgetDefinitionOptions<TValue, TOptions = Record<string, any>> {
  name: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: () => Promise<any>
  defaultOptions?: Partial<TOptions>
  validate?: (value: TValue, options: TOptions) => string | true
  propType?: PropTypeConstructor
}

// Widget registry entry
export interface WidgetRegistryEntry {
  name: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: () => Promise<any>
}

// Field function returned by defineWidget
export type FieldFunction<TValue, TOptions> = (
  options?: TOptions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
) => VuePropDefinition<TValue, TOptions>

// Vue prop definition with CMS metadata
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface VuePropDefinition<TValue, TOptions> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type: any
  required: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validator?: (value: any) => boolean
  cms: {
    widget: string
    options: TOptions
  }
}

// Widget component props (minimal)
export interface WidgetComponentProps<T> {
  modelValue: T
}

// Widget component emits
export interface WidgetComponentEmits<T> {
  'update:modelValue': [value: T]
}

// eslint-disable-next-line @stylistic/operator-linebreak

// Validation rule types
export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'min' | 'max' | 'pattern' | 'email' | 'url' | 'custom'
  value?: any
  message?: string
  fn?: (value: any) => boolean
}

// Base field options
export interface BaseFieldOptions {
  label?: string
  description?: string
  required?: boolean
  validation?: ValidationRule[]
}

// Text field options
export interface TextOptions extends BaseFieldOptions {
  default?: string
  placeholder?: string
  minLength?: number
  maxLength?: number
}

// Number field options
export interface NumberOptions extends BaseFieldOptions {
  default?: number
  placeholder?: string
  min?: number
  max?: number
  step?: number
}

// Textarea field options
export interface TextareaOptions extends TextOptions {
  rows?: number
}

// Boolean field options
export interface BooleanOptions extends BaseFieldOptions {
  default?: boolean
}

// Select field options
export interface SelectOption {
  label: string
  value: string
}

export interface SelectOptions extends BaseFieldOptions {
  default?: string | string[]
  options: SelectOption[] | Record<string, string>
  multiple?: boolean
}

// Link field options
export interface LinkValue {
  url: string
  label?: string
  target?: '_blank' | '_self'
  external?: boolean
}

export interface LinkOptions extends BaseFieldOptions {
  default?: LinkValue | (() => LinkValue)
  allowExternal?: boolean
  allowInternal?: boolean
}

// Relation field options
export interface RelationOptions extends BaseFieldOptions {
  collection: string
  multiple?: boolean
  fields?: string[]
  filter?: Record<string, any>
}

// Repeater field options
export interface RepeaterOptions extends BaseFieldOptions {
  default?: any[]
  fields: Record<string, VuePropDefinition<any, any>>
  minItems?: number
  maxItems?: number
}

// Block field types
export type BlockFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'link'
  | 'relation'
  | 'repeater'

// Block item structure
export interface BlockItem {
  id: string
  type: string
  data: Record<string, any>
  meta?: {
    createdAt: string
    updatedAt: string
  }
}
