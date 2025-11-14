require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const url = process.env.MONGO_URI;
if (!url) {
    console.error('Error: MONGO_URI is not defined in the .env file');
    process.exit(1);
}

const client = new MongoClient(url);
const dbName = 'nba_db';

let db;

// Middleware
app.use(cors());
app.use(express.json());
// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

/**
 * API endpoint to search for a player and get their career average stats.
 * Example: /api/players/search/Michael Jordan
 */
app.get('/api/players/search/:name', async (req, res) => {
    const playerName = req.params.name;

    if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
    }

    try {
        const playersCollection = db.collection('players');
        const pipeline = [
            { $match: { player: { $regex: new RegExp(`^${playerName}$`, 'i') } } },
            {
                $lookup: {
                    from: 'team_names',
                    localField: 'team',
                    foreignField: 'abbreviation',
                    as: 'teamDetails'
                }
            },
            { $unwind: '$teamDetails' },
            {
                $group: {
                    _id: '$player',
                    playerId: { $first: '$playerId' }, // Add the playerId to the grouped result
                    teams: { $addToSet: '$teamDetails.name' },
                    gamesPlayed: { $sum: 1 },
                    avgPTS: { $avg: { $ifNull: ['$PTS', 0] } },
                    avgREB: { $avg: { $ifNull: ['$REB', 0] } },
                    avgAST: { $avg: { $ifNull: ['$AST', 0] } },
                    avgSTL: { $avg: { $ifNull: ['$STL', 0] } },
                    avgBLK: { $avg: { $ifNull: ['$BLK', 0] } },
                    avgTOV: { $avg: { $ifNull: ['$TOV', 0] } },
                    avgMIN: { $avg: { $ifNull: ['$MIN', 0] } },
                    avgFG_PCT: { $avg: { $ifNull: ['$FG_PCT', 0] } },
                    avg3P_PCT: { $avg: { $ifNull: ['$3P_PCT', 0] } },
                    avgFT_PCT: { $avg: { $ifNull: ['$FT_PCT', 0] } },
                }
            }
        ];

        const result = await playersCollection.aggregate(pipeline).toArray();

        if (result.length > 0) {
            res.json(result[0]);
        } else {
            res.status(404).json({ message: `Player "${playerName}" not found.` });
        }
    } catch (err) {
        console.error('API Error:', err);
        res.status(500).json({ error: 'An error occurred during the search.' });
    }
});

// --- New Endpoint: Search for a team and its top players ---
app.get('/api/teams/search/:teamName', async (req, res) => {
    const teamName = req.params.teamName;

    if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
    }

    try {
        // Find all abbreviations that match the search term (e.g., "Lakers", "LAL", "Los Angeles")
        const teamNameDocs = await db.collection('team_names').find({
            $or: [
                { name: { $regex: teamName, $options: 'i' } },
                { abbreviation: { $regex: `^${teamName}$`, $options: 'i' } }
            ]
        }).toArray();

        if (teamNameDocs.length === 0) {
            return res.status(404).json({ message: 'Team not found.' });
        }

        const teamAbbreviations = teamNameDocs.map(doc => doc.abbreviation);

        // Find the top 10 players for that team based on average points
        const topPlayers = await db.collection('players').aggregate([
            // Match all games played for the found team abbreviations
            { $match: { team: { $in: teamAbbreviations } } },
            // Group by player to calculate career averages for that team
            {
                $group: {
                    _id: '$player',
                    playerId: { $first: '$playerId' }, // Get the ID for the headshot
                    avgPTS: { $avg: '$PTS' },
                    gamesPlayed: { $sum: 1 }
                }
            },
            // Sort by average points descending
            { $sort: { avgPTS: -1 } },
            // Limit to the top 10
            { $limit: 10 }
        ]).toArray();

        const response = {
            teamName: teamNameDocs[0].name, // Use the first found full name for display
            players: topPlayers
        };

        res.json(response);

    } catch (error) {
        console.error('Error searching for team:', error);
        res.status(500).json({ message: 'Error searching for team.' });
    }
});

// Start the server and connect to the database
async function startServer() {
    try {
        await client.connect();
        console.log('Connected to MongoDB Atlas');
        db = client.db(dbName);

        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
        });
    } catch (err) {
        console.error('Failed to connect to MongoDB', err);
        process.exit(1);
    }
}

startServer();
