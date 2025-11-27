// To run this file using the MONGO_URI from your .env file:
//
// 1. Make sure your .env file contains a line like this (with your actual URI):
//    MONGO_URI="mongodb+srv://user:pass@cluster.mongodb.net/..."
//
// 2. Open your terminal in the project root and run the command for your OS.
//
// --- For Linux/macOS/Git Bash ---
// mongosh "$(grep MONGO_URI .env | cut -d '"' -f2)" --file queries.mongodb.js
//
// --- For Windows PowerShell ---
// $uri = (Get-Content .env | Select-String MONGO_URI).Line.Split('"')[1]; mongosh $uri --file queries.mongodb.js
//
// This command extracts the URI from your .env file and securely passes it to mongosh.

// Switch to the correct database
use('nba_db');

// ----------------------------------------------------------------------------
// 1. Find Player Career Averages (Example: LeBron James)
// ----------------------------------------------------------------------------
print("--- Finding career averages for LeBron James ---");

const playerPipeline = [
    { $match: { player: { $regex: "LeBron James", $options: 'i' } } },
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
            playerId: { $first: '$playerId' },
            teams: { $addToSet: '$teamDetails.name' },
            gamesPlayed: { $sum: 1 },
            avgPTS: { $avg: '$PTS' },
            avgREB: { $avg: '$REB' },
            avgAST: { $avg: '$AST' }
        }
    },
    { $sort: { gamesPlayed: -1 } }
];

const playerResult = db.getCollection('players').aggregate(playerPipeline).toArray();
printjson(playerResult);


// ----------------------------------------------------------------------------
// 2. Find a Team's Top 10 All-Time Players (Example: Lakers)
// ----------------------------------------------------------------------------
print("\n--- Finding the top 10 all-time players for the Lakers ---");

// First, find the team's abbreviations (e.g., "Lakers" could match "LAL")
const teamAbbreviations = db.getCollection('team_names').find({
    name: { $regex: "Lakers", $options: 'i' }
}).map(doc => doc.abbreviation);

const topPlayersPipeline = [
    { $match: { team: { $in: teamAbbreviations } } },
    {
        $group: {
            _id: '$player',
            playerId: { $first: '$playerId' },
            avgPTS: { $avg: '$PTS' }
        }
    },
    { $sort: { avgPTS: -1 } },
    { $limit: 10 }
];

const topPlayersResult = db.getCollection('players').aggregate(topPlayersPipeline).toArray();
printjson(topPlayersResult);


// ----------------------------------------------------------------------------
// 3. Head-to-Head Matchup (Example: Lakers vs. Celtics)
// ----------------------------------------------------------------------------
print("\n--- Calculating head-to-head matchup: Lakers vs. Celtics ---");

const t1Abbr = "LAL";
const t2Abbr = "BOS";

// Calculate wins for Team 1 (Lakers) against Team 2 (Celtics)
const t1Wins = db.getCollection('teams').countDocuments({
    team: t1Abbr,
    $or: [{ home: t2Abbr }, { away: t2Abbr }],
    win: true
});

// Calculate wins for Team 2 (Celtics) against Team 1 (Lakers)
const t2Wins = db.getCollection('teams').countDocuments({
    team: t2Abbr,
    $or: [{ home: t1Abbr }, { away: t1Abbr }],
    win: true
});

print(`Lakers Wins vs. Celtics: ${t1Wins}`);
print(`Celtics Wins vs. Lakers: ${t2Wins}`);

// Find Top 5 Scorers for the Lakers in games against the Celtics
const t1TopPlayers = db.getCollection('players').aggregate([
    { $match: { team: t1Abbr, $or: [{ home: t2Abbr }, { away: t2Abbr }] } },
    { $group: { _id: '$player', avgPTS: { $avg: '$PTS' } } },
    { $sort: { avgPTS: -1 } },
    { $limit: 5 }
]).toArray();

print("\n--- Top 5 Lakers scorers against the Celtics ---");
printjson(t1TopPlayers);
