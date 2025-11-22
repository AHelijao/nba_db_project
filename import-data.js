require('dotenv').config();
const fs = require('fs');
const { MongoClient, ServerApiVersion } = require('mongodb');
const csv = require('csv-parser');

const url = process.env.MONGO_URI;

if (!url) {
  console.error('Error: MONGO_URI is not defined in the .env file');
  process.exit(1);
}

const client = new MongoClient(url);

const dbName = 'nba_db';

// Get the import type from command line arguments
const importType = process.argv[2]; // e.g., 'players' or 'teams'

let collectionName;
let filePath;

if (importType === 'players') {
  collectionName = 'players';
  filePath = './nba_dataset/traditional.csv';
} else if (importType === 'teams') {
  collectionName = 'teams';
  filePath = './nba_dataset/team_traditional.csv';
} else if (importType === 'team_names') {
  collectionName = 'team_names';
  filePath = './nba_dataset/team_names.csv';
} else {
  console.error("Invalid import type. Please specify 'players', 'teams', or 'team_names'.");
  console.error("Usage: npm run import -- <type>");
  console.error("Example: npm run import -- players");
  process.exit(1);
}

/**
 * Transforms a raw CSV data row for a player into a structured document
 * with appropriate data types.
 * @param {object} data - The raw data object from csv-parser.
 * @returns {object} The transformed document.
 */
function transformPlayerData(data) {
  const numberFields = [
    'MIN', 'PTS', 'FGM', 'FGA', 'FG_PCT', '3PM', '3PA', '3P_PCT', 'FTM', 'FTA', 'FT_PCT',
    'OREB', 'DREB', 'REB', 'AST', 'STL', 'BLK', 'TOV', 'PF', 'PLUS_MINUS'
  ];

  const transformed = {
    gameId: parseInt(data.gameid, 10),
    date: new Date(data.date),
    type: data.type,
    playerId: parseInt(data.playerid, 10),
    player: data.player,
    team: data.team,
    home: data.home,
    away: data.away,
    win: (data.win && (data.win === '1.0' || data.win.toLowerCase() === 'true')) || false,
    season: data.season,
    // Rename fields with special characters and convert to numbers
    FG_PCT: parseFloat(data['FG%']) || 0,
    '3P_PCT': parseFloat(data['3P%']) || 0,
    FT_PCT: parseFloat(data['FT%']) || 0,
    PLUS_MINUS: parseFloat(data['+/-']),
  };

  // Convert other numeric fields from string to number
  numberFields.forEach(field => {
    if (data[field] !== undefined && !transformed[field]) transformed[field] = parseFloat(data[field]);
  });

  return transformed;
}

/**
 * Transforms a raw CSV data row for a team into a structured document
 * with appropriate data types.
 * @param {object} data - The raw data object from csv-parser.
 * @returns {object} The transformed document.
 */
function transformTeamData(data) {
  const numberFields = [
    'MIN', 'PTS', 'FGM', 'FGA', 'FG_PCT', '3PM', '3PA', '3P_PCT', 'FTM', 'FTA', 'FT_PCT',
    'OREB', 'DREB', 'REB', 'AST', 'TOV', 'STL', 'BLK', 'PF', 'PLUS_MINUS'
  ];

  const transformed = {
    gameId: parseInt(data.gameid, 10),
    date: new Date(data.date),
    type: data.type,
    teamId: parseInt(data.teamid, 10),
    team: data.team,
    home: data.home,
    away: data.away,
    win: data.win.toLowerCase() === 'true',
    season: data.season,
    // Rename fields with special characters and convert to numbers
    FG_PCT: parseFloat(data['FG%']) || 0,
    '3P_PCT': parseFloat(data['3P%']) || 0,
    FT_PCT: parseFloat(data['FT%']) || 0,
    PLUS_MINUS: parseFloat(data['+/-']),
  };

  // Convert other numeric fields from string to number
  numberFields.forEach(field => {
    if (data[field] !== undefined && !transformed[field]) transformed[field] = parseFloat(data[field]);
  });

  return transformed;
}

async function importData() {
  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    await collection.deleteMany({});
    console.log(`Cleared existing data from "${collectionName}" collection.`);

    await new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          if (importType === 'players') {
            results.push(transformPlayerData(data));
          } else if (importType === 'teams') {
            results.push(transformTeamData(data));
          } else {
            results.push(data); // Fallback for simple CSVs like team_names
          }
        })
        .on('error', (err) => reject(err))
        .on('end', async () => {
          try {
            if (results.length > 0) {
              await collection.insertMany(results);
              console.log(`Successfully imported ${results.length} documents into "${collectionName}".`);
            } else {
              console.log('No data found in CSV file to import.');
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        });
    });

  } catch (err) {
    console.error('An error occurred during the import process:', err);
  } finally {
    await client.close();
    console.log('MongoDB connection closed.');
  }
}

importData();
