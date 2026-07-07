import { registerCollections, registerSchemaTables, setDrizzleConnection } from './database'
import _db, { schema as _schema } from '#nuxt-cms/db.mjs'
import { collections as _collections } from '#nuxt-cms/collections.mjs'

export default defineNitroPlugin(() => {
  setDrizzleConnection(_db)
  registerCollections(_collections)
  if (_schema) {
    registerSchemaTables(_schema)
  }
})
