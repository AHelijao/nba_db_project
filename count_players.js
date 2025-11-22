require('dotenv').config();
const { MongoClient } = require('mongodb');

const url = process.env.MONGO_URI;
const client = new MongoClient(url);
const dbName = 'nba_db';

async function countPlayers() {
    try {
        await client.connect();
        const db = client.db(dbName);
        const count = await db.collection('players').countDocuments();
        console.log(`Players count: ${count}`);
    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

countPlayers();
