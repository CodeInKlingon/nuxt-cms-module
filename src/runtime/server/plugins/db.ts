import { registerCollections, registerSchemaTables, setDrizzleConnection } from './database'
import _db, { schema as _schema } from '#my-module/db.mjs'
import { collections as _collections } from '#my-module/collections.mjs'

export default defineNitroPlugin(() => {
  setDrizzleConnection(_db)
  registerCollections(_collections)
  if (_schema) {
    registerSchemaTables(_schema)
  }
})
