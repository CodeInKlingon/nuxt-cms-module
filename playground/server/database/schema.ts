import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

// ── Core tables ─────────────────────────────────────────────────────────────

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  price: integer('price').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const pages = sqliteTable('pages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  content: text('content'),
  blocks: text('blocks', { mode: 'json' }).$defaultFn(() => '[]'),
  published: integer('published', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// ── Junction table (many-to-many) ─────────────────────────────────────────

export const productsToPages = sqliteTable('products_to_pages', {
  productId: integer('product_id').notNull().references(() => products.id),
  pageId: integer('page_id').notNull().references(() => pages.id),
  order: integer('order').notNull().default(0),
}, t => [primaryKey({ columns: [t.productId, t.pageId] })])

// ── Relations ───────────────────────────────────────────────────────────────

export const productsRelations = relations(products, ({ many }) => ({
  pages: many(productsToPages),
}))

export const pagesRelations = relations(pages, ({ many }) => ({
  products: many(productsToPages),
}))

export const productsToPagesRelations = relations(productsToPages, ({ one }) => ({
  product: one(products, {
    fields: [productsToPages.productId],
    references: [products.id],
  }),
  page: one(pages, {
    fields: [productsToPages.pageId],
    references: [pages.id],
  }),
}))
