import Database from 'better-sqlite3'
import { join } from 'node:path'

/**
 * Playground-only Nitro plugin.
 *
 * Seeds sample rows when tables are empty so the playground is immediately
 * usable after a fresh clone. Schema management is handled by drizzle-kit
 * migrations (see server/database/index.ts).
 */
export default defineNitroPlugin(() => {
  const cwd = process.cwd()
  const dbPath = cwd.endsWith('playground') || cwd.includes('playground')
    ? join(cwd, 'playground.db')
    : join(cwd, 'playground/playground.db')

  const sqlite = new Database(dbPath)

  const now = Date.now()

  // ── Products ──────────────────────────────────────────────────────────────
  let product1Id: number | undefined
  let product2Id: number | undefined

  let productCount = 0
  try {
    productCount = (sqlite.prepare('SELECT COUNT(*) as c FROM products').get() as { c: number }).c
  }
  catch {
    // Table may not exist yet if migrations haven't run
    console.log('[cms] Products table not found, skipping seed')
    sqlite.close()
    return
  }

  if (productCount === 0) {
    const insertProduct = sqlite.prepare(`
      INSERT INTO products (name, slug, description, price, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    const info1 = insertProduct.run('Example Widget', 'example-widget', 'A sample product to get you started.', 1999, 1, now, now)
    const info2 = insertProduct.run('Demo Gadget', 'demo-gadget', 'Another sample product for the playground.', 4999, 1, now, now)
    product1Id = Number(info1.lastInsertRowid)
    product2Id = Number(info2.lastInsertRowid)
    console.log('[cms] Seeded products table with 2 sample rows')
  }
  else {
    product1Id = (sqlite.prepare('SELECT id FROM products WHERE slug = ?').get('example-widget') as { id: number })?.id
    product2Id = (sqlite.prepare('SELECT id FROM products WHERE slug = ?').get('demo-gadget') as { id: number })?.id
  }

  // ── Pages ─────────────────────────────────────────────────────────────────
  let page1Id: number | undefined
  let page2Id: number | undefined

  const pageCount = (sqlite.prepare('SELECT COUNT(*) as c FROM pages').get() as { c: number }).c
  if (pageCount === 0) {
    const insertPage = sqlite.prepare(`
      INSERT INTO pages (title, slug, content, published, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    const info1 = insertPage.run('Welcome', 'welcome', '<p>Welcome to the CMS playground!</p>', 1, now, now)
    const info2 = insertPage.run('About', 'about', '<p>This is a demo page.</p>', 0, now, now)
    page1Id = Number(info1.lastInsertRowid)
    page2Id = Number(info2.lastInsertRowid)
    console.log('[cms] Seeded pages table with 2 sample rows')
  }
  else {
    page1Id = (sqlite.prepare('SELECT id FROM pages WHERE slug = ?').get('welcome') as { id: number })?.id
    page2Id = (sqlite.prepare('SELECT id FROM pages WHERE slug = ?').get('about') as { id: number })?.id
  }

  // ── Junction table (products_to_pages) ──────────────────────────────────
  if (product1Id && product2Id && page1Id && page2Id) {
    const junctionCount = (sqlite.prepare('SELECT COUNT(*) as c FROM products_to_pages').get() as { c: number }).c
    if (junctionCount === 0) {
      const insert = sqlite.prepare(`
        INSERT INTO products_to_pages (product_id, page_id)
        VALUES (?, ?)
      `)
      insert.run(product1Id, page1Id) // Example Widget -> Welcome
      insert.run(product1Id, page2Id) // Example Widget -> About
      insert.run(product2Id, page1Id) // Demo Gadget -> Welcome
      console.log('[cms] Seeded products_to_pages with 3 sample rows')
    }
  }

  sqlite.close()
})
