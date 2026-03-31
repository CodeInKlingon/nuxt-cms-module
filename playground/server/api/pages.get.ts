import db from '../database'
import { pages } from '../database/schema'

/**
 * GET /api/pages
 *
 * Returns all pages directly from the SQLite database via Drizzle.
 */
export default defineEventHandler(async () => {
  return db.select().from(pages).orderBy(pages.createdAt)
})
