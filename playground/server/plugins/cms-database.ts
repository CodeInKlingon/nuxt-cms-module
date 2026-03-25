import { setDrizzleConnection, registerCollections } from '../../../src/runtime/server/utils/drizzle-adapter'
import { db } from '../database'
import products from '../../cms/products'
import pages from '../../cms/pages'

export default defineNitroPlugin(() => {
  // Set the database connection for the CMS module
  setDrizzleConnection(db)
  
  // Register collection schemas for runtime access
  registerCollections([products, pages])
})
