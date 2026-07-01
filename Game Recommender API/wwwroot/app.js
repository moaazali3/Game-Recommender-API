document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const autocompleteDropdown = document.getElementById('autocompleteDropdown');
    const aboutBtn = document.getElementById('aboutBtn');
    const infoModal = document.getElementById('infoModal');
    const closeModalBtn = document.getElementById('closeModalBtn');

    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const resultsSection = document.getElementById('resultsSection');

    const targetGameContainer = document.getElementById('targetGameContainer');
    const recommendationsGrid = document.getElementById('recommendationsGrid');

    // Utility function to get Steam header image
    const getSteamImage = (appId) => {
        return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;
    };

    if (aboutBtn && infoModal && closeModalBtn) {
        aboutBtn.addEventListener('click', () => {
            infoModal.classList.add('show');
        });

        closeModalBtn.addEventListener('click', () => {
            infoModal.classList.remove('show');
        });

        // Close on outside click
        infoModal.addEventListener('click', (e) => {
            if (e.target === infoModal) {
                infoModal.classList.remove('show');
            }
        });
    }

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
        resultsSection.classList.remove('hidden');
        targetGameContainer.innerHTML = `<div class="skeleton-target"></div>`;
        recommendationsGrid.innerHTML = Array(8).fill(`<div class="skeleton-card"></div>`).join('');
    };

    const renderResults = (data, searchInputVal) => {
        hideAllSections();

        targetGameContainer.innerHTML = '';
        recommendationsGrid.innerHTML = '';

        // Handle Target Game
        const targetName = data.targetgame || data.targetGame || data.Targetgame || searchInputVal;

        // Check if the search input was a numeric ID to attempt getting its cover
        let targetAppId = null;
        if (!isNaN(searchInputVal) && searchInputVal.trim() !== '') {
            targetAppId = searchInputVal.trim();
        } else {
            targetAppId = data.targetappid || data.targetAppId || data.TargetAppId || data.appid || data.appId || data.AppId;
        }

        let targetImageHtml = '';
        if (targetAppId) {
            targetImageHtml = `<img src="${getSteamImage(targetAppId)}" alt="${targetName}" class="target-image" onerror="this.src='https://via.placeholder.com/460x215/1a1a1c/ffffff?text=Image+Not+Found';">`;
        } else {
            // Default abstract aesthetic image if no specific App ID is known for target
            targetImageHtml = `<div class="target-image" style="background: linear-gradient(135deg, #1a1a24, #2a1b38); display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.2); font-size: 2rem;">No Image Available</div>`;
        }

        const targetHasSeries = data.hasSeries || data.HasSeries;
        const targetSeriesId = data.seriesId || data.SeriesId;

        let targetButtonsHtml = '';
        if (targetAppId) {
            targetButtonsHtml += `<button class="action-btn ai-summary-btn" onclick="window.openAISummary('${targetAppId}')" data-i18n="ai_summary_btn">✨ AI Summary</button>`;
        }
        if (targetHasSeries && targetSeriesId) {
            targetButtonsHtml += `<button class="action-btn similar-btn" onclick="window.location.href='series.html?id=${targetSeriesId}'" data-i18n="view_series">View Series</button>`;
        }

        targetGameContainer.innerHTML = `
            ${targetImageHtml}
            <div class="target-info">
                <div class="target-label" data-i18n="target_label">Target Game</div>
                <h2 class="target-title">${targetName}</h2>
                <div class="card-actions" style="margin-top: 1.5rem; max-width: 350px;">
                    ${targetButtonsHtml}
                </div>
            </div>
        `;

        // Handle Recommendations
        const recList = data.recommendations || data.recommend || data.Recommend || data.Recommendations || [];
        if (recList.length > 0) {
            recList.forEach(game => {
                const id = game.appid || game.appId || game.AppId || game.TargetAppId;
                const score = game.matchscore || game.matchScore || game.MatchScore;
                const keywords = game.sharedkeywords || game.sharedKeywords || game.SharedKeywords || game.Sharedkeywords || [];
                const name = game.name || game.Name;

                const tags = game.tags || game.Tags || [];
                let tagsArray = [];
                if (typeof tags === 'string') {
                    tagsArray = tags.split(',').map(t => t.trim()).filter(t => t);
                } else if (Array.isArray(tags)) {
                    tagsArray = tags;
                }

                let tagsHtml = '';
                if (tagsArray.length > 0) {
                    tagsHtml = `<div class="tags-container">
                        ${tagsArray.slice(0, 4).map(t => `<span class="tag-badge">${t}</span>`).join('')}
                    </div>`;
                }

                const isMature = game.isMature || game.IsMature;
                const hasSeries = game.hasseries || game.hasSeries;
                const seriesId = game.seriesid || game.seriesId;

                const card = document.createElement('div');
                card.className = isMature ? 'game-card mature-card' : 'game-card';
                if (hasSeries) {
                    card.classList.add('has-series-card');
                }

                const matureBadgeHtml = isMature ? `<span class="mature-badge">18+ Mature</span>` : '';
                
                let seriesBadgeHtml = '';
                if (hasSeries && seriesId) {
                    seriesBadgeHtml = `<button class="series-badge" onclick="event.stopPropagation(); window.location.href='series.html?id=${seriesId}'" data-i18n="view_series">View Series</button>`;
                }

                card.innerHTML = `
                    <div class="card-image-container">
                        <img src="${getSteamImage(id)}" alt="${name}" class="card-image" onerror="this.src='https://via.placeholder.com/460x215/1a1a1c/ffffff?text=No+Cover';">
                        ${matureBadgeHtml}
                        ${seriesBadgeHtml}
                        <div class="match-score-badge">
                            <span class="match-score-label" data-i18n="match_label">Match</span>
                            <span class="match-score-value">${score}</span>
                        </div>
                    </div>
                    <div class="card-content">
                        <h3 class="card-title">${name}</h3>
                        ${tagsHtml}
                        <div class="card-actions">
                            <button class="action-btn ai-summary-btn" onclick="event.stopPropagation(); window.openAISummary('${id}')" data-i18n="ai_summary_btn">✨ AI Summary</button>
                            <a href="https://store.steampowered.com/app/${id}" target="_blank" class="action-btn steam-btn" onclick="event.stopPropagation()" data-i18n="view_steam">View on Steam</a>
                            <button class="action-btn similar-btn" data-name="${name}" data-i18n="find_similar">Find Similar</button>
                        </div>
                    </div>
                `;

                const similarBtn = card.querySelector('.similar-btn');
                if (similarBtn) {
                    similarBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        searchInput.value = name;
                        performSearch();
                    });
                }

                recommendationsGrid.appendChild(card);
            });
        }

        resultsSection.classList.remove('hidden');
        if (typeof applyLanguage === 'function') {
            applyLanguage();
        }
    };

    const performSearch = async () => {
        const searchTerm = searchInput.value.trim();
        if (!searchTerm) return;

        showLoading();

        try {

            const response = await fetch(`/api/Recommendations/${searchTerm}/recommendations`);

            if (!response.ok) {
                throw new Error('Game not found or API error');
            }

            const data = await response.json();

            const recList = data.recommendations || data.recommend || data.Recommend || data.Recommendations;
            const tGame = data.targetgame || data.targetGame || data.Targetgame;

            if (!data || (!tGame && (!recList || recList.length === 0))) {
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
            autocompleteDropdown.classList.add('hidden');
        }
    });

    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const term = e.target.value.trim();
        if (term.length >= 2) {
            debounceTimer = setTimeout(() => {
                fetchAutocomplete(term);
            }, 300);
        } else {
            autocompleteDropdown.classList.add('hidden');
        }
    });

    const fetchAutocomplete = async (term) => {
        try {
            const response = await fetch(`/api/Recommendations/autocomplete?q=${term}`);
            if (response.ok) {
                const suggestions = await response.json();
                renderAutocomplete(suggestions);
            }
        } catch (err) {
            console.error('Autocomplete error:', err);
        }
    };

    const renderAutocomplete = (suggestions) => {
        if (!suggestions || suggestions.length === 0) {
            autocompleteDropdown.classList.add('hidden');
            return;
        }
        autocompleteDropdown.innerHTML = '';
        suggestions.forEach(s => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.textContent = s.name || s.Name;
            item.addEventListener('click', () => {
                const id = s.appid || s.appId || s.AppId;
                searchInput.value = item.textContent;
                autocompleteDropdown.classList.add('hidden');
                performSearch();
            });
            autocompleteDropdown.appendChild(item);
        });
        autocompleteDropdown.classList.remove('hidden');
    };

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
            autocompleteDropdown.classList.add('hidden');
        }
    });

    // Check if there is a search query in the URL params (e.g. index.html?search=Dark%20Souls)
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    if (searchParam) {
        searchInput.value = searchParam;
        performSearch();
    }
});
