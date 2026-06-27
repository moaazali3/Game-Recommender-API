document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');

    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const resultsSection = document.getElementById('resultsSection');

    const targetGameContainer = document.getElementById('targetGameContainer');
    const recommendationsGrid = document.getElementById('recommendationsGrid');

    // Utility function to get Steam header image
    const getSteamImage = (appId) => {
        return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;
    };

    const hideAllSections = () => {
        loadingState.classList.add('hidden');
        errorState.classList.add('hidden');
        resultsSection.classList.add('hidden');
    };

    const showError = () => {
        hideAllSections();
        errorState.classList.remove('hidden');
    };

    const showLoading = () => {
        hideAllSections();
        loadingState.classList.remove('hidden');
    };

    const renderResults = (data, searchInputVal) => {
        hideAllSections();

        targetGameContainer.innerHTML = '';
        recommendationsGrid.innerHTML = '';

        // Handle Target Game
        const targetName = data.targetGame || searchInputVal;

        // Check if the search input was a numeric ID to attempt getting its cover
        let targetAppId = null;
        if (!isNaN(searchInputVal) && searchInputVal.trim() !== '') {
            targetAppId = searchInputVal.trim();
        } else if (data.targetAppId) {
            targetAppId = data.targetAppId;
        }

        let targetImageHtml = '';
        if (targetAppId) {
            targetImageHtml = `<img src="${getSteamImage(targetAppId)}" alt="${targetName}" class="target-image" onerror="this.src='https://via.placeholder.com/460x215/1a1a1c/ffffff?text=Image+Not+Found';">`;
        } else {
            // Default abstract aesthetic image if no specific App ID is known for target
            targetImageHtml = `<div class="target-image" style="background: linear-gradient(135deg, #1a1a24, #2a1b38); display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.2); font-size: 2rem;">No Image Available</div>`;
        }

        targetGameContainer.innerHTML = `
            ${targetImageHtml}
            <div class="target-info">
                <div class="target-label">Target Game</div>
                <h2 class="target-title">${targetName}</h2>
            </div>
        `;

        // Handle Recommendations
        if (data.recommendations && data.recommendations.length > 0) {
            data.recommendations.slice(0, 5).forEach(rec => {
                const card = document.createElement('div');
                card.className = 'game-card';

                const keywordsHtml = rec.sharedKeywords
                    ? rec.sharedKeywords.map(kw => `<span class="keyword-tag">${kw}</span>`).join('')
                    : '';

                card.innerHTML = `
                    <div class="card-image-container">
                        <img src="${getSteamImage(rec.appId)}" alt="${rec.name}" class="card-image" onerror="this.src='https://via.placeholder.com/460x215/1a1a1c/ffffff?text=No+Cover';">
                        <div class="match-score-badge">${rec.matchScore}</div>
                    </div>
                    <div class="card-content">
                        <h3 class="card-title">${rec.name}</h3>
                        <div class="keywords">
                            ${keywordsHtml}
                        </div>
                    </div>
                `;

                recommendationsGrid.appendChild(card);
            });
        }

        resultsSection.classList.remove('hidden');
    };

    const performSearch = async () => {
        const searchTerm = searchInput.value.trim();
        if (!searchTerm) return;

        showLoading();

        try {
            const response = await fetch(`http://localhost:7193/api/Recommendations/${encodeURIComponent(searchTerm)}/recommendations`);

            if (!response.ok) {
                throw new Error('Game not found or API error');
            }

            const data = await response.json();

            if (!data || (!data.targetGame && (!data.recommendations || data.recommendations.length === 0))) {
                throw new Error('Invalid data structure');
            }

            renderResults(data, searchTerm);

        } catch (error) {
            console.error('Error fetching recommendations:', error);
            showError();
        }
    };

    searchBtn.addEventListener('click', performSearch);

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
});
