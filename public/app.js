document.addEventListener('DOMContentLoaded', () => {
    const searchButton = document.getElementById('search-button');
    const playerNameInput = document.getElementById('player-name-input');
    const teamSearchButton = document.getElementById('team-search-button');
    const teamNameInput = document.getElementById('team-name-input');
    const resultsContainer = document.getElementById('results-container');
    const teamResultsContainer = document.getElementById('team-results-container');
    const loadingIndicator = document.getElementById('loading-indicator');

    // --- Player Search Logic ---
    const searchPlayer = async () => {
        const playerName = playerNameInput.value.trim();
        if (!playerName) {
            resultsContainer.innerHTML = '<p style="color: red;">Please enter a player name.</p>';
            return;
        }

        // Show loading and clear previous results
        loadingIndicator.classList.remove('hidden');
        resultsContainer.innerHTML = ''; // Only clear player results

        try {
            const response = await fetch(`/api/players/search/${playerName}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Player not found.');
            }

            const stats = await response.json();
            displayStats(stats);

        } catch (error) {
            resultsContainer.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
        } finally {
            // Hide loading
            loadingIndicator.classList.add('hidden');
        }
    };

    // --- Team Search Logic ---
    const searchTeam = async () => {
        const teamName = teamNameInput.value.trim();
        if (!teamName) {
            teamResultsContainer.innerHTML = '<p style="color: red;">Please enter a team name.</p>';
            return;
        }

        loadingIndicator.classList.remove('hidden');
        teamResultsContainer.innerHTML = ''; // Only clear team results

        try {
            const response = await fetch(`/api/teams/search/${teamName}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Team not found.');
            }

            const teamData = await response.json();
            displayTeamTopPlayers(teamData);

        } catch (error) {
            teamResultsContainer.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
        } finally {
            loadingIndicator.classList.add('hidden');
        }
    };

    // --- Event Listeners ---
    searchButton.addEventListener('click', searchPlayer);
    playerNameInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            searchPlayer();
        }
    });

    teamSearchButton.addEventListener('click', searchTeam);
    teamNameInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            searchTeam();
        }
    });

    // --- Display Functions ---

    /**
     * Displays the stats for a single player.
     * @param {object} stats - The player stats object from the API.
     */
    function displayStats(stats) {
        // Clear previous results
        resultsContainer.innerHTML = '';

        // Create a container for the player card
        const playerCard = document.createElement('div');
        playerCard.className = 'player-card';

        // --- Player Headshot ---
        const imageContainer = document.createElement('div');
        imageContainer.className = 'player-image-container';
        const playerImage = document.createElement('img');
        playerImage.className = 'player-image';
        playerImage.src = `https://cdn.nba.com/headshots/nba/latest/1040x760/${stats.playerId}.png`;
        playerImage.alt = `Headshot of ${stats._id}`;
        // Fallback image if the player's headshot isn't found
        playerImage.onerror = () => {
            playerImage.src = 'https://cdn.nba.com/headshots/nba/latest/1040x760/fallback.png';
        };
        imageContainer.appendChild(playerImage);

        // Create a container for the text info
        const infoContainer = document.createElement('div');
        infoContainer.className = 'player-info-container';
        const header = document.createElement('h2');
        header.textContent = stats._id;

        // --- Add Career History and Win/Loss Record ---
        const careerDetails = document.createElement('div');
        careerDetails.className = 'career-details';

        // Team History
        const teamsHeader = document.createElement('h3');
        teamsHeader.textContent = 'Career History';
        const teamsList = document.createElement('p');
        // Use a Set to remove duplicates (e.g., "Charlotte Hornets" appearing twice for CHH/CHA)
        teamsList.textContent = `Played for: ${[...new Set(stats.teams.sort())].join(', ')}`;

        // Create a grid for the stats
        const statsGrid = document.createElement('div');
        statsGrid.className = 'stats-grid';

        const statsToShow = {
            "Games Played": stats.gamesPlayed,
            "Points": (stats.avgPTS || 0).toFixed(2),
            "Rebounds": (stats.avgREB || 0).toFixed(2),
            "Assists": (stats.avgAST || 0).toFixed(2),
            "Steals": (stats.avgSTL || 0).toFixed(2),
            "Blocks": (stats.avgBLK || 0).toFixed(2),
            "Minutes": (stats.avgMIN || 0).toFixed(2),
            "FG %": (stats.avgFG_PCT || 0).toFixed(1),
            "3P %": (stats.avg3P_PCT || 0).toFixed(1),
            "FT %": (stats.avgFT_PCT || 0).toFixed(1),
        };

        for (const [key, value] of Object.entries(statsToShow)) {
            const statItem = document.createElement('div');
            statItem.className = 'stat-item';
            statItem.innerHTML = `<strong>${key}</strong><span>${value}</span>`;
            statsGrid.appendChild(statItem);
        }

        // Assemble the card
        infoContainer.appendChild(header);
        infoContainer.appendChild(careerDetails);
        careerDetails.append(teamsHeader, teamsList);
        infoContainer.appendChild(statsGrid); // The stats grid will now be inside the info container
        playerCard.append(imageContainer, infoContainer);
        resultsContainer.appendChild(playerCard);
    }

    /**
     * Displays the top players for a team.
     * @param {object} teamData - The team data object from the API.
     */
    function displayTeamTopPlayers(teamData) {
        teamResultsContainer.innerHTML = ''; // Clear previous results

        const header = document.createElement('h2');
        header.textContent = `Top 10 All-Time Players for ${teamData.teamName}`;
        teamResultsContainer.appendChild(header);

        const playerList = document.createElement('div');
        playerList.className = 'top-players-list';

        teamData.players.forEach(player => {
            const playerItem = document.createElement('div');
            playerItem.className = 'top-player-item';

            const playerImage = document.createElement('img');
            playerImage.className = 'top-player-image';
            playerImage.src = `https://cdn.nba.com/headshots/nba/latest/1040x760/${player.playerId}.png`;
            playerImage.alt = `Headshot of ${player._id}`;
            playerImage.onerror = () => {
                playerImage.src = 'https://cdn.nba.com/headshots/nba/latest/1040x760/fallback.png';
            };

            const playerName = document.createElement('span');
            playerName.className = 'top-player-name';
            playerName.textContent = player._id;

            const playerStats = document.createElement('span');
            playerStats.className = 'top-player-stats';
            playerStats.textContent = `${player.avgPTS.toFixed(2)} PPG in ${player.gamesPlayed} games`;

            playerItem.append(playerImage, playerName, playerStats);
            playerList.appendChild(playerItem);
        });

        teamResultsContainer.appendChild(playerList);
    }
});
