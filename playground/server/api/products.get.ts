import db from '../database'
import { products } from '../database/schema'

/**
 * GET /api/products
 *
 * Returns all products directly from the SQLite database via Drizzle.
 */
export default defineEventHandler(async () => {
  return db.select().from(products).orderBy(products.createdAt)
})
