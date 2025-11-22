# NBA Stats Pro Database

A modern, full-stack web application for exploring NBA player careers and team histories. Built with **Node.js**, **Express**, and **MongoDB**, featuring a premium dark-mode UI.

![Project Banner](https://via.placeholder.com/1200x400/0f172a/3b82f6?text=NBA+Stats+Pro+Database)

## Features

-   **Player Search**: Instant access to career averages (Points, Rebounds, Assists, etc.) and team history.
-   **Team Deep Dive**: Discover top 10 all-time scorers for any NBA franchise.
-   **Smart Search**: Handles team abbreviations (e.g., "LAL" -> "Lakers") and case-insensitive queries.
-   **Dynamic Visuals**: Automatically fetches high-res player headshots from the NBA CDN.
-   **Modern UI**: Glassmorphism design, responsive grid layout, and smooth animations.

## Tech Stack

-   **Frontend**: HTML5, CSS3 (Variables, Flexbox/Grid), Vanilla JavaScript.
-   **Backend**: Node.js, Express.js REST API.
-   **Database**: MongoDB Atlas (Aggregation Pipeline for complex analytics).
-   **Data Processing**: Custom CSV ingestion pipeline (`csv-parser`).

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
    Create a `.env` file in the root directory:
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
└── database_documentation.md # Detailed architecture docs
```

## 📄 License

This project is for educational purposes. Data courtesy of NBA.com.
