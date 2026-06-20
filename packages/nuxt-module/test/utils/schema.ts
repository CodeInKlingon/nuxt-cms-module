import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})

export const company = sqliteTable('company', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  supportEmail: text('support_email'),
})
