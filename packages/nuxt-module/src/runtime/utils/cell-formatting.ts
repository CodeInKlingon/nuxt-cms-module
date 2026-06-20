/**
 * Parse an unknown value into a Date.
 */
function parseDate(value: unknown): Date | null {
  if (value instanceof Date) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date
  }
  return null
}

/**
 * Format a value as a date string using Intl.DateTimeFormat.
 */
export function formatDate(value: unknown, options?: Intl.DateTimeFormatOptions): string {
  const date = parseDate(value)
  if (!date) return String(value ?? '')
  return new Intl.DateTimeFormat('en', options ?? { year: 'numeric', month: 'short', day: 'numeric' }).format(date)
}

/**
 * Format a value as a datetime string using Intl.DateTimeFormat.
 */
export function formatDateTime(value: unknown, options?: Intl.DateTimeFormatOptions): string {
  const date = parseDate(value)
  if (!date) return String(value ?? '')
  return new Intl.DateTimeFormat('en', options ?? { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
}

/**
 * Format a value as a relative time string.
 */
export function formatRelative(value: unknown): string {
  const date = parseDate(value)
  if (!date) return String(value ?? '')
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.round(diffMs / 1000)
  const diffMin = Math.round(diffSec / 60)
  const diffHour = Math.round(diffMin / 60)
  const diffDay = Math.round(diffHour / 24)
  const diffMonth = Math.round(diffDay / 30)
  const diffYear = Math.round(diffDay / 365)

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  if (Math.abs(diffSec) < 60) return rtf.format(-diffSec, 'second')
  if (Math.abs(diffMin) < 60) return rtf.format(-diffMin, 'minute')
  if (Math.abs(diffHour) < 24) return rtf.format(-diffHour, 'hour')
  if (Math.abs(diffDay) < 30) return rtf.format(-diffDay, 'day')
  if (Math.abs(diffMonth) < 12) return rtf.format(-diffMonth, 'month')
  return rtf.format(-diffYear, 'year')
}

/**
 * Format a value as currency.
 */
export function formatCurrency(value: unknown, currency = 'USD', locale = 'en-US'): string {
  if (value === null || value === undefined) return ''
  const num = Number(value)
  if (Number.isNaN(num)) return String(value)
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(num)
}

/**
 * Format a value as a number.
 */
export function formatNumber(value: unknown, decimals?: number, locale = 'en-US', prefix = '', suffix = ''): string {
  if (value === null || value === undefined) return ''
  const num = Number(value)
  if (Number.isNaN(num)) return String(value)
  const formatted = new Intl.NumberFormat(locale, decimals !== undefined ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals } : {}).format(num)
  return `${prefix}${formatted}${suffix}`
}

/**
 * Resolve a mapped config value (e.g. badge color/label) by cell value.
 */
export function resolveMapped(value: unknown, config: string | Record<string, string> | undefined, fallback?: string): string {
  if (config === undefined) return fallback ?? String(value ?? '')
  if (typeof config === 'string') return config
  const key = String(value ?? '')
  return config[key] ?? fallback ?? key
}

/**
 * Substitute template variables like `{fieldName}` in a string with row values.
 */
export function substituteTemplate(template: string, row: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_, field) => String(row[field] ?? ''))
}
