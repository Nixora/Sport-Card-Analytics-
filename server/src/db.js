const { MongoClient } = require("mongodb");
const config = require("./config");

let client = null;

async function getDb() {
  if (!client) {
    client = new MongoClient(config.mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10_000,
    });
    await client.connect();
  }
  return client.db(config.mongoDb);
}

async function closeDb() {
  if (client) {
    await client.close();
    client = null;
  }
}

module.exports = { getDb, closeDb };
