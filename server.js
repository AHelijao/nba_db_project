require('dotenv').config();
const express = require('express');

const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 5001;
const { MongoClient } = require('mongodb');

const url = process.env.MONGO_URI;
if (!url) {
    console.error('Error: MONGO_URI is not defined in the .env file');
    process.exit(1);
}

const client = new MongoClient(url);
const dbName = 'nba_db'; // Corrected database name

let db;

// Middleware
app.use(cors());
app.use(express.json());

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
            // Use regex for partial match and case-insensitivity
            { $match: { player: { $regex: playerName, $options: 'i' } } },
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
            },
            // Sort by games played to return the most prominent player first (e.g. "James" -> LeBron)
            { $sort: { gamesPlayed: -1 } }
        ];

        // Add collation for accent insensitivity (strength: 1 ignores case and diacritics)
        const result = await playersCollection.aggregate(pipeline, { collation: { locale: 'en', strength: 1 } }).toArray();

        if (result.length > 0) {
            res.json(result[0]);
        } else {
            res.status(404).json({ message: `Team "${playerName}" not found.` });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
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

// --- New Endpoint: Head-to-Head Matchup ---
app.get('/api/matchup/:team1/:team2', async (req, res) => {
    const { team1, team2 } = req.params;

    if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
    }

    try {
        // Helper function to resolve team name/abbr to abbreviation
        const resolveTeam = async (input) => {
            const doc = await db.collection('team_names').findOne({
                $or: [
                    { abbreviation: { $regex: `^${input}$`, $options: 'i' } },
                    { name: { $regex: input, $options: 'i' } }
                ]
            });
            return doc ? doc : null;
        };

        const t1Doc = await resolveTeam(team1);
        const t2Doc = await resolveTeam(team2);

        if (!t1Doc || !t2Doc) {
            return res.status(404).json({ message: 'One or both teams not found.' });
        }

        const t1Abbr = t1Doc.abbreviation;
        const t2Abbr = t2Doc.abbreviation;

        // 1. Calculate Win/Loss Record
        // We query the 'teams' collection (which contains team stats per game)
        // We look for games where the team is t1Abbr and the opponent is t2Abbr
        const games = await db.collection('teams').find({
            team: t1Abbr,
            $or: [{ home: t2Abbr }, { away: t2Abbr }]
        }).toArray();

        let t1Wins = 0;
        let t2Wins = 0;

        games.forEach(game => {
            if (game.win) {
                t1Wins++;
            } else {
                t2Wins++;
            }
        });

        // 2. Find Top 5 Players for each team in this matchup
        const getTopPlayers = async (teamAbbr, opponentAbbr) => {
            return await db.collection('players').aggregate([
                {
                    $match: {
                        team: teamAbbr,
                        $or: [{ home: opponentAbbr }, { away: opponentAbbr }]
                    }
                },
                {
                    $group: {
                        _id: '$player',
                        playerId: { $first: '$playerId' },
                        avgPTS: { $avg: '$PTS' },
                        gamesPlayed: { $sum: 1 }
                    }
                },
                { $sort: { avgPTS: -1 } },
                { $limit: 5 }
            ]).toArray();
        };

        const [t1Players, t2Players] = await Promise.all([
            getTopPlayers(t1Abbr, t2Abbr),
            getTopPlayers(t2Abbr, t1Abbr)
        ]);

        res.json({
            team1: { ...t1Doc, wins: t1Wins },
            team2: { ...t2Doc, wins: t2Wins },
            team1TopPlayers: t1Players,
            team2TopPlayers: t2Players
        });

    } catch (error) {
        console.error('Matchup API Error:', error);
        res.status(500).json({ error: 'An error occurred during the matchup search.' });
    }
});

// Serve static files from the "public" directory. This should come AFTER the API routes.
app.use(express.static(path.join(__dirname, 'public')));

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

// Graceful shutdown
process.on('SIGINT', async () => {
    await client.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
});
