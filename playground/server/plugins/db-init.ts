import { migrate } from 'drizzle-orm/libsql/migrator'
import { client, db, migrationsFolder } from '../database/index'

/**
 * Playground-only Nitro plugin.
 *
 * Runs Drizzle migrations and seeds sample rows when tables are empty so the
 * playground is immediately usable after a fresh clone.
 */
export default defineNitroPlugin(async () => {
  // Run drizzle-kit migrations before seeding.
  await migrate(db, { migrationsFolder })
  console.log('[db] Drizzle migrations applied successfully')

  const now = Date.now()

  // ── Products ──────────────────────────────────────────────────────────────
  let product1Id: number | undefined
  let product2Id: number | undefined

  let productCount = 0
  try {
    const result = await client.execute('SELECT COUNT(*) as c FROM products')
    productCount = Number(result.rows[0]?.c ?? 0)
  }
  catch {
    // Table may not exist yet if migrations haven't run
    console.log('[cms] Products table not found, skipping seed')
    return
  }

  if (productCount === 0) {
    const info1 = await client.execute({
      sql: `INSERT INTO products (name, slug, description, price, active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: ['Example Widget', 'example-widget', 'A sample product to get you started.', 1999, 1, now, now],
    })
    const info2 = await client.execute({
      sql: `INSERT INTO products (name, slug, description, price, active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: ['Demo Gadget', 'demo-gadget', 'Another sample product for the playground.', 4999, 1, now, now],
    })
    product1Id = Number(info1.lastInsertRowid)
    product2Id = Number(info2.lastInsertRowid)
    console.log('[cms] Seeded products table with 2 sample rows')
  }
  else {
    const existing = await client.execute({
      sql: 'SELECT id FROM products WHERE slug IN (?, ?)',
      args: ['example-widget', 'demo-gadget'],
    })
    product1Id = Number(existing.rows.find((row: Record<string, unknown>) => row.slug === 'example-widget')?.id)
    product2Id = Number(existing.rows.find((row: Record<string, unknown>) => row.slug === 'demo-gadget')?.id)
  }

  // ── Pages ─────────────────────────────────────────────────────────────────
  let page1Id: number | undefined
  let page2Id: number | undefined

  const pageResult = await client.execute('SELECT COUNT(*) as c FROM pages')
  const pageCount = Number(pageResult.rows[0]?.c ?? 0)

  if (pageCount === 0) {
    const info1 = await client.execute({
      sql: `INSERT INTO pages (title, slug, content, published, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: ['Welcome', 'welcome', '<p>Welcome to the CMS playground!</p>', 1, now, now],
    })
    const info2 = await client.execute({
      sql: `INSERT INTO pages (title, slug, content, published, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: ['About', 'about', '<p>This is a demo page.</p>', 0, now, now],
    })
    page1Id = Number(info1.lastInsertRowid)
    page2Id = Number(info2.lastInsertRowid)
    console.log('[cms] Seeded pages table with 2 sample rows')
  }
  else {
    const existing = await client.execute({
      sql: 'SELECT id FROM pages WHERE slug IN (?, ?)',
      args: ['welcome', 'about'],
    })
    page1Id = Number(existing.rows.find((row: Record<string, unknown>) => row.slug === 'welcome')?.id)
    page2Id = Number(existing.rows.find((row: Record<string, unknown>) => row.slug === 'about')?.id)
  }

  // ── Junction table (products_to_pages) ──────────────────────────────────
  if (product1Id && product2Id && page1Id && page2Id) {
    const junctionResult = await client.execute('SELECT COUNT(*) as c FROM products_to_pages')
    const junctionCount = Number(junctionResult.rows[0]?.c ?? 0)
    if (junctionCount === 0) {
      await client.execute({
        sql: `INSERT INTO products_to_pages (product_id, page_id, "order")
              VALUES (?, ?, ?)`,
        args: [product1Id, page1Id, 0],
      })
      await client.execute({
        sql: `INSERT INTO products_to_pages (product_id, page_id, "order")
              VALUES (?, ?, ?)`,
        args: [product1Id, page2Id, 1],
      })
      await client.execute({
        sql: `INSERT INTO products_to_pages (product_id, page_id, "order")
              VALUES (?, ?, ?)`,
        args: [product2Id, page1Id, 0],
      })
      console.log('[cms] Seeded products_to_pages with 3 sample rows')
    }
  }
})
