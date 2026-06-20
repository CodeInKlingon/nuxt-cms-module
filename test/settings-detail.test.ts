import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { createEvent } from 'h3'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import settingsGetHandler from '../src/runtime/server/api/cms/settings/[name].get'
import { createTestDb, schema } from './utils/db'
import { defineSettings } from '../src/runtime/composables/defineSettings'
import {
  registerSchemaTables,
  registerSettingsDefinition,
  resetDrizzleConnection,
  resetSettingsDefinitions,
  setDrizzleConnection,
} from '../src/runtime/server/plugins/database'
import type { SettingsDefinition } from '../src/runtime/types'

let db: LibSQLDatabase<typeof schema>

const siteSettings: SettingsDefinition = {
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
        ],
      },
    ],
  },
}

function mockEvent(params: Record<string, string>) {
  const event = createEvent(
    {} as unknown as IncomingMessage,
    {} as unknown as ServerResponse,
  )
  event.context.params = params
  return event
}

describe('GET /api/cms/settings/:name', () => {
  beforeEach(async () => {
    resetDrizzleConnection()
    resetSettingsDefinitions()
    db = await createTestDb()
    setDrizzleConnection(db)
    registerSchemaTables(schema as Record<string, unknown>)
    registerSettingsDefinition(defineSettings(siteSettings))
    await db.delete(schema.settings)
  })

  afterEach(async () => {
    await db.delete(schema.settings)
  })

  it('should return 404 for an unknown settings group', async () => {
    await expect(settingsGetHandler(mockEvent({ name: 'missing' })))
      .rejects.toMatchObject({ statusCode: 404 })
  })

  it('should return current values for every field in the group', async () => {
    await db.insert(schema.settings).values([
      { key: 'siteName', value: 'Endpoint Site' },
      { key: 'maintenanceMode', value: 'true' },
    ])

    const result = await settingsGetHandler(mockEvent({ name: 'site' })) as Record<string, unknown>

    expect(result.siteName).toBe('Endpoint Site')
    expect(result.maintenanceMode).toBe(true)
  })

  it('should fall back to default values for unset fields', async () => {
    const result = await settingsGetHandler(mockEvent({ name: 'site' })) as Record<string, unknown>

    expect(result.siteName).toBe('My Site')
    expect(result.maintenanceMode).toBe(false)
  })
})
