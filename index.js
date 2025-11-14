require('dotenv').config();
const express = require('express');
const path = require('path'); // Import the path module
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const port = 3000;

const url = process.env.MONGO_URI;

if (!url) {
  console.error('Error: MONGO_URI is not defined in the .env file');
  process.exit(1);
}

const client = new MongoClient(url, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const dbName = 'nba_db';

async function main() {
  await client.connect();
  console.log('Connected successfully to MongoDB Atlas!');
  const db = client.db(dbName);

  // Serve static files from the 'public' directory
  app.use(express.static(path.join(__dirname, 'public')));

  // API Endpoints
  // GET all players
  app.get('/api/players', async (req, res) => {
    try {
      const playersCollection = db.collection('players');
      // Using .find({}).limit(20) to avoid sending a huge amount of data
      const players = await playersCollection.find({}).limit(20).toArray();
      res.json(players);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'An internal server error occurred' });
    }
  });

  // GET all teams
  app.get('/api/teams', async (req, res) => {
    try {
      const teamsCollection = db.collection('teams');
      const teams = await teamsCollection.find({}).toArray();
      res.json(teams);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'An internal server error occurred' });
    }
  });

  // The root URL will now serve your index.html, so this route is no longer needed
  // app.get('/', (req, res) => {
  //   res.send('Welcome to the NBA Database API! Try /api/players or /api/teams');
  // });

  app.listen(port, () => {
    console.log(`Server running. Open http://localhost:${port} in your browser.`);
  });
}

main().catch(console.error);

process.on('SIGINT', async () => {
  await client.close();
  console.log('MongoDB connection closed.');
  process.exit(0);
});
