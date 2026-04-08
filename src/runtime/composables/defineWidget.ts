import type {
  WidgetDefinitionOptions,
  FieldFunction,
  VuePropDefinition,
  ValidationRule,
} from '../types/widgets'

// Global widget registry for build-time collection
declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var __CMS_WIDGET_REGISTRY__: Map<string, WidgetDefinitionOptions<any, any>> | undefined
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function defineWidget<TValue = any, TOptions extends Record<string, any> = Record<string, any>>(
  definition: WidgetDefinitionOptions<TValue, TOptions>,
): FieldFunction<TValue, TOptions> {
  // Register widget globally (will be collected by module at build time)
  if (typeof globalThis !== 'undefined') {
    const registry = (globalThis.__CMS_WIDGET_REGISTRY__ ||= new Map())
    registry.set(definition.name, definition)
  }

  // Return field function
  return (options?: TOptions): VuePropDefinition<TValue, TOptions> => {
    const mergedOptions = {
      ...definition.defaultOptions,
      ...options,
    } as TOptions

    // Build validator function from validation rules
    const validator = buildValidator(mergedOptions.validation as ValidationRule[] | undefined)

    return {
      type: definition.propType ?? inferPropType<TValue>(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      required: (options as any)?.required ?? false,
      default: getDefaultValue<TValue>(mergedOptions, definition.defaultOptions),
      ...(validator && { validator }),
      cms: {
        widget: definition.name,
        options: mergedOptions,
      },
    }
  }
}

// Fallback Vue PropType when not specified in widget definition
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function inferPropType<_T>(): any {
  // Default to Object as a safe fallback
  // Most widgets should specify propType explicitly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Object as any
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getDefaultValue<T>(options: any, defaultOptions?: any): T {
  // If explicit default provided in options, use it
  if (options?.default !== undefined) {
    // Handle factory functions
    if (typeof options.default === 'function') {
      return options.default()
    }
    return options.default
  }

  // Otherwise fall back to widget's defaultOptions
  if (defaultOptions?.default !== undefined) {
    // Handle factory functions
    if (typeof defaultOptions.default === 'function') {
      return defaultOptions.default()
    }
    return defaultOptions.default
  }

  // Return sensible defaults based on type detection
  return getTypeDefault<T>(options)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getTypeDefault<T>(_options: any): T {
  // Default to null for objects/arrays, empty string for text, 0 for numbers, false for boolean
  return null as T
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildValidator(validationRules?: ValidationRule[]): ((value: any) => boolean) | undefined {
  if (!validationRules || validationRules.length === 0) return undefined

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (value: any): boolean => {
    for (const rule of validationRules) {
      if (!validateRule(value, rule)) {
        return false
      }
    }
    return true
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateRule(value: any, rule: ValidationRule): boolean {
  switch (rule.type) {
    case 'required':
      return value !== undefined && value !== null && value !== ''
    case 'minLength':
      return typeof value === 'string' && value.length >= (rule.value as number)
    case 'maxLength':
      return typeof value === 'string' && value.length <= (rule.value as number)
    case 'min':
      return typeof value === 'number' && value >= (rule.value as number)
    case 'max':
      return typeof value === 'number' && value <= (rule.value as number)
    case 'pattern':
      return typeof value === 'string' && new RegExp(rule.value as string).test(value)
    case 'email':
      // eslint-disable-next-line regexp/no-super-linear-backtracking
      return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    case 'url':
      try {
        if (typeof value === 'string') {
          new URL(value)
          return true
        }
        return false
      }
      catch {
        return false
      }
    case 'custom':
      return rule.fn ? rule.fn(value) : true
    default:
      return true
  }
}

// Export for use in field helpers
export { buildValidator }
