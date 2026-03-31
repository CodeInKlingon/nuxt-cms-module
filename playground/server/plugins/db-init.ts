import Database from 'better-sqlite3'

/**
 * Playground-only Nitro plugin.
 *
 * Creates tables if they don't exist and seeds sample rows when the tables
 * are empty, so the playground is immediately usable after a fresh clone.
 *
 * In a real app you would use your own migration tool (e.g. drizzle-kit migrate).
 */
export default defineNitroPlugin(() => {
  const sqlite = new Database('playground.db')

  // ── Schema ────────────────────────────────────────────────────────────────
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      slug        TEXT    NOT NULL UNIQUE,
      description TEXT,
      price       INTEGER NOT NULL,
      active      INTEGER NOT NULL DEFAULT 1,
      created_at  INTEGER,
      updated_at  INTEGER
    );

    CREATE TABLE IF NOT EXISTS pages (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT    NOT NULL,
      slug        TEXT    NOT NULL UNIQUE,
      content     TEXT,
      published   INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER,
      updated_at  INTEGER
    );
  `)

  // ── Seed — only when tables are empty ─────────────────────────────────────
  const now = Date.now()

  const productCount = (sqlite.prepare('SELECT COUNT(*) as c FROM products').get() as { c: number }).c
  if (productCount === 0) {
    const insertProduct = sqlite.prepare(`
      INSERT INTO products (name, slug, description, price, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    insertProduct.run('Example Widget', 'example-widget', 'A sample product to get you started.', 1999, 1, now, now)
    insertProduct.run('Demo Gadget', 'demo-gadget', 'Another sample product for the playground.', 4999, 1, now, now)
    console.log('[cms] Seeded products table with 2 sample rows')
  }

  const pageCount = (sqlite.prepare('SELECT COUNT(*) as c FROM pages').get() as { c: number }).c
  if (pageCount === 0) {
    const insertPage = sqlite.prepare(`
      INSERT INTO pages (title, slug, content, published, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    insertPage.run('Welcome', 'welcome', '<p>Welcome to the CMS playground!</p>', 1, now, now)
    insertPage.run('About', 'about', '<p>This is a demo page.</p>', 0, now, now)
    console.log('[cms] Seeded pages table with 2 sample rows')
  }

  sqlite.close()
})
