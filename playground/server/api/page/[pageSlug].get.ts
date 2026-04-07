import { eq } from 'drizzle-orm'
import db from '../../database'
import { pages } from '../../database/schema'

/**
 * GET /api/pages
 *
 * Returns all pages directly from the SQLite database via Drizzle.
 */
export default defineEventHandler(async (event) => {
    console.log('Received request for page with slug', event)
    const { pageSlug } = event.context.params as { pageSlug: string }
    const result = await db.select().from(pages).where(eq(pages.slug, pageSlug)).limit(1)
    return result[0]
})
