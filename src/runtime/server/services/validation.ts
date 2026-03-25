import type { CollectionDefinition, FieldDefinition, ValidationError } from '../../types'

/**
 * Validate data against collection field definitions
 */
export async function validateData(
  collection: CollectionDefinition,
  data: any,
): Promise<ValidationError[]> {
  const errors: ValidationError[] = []

  // Validate each field
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
 * Validate a single value against a validation rule
 */
async function validateRule(
  field: FieldDefinition,
  value: any,
  rule: any,
): Promise<ValidationError | null> {
  switch (rule.type) {
    case 'required':
      // Already checked above
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

    case 'pattern':
      {
        let regex: RegExp
        
        // Handle deserialized regex from runtime config
        if (typeof rule.value === 'string') {
          // Check if it's a serialized regex (e.g., "/pattern/flags")
          const match = rule.value.match(/^\/(.*)\/([gimuy]*)$/)
          if (match) {
            regex = new RegExp(match[1], match[2])
          } else {
            // Plain string pattern without flags
            regex = new RegExp(rule.value)
          }
        } else {
          regex = rule.value
        }
        
        if (!regex.test(value)) {
          return {
            field: field.name,
            message: rule.message || 'Invalid format',
            type: 'pattern',
          }
        }
      }
      break

    case 'email':
      {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) {
          return {
            field: field.name,
            message: rule.message || 'Invalid email address',
            type: 'email',
          }
        }
      }
      break

    case 'url':
      try {
        new URL(value)
      }
      catch {
        return {
          field: field.name,
          message: rule.message || 'Invalid URL',
          type: 'url',
        }
      }
      break

    case 'custom':
      {
        const isValid = await rule.fn(value)
        if (!isValid) {
          return {
            field: field.name,
            message: rule.message || 'Validation failed',
            type: 'custom',
          }
        }
      }
      break
  }

  return null
}
