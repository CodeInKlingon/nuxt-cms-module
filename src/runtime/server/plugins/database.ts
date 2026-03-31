import type { CollectionDefinition } from '../../types'

let dbInstance: any = null
const collectionSchemas = new Map<string, any>()
const collectionDefinitions = new Map<string, CollectionDefinition>()

export function setDrizzleConnection(db: any) {
  dbInstance = db
}

export function getDrizzleConnection(): any {
  if (!dbInstance) {
    throw new Error('Database connection not initialized. Please create a server plugin to set the database connection.')
  }
  return dbInstance
}

export function resetDrizzleConnection(): void {
  dbInstance = null
  collectionSchemas.clear()
  collectionDefinitions.clear()
}

export function registerCollectionSchema(name: string, schema: any) {
  collectionSchemas.set(name, schema)
}

export function getCollectionSchema(name: string): any {
  return collectionSchemas.get(name)
}

export function registerCollectionDefinition(collection: CollectionDefinition) {
  collectionDefinitions.set(collection.name, collection)
  collectionSchemas.set(collection.name, collection.schema)
}

export function getCollectionDefinition(name: string): CollectionDefinition | undefined {
  return collectionDefinitions.get(name)
}

export function registerCollections(collections: CollectionDefinition[]) {
  collections.forEach((collection) => {
    registerCollectionDefinition(collection)
  })
}

export function getAllCollectionDefinitions(): CollectionDefinition[] {
  return Array.from(collectionDefinitions.values())
}
