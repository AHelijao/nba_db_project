# NBA Database Project: Architecture & Data Flow

This document details the database architecture, data ingestion process, and API integration for the NBA Stats Database project.

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

## 3. API & Backend Logic
The backend (`server.js`) serves as an interface between the frontend and the MongoDB cluster.

### Endpoints

#### `GET /api/players/search/:name`
-   **Purpose**: Retrieves career average stats for a specific player.
-   **Logic**:
    1.  **Match**: Finds documents matching the player name.
    2.  **Lookup (Join)**: Joins with the `team_names` collection to resolve team abbreviations to full names.
    3.  **Aggregation**: Groups by player name to calculate averages (`$avg`) for points, rebounds, assists, etc., across all games played.

#### `GET /api/teams/search/:teamName`
-   **Purpose**: Finds a team and lists its top 10 all-time players.
-   **Logic**:
    1.  **Search**: Uses Regex to match team name or abbreviation (case-insensitive).
    2.  **Aggregation**:
        -   Matches all games played by that team.
        -   Groups by player.
        -   Calculates average points.
        -   Sorts by points descending (`$sort`).
        -   Limits to top 10.

## 4. Frontend Integration & Assets
# NBA Database Project: Architecture & Data Flow

This document details the database architecture, data ingestion process, and API integration for the NBA Stats Database project.

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

## 3. API & Backend Logic
The backend (`server.js`) serves as an interface between the frontend and the MongoDB cluster.

### Endpoints

#### `GET /api/players/search/:name`
-   **Purpose**: Retrieves career average stats for a specific player.
-   **Logic**:
    1.  **Match**: Finds documents matching the player name.
    2.  **Lookup (Join)**: Joins with the `team_names` collection to resolve team abbreviations to full names.
    3.  **Aggregation**: Groups by player name to calculate averages (`$avg`) for points, rebounds, assists, etc., across all games played.

#### `GET /api/teams/search/:teamName`
-   **Purpose**: Finds a team and lists its top 10 all-time players.
-   **Logic**:
    1.  **Search**: Uses Regex to match team name or abbreviation (case-insensitive).
    2.  **Aggregation**:
        -   Matches all games played by that team.
        -   Groups by player.
        -   Calculates average points.
        -   Sorts by points descending (`$sort`).
        -   Limits to top 10.

## 4. Frontend Integration & Assets
-   **Data Fetching**: The frontend (`app.js`) calls the API endpoints asynchronously.
-   **Headshots**: Player images are **not** stored in the database. They are fetched dynamically from the NBA's public CDN using the `playerId` stored in the database:
    ```javascript
    `https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`
    ```

### 4. Head-to-Head Rivalry Feature

-   **Endpoint**: `/api/matchup/:team1/:team2`
-   **Purpose**: Calculates the historical win/loss record between two teams and identifies the top 5 scorers for each side in those specific matchups.
-   **Logic**:
    1.  **Team Resolution**: Resolves user input (e.g., "Lakers") to official abbreviations (e.g., "LAL").
    2.  **Win/Loss Calculation**: Queries the `teams` collection for games where `team` matches Team A and the opponent (`home` or `away`) matches Team B. It counts wins based on the `win` boolean field.
    3.  **Top Performers**: Uses an aggregation pipeline on the `players` collection:
        -   `$match`: Filters for games between the two teams.
        -   `$group`: Groups by player to calculate average points (`$avg`) and games played.
        -   `$sort`: Orders by average points descending.
        -   `$limit`: Returns the top 5.

## Future Roadmap

-   **Advanced Filtering**: Add season-based filtering for search results.
-   **Visualizations**: Integrate charts for career stat progression.
-   **Live Data**: Connect to a live NBA API for real-time updates.
