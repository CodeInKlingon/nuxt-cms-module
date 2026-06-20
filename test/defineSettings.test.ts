import { describe, expect, it } from 'vitest'
import { defineSettings } from '../src/runtime/composables/defineSettings'
import type { SettingsDefinition } from '../src/runtime/types'

describe('defineSettings', () => {
  const baseSettings = {
    name: 'site',
    storage: { table: 'settings', keyColumn: 'key', valueColumn: 'value' },
    form: {
      sections: [
        {
          label: 'General',
          fields: [
            { field: 'siteName', widget: 'text' as const, key: 'siteName' },
          ],
        },
      ],
    },
  } satisfies SettingsDefinition

  it('should return a settings definition with defaulted label and icon', () => {
    const settings = defineSettings(baseSettings)

    expect(settings.name).toBe('site')
    expect(settings.label).toBe('site')
    expect(settings.icon).toBe('i-lucide-settings')
    expect(settings.storage).toEqual(baseSettings.storage)
  })

  it('should preserve explicit label and icon', () => {
    const settings = defineSettings({
      ...baseSettings,
      label: 'Site Settings',
      icon: 'i-lucide-globe',
    })

    expect(settings.label).toBe('Site Settings')
    expect(settings.icon).toBe('i-lucide-globe')
  })

  it('should throw when name is missing', () => {
    expect(() =>
      defineSettings({
        ...baseSettings,
        name: '',
      }),
    ).toThrow('Settings group must have a name')
  })

  it('should throw when form is missing', () => {
    expect(() =>
      defineSettings({
        name: 'site',
      } as SettingsDefinition),
    ).toThrow('Settings group "site" must have a form')
  })

  it('should throw when form has no tabs or sections', () => {
    expect(() =>
      defineSettings({
        ...baseSettings,
        form: {},
      } as unknown as SettingsDefinition),
    ).toThrow('Settings group "site" form must have tabs or sections')
  })

  it('should throw when a field has neither source nor key', () => {
    expect(() =>
      defineSettings({
        ...baseSettings,
        form: {
          sections: [
            {
              fields: [
                { field: 'orphan', widget: 'text' as const },
              ],
            },
          ],
        },
      }),
    ).toThrow('Settings field "orphan" must have a source or key')
  })

  it('should throw when a field has both source and key', () => {
    expect(() =>
      defineSettings({
        ...baseSettings,
        form: {
          sections: [
            {
              fields: [
                {
                  field: 'conflict',
                  widget: 'text' as const,
                  source: { table: 'config', column: 'value' },
                  key: 'conflict',
                },
              ],
            },
          ],
        },
      }),
    ).toThrow('Settings field "conflict" must use either source or key, not both')
  })

  it('should throw when a field uses key without group-level storage', () => {
    expect(() =>
      defineSettings({
        name: 'site',
        form: {
          sections: [
            {
              fields: [
                { field: 'siteName', widget: 'text' as const, key: 'siteName' },
              ],
            },
          ],
        },
      }),
    ).toThrow('Settings field "siteName" uses key but group "site" has no storage')
  })

  it('should accept source fields without group-level storage', () => {
    const settings = defineSettings({
      name: 'site',
      form: {
        sections: [
          {
            fields: [
              { field: 'logoUrl', widget: 'text' as const, source: { table: 'config', column: 'logoUrl' } },
            ],
          },
        ],
      },
    })

    expect(settings.name).toBe('site')
    expect(settings.storage).toBeUndefined()
  })

  it('should validate fields inside tabs and sections', () => {
    expect(() =>
      defineSettings({
        ...baseSettings,
        form: {
          tabs: [
            {
              label: 'Tab',
              sections: [
                {
                  fields: [
                    { field: 'nestedOrphan', widget: 'text' as const },
                  ],
                },
              ],
            },
          ],
        },
      }),
    ).toThrow('Settings field "nestedOrphan" must have a source or key')
  })
})
