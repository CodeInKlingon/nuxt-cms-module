import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, it, beforeEach } from 'vitest'
import { createEvent } from 'h3'
import settingsListHandler from '../src/runtime/server/api/cms/settings/index.get'
import { defineSettings } from '../src/runtime/composables/defineSettings'
import { registerSettingsDefinition, resetSettingsDefinitions } from '../src/runtime/server/plugins/database'
import type { SettingsFormConfig } from '../src/runtime/types'

interface SettingsListResponse {
  name: string
  label: string | undefined
  description: string | undefined
  icon: string | undefined
  form: SettingsFormConfig
}

function mockEvent() {
  return createEvent(
    {} as unknown as IncomingMessage,
    {} as unknown as ServerResponse,
  )
}

describe('GET /api/cms/settings', () => {
  beforeEach(() => {
    resetSettingsDefinitions()
  })

  it('should return an empty array when no settings are registered', async () => {
    const result = await settingsListHandler(mockEvent())
    expect(result).toEqual([])
  })

  it('should return sanitized metadata for registered settings groups', async () => {
    registerSettingsDefinition(defineSettings({
      name: 'site',
      description: 'Site-wide configuration',
      storage: { table: 'settings', keyColumn: 'key', valueColumn: 'value' },
      form: {
        sections: [
          {
            label: 'General',
            fields: [
              {
                field: 'siteName',
                label: 'Site Name',
                widget: 'text',
                required: true,
                key: 'siteName',
                validation: [
                  { type: 'min', value: 3 },
                  { type: 'pattern', value: /^[a-z0-9]+$/i },
                  { type: 'custom', fn: () => true, message: 'Must be unique' },
                ],
              },
              {
                field: 'logoUrl',
                label: 'Logo URL',
                widget: 'text',
                source: { table: 'assets', column: 'url' },
              },
            ],
          },
        ],
      },
    }))

    const result = (await settingsListHandler(mockEvent())) as unknown as SettingsListResponse[]

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      name: 'site',
      label: 'site',
      description: 'Site-wide configuration',
      icon: 'i-lucide-settings',
    })

    const form = result[0]!.form
    const sections = form.sections!
    expect(sections).toHaveLength(1)

    const [siteName, logoUrl] = sections[0]!.fields

    // Storage details stripped
    expect(siteName!.key).toBeUndefined()
    expect(siteName!.source).toBeUndefined()
    expect(logoUrl!.source).toBeUndefined()

    // Validation rules serialized
    const [minRule, patternRule, customRule] = siteName!.validation ?? []
    expect(minRule).toEqual({ type: 'min', value: 3 })
    expect(patternRule).toMatchObject({ type: 'pattern', value: '/^[a-z0-9]+$/i', _isRegex: true })
    expect(customRule).toEqual({ type: 'custom', message: 'Must be unique' })

    // Top-level storage stripped
    expect('storage' in result[0]!).toBe(false)
    expect('hooks' in result[0]!).toBe(false)
  })
})
