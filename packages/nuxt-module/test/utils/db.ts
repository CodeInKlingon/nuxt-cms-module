import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'

/**
 * Create an isolated SQLite database on disk for tests.
 * Each call uses its own temp directory, so parallel tests do not lock each
 * other. Only the `settings` EAV table is created; extend this helper if tests
 * need additional playground tables.
 */
export async function createTestDb() {
  const dir = mkdtempSync(join(tmpdir(), 'cms-test-'))
  const dbPath = join(dir, 'test.db')
  const client = createClient({ url: `file:${dbPath}` })
  const db = drizzle(client, { schema })

  await client.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS company (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      support_email TEXT
    )
  `)

  return db
}

export { schema }
