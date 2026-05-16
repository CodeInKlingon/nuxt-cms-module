import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import * as schema from './schema'

const cwd = process.cwd()

// Resolve migrations folder relative to cwd (works when started from root or playground/)
const migrationsFolder = existsSync(join(cwd, 'server/database/migrations/meta/_journal.json'))
  ? join(cwd, 'server/database/migrations')
  : join(cwd, 'playground/server/database/migrations')

// Resolve db path relative to cwd
const dbPath = cwd.endsWith('playground') || cwd.includes('playground')
  ? join(cwd, 'playground.db')
  : join(cwd, 'playground/playground.db')

const sqlite = new Database(dbPath)

// Run drizzle-kit migrations
migrate(drizzle(sqlite), {
  migrationsFolder,
})

console.log('[db] Drizzle migrations applied successfully')

// Create drizzle instance
const db = drizzle(sqlite, { schema })

export default db
