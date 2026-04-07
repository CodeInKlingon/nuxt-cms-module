import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

const sqlite = new Database('./playground.db')

// Run migrations
function migrate() {
  console.log('Running database migrations...')

  // Check if blocks column exists in pages table
  const tableInfo = sqlite.prepare('PRAGMA table_info(pages)').all() as Array<{ name: string }>
  const hasBlocksColumn = tableInfo.some(col => col.name === 'blocks')

  if (!hasBlocksColumn) {
    console.log('Adding blocks column to pages table...')
    sqlite.exec(`
      ALTER TABLE pages ADD COLUMN blocks TEXT DEFAULT '[]';
    `)
    console.log('Blocks column added successfully!')
  }
  else {
    console.log('Blocks column already exists, skipping migration.')
  }

  console.log('Migrations complete!')
}

// Run migrations
migrate()

// Create drizzle instance
const db = drizzle(sqlite, { schema })

export default db
