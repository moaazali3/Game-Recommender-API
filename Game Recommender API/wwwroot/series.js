document.addEventListener('DOMContentLoaded', () => {
    const seriesSearchInput = document.getElementById('seriesSearchInput');
    const seriesAutocompleteDropdown = document.getElementById('seriesAutocompleteDropdown');
    
    const allSeriesSection = document.getElementById('allSeriesSection');
    const seriesGrid = document.getElementById('seriesGrid');
    const seriesLoadingState = document.getElementById('seriesLoadingState');
    const seriesErrorState = document.getElementById('seriesErrorState');

    const timelineSection = document.getElementById('timelineSection');
    const timelineSeriesTitle = document.getElementById('timelineSeriesTitle');
    const mainlineToggle = document.getElementById('mainlineToggle');
    const timelineLoadingState = document.getElementById('timelineLoadingState');
    const timelineErrorState = document.getElementById('timelineErrorState');
    const timelineContainer = document.getElementById('timelineContainer');
    const emptyStateSection = document.getElementById('emptyStateSection');

    // Extract ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    let currentSeriesId = urlParams.get('id');

    if (currentSeriesId) {
        // Show timeline view
        loadTimeline(currentSeriesId);
    } else {
        // Show empty state
        showEmptyState();
    }

    // --- Autocomplete Logic ---
    if (seriesSearchInput && seriesAutocompleteDropdown) {
        let seriesDebounceTimer;
        seriesSearchInput.addEventListener('input', (e) => {
            clearTimeout(seriesDebounceTimer);
            const term = e.target.value.trim();
            if (term.length >= 2) {
                seriesDebounceTimer = setTimeout(() => {
                    fetchSeriesAutocomplete(term);
                }, 300);
            } else {
                seriesAutocompleteDropdown.classList.add('hidden');
            }
        });

        const fetchSeriesAutocomplete = async (term) => {
            try {
                const response = await fetch(`/api/Series/autocomplete?q=${term}`);
                if (response.ok) {
                    const suggestions = await response.json();
                    renderSeriesAutocomplete(suggestions);
                }
            } catch (err) {
                console.error('Series autocomplete error:', err);
            }
        };

        const renderSeriesAutocomplete = (suggestions) => {
            if (!suggestions || suggestions.length === 0) {
                seriesAutocompleteDropdown.classList.add('hidden');
                return;
            }
            seriesAutocompleteDropdown.innerHTML = '';
            suggestions.forEach(s => {
                const item = document.createElement('div');
                item.className = 'autocomplete-item';
                item.textContent = s.name || s.Name;
                item.addEventListener('click', () => {
                    seriesAutocompleteDropdown.classList.add('hidden');
                    seriesSearchInput.value = item.textContent;
                    
                    // Update URL and state
                    const newUrl = `${window.location.pathname}?id=${s.id || s.Id}`;
                    window.history.pushState({ path: newUrl }, '', newUrl);
                    currentSeriesId = s.id || s.Id;
                    loadTimeline(currentSeriesId, s.name || s.Name);
                });
                seriesAutocompleteDropdown.appendChild(item);
            });
            seriesAutocompleteDropdown.classList.remove('hidden');
        };

        document.addEventListener('click', (e) => {
            if (!seriesSearchInput.contains(e.target) && !seriesAutocompleteDropdown.contains(e.target)) {
                seriesAutocompleteDropdown.classList.add('hidden');
            }
        });

        seriesSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                // Optionally select the first item if dropdown is open and has items
                const firstItem = seriesAutocompleteDropdown.querySelector('.autocomplete-item');
                if (firstItem && !seriesAutocompleteDropdown.classList.contains('hidden')) {
                    firstItem.click();
                }
            }
        });
    }

    // --- Empty State View ---
    
    function showEmptyState() {
        if (emptyStateSection) emptyStateSection.classList.remove('hidden');
        if (timelineSection) timelineSection.classList.add('hidden');
        if (seriesErrorState) seriesErrorState.classList.add('hidden');
        if (seriesLoadingState) seriesLoadingState.classList.add('hidden');
    }

    // --- Timeline View ---
    mainlineToggle.addEventListener('change', (e) => {
        if (currentSeriesId) {
            fetchTimelineData(currentSeriesId, e.target.checked);
        }
    });

    function loadTimeline(id, nameFallback = null) {
        if (emptyStateSection) emptyStateSection.classList.add('hidden');
        seriesErrorState.classList.add('hidden');
        seriesLoadingState.classList.add('hidden');
        timelineSection.classList.remove('hidden');
        
        mainlineToggle.checked = false;
        
        if (nameFallback) {
            timelineSeriesTitle.textContent = `${nameFallback} Timeline`;
        } else {
            timelineSeriesTitle.textContent = 'Series Story Timeline';
        }

        fetchTimelineData(id, false);
    }

    async function fetchTimelineData(id, onlyMainline) {
        timelineLoadingState.classList.remove('hidden');
        timelineErrorState.classList.add('hidden');
        timelineContainer.classList.add('hidden');
        timelineContainer.innerHTML = '';

        try {
            const response = await fetch(`/api/Series/${id}/timeline?onlyMainline=${onlyMainline}`);
            if (!response.ok) {
                throw new Error('Timeline fetch failed');
            }
            
            const data = await response.json();
            
            if (data && data.seriesName) {
                timelineSeriesTitle.textContent = `${data.seriesName} Timeline`;
            }
            
            renderTimeline(data);
        } catch (error) {
            console.error('Error fetching timeline:', error);
            timelineLoadingState.classList.add('hidden');
            timelineErrorState.classList.remove('hidden');
        }
    }

    function renderTimeline(data) {
        timelineLoadingState.classList.add('hidden');
        timelineContainer.innerHTML = '';
        
        if (!data || !data.timeline || data.timeline.length === 0) {
            timelineContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); margin-top: 2rem;">No timeline data available.</p>';
            timelineContainer.classList.remove('hidden');
            return;
        }

        data.timeline.forEach((game, index) => {
            const delay = index * 0.1; // staggered animation
            
            const isMainline = game.isMainline;
            const badgeClass = isMainline ? 'badge-mainline' : 'badge-spinoff';
            const badgeText = isMainline ? 'Mainline' : 'Spin-off';
            
            let dateStr = game.releaseDate;
            if (dateStr) {
                const releaseDateObj = new Date(game.releaseDate);
                if (!isNaN(releaseDateObj.getTime())) {
                    dateStr = releaseDateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric'});
                }
            } else {
                dateStr = 'TBA';
            }

            let coverUrl = game.coverImageUrl;
            if (!coverUrl || coverUrl.trim() === '') {
                const titleForPlaceholder = game.title ? game.title.charAt(0).toUpperCase() : '?';
                coverUrl = `https://placehold.co/120x160/1e1e24/00d2ff?text=${encodeURIComponent(titleForPlaceholder)}`;
            }

            const itemHTML = `
                <div class="timeline-item" style="animation-delay: ${delay}s">
                    <div class="timeline-marker">${game.chronologicalOrder}</div>
                    <div class="timeline-card">
                        <img src="${coverUrl}" alt="${game.title}" class="timeline-img" onerror="this.src='https://via.placeholder.com/120x80/1a1a1c/ffffff?text=No+Cover';">
                        <div class="timeline-info">
                            <h4 class="timeline-title">${game.title}</h4>
                            <span class="timeline-date">${dateStr}</span>
                            <span class="mainline-badge ${badgeClass}">${badgeText}</span>
                        </div>
                    </div>
                </div>
            `;
            timelineContainer.insertAdjacentHTML('beforeend', itemHTML);
        });

        timelineContainer.classList.remove('hidden');
    }
    
    // Handle back button navigation
    window.addEventListener('popstate', (e) => {
        const params = new URLSearchParams(window.location.search);
        const newId = params.get('id');
        if (newId) {
            currentSeriesId = newId;
            loadTimeline(newId);
        } else {
            currentSeriesId = null;
            showEmptyState();
        }
    });
});
