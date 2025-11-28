# NBA Stats Pro Database

A modern, full-stack web application for exploring NBA player careers, team histories, and head-to-head matchups. Built with **Node.js**, **Express**, and **MongoDB**, featuring a premium dark-mode UI.

![Project Banner](https://via.placeholder.com/1200x400/0f172a/3b82f6?text=NBA+Stats+Pro+Database)

## Features

-   **Player Search**: Instant access to career averages (Points, Rebounds, Assists, etc.) and team history.
-   **Team Deep Dive**: Discover top 10 all-time scorers for any NBA franchise.
-   **Head-to-Head Rivalry**: Compare two teams' historical win/loss records and find top performers in those matchups.
-   **Smart Search**: Handles team abbreviations (e.g., "LAL" -> "Lakers") and case-insensitive queries.
-   **Dynamic Visuals**: Automatically fetches high-res player headshots and team logos.
-   **Modern UI**: Glassmorphism design, responsive grid layout, and smooth animations.

## Tech Stack

-   **Frontend**: HTML5, CSS3 (Variables, Flexbox/Grid), Vanilla JavaScript.
-   **Backend**: Node.js, Express.js REST API.
-   **Database**: MongoDB Atlas (Aggregation Pipeline for complex analytics).
-   **Data Processing**: Custom CSV ingestion pipeline (`csv-parser`).

## Setting Up MongoDB Atlas

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

## Installation & Setup

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/yourusername/nba-db-project.git
    cd nba_db_project
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Create a `.env` file in the root directory and add your `MONGO_URI`:
    ```env
    MONGO_URI="your_mongodb_connection_string"
    PORT=5001
    ```

4.  **Import Data** (First time only)
    Populate your MongoDB cluster with the provided datasets:
    ```bash
    # Import Player Stats
    npm run import -- players

    # Import Team Stats
    npm run import -- teams

    # Import Team Names Mapping
    npm run import -- team_names
    ```

5.  **Start the Server**
    ```bash
    npm start
    ```
    The app will be available at `http://localhost:5001`.

## Usage Guide

### Searching for a Player
1.  Enter a name (e.g., "LeBron James") in the **Player Lookup** box.
2.  Hit Enter or click the search icon.
3.  View their career stats, teams played for, and headshot.

### Exploring a Team
1.  Enter a team name or abbreviation (e.g., "Celtics" or "BOS") in the **Team Lookup** box.
2.  See the top 10 all-time leading scorers for that franchise.

### Head-to-Head Matchup
1.  Enter two team names (e.g., "Lakers" vs "Celtics") in the **Rivalry** section.
2.  View the historical win/loss record and top 5 scorers for each team in those specific games.

---

## Architecture & Data Flow

### 1. Database Infrastructure
-   **Database System**: MongoDB Atlas (Cloud-hosted NoSQL Database).
-   **Cluster Configuration**: Single-node cluster (M0 Sandbox/Shared).
-   **Connection**: Managed via Node.js `mongodb` driver using a secure connection string (`MONGO_URI`) stored in `.env`.

### 2. Data Ingestion Pipeline
The project uses a custom script (`import-data.js`) to seed the database from raw CSV files located in `nba_dataset/`.

-   **Parsing**: Uses `csv-parser` to stream and read raw CSV files.
-   **Transformation**: Converts string fields to appropriate types (Integers, Floats, Dates) and renames special characters (e.g., `FG%` -> `FG_PCT`).
-   **Loading**: Clears existing collections to prevent duplicates and inserts transformed documents in bulk.

### 3. API & Backend Logic
The backend (`server.js`) serves as an interface between the frontend and the MongoDB cluster.

#### `GET /api/players/search/:name`
-   **Purpose**: Retrieves career average stats for a specific player.
-   **NoSQL Logic**:
    1.  **`$match`**: Filters documents where the `player` field matches the search name (case-insensitive regex).
    2.  **`$lookup`**: Joins with `team_names` to find full team names.
    3.  **`$unwind`**: Deconstructs the joined team details.
    4.  **`$group`**: Groups by player to calculate career averages (`$avg`) and unique teams (`$addToSet`).
    5.  **`$sort`**: Orders by `gamesPlayed` descending.

#### `GET /api/teams/search/:teamName`
-   **Purpose**: Finds a team and lists its top 10 all-time players.
-   **NoSQL Logic**:
    1.  **Team Resolution**: Finds the team abbreviation from `team_names`.
    2.  **Top Player Aggregation**: Filters `players` by team abbreviation, groups by player to calculate average points, sorts by descending points, and limits to top 10.

#### `GET /api/matchup/:team1/:team2`
-   **Purpose**: Calculates historical win/loss record and top scorers for a matchup.
-   **NoSQL Logic**:
    1.  **Win/Loss**: Queries `teams` collection for games between the two teams and counts wins.
    2.  **Top Performers**: Aggregates `players` collection for games between the two teams, groups by player, and finds top 5 scorers.

### 4. Frontend Integration
-   **Data Fetching**: The frontend (`app.js`) calls API endpoints asynchronously.
-   **Headshots**: Player images are fetched dynamically from the NBA's public CDN using the `playerId`.

---

## MongoDB Reference

### Shell Commands

**Find Player Career Averages**
```javascript
db.getCollection('players').aggregate([
    { $match: { player: { $regex: "LeBron James", $options: 'i' } } },
    { $lookup: { from: 'team_names', localField: 'team', foreignField: 'abbreviation', as: 'teamDetails' } },
    { $unwind: '$teamDetails' },
    { $group: {
        _id: '$player',
        playerId: { $first: '$playerId' },
        teams: { $addToSet: '$teamDetails.name' },
        gamesPlayed: { $sum: 1 },
        avgPTS: { $avg: '$PTS' }
    }},
    { $sort: { gamesPlayed: -1 } }
])
```

**Find Team's Top 10 Players**
```javascript
// 1. Find team abbreviations (e.g., LAL)
// 2. Find top players
db.getCollection('players').aggregate([
    { $match: { team: { $in: ["LAL"] } } },
    { $group: { _id: '$player', avgPTS: { $avg: '$PTS' } } },
    { $sort: { avgPTS: -1 } },
    { $limit: 10 }
])
```

### SQL Equivalent Queries (Conceptual)

**Find Player Career Averages**
```sql
SELECT p.player, COUNT(p.gameId) AS gamesPlayed, AVG(p.PTS) AS avgPTS
FROM players p
JOIN team_names tn ON p.team = tn.abbreviation
WHERE p.player ILIKE '%LeBron James%'
GROUP BY p.player
ORDER BY gamesPlayed DESC;
```

**Find Team's Top 10 Players**
```sql
SELECT player, AVG(PTS) AS avgPTS
FROM players
WHERE team = 'LAL'
GROUP BY player
ORDER BY avgPTS DESC
LIMIT 10;
```

## Project Structure

```
nba_db_project/
├── nba_dataset/          # Raw CSV data source
├── public/               # Frontend assets
│   ├── index.html        # Main UI structure
│   ├── styles.css        # Dark mode & glassmorphism styles
│   └── app.js            # Frontend logic & API calls
├── import-data.js        # Database seeding script
├── server.js             # Express API & MongoDB logic
└── README.md             # Project documentation
```

## License

This project is for educational purposes. Data courtesy of NBA.com.
