import { describe, it, expect } from 'vitest'
import {
  formatDate,
  formatDateTime,
  formatRelative,
  formatCurrency,
  formatNumber,
  resolveMapped,
  substituteTemplate,
} from '../src/runtime/utils/cell-formatting'

describe('formatDate', () => {
  it('should format a Date object', () => {
    const result = formatDate(new Date(2024, 5, 15))
    expect(result).toBe('Jun 15, 2024')
  })

  it('should return empty string for null', () => {
    expect(formatDate(null)).toBe('')
  })

  it('should return raw value for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date')
  })

  it('should respect custom options', () => {
    const result = formatDate(new Date(2024, 5, 15), { month: 'long', day: 'numeric' })
    expect(result).toBe('June 15')
  })
})

describe('formatDateTime', () => {
  it('should format a datetime string', () => {
    const result = formatDateTime('2024-06-15T14:30:00')
    // Result includes time which is locale-dependent; just check it contains date parts
    expect(result).toContain('Jun')
    expect(result).toContain('15')
    expect(result).toContain('2024')
  })

  it('should return empty string for null', () => {
    expect(formatDateTime(null)).toBe('')
  })
})

describe('formatRelative', () => {
  it('should return relative time for a recent date', () => {
    const now = new Date()
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
    const result = formatRelative(twoHoursAgo)
    expect(result).toContain('hour')
    expect(result).toContain('ago')
  })

  it('should return relative time for a recent string', () => {
    const now = new Date()
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)
    const result = formatRelative(oneMinuteAgo.toISOString())
    expect(result).toContain('minute')
    expect(result).toContain('ago')
  })

  it('should return raw value for invalid input', () => {
    expect(formatRelative('invalid')).toBe('invalid')
  })
})

describe('formatCurrency', () => {
  it('should format as USD by default', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56')
  })

  it('should format with custom currency', () => {
    expect(formatCurrency(99.99, 'EUR', 'de-DE')).toContain('99,99')
  })

  it('should return raw value for non-number', () => {
    expect(formatCurrency('abc')).toBe('abc')
  })

  it('should return empty string for null', () => {
    expect(formatCurrency(null)).toBe('')
  })
})

describe('formatNumber', () => {
  it('should format a plain number', () => {
    expect(formatNumber(1234567.89)).toBe('1,234,567.89')
  })

  it('should format with fixed decimals', () => {
    expect(formatNumber(42, 2)).toBe('42.00')
  })

  it('should include prefix and suffix', () => {
    expect(formatNumber(50, 0, 'en-US', '~', ' units')).toBe('~50 units')
  })

  it('should return raw value for non-number', () => {
    expect(formatNumber('nope')).toBe('nope')
  })
})

describe('resolveMapped', () => {
  it('should return string config as-is', () => {
    expect(resolveMapped(true, 'success')).toBe('success')
  })

  it('should map value to record key', () => {
    const map = { true: 'success', false: 'neutral' }
    expect(resolveMapped(true, map)).toBe('success')
    expect(resolveMapped(false, map)).toBe('neutral')
  })

  it('should use fallback when key is missing', () => {
    const map = { true: 'success' }
    expect(resolveMapped(false, map, 'neutral')).toBe('neutral')
  })

  it('should stringify value when config is undefined', () => {
    expect(resolveMapped(42, undefined)).toBe('42')
  })

  it('should use fallback when config and value are undefined', () => {
    expect(resolveMapped(undefined, undefined, 'default')).toBe('default')
  })
})

describe('substituteTemplate', () => {
  it('should replace placeholders with row values', () => {
    const row = { slug: 'hello-world', id: 42 }
    expect(substituteTemplate('/pages/{slug}', row)).toBe('/pages/hello-world')
  })

  it('should replace multiple placeholders', () => {
    const row = { a: 'foo', b: 'bar' }
    expect(substituteTemplate('/{a}/{b}', row)).toBe('/foo/bar')
  })

  it('should leave unknown placeholders empty', () => {
    const row = { slug: 'test' }
    expect(substituteTemplate('/{slug}/{missing}', row)).toBe('/test/')
  })
})
