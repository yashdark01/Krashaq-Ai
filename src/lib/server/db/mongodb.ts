import { Collection, Db, MongoClient } from 'mongodb';
import { getConfig } from '@/lib/server/config';

declare global {
  var _krashaqMongoClient: MongoClient | undefined;

  var _krashaqMongoDb: Db | undefined;
}

export async function getDb(): Promise<Db> {
  if (global._krashaqMongoDb) {
    return global._krashaqMongoDb;
  }

  const { mongodbUrl, mongodbDb } = getConfig();
  const client = new MongoClient(mongodbUrl);
  await client.connect();

  global._krashaqMongoClient = client;
  global._krashaqMongoDb = client.db(mongodbDb);
  return global._krashaqMongoDb;
}

export async function getCollection(name: string): Promise<Collection> {
  const db = await getDb();
  return db.collection(name);
}
