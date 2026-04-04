import { createSchemaFactory } from 'drizzle-zod'
import type { z } from 'zod/v4'
import type { CollectionDefinition, FormFieldConfig, ValidationError, ValidationRule } from '../../types'

// Factory with date coercion — converts date strings to Date objects automatically
const { createInsertSchema } = createSchemaFactory({
  coerce: { date: true },
})

/**
 * Flatten all FormFieldConfig entries from a collection's dashboard config.
 * Walks tabs → sections → fields (or sections → fields for flat layouts).
 * Returns an empty array when no dashboard is defined.
 */
function flattenDashboardFields(collection: CollectionDefinition): FormFieldConfig[] {
  const dashboard = collection.dashboard
  if (!dashboard?.form) return []

  const allFields: FormFieldConfig[] = []

  const addSection = (sections: typeof dashboard.form.sections) => {
    for (const section of sections ?? []) {
      allFields.push(...section.fields)
    }
  }

  if (dashboard.form.tabs?.length) {
    for (const tab of dashboard.form.tabs) {
      addSection(tab.sections)
    }
  }
  else {
    addSection(dashboard.form.sections)
  }

  return allFields
}

/**
 * Build a Zod schema from a Drizzle table + dashboard form validation rules.
 * Uses drizzle-zod to introspect column types and applies per-field validation
 * rules from `dashboard.form` as Zod refinements.
 */
function buildZodSchema(collection: CollectionDefinition) {
  const fields = flattenDashboardFields(collection)

  // Build a refinement map from dashboard field configs
  const refinements: Record<string, (schema: z.ZodType) => z.ZodType> = {}

  for (const fieldConfig of fields) {
    if (!fieldConfig.validation?.length) continue

    refinements[fieldConfig.field] = (columnSchema: z.ZodType) => {
      return applyFieldRules(columnSchema, fieldConfig)
    }
  }

  // Use type assertion — refinement keys are guaranteed to be valid column names
  // because they come from dashboard.form which maps 1:1 to schema columns
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createInsertSchema(collection.schema, refinements as any)
}

/**
 * Apply dashboard field validation rules to a Zod schema for a single field.
 */
function applyFieldRules(schema: z.ZodType, fieldConfig: FormFieldConfig): z.ZodType {
  let result = schema

  for (const rule of fieldConfig.validation || []) {
    result = applyRule(result, fieldConfig, rule)
  }

  return result
}

/**
 * Apply a single validation rule to a Zod schema.
 */
function applyRule(schema: z.ZodType, fieldConfig: FormFieldConfig, rule: ValidationRule): z.ZodType {
  switch (rule.type) {
    case 'required':
      // drizzle-zod already handles notNull; skip
      return schema

    case 'min':
      return schema.refine(
        (val: unknown) => {
          if (val === undefined || val === null) return true
          if (typeof val === 'number') return val >= rule.value
          if (typeof val === 'string') return val.length >= rule.value
          return true
        },
        {
          message: rule.message
            || (fieldConfig.widget === 'number'
              ? `Must be at least ${rule.value}`
              : `Must be at least ${rule.value} characters`),
        },
      )

    case 'max':
      return schema.refine(
        (val: unknown) => {
          if (val === undefined || val === null) return true
          if (typeof val === 'number') return val <= rule.value
          if (typeof val === 'string') return val.length <= rule.value
          return true
        },
        {
          message: rule.message
            || (fieldConfig.widget === 'number'
              ? `Must be at most ${rule.value}`
              : `Must be at most ${rule.value} characters`),
        },
      )

    case 'pattern': {
      const patternValue = rule.value
      let regex: RegExp
      if (typeof patternValue === 'string') {
        const match = patternValue.match(/^\/(.*)\/([gimuy]*)$/)
        regex = match ? new RegExp(match[1]!, match[2]) : new RegExp(patternValue)
      }
      else {
        regex = patternValue
      }
      return schema.refine(
        (val: unknown) => {
          if (val === undefined || val === null) return true
          if (typeof val !== 'string') return true
          return regex.test(val)
        },
        { message: rule.message || 'Invalid format' },
      )
    }

    case 'email':
      return schema.refine(
        (val: unknown) => {
          if (val === undefined || val === null) return true
          if (typeof val !== 'string') return true
          return /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(val)
        },
        { message: rule.message || 'Invalid email address' },
      )

    case 'url':
      return schema.refine(
        (val: unknown) => {
          if (val === undefined || val === null) return true
          if (typeof val !== 'string') return true
          try {
            new URL(val)
            return true
          }
          catch {
            return false
          }
        },
        { message: rule.message || 'Invalid URL' },
      )

    case 'custom':
      return schema.refine(
        async (val: unknown) => {
          if (val === undefined || val === null) return true
          return rule.fn(val)
        },
        { message: rule.message || 'Validation failed' },
      )

    default:
      return schema
  }
}

/**
 * Map Zod issue paths to our ValidationError format.
 */
function zodIssuesToErrors(issues: readonly z.core.$ZodIssue[]): ValidationError[] {
  return issues.map((issue) => {
    const field = String(issue.path[0] ?? 'unknown')
    const type = inferErrorType(issue.message)
    return { field, message: issue.message, type }
  })
}

/**
 * Infer a validation error type from a Zod error message.
 * Falls back to 'validation' for unrecognised messages.
 */
function inferErrorType(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('required') || lower.includes('expected') || lower === 'required') return 'required'
  if (lower.includes('at least') && lower.includes('character')) return 'min'
  if (lower.includes('at most') && lower.includes('character')) return 'max'
  if (lower.includes('at least') || lower.includes('must be positive') || lower.includes('minimum')) return 'min'
  if (lower.includes('at most') || lower.includes('maximum')) return 'max'
  if (lower.includes('email')) return 'email'
  if (lower.includes('url')) return 'url'
  if (lower.includes('format') || lower.includes('pattern')) return 'pattern'
  return 'validation'
}

/**
 * Result type for validateAndCoerce — either coerced data or validation errors.
 */
export type ValidateResult
  = | { success: true, data: Record<string, unknown> }
    | { success: false, errors: ValidationError[] }

/**
 * Validate and coerce incoming data against a Drizzle table schema + dashboard
 * field validation rules.
 *
 * - Generates a Zod insert schema from the Drizzle table (with date coercion)
 * - Layers validation rules from `dashboard.form` fields as Zod refinements
 * - Runs the collection's hooks.validate custom hook
 * - Returns coerced data on success, or ValidationError[] on failure
 */
export async function validateAndCoerce(
  collection: CollectionDefinition,
  data: Record<string, unknown>,
): Promise<ValidateResult> {
  const schema = buildZodSchema(collection)
  const result = await schema.safeParseAsync(data)

  if (!result.success) {
    const errors = zodIssuesToErrors(result.error.issues)
    return { success: false, errors }
  }

  // Run custom validation hook if defined
  if (collection.hooks?.validate) {
    const customErrors = await collection.hooks.validate(result.data)
    if (customErrors.length > 0) {
      return { success: false, errors: customErrors }
    }
  }

  return { success: true, data: result.data as Record<string, unknown> }
}

/**
 * Legacy validation function — validates data against dashboard form field
 * configs without schema coercion. Kept for code paths that don't need coercion.
 */
export async function validateData(
  collection: CollectionDefinition,
  data: Record<string, unknown>,
): Promise<ValidationError[]> {
  const errors: ValidationError[] = []
  const fields = flattenDashboardFields(collection)

  for (const fieldConfig of fields) {
    const value = data[fieldConfig.field]

    // Check required
    if (fieldConfig.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field: fieldConfig.field,
        message: `${fieldConfig.label || fieldConfig.field} is required`,
        type: 'required',
      })
      continue
    }

    // Skip validation if no value
    if (value === undefined || value === null)
      continue

    // Validate against rules
    if (fieldConfig.validation) {
      for (const rule of fieldConfig.validation) {
        const error = await validateRule(fieldConfig, value, rule)
        if (error) {
          errors.push(error)
        }
      }
    }
  }

  // Execute custom validation hook
  if (collection.hooks?.validate) {
    const customErrors = await collection.hooks.validate(data)
    errors.push(...customErrors)
  }

  return errors
}

/**
 * Validate a single value against a validation rule (legacy helper).
 */
async function validateRule(
  fieldConfig: FormFieldConfig,
  value: unknown,
  rule: ValidationRule,
): Promise<ValidationError | null> {
  switch (rule.type) {
    case 'required':
      return null

    case 'min':
      if (typeof value === 'number' && value < rule.value) {
        return {
          field: fieldConfig.field,
          message: rule.message || `Must be at least ${rule.value}`,
          type: 'min',
        }
      }
      if (typeof value === 'string' && value.length < rule.value) {
        return {
          field: fieldConfig.field,
          message: rule.message || `Must be at least ${rule.value} characters`,
          type: 'min',
        }
      }
      break

    case 'max':
      if (typeof value === 'number' && value > rule.value) {
        return {
          field: fieldConfig.field,
          message: rule.message || `Must be at most ${rule.value}`,
          type: 'max',
        }
      }
      if (typeof value === 'string' && value.length > rule.value) {
        return {
          field: fieldConfig.field,
          message: rule.message || `Must be at most ${rule.value} characters`,
          type: 'max',
        }
      }
      break

    case 'pattern': {
      const patternValue = rule.value
      let regex: RegExp
      if (typeof patternValue === 'string') {
        const match = patternValue.match(/^\/(.*)\/([gimuy]*)$/)
        regex = match ? new RegExp(match[1]!, match[2]) : new RegExp(patternValue)
      }
      else {
        regex = patternValue
      }
      if (!regex.test(value as string)) {
        return {
          field: fieldConfig.field,
          message: rule.message || 'Invalid format',
          type: 'pattern',
        }
      }
      break
    }

    case 'email': {
      const emailRegex = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/
      if (!emailRegex.test(value as string)) {
        return {
          field: fieldConfig.field,
          message: rule.message || 'Invalid email address',
          type: 'email',
        }
      }
      break
    }

    case 'url':
      try {
        new URL(value as string)
      }
      catch {
        return {
          field: fieldConfig.field,
          message: rule.message || 'Invalid URL',
          type: 'url',
        }
      }
      break

    case 'custom': {
      const isValid = await rule.fn(value)
      if (!isValid) {
        return {
          field: fieldConfig.field,
          message: rule.message || 'Validation failed',
          type: 'custom',
        }
      }
      break
    }
  }

  return null
}
