document.addEventListener('DOMContentLoaded', () => {
    const totalGamesCount = document.getElementById('totalGamesCount');
    const libraryGrid = document.getElementById('libraryGrid');
    const libraryLoadingState = document.getElementById('libraryLoadingState');
    const libraryErrorState = document.getElementById('libraryErrorState');
    const librarySection = document.getElementById('librarySection');
    const librarySearchInput = document.getElementById('librarySearchInput');

    let allGames = [];
    let displayedGames = 0;
    const batchSize = 40;

    // Utility function to get Steam header image
    const getSteamImage = (appId) => {
        return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;
    };

    const fetchLibrary = async () => {
        libraryLoadingState.classList.remove('hidden');
        try {
            const response = await fetch('/api/Recommendations/all');
            if (!response.ok) {
                throw new Error('Failed to fetch library');
            }
            const data = await response.json();
            
            totalGamesCount.textContent = data.totalSavedGames || data.TotalSavedGames || 0;
            allGames = data.games || data.Games || [];
            
            libraryLoadingState.classList.add('hidden');
            librarySection.classList.remove('hidden');
            
            renderGamesBatch(allGames, true);
        } catch (error) {
            console.error('Error fetching library:', error);
            libraryLoadingState.classList.add('hidden');
            libraryErrorState.classList.remove('hidden');
        }
    };

    const renderGamesBatch = (gamesList, reset = false) => {
        if (reset) {
            libraryGrid.innerHTML = '';
            displayedGames = 0;
        }

        const nextBatch = gamesList.slice(displayedGames, displayedGames + batchSize);
        if (nextBatch.length === 0) return;

        nextBatch.forEach(game => {
            const id = game.appid || game.appId || game.Appid;
            const name = game.name || game.Name;

            const card = document.createElement('div');
            card.className = 'game-card';
            
            card.innerHTML = `
                <div class="card-image-container">
                    <img src="${getSteamImage(id)}" alt="${name}" class="card-image" onerror="this.src='https://via.placeholder.com/460x215/1a1a1c/ffffff?text=No+Cover';">
                </div>
                <div class="card-content">
                    <h3 class="card-title">${name}</h3>
                    <div class="card-actions">
                        <button class="action-btn ai-summary-btn" onclick="event.stopPropagation(); window.openAISummary('${id}')" data-i18n="ai_summary_btn">✨ AI Summary</button>
                        <a href="https://store.steampowered.com/app/${id}" target="_blank" class="action-btn steam-btn" onclick="event.stopPropagation()" data-i18n="view_steam">View on Steam</a>
                        <button class="action-btn similar-btn" onclick="window.location.href='index.html?search=${encodeURIComponent(name)}'" data-i18n="find_similar">Find Similar</button>
                    </div>
                </div>
            `;
            
            libraryGrid.appendChild(card);
        });

        displayedGames += nextBatch.length;

        // Apply translations to the new batch
        if (typeof applyLanguage === 'function') {
            applyLanguage();
        }
    };

    // Lazy load on scroll
    window.addEventListener('scroll', () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            const term = librarySearchInput.value.trim().toLowerCase();
            let filteredGames = allGames;
            if (term) {
                filteredGames = allGames.filter(g => (g.name || g.Name).toLowerCase().includes(term));
            }
            renderGamesBatch(filteredGames);
        }
    });

    // Frontend search filter
    librarySearchInput.addEventListener('input', (e) => {
        const term = e.target.value.trim().toLowerCase();
        let filteredGames = allGames;
        if (term) {
            filteredGames = allGames.filter(g => (g.name || g.Name).toLowerCase().includes(term));
        }
        renderGamesBatch(filteredGames, true);
    });

    // Handle incoming search query from URL (if we wanted to link here)
    fetchLibrary();
});
