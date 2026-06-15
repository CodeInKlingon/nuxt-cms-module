import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'

import * as schema from './schema'

export { schema }

const cwd = process.cwd()

// Resolve migrations folder relative to cwd (works when started from root or playground/)
export const migrationsFolder = existsSync(join(cwd, 'server/database/migrations/meta/_journal.json'))
  ? join(cwd, 'server/database/migrations')
  : join(cwd, 'playground/server/database/migrations')

// Resolve db path relative to cwd
const dbPath = cwd.endsWith('playground') || cwd.includes('playground')
  ? join(cwd, 'playground.db')
  : join(cwd, 'playground/playground.db')

export const client = createClient({ url: `file:${dbPath}` })

// Create drizzle instance
export const db = drizzle(client, { schema })

export default db
