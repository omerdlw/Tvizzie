import { MongoClient } from 'mongodb'

import { SERVICES_CONFIG } from '@/config/services.config'

const MONGO_CONFIG = SERVICES_CONFIG.mongodb
const CLIENT_CACHE = {}

async function getClient(databaseKey) {
  if (CLIENT_CACHE[databaseKey]?.conn) {
    return CLIENT_CACHE[databaseKey]
  }

  const dbConfig = MONGO_CONFIG.databases[databaseKey]

  if (!dbConfig) {
    throw new Error(
      `MongoDB database "${databaseKey}" not found in SERVICES_CONFIG`
    )
  }

  const uri = process.env[dbConfig.uriEnvKey]
  const dbName = process.env[dbConfig.dbEnvKey]

  if (!uri || !dbName) {
    throw new Error(
      `Missing env vars for MongoDB database "${databaseKey}": ${dbConfig.uriEnvKey}, ${dbConfig.dbEnvKey}`
    )
  }

  if (!CLIENT_CACHE[databaseKey]) {
    CLIENT_CACHE[databaseKey] = { conn: null, promise: null }
  }

  const entry = CLIENT_CACHE[databaseKey]

  if (!entry.promise) {
    entry.promise = MongoClient.connect(uri).then((client) => ({
      client,
      db: client.db(dbName),
    }))
  }

  entry.conn = await entry.promise
  return entry
}

export function createRepository(collectionKey) {
  const collectionConfig = MONGO_CONFIG.collections[collectionKey]

  if (!collectionConfig) {
    throw new Error(
      `Collection "${collectionKey}" not found in SERVICES_CONFIG`
    )
  }

  const { database, collectionName, fields } = collectionConfig

  async function getCollection() {
    const { db } = await getClient(database)
    return db.collection(collectionName)
  }

  return {
    async find(query = {}, { limit = 20, skip = 0, sort = {} } = {}) {
      const col = await getCollection()
      return col.find(query).sort(sort).skip(skip).limit(limit).toArray()
    },

    async findOne(query = {}) {
      const col = await getCollection()
      return col.findOne(query)
    },

    async create(data) {
      const col = await getCollection()
      const doc = { ...data }
      const now = new Date()

      for (const [field, def] of Object.entries(fields)) {
        if (def.auto === 'createdAt' || def.auto === 'updatedAt') {
          doc[field] = now
        }
        if (def.default !== undefined && doc[field] === undefined) {
          doc[field] = def.default
        }
      }

      const result = await col.insertOne(doc)
      return { ...doc, _id: result.insertedId }
    },

    async update(query, data) {
      const col = await getCollection()
      const updates = { ...data }
      const now = new Date()

      for (const [field, def] of Object.entries(fields)) {
        if (def.auto === 'updatedAt') {
          updates[field] = now
        }
      }

      return col.findOneAndUpdate(
        query,
        { $set: updates },
        { returnDocument: 'after' }
      )
    },

    async deleteOne(query) {
      const col = await getCollection()
      return col.deleteOne(query)
    },

    async count(query = {}) {
      const col = await getCollection()
      return col.countDocuments(query)
    },
  }
}
