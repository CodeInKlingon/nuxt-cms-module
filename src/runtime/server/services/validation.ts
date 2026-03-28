import { createSchemaFactory } from 'drizzle-zod'
import type { z } from 'zod/v4'
import type { CollectionDefinition, FieldDefinition, ValidationError, ValidationRule } from '../../types'

// Factory with date coercion — converts date strings to Date objects automatically
const { createInsertSchema } = createSchemaFactory({
  coerce: { date: true },
})

/**
 * Build a Zod schema from a Drizzle table + collection field validation rules.
 * Uses drizzle-zod to introspect column types and applies collection-level
 * validation rules (min, max, pattern, email, url) as Zod refinements.
 */
function buildZodSchema(collection: CollectionDefinition) {
  // Build a refinement map from collection field definitions
  const refinements: Record<string, (schema: z.ZodType) => z.ZodType> = {}

  for (const field of collection.fields) {
    if (!field.validation?.length) continue

    refinements[field.name] = (columnSchema: z.ZodType) => {
      return applyFieldRules(columnSchema, field)
    }
  }

  // Use type assertion — the refinement keys are guaranteed to be valid
  // column names because they come from collection.fields which map 1:1 to schema columns
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createInsertSchema(collection.schema, refinements as any)
}

/**
 * Apply collection-level validation rules to a Zod schema for a single field.
 * Maps our ValidationRule types to Zod methods (min, max, regex, email, url, refine).
 */
function applyFieldRules(schema: z.ZodType, field: FieldDefinition): z.ZodType {
  let result = schema

  for (const rule of field.validation || []) {
    result = applyRule(result, field, rule)
  }

  return result
}

/**
 * Apply a single validation rule to a Zod schema.
 */
function applyRule(schema: z.ZodType, field: FieldDefinition, rule: ValidationRule): z.ZodType {
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
            || (field.type === 'number'
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
            || (field.type === 'number'
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
 * Validate and coerce incoming data against a Drizzle table schema + collection rules.
 *
 * - Generates a Zod insert schema from the Drizzle table (with date coercion)
 * - Layers collection field validation rules as Zod refinements
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
 * Legacy validation function — validates data against collection field definitions
 * without schema coercion. Kept for backward compatibility with existing tests and
 * code paths that don't need coercion.
 */
export async function validateData(
  collection: CollectionDefinition,
  data: Record<string, unknown>,
): Promise<ValidationError[]> {
  const errors: ValidationError[] = []

  for (const field of collection.fields) {
    const value = data[field.name]

    // Check required
    if (field.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field: field.name,
        message: `${field.label || field.name} is required`,
        type: 'required',
      })
      continue
    }

    // Skip validation if no value
    if (value === undefined || value === null)
      continue

    // Validate against rules
    if (field.validation) {
      for (const rule of field.validation) {
        const error = await validateRule(field, value, rule)
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
  field: FieldDefinition,
  value: unknown,
  rule: ValidationRule,
): Promise<ValidationError | null> {
  switch (rule.type) {
    case 'required':
      return null

    case 'min':
      if (typeof value === 'number' && value < rule.value) {
        return {
          field: field.name,
          message: rule.message || `Must be at least ${rule.value}`,
          type: 'min',
        }
      }
      if (typeof value === 'string' && value.length < rule.value) {
        return {
          field: field.name,
          message: rule.message || `Must be at least ${rule.value} characters`,
          type: 'min',
        }
      }
      break

    case 'max':
      if (typeof value === 'number' && value > rule.value) {
        return {
          field: field.name,
          message: rule.message || `Must be at most ${rule.value}`,
          type: 'max',
        }
      }
      if (typeof value === 'string' && value.length > rule.value) {
        return {
          field: field.name,
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
          field: field.name,
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
          field: field.name,
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
          field: field.name,
          message: rule.message || 'Invalid URL',
          type: 'url',
        }
      }
      break

    case 'custom': {
      const isValid = await rule.fn(value)
      if (!isValid) {
        return {
          field: field.name,
          message: rule.message || 'Validation failed',
          type: 'custom',
        }
      }
      break
    }
  }

  return null
}
