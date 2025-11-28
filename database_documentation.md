# NBA Database Project: Architecture & Data Flow

This document details the database architecture, data ingestion process, and API integration for the NBA Stats Database project.

## Getting Started: Setting Up MongoDB Atlas

This project requires a MongoDB database. You can use a free "M0" cluster from MongoDB Atlas.

1.  **Create a Free Cluster:**
    *   Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) and create an account.
    *   Follow the on-screen instructions to create a new project and build a database.
    *   Choose the **M0 (Free)** cluster tier, select a cloud provider and region (e.g., AWS, N. Virginia `us-east-1`), and give your cluster a name.

2.  **Create a Database User:**
    *   In the left-hand menu, go to `Security > Database Access`.
    *   Click **Add New Database User**.
    *   Enter a username and password. **Save these credentials**, as you will need them for your connection string.

3.  **Whitelist Your IP Address:**
    *   In the left-hand menu, go to `Security > Network Access`.
    *   Click **Add IP Address**.
    *   Click **Allow Access From Anywhere** (`0.0.0.0/0`). This is the easiest for development but is not recommended for production. For better security, you can click "Add Current IP Address".

4.  **Get Your Connection String:**
    *   Go back to your cluster's "Overview" page and click the **Connect** button.
    *   Select **Drivers**.
    *   Under "View connection string", select **Node.js** and the latest version.
    *   Copy the connection string. It will look like this:
        `mongodb+srv://<username>:<password>@yourcluster.mongodb.net/?retryWrites=true&w=majority`
    *   Replace `<username>` and `<password>` with the credentials you created in Step 2. This is your `MONGO_URI`.

## 1. Database Infrastructure
-   **Database System**: MongoDB Atlas (Cloud-hosted NoSQL Database).
-   **Cluster Configuration**: Single-node cluster (M0 Sandbox/Shared).
-   **Connection**: Managed via Node.js `mongodb` driver using a secure connection string (`MONGO_URI`) stored in `.env`.

## 2. Data Ingestion Pipeline
The project uses a custom script (`import-data.js`) to seed the database from raw CSV files.

### Source Data
Located in the `nba_dataset/` directory:
-   `traditional.csv`: Player game stats (points, rebounds, assists, etc.).
-   `team_traditional.csv`: Team game stats.
-   `team_names.csv`: Mapping of team abbreviations (e.g., "LAL") to full names ("Los Angeles Lakers").

### Ingestion Process (`import-data.js`)
1.  **Parsing**: Uses `csv-parser` to stream and read raw CSV files.
2.  **Transformation**:
    -   Converts string fields to appropriate types (Integers for IDs, Floats for percentages, Dates for game dates).
    -   Renames special characters (e.g., `FG%` -> `FG_PCT`) to be MongoDB-friendly.
3.  **Loading**:
    -   Clears existing collections to prevent duplicates.
    -   Inserts transformed documents in bulk (`insertMany`) for efficiency.

### Command Example
```bash
node import-data.js players
node import-data.js teams
node import-data.js team_names
```

### Script Sample (`import-data.js`)
```javascript
const fs = require('fs');
const { MongoClient } = require('mongodb');
const csv = require('csv-parser');

// ... (dotenv setup)

const client = new MongoClient(process.env.MONGO_URI);
const dbName = 'nba_db';

async function importData(importType) {
  // ... (logic to determine collectionName and filePath from importType)

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    await collection.deleteMany({});

    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        // ... (data transformation logic based on importType)
        results.push(transformedData);
      })
      .on('end', async () => {
        if (results.length > 0) {
          await collection.insertMany(results);
        }
        await client.close();
      });
  } catch (err) {
    console.error(err);
  }
}

// Usage: node import-data.js <type>
importData(process.argv[2]);
```

## 3. API & Backend Logic
The backend (`server.js`) serves as an interface between the frontend and the MongoDB cluster.

### Endpoints

#### `GET /api/players/search/:name`
-   **Purpose**: Retrieves career average stats for a specific player.
-   **NoSQL Logic**: The query uses a multi-stage aggregation pipeline to process documents from the `players` collection.
    1.  **`$match`**: Filters documents where the `player` field matches the search name. A case-insensitive regex (`$options: 'i'`) is used for flexible matching.
    2.  **`$lookup`**: Performs a left outer join with the `team_names` collection to find the full team name from its abbreviation. It's important to note that this is a join between two *collections* (`players` and `team_names`) within the same `nba_db` database, not a join across different databases.
    3.  **`$unwind`**: Deconstructs the `teamDetails` array created by the lookup to treat each joined document as a separate input.
    4.  **`$group`**: Groups all game documents by player name (`_id: '$player'`). It then calculates career averages for stats like points (`$avg: '$PTS'`) and compiles a unique list of teams played for (`$addToSet`).
    5.  **`$sort`**: Orders the results by `gamesPlayed` in descending order to ensure the most prominent player is returned first.
-   **Command Example**:
    ```bash
    curl http://localhost:3000/api/players/search/LeBron%20James
    ```
-   **Script Sample (`server.js`)**:
    ```javascript
    app.get('/api/players/search/:name', async (req, res) => {
        const pipeline = [
            { $match: { player: { $regex: req.params.name, $options: 'i' } } },
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
                    // ... other averaged stats
                }
            },
            { $sort: { gamesPlayed: -1 } }
        ];
        const result = await db.collection('players').aggregate(pipeline).toArray();
        res.json(result[0]);
    });
    ```

#### `GET /api/teams/search/:teamName`
-   **Purpose**: Finds a team and lists its top 10 all-time players.
-   **NoSQL Logic**: This involves two separate queries.
    1.  **Team Resolution**: A `find` query on the `team_names` collection searches for a match in either the full `name` or `abbreviation` field using case-insensitive regex.
    2.  **Top Player Aggregation**:
        -   **`$match`**: Filters the `players` collection to find all game documents where the `team` field is in the list of resolved abbreviations.
        -   **`$group`**: Groups the results by player to calculate their average points (`$avg: '$PTS'`) for that specific team.
        -   **`$sort`**: Orders the players by `avgPTS` in descending order.
        -   **`$limit`**: Restricts the output to the top 10 players.
-   **Command Example**:
    ```bash
    curl http://localhost:3000/api/teams/search/Lakers
    ```
-   **Script Sample (`server.js`)**:
    ```javascript
    app.get('/api/teams/search/:teamName', async (req, res) => {
        const teamNameDocs = await db.collection('team_names').find({
            $or: [
                { name: { $regex: req.params.teamName, $options: 'i' } },
                { abbreviation: { $regex: `^${req.params.teamName}$`, $options: 'i' } }
            ]
        }).toArray();

        const teamAbbreviations = teamNameDocs.map(doc => doc.abbreviation);

        const topPlayers = await db.collection('players').aggregate([
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
        ]).toArray();

        res.json({ teamName: teamNameDocs[0].name, players: topPlayers });
    });
    ```

## 4. Frontend Integration & Assets
-   **Data Fetching**: The frontend (`app.js`) calls the API endpoints asynchronously.
-   **Headshots**: Player images are **not** stored in the database. They are fetched dynamically from the NBA's public CDN using the `playerId` stored in the database:
    ```javascript
    `https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`
    ```

## 5. Head-to-Head Rivalry Feature

-   **Endpoint**: `/api/matchup/:team1/:team2`
-   **Purpose**: Calculates the historical win/loss record between two teams and identifies the top 5 scorers for each side in those specific matchups.
-   **NoSQL Logic**: This feature combines multiple queries.
    1.  **Team Resolution**: Similar to the team search, it resolves input names/abbreviations for both teams.
    2.  **Win/Loss Calculation**: A `find` query on the `teams` collection retrieves all games where `team` is Team A and the opponent (`home` or `away`) is Team B. The wins are counted by iterating through the results.
    3.  **Top Performers Aggregation**: An aggregation pipeline is run for each team on the `players` collection:
        -   **`$match`**: Filters for games where the player's `team` is one of the specified teams and the opponent (`home` or `away`) is the other.
        -   **`$group`**: Groups by player to calculate their average points in those specific matchups.
        -   **`$sort`**: Orders players by descending `avgPTS`.
        -   **`$limit`**: Returns the top 5 performers.
-   **Command Example**:
    ```bash
    curl http://localhost:3000/api/matchup/Lakers/Celtics
    ```
-   **Script Sample (`server.js`)**:
    ```javascript
    app.get('/api/matchup/:team1/:team2', async (req, res) => {
        // 1. Resolve team names to abbreviations
        const t1Abbr = (await resolveTeam(req.params.team1)).abbreviation;
        const t2Abbr = (await resolveTeam(req.params.team2)).abbreviation;

        // 2. Calculate Win/Loss Record
        const games = await db.collection('teams').find({
            team: t1Abbr,
            $or: [{ home: t2Abbr }, { away: t2Abbr }]
        }).toArray();
        // ... (win counting logic)

        // 3. Find Top 5 Players for each team
        const getTopPlayers = async (teamAbbr, opponentAbbr) => {
            return await db.collection('players').aggregate([
                { $match: { team: teamAbbr, $or: [{ home: opponentAbbr }, { away: opponentAbbr }] } },
                { $group: { _id: '$player', avgPTS: { $avg: '$PTS' } } },
                { $sort: { avgPTS: -1 } },
                { $limit: 5 }
            ]).toArray();
        };

        const [t1Players, t2Players] = await Promise.all([
            getTopPlayers(t1Abbr, t2Abbr),
            getTopPlayers(t2Abbr, t1Abbr)
        ]);

        res.json({ /* ... results ... */ });
    });
    ```

## 6. MongoDB Shell Commands

This section provides the raw MongoDB shell commands for the main features of the application.

### Find Player Career Averages
```mongodb
// db.players.aggregate([...])
db.getCollection('players').aggregate([
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
])
```

### Find Team's Top 10 Players
```mongodb
// 1. Find team abbreviations
const teamAbbreviations = db.getCollection('team_names').find({
    $or: [
        { name: { $regex: "Lakers", $options: 'i' } },
        { abbreviation: { $regex: "^LAL$", $options: 'i' } }
    ]
}).map(doc => doc.abbreviation);

// 2. Find top players
db.getCollection('players').aggregate([
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
])
```

### Head-to-Head Matchup
```mongodb
// 1. Resolve team abbreviations
const t1Abbr = "LAL";
const t2Abbr = "BOS";

// 2. Calculate Win/Loss Record
db.getCollection('teams').countDocuments({ team: t1Abbr, $or: [{ home: t2Abbr }, { away: t2Abbr }], win: true })
db.getCollection('teams').countDocuments({ team: t1Abbr, $or: [{ home: t2Abbr }, { away: t2Abbr }], win: false })


// 3. Find Top 5 Players for Team 1
db.getCollection('players').aggregate([
    { $match: { team: t1Abbr, $or: [{ home: t2Abbr }, { away: t2Abbr }] } },
    {
        $group: {
            _id: '$player',
            avgPTS: { $avg: '$PTS' }
        }
    },
    { $sort: { avgPTS: -1 } },
    { $limit: 5 }
])
```

## 7. MongoDB GUI (Compass/Atlas) Queries

This section provides query snippets formatted for use in a GUI like MongoDB Compass or the Atlas Data Explorer. You can paste these directly into the filter or aggregation pipeline editor.

### Find Player Career Averages

In the `players` collection, go to the "Aggregations" tab and paste this into the pipeline editor:

```json
[
    {
        "$match": {
            "player": {
                "$regex": "LeBron James",
                "$options": "i"
            }
        }
    },
    {
        "$lookup": {
            "from": "team_names",
            "localField": "team",
            "foreignField": "abbreviation",
            "as": "teamDetails"
        }
    },
    {
        "$unwind": "$teamDetails"
    },
    {
        "$group": {
            "_id": "$player",
            "playerId": {
                "$first": "$playerId"
            },
            "teams": {
                "$addToSet": "$teamDetails.name"
            },
            "gamesPlayed": {
                "$sum": 1
            },
            "avgPTS": {
                "$avg": "$PTS"
            }
        }
    },
    {
        "$sort": {
            "gamesPlayed": -1
        }
    }
]
```

### Find Team's Top 10 Players

This requires two steps in a GUI.

**Step 1: Find Team Abbreviations**

In the `team_names` collection, use this as your **filter**:

```json
{
    "$or": [
        { "name": { "$regex": "Lakers", "$options": "i" } },
        { "abbreviation": { "$regex": "^LAL$", "$options": "i" } }
    ]
}
```
*Copy the resulting `abbreviation` values (e.g., "LAL").*

**Step 2: Find Top Players**

In the `players` collection, go to the "Aggregations" tab and use this pipeline, replacing `"LAL"` with the abbreviations you found:

```json
[
    {
        "$match": {
            "team": {
                "$in": ["LAL"]
            }
        }
    },
    {
        "$group": {
            "_id": "$player",
            "playerId": {
                "$first": "$playerId"
            },
            "avgPTS": {
                "$avg": "$PTS"
            }
        }
    },
    {
        "$sort": {
            "avgPTS": -1
        }
    },
    {
        "$limit": 10
    }
]
```

### Head-to-Head Matchup

In the `teams` collection, use this as your **filter** to find the win count for the Lakers against the Celtics:

```json
{
    "team": "LAL",
    "win": true,
    "$or": [
        { "home": "BOS" },
        { "away": "BOS" }
    ]
}
```
*The number of documents found is the win count.*

## 8. SQL Equivalent Queries (Conceptual)

This section provides the conceptual SQL equivalents for the MongoDB queries used in this project. These queries are for illustrative purposes to help understand the logic from a relational database perspective. You cannot run these queries on MongoDB.

For these examples, assume we have three tables: `players`, `teams`, and `team_names`.

### Find Player Career Averages

This query joins the `players` table with `team_names`, groups by player, and calculates aggregate statistics, similar to the MongoDB aggregation pipeline.

```sql
SELECT
    p.player,
    p.playerId,
    COUNT(p.gameId) AS gamesPlayed,
    AVG(p.PTS) AS avgPTS,
    AVG(p.REB) AS avgREB,
    AVG(p.AST) AS avgAST,
    GROUP_CONCAT(DISTINCT tn.name SEPARATOR ', ') AS teams
FROM
    players p
JOIN
    team_names tn ON p.team = tn.abbreviation
WHERE
    p.player ILIKE '%LeBron James%'
GROUP BY
    p.player, p.playerId
ORDER BY
    gamesPlayed DESC
LIMIT 1;
```

### Find Team's Top 10 Players

This would be a two-step process in SQL as well.

**Step 1: Find Team Abbreviations**

```sql
SELECT abbreviation FROM team_names WHERE name ILIKE '%Lakers%' OR abbreviation ILIKE 'LAL';
```

**Step 2: Find Top Players**

This query finds the top 10 players for a given team based on average points.

```sql
SELECT
    player,
    playerId,
    AVG(PTS) AS avgPTS
FROM
    players
WHERE
    team IN ('LAL') -- Assume 'LAL' was found in the previous step
GROUP BY
    player, playerId
ORDER BY
    avgPTS DESC
LIMIT 10;
```

### Head-to-Head Matchup

**Step 1: Calculate Win/Loss Record**

This query counts the number of wins for the Lakers against the Celtics.

```sql
SELECT
    COUNT(*) AS wins
FROM
    teams
WHERE
    team = 'LAL'
    AND (home = 'BOS' OR away = 'BOS')
    AND win = TRUE;
```

**Step 2: Find Top 5 Players**

This query finds the top 5 Lakers players based on average points in games against the Celtics.

```sql
SELECT
    player,
    AVG(PTS) as avgPTS
FROM
    players
WHERE
    team = 'LAL'
    AND (home = 'BOS' OR away = 'BOS')
GROUP BY
    player
ORDER BY
    avgPTS DESC
LIMIT 5;
```
