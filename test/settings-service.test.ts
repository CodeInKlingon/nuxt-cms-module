import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import { createTestDb, schema } from './utils/db'
import { SettingsService } from '../src/runtime/server/services/settings'
import {
  registerSchemaTables,
  resetDrizzleConnection,
  setDrizzleConnection,
} from '../src/runtime/server/utils/drizzle-adapter'
import type { SettingsDefinition } from '../src/runtime/types'

let db: LibSQLDatabase<typeof schema>

const eavSettings: SettingsDefinition = {
  name: 'site',
  storage: {
    table: 'settings',
    keyColumn: 'key',
    valueColumn: 'value',
  },
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
            defaultValue: 'My Site',
          },
          {
            field: 'maintenanceMode',
            label: 'Maintenance Mode',
            widget: 'boolean',
            key: 'maintenanceMode',
            defaultValue: false,
          },
          {
            field: 'tagline',
            label: 'Tagline',
            widget: 'textarea',
            key: 'tagline',
          },
        ],
      },
    ],
  },
}

describe('SettingsService', () => {
  beforeEach(async () => {
    resetDrizzleConnection()
    db = await createTestDb()
    setDrizzleConnection(db)
    registerSchemaTables(schema as Record<string, unknown>)
    await db.delete(schema.settings)
  })

  afterEach(async () => {
    await db.delete(schema.settings)
    await db.delete(schema.company)
  })

  describe('read', () => {
    it('should return default values for unset fields', async () => {
      const service = new SettingsService(eavSettings)
      const result = await service.read()

      expect(result.siteName).toBe('My Site')
      expect(result.maintenanceMode).toBe(false)
      expect(result.tagline).toBeUndefined()
    })

    it('should return persisted EAV values overriding defaults', async () => {
      await db.insert(schema.settings).values([
        { key: 'siteName', value: 'Persisted Site' },
        { key: 'maintenanceMode', value: 'true' },
      ])

      const service = new SettingsService(eavSettings)
      const result = await service.read()

      expect(result.siteName).toBe('Persisted Site')
      expect(result.maintenanceMode).toBe(true)
      expect(result.tagline).toBeUndefined()
    })

    it('should run beforeRead hook and include its mutations', async () => {
      const definition: SettingsDefinition = {
        ...eavSettings,
        hooks: {
          beforeRead: (data) => {
            data.tagline = 'injected'
            return data
          },
        },
      }

      const service = new SettingsService(definition)
      const result = await service.read()

      expect(result.tagline).toBe('injected')
    })
  })

  describe('update', () => {
    it('should persist EAV values and return refreshed state', async () => {
      const service = new SettingsService(eavSettings)
      const result = await service.update({ siteName: 'Updated Site' })

      expect(result.siteName).toBe('Updated Site')
      expect(result.maintenanceMode).toBe(false)
      expect(result.tagline).toBeUndefined()

      const rows = await db.select().from(schema.settings)
      expect(rows).toHaveLength(1)
      expect(rows[0]!.key).toBe('siteName')
      expect(rows[0]!.value).toBe('Updated Site')
    })

    it('should only update fields present in the request body', async () => {
      await db.insert(schema.settings).values({ key: 'siteName', value: 'Original' })

      const service = new SettingsService(eavSettings)
      const result = await service.update({ maintenanceMode: true })

      expect(result.siteName).toBe('Original')
      expect(result.maintenanceMode).toBe(true)

      const rows = await db.select().from(schema.settings)
      const siteNameRow = rows.find(r => r.key === 'siteName')
      expect(siteNameRow!.value).toBe('Original')
    })

    it('should run beforeUpdate then afterUpdate in order', async () => {
      const order: string[] = []
      const captured: Record<string, unknown>[] = []
      const definition: SettingsDefinition = {
        ...eavSettings,
        hooks: {
          beforeUpdate: async (data) => {
            order.push('beforeUpdate')
            data.beforeUpdateRan = true
            captured.push({ ...data })
            return data
          },
          afterUpdate: async (data) => {
            order.push('afterUpdate')
            expect(data.beforeUpdateRan).toBe(true)
            captured.push({ ...data })
          },
        },
      }

      const service = new SettingsService(definition)
      await service.update({ siteName: 'Hooked' })

      expect(order).toEqual(['beforeUpdate', 'afterUpdate'])
      expect(captured[0]!.beforeUpdateRan).toBe(true)
      expect(captured[1]!.beforeUpdateRan).toBe(true)
    })

    it('should return validation errors with status 400', async () => {
      const definition: SettingsDefinition = {
        ...eavSettings,
        form: {
          sections: [
            {
              fields: [
                {
                  field: 'siteName',
                  label: 'Site Name',
                  widget: 'text',
                  required: true,
                  key: 'siteName',
                },
              ],
            },
          ],
        },
      }

      const service = new SettingsService(definition)

      await expect(service.update({})).rejects.toMatchObject({
        statusCode: 400,
        data: expect.arrayContaining([expect.objectContaining({ field: 'siteName', type: 'required' })]),
      })
    })
  })
  describe('source fields', () => {
    const sourceSettings: SettingsDefinition = {
      name: 'company',
      form: {
        sections: [
          {
            label: 'Company',
            fields: [
              {
                field: 'companyName',
                label: 'Company Name',
                widget: 'text',
                source: { table: 'company', column: 'name', match: { id: 1 } },
              },
              {
                field: 'supportEmail',
                label: 'Support Email',
                widget: 'text',
                source: { table: 'company', column: 'supportEmail', match: { id: 1 } },
              },
            ],
          },
        ],
      },
    }

    it('should read values from the matched row', async () => {
      await db.insert(schema.company).values({ id: 1, name: 'Acme', supportEmail: 'support@acme.com' })

      const service = new SettingsService(sourceSettings)
      const result = await service.read()

      expect(result.companyName).toBe('Acme')
      expect(result.supportEmail).toBe('support@acme.com')
    })

    it('should update the matched row and return refreshed state', async () => {
      await db.insert(schema.company).values({ id: 1, name: 'Acme', supportEmail: 'support@acme.com' })

      const service = new SettingsService(sourceSettings)
      const result = await service.update({ companyName: 'Acme Inc' })

      expect(result.companyName).toBe('Acme Inc')
      expect(result.supportEmail).toBe('support@acme.com')

      const rows = await db.select().from(schema.company)
      expect(rows).toHaveLength(1)
      expect(rows[0]!.name).toBe('Acme Inc')
      expect(rows[0]!.supportEmail).toBe('support@acme.com')
    })

    it('should insert a new row when the matched row does not exist', async () => {
      const service = new SettingsService(sourceSettings)
      const result = await service.update({ companyName: 'New Co', supportEmail: 'hello@newco.com' })

      expect(result.companyName).toBe('New Co')
      expect(result.supportEmail).toBe('hello@newco.com')

      const rows = await db.select().from(schema.company)
      expect(rows).toHaveLength(1)
      expect(rows[0]!.id).toBe(1)
      expect(rows[0]!.name).toBe('New Co')
      expect(rows[0]!.supportEmail).toBe('hello@newco.com')
    })

    it('should read and update the first row when no match is provided', async () => {
      const noMatchSettings: SettingsDefinition = {
        name: 'company',
        form: {
          sections: [
            {
              fields: [
                {
                  field: 'companyName',
                  label: 'Company Name',
                  widget: 'text',
                  source: { table: 'company', column: 'name' },
                },
              ],
            },
          ],
        },
      }

      await db.insert(schema.company).values({ name: 'Single Row Co' })

      const service = new SettingsService(noMatchSettings)
      const readResult = await service.read()
      expect(readResult.companyName).toBe('Single Row Co')

      const updateResult = await service.update({ companyName: 'Updated Co' })
      expect(updateResult.companyName).toBe('Updated Co')

      const rows = await db.select().from(schema.company)
      expect(rows).toHaveLength(1)
      expect(rows[0]!.name).toBe('Updated Co')
    })

    it('should insert a new row for source fields when the table is empty and no match is provided', async () => {
      const noMatchSettings: SettingsDefinition = {
        name: 'company',
        form: {
          sections: [
            {
              fields: [
                {
                  field: 'companyName',
                  label: 'Company Name',
                  widget: 'text',
                  source: { table: 'company', column: 'name' },
                },
              ],
            },
          ],
        },
      }

      const service = new SettingsService(noMatchSettings)
      const result = await service.update({ companyName: 'First Co' })

      expect(result.companyName).toBe('First Co')

      const rows = await db.select().from(schema.company)
      expect(rows).toHaveLength(1)
      expect(rows[0]!.name).toBe('First Co')
    })
  })

  describe('mixed EAV and source fields', () => {
    const mixedSettings: SettingsDefinition = {
      name: 'site',
      storage: {
        table: 'settings',
        keyColumn: 'key',
        valueColumn: 'value',
      },
      form: {
        sections: [
          {
            fields: [
              {
                field: 'siteName',
                label: 'Site Name',
                widget: 'text',
                key: 'siteName',
              },
              {
                field: 'companyName',
                label: 'Company Name',
                widget: 'text',
                source: { table: 'company', column: 'name', match: { id: 1 } },
              },
            ],
          },
        ],
      },
    }

    it('should update both EAV and source tables in a single call', async () => {
      const service = new SettingsService(mixedSettings)
      const result = await service.update({ siteName: 'New Site', companyName: 'New Company' })

      expect(result.siteName).toBe('New Site')
      expect(result.companyName).toBe('New Company')

      const settingsRows = await db.select().from(schema.settings)
      expect(settingsRows).toHaveLength(1)
      expect(settingsRows[0]!.key).toBe('siteName')
      expect(settingsRows[0]!.value).toBe('New Site')

      const companyRows = await db.select().from(schema.company)
      expect(companyRows).toHaveLength(1)
      expect(companyRows[0]!.id).toBe(1)
      expect(companyRows[0]!.name).toBe('New Company')
    })
  })

  describe('configuration errors', () => {
    it('should throw a clear error for a missing source table', async () => {
      const definition: SettingsDefinition = {
        name: 'bad',
        form: {
          sections: [
            {
              fields: [
                {
                  field: 'value',
                  label: 'Value',
                  widget: 'text',
                  source: { table: 'missing_table', column: 'value' },
                },
              ],
            },
          ],
        },
      }

      const service = new SettingsService(definition)
      await expect(service.read()).rejects.toThrow('Source table "missing_table" not found')
    })

    it('should throw a clear error when a field has both source and key', () => {
      const definition: SettingsDefinition = {
        name: 'bad',
        storage: {
          table: 'settings',
          keyColumn: 'key',
          valueColumn: 'value',
        },
        form: {
          sections: [
            {
              fields: [
                {
                  field: 'value',
                  label: 'Value',
                  widget: 'text',
                  key: 'value',
                  source: { table: 'company', column: 'name' },
                },
              ],
            },
          ],
        },
      }

      expect(() => new SettingsService(definition)).toThrow('must use either source or key, not both')
    })
  })
})
