# NBA Stats Search Engine

This project is a web-based application designed to search and display career statistics for NBA players and view top players for any given team. It serves as a practical demonstration of using a Node.js and Express.js backend to perform complex database manipulations on a MongoDB database, which is then presented to the user through a clean, vanilla JavaScript, HTML, and CSS frontend.

## Project Purpose & Technology Choices

The primary goal of this project was to leverage a large, real-world dataset (NBA game-by-game statistics) and build a performant search application. The key challenge lies in efficiently querying and processing tens of thousands of data entries to compute aggregate statistics on the fly.

### Why MongoDB?

A NoSQL database like MongoDB was chosen for several key reasons that make it ideal for this type of data and application:

1.  **Flexible Document Model**: The raw NBA data comes in a semi-structured format. Each document represents a single game's box score for a player or a team. MongoDB's BSON document model handles this perfectly, allowing for fields that might be null or absent in some documents without breaking the schema.

2.  **Performance at Scale**: MongoDB is designed for high performance on large datasets. Its indexing capabilities are crucial for quickly filtering through the vast number of game records.

3.  **Powerful Aggregation Framework**: This is the core feature we leveraged. Instead of fetching thousands of raw game documents into our application and performing calculations (like career averages) in JavaScript—which would be slow and memory-intensive—we offload this work to the database itself. MongoDB's **Aggregation Pipeline** allows us to build a series of data processing stages that run directly on the database server, returning only the final, computed result. This is significantly more efficient.

## Key Implementation Steps

### 1. Data Ingestion and Transformation

-   **File**: `import-data.js`
-   **What We Did**: A Node.js script was created to parse the raw `.csv` files containing player and team game data.
-   **The "MongoDB" Way**: During the import process, we didn't just dump the raw data. We **transformed** it into a database-friendly format.
    -   Strings representing numbers (e.g., `"45.2"`) were converted to `Float` types.
    -   Boolean-like strings (e.g., `"true"`) were converted to actual `Boolean` types.
    -   Date strings were converted to `ISODate` objects.
    -   This data sanitization is critical because it enables MongoDB to perform mathematical operations (`$avg`, `$sum`) and date-based queries efficiently.
    -   We used `insertMany()` for a **bulk insert**, which is vastly more performant than inserting documents one by one as it minimizes network round trips to the database.

### 2. Backend API with Express.js & MongoDB

-   **File**: `server.js`
-   **What We Did**: We built an Express.js server to act as the intermediary between our frontend and the MongoDB database. It exposes several API endpoints that the frontend can call to get data.

#### Player Search Endpoint (`/api/players/search/:name`)

This endpoint is a prime example of using MongoDB's Aggregation Framework for powerful data manipulation.

-   **The Goal**: When a user searches for a player (e.g., "Michael Jordan"), we need to find all his game records, calculate his career average points, rebounds, assists, etc., and list the teams he played for.
-   **The MongoDB Pipeline**:
    1.  `$match`: The pipeline starts by efficiently filtering the entire `players` collection to find only the documents matching the player's name. This is the first and most important step to reduce the working dataset.
    2.  `$lookup`: We then perform a "join" with the `team_names` collection to translate team abbreviations (e.g., "CHI") into full names (e.g., "Chicago Bulls").
    3.  `$group`: This is the most powerful stage. It groups all of the player's individual game documents into a single result. During this stage, we use accumulator operators:
        -   `$avg`: To calculate the career average for stats like `PTS`, `REB`, and `AST`.
        -   `$sum`: To count the total number of games played.
        -   `$addToSet`: To compile a unique list of team names.
        -   `$first`: To retrieve the `playerId`, which is needed for fetching the player's headshot.

#### Team Search Endpoint (`/api/teams/search/:teamName`)

This endpoint demonstrates a multi-step query process.

-   **The Goal**: Find a team and display its top 10 all-time leading scorers.
-   **The MongoDB Process**:
    1.  First, we query the `team_names` collection to find all abbreviations associated with the searched team name (e.g., searching "Hornets" returns both "CHH" and "CHA").
    2.  Next, we run an aggregation pipeline on the `players` collection:
        -   `$match`: We use the `$in` operator to find all player-games for any of the team abbreviations found in the first step.
        -   `$group`: We group the results by player to calculate their average points (`$avg`) and games played (`$sum`) *specifically for that team*.
        -   `$sort` and `$limit`: Finally, we sort the players by their average points in descending order and limit the output to the top 10.

### 3. Frontend User Interface

-   **Files**: `public/index.html`, `public/app.js`, `public/styles.css`
-   **What We Did**: We created a user-friendly, two-column interface for searching players and teams.
-   **How It Works**:
    -   The `app.js` file listens for user input (button clicks or 'Enter' key presses).
    -   It uses the `fetch()` API to make asynchronous calls to our backend endpoints.
    -   When the data is returned from the server, JavaScript dynamically creates the HTML elements (player cards, team lists) and injects them into the DOM, allowing the user to see the results without a page refresh.
    -   CSS is used to style the layout, creating the side-by-side search columns and the visual presentation of the player and team cards.

## How to Run the Project

1.  **Prerequisites**:
    -   Node.js and npm installed.
    -   A MongoDB Atlas account (or a local MongoDB instance).

2.  **Setup**:
    -   Clone the repository.
    -   Install dependencies: `npm install`
    -   Create a `.env` file in the root directory and add your MongoDB connection string:
        `MONGO_URI="your_mongodb_connection_string"`

3.  **Import Data**:
    -   Run the import scripts one by one. This only needs to be done once.
