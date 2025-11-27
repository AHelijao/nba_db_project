document.addEventListener('DOMContentLoaded', () => {
    const searchButton = document.getElementById('search-button');
    const playerNameInput = document.getElementById('player-name-input');
    const teamSearchButton = document.getElementById('team-search-button');
    const teamNameInput = document.getElementById('team-name-input');
    const resultsContainer = document.getElementById('results-container');
    const teamResultsContainer = document.getElementById('team-results-container');
    const loadingIndicator = document.getElementById('loading-indicator');

    /**
     * A generic function to handle API searches, loading states, and error display.
     * @param {object} config - The configuration for the search.
     * @param {HTMLInputElement} config.inputElement - The input field.
     * @param {HTMLElement} config.container - The container to display results.
     * @param {string} config.apiEndpoint - The API path to fetch from.
     * @param {string} config.emptyMessage - The message to show if the input is empty.
     * @param {function} config.displayFunction - The function to render the results.
     */
    const performSearch = async ({ inputElement, container, apiEndpoint, emptyMessage, displayFunction }) => {
        const query = inputElement.value.trim();
        if (!query) {
            container.innerHTML = `<p style="color: red;">${emptyMessage}</p>`;
            return;
        }

        loadingIndicator.classList.remove('hidden');
        container.innerHTML = '';

        try {
            const response = await fetch(`${apiEndpoint}/${query}`);
            if (!response.ok) {
                // Try to parse error message, but have a fallback
                let errorMsg = `A server error occurred: ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.message || `No results found for "${query}".`;
                } catch (e) {
                    // The error response wasn't valid JSON, use the status text.
                }
                throw new Error(errorMsg);
            }
            const data = await response.json();
            displayFunction(data);
        } catch (error) {
            container.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
        } finally {
            loadingIndicator.classList.add('hidden');
        }
    };

    const searchPlayer = () => performSearch({ inputElement: playerNameInput, container: resultsContainer, apiEndpoint: '/api/players/search', emptyMessage: 'Please enter a player name.', displayFunction: displayStats });
    const searchTeam = () => performSearch({ inputElement: teamNameInput, container: teamResultsContainer, apiEndpoint: '/api/teams/search', emptyMessage: 'Please enter a team name.', displayFunction: displayTeamTopPlayers });

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

        const headerContainer = document.createElement('div');
        headerContainer.className = 'team-header';

        if (teamData.teamId) {
            const logo = document.createElement('img');
            logo.className = 'team-logo';
            logo.src = `https://cdn.nba.com/logos/nba/${teamData.teamId}/primary/L/logo.svg`;
            logo.alt = `${teamData.teamName} logo`;
            logo.onerror = () => { logo.style.display = 'none'; }; // Hide if logo fails to load
            headerContainer.appendChild(logo);
        }

        const header = document.createElement('h2');
        header.textContent = `Top 10 All-Time Players for ${teamData.teamName}`;
        headerContainer.appendChild(header);

        teamResultsContainer.appendChild(headerContainer);

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

            // Make the entire player item clickable
            playerItem.style.cursor = 'pointer';
            playerItem.addEventListener('click', () => {
                // Populate the player search input with the clicked player's name
                playerNameInput.value = player._id;
                // Trigger the player search
                searchPlayer();
                // Scroll to the player search section for better UX
                document.getElementById('player-search-column').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });

            playerItem.append(playerImage, playerName, playerStats);
            playerList.appendChild(playerItem);
        });

        teamResultsContainer.appendChild(playerList);
    }
    // --- Rivalry Feature ---
    const rivalryTeam1Input = document.getElementById('rivalry-team1-input');
    const rivalryTeam2Input = document.getElementById('rivalry-team2-input');
    const rivalrySearchButton = document.getElementById('rivalry-search-button');
    const rivalryResultsContainer = document.getElementById('rivalry-results-container');

    const searchMatchup = async () => {
        const t1 = rivalryTeam1Input.value.trim();
        const t2 = rivalryTeam2Input.value.trim();

        if (!t1 || !t2) {
            alert('Please enter both team names.');
            return;
        }

        loadingIndicator.classList.remove('hidden');
        rivalryResultsContainer.classList.add('hidden');
        rivalryResultsContainer.innerHTML = '';

        try {
            const response = await fetch(`/api/matchup/${t1}/${t2}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Matchup not found.');
            }
            const data = await response.json();
            displayMatchup(data);
        } catch (error) {
            alert(error.message);
        } finally {
            loadingIndicator.classList.add('hidden');
        }
    };

    rivalrySearchButton.addEventListener('click', searchMatchup);

    function displayMatchup(data) {
        rivalryResultsContainer.classList.remove('hidden');
        rivalryResultsContainer.innerHTML = `
            <div class="matchup-banner">
                <div class="score-board">
                    <div class="team-score">
                        <img src="https://cdn.nba.com/logos/nba/${data.team1.teamId}/primary/L/logo.svg" class="matchup-logo" onerror="this.style.display='none'">
                        <h3>${data.team1.wins}</h3>
                    </div>
                    <div class="score-divider">-</div>
                    <div class="team-score">
                        <h3>${data.team2.wins}</h3>
                        <img src="https://cdn.nba.com/logos/nba/${data.team2.teamId}/primary/L/logo.svg" class="matchup-logo" onerror="this.style.display='none'">
                    </div>
                </div>
                
                <div class="top-performers-grid">
                    <div class="team-column">
                        <h4>Top ${data.team1.name} Performers</h4>
                        ${data.team1TopPlayers.map(p => createMiniPlayer(p)).join('')}
                    </div>
                    <div class="team-column">
                        <h4>Top ${data.team2.name} Performers</h4>
                        ${data.team2TopPlayers.map(p => createMiniPlayer(p)).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    function createMiniPlayer(player) {
        return `
            <div class="mini-player-item">
                <img src="https://cdn.nba.com/headshots/nba/latest/1040x760/${player.playerId}.png" 
                     class="mini-player-img" 
                     onerror="this.src='https://cdn.nba.com/headshots/nba/latest/1040x760/fallback.png'">
                <div class="mini-player-info">
                    <div>${player._id}</div>
                </div>
                <div class="mini-player-stat">${player.avgPTS.toFixed(1)} PPG</div>
            </div>
        `;
    }
});
