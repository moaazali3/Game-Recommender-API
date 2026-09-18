/**
 * API Service for Ludova Game Intelligence
 * Proxies calls to ASP.NET Core Backend
 */

const API_BASE = '/api';

/** Utility function to get Steam cover header image */
export const getSteamImage = (appId) => {
  if (!appId) return null;
  return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;
};


/** Get game recommendations by AppId or Game Name */
export const fetchRecommendations = async (searchTerm) => {
  const encoded = encodeURIComponent(searchTerm.trim());
  const response = await fetch(`${API_BASE}/Recommendations/${encoded}/recommendations`);
  if (!response.ok) {
    throw new Error(`Game not found or server error (${response.status})`);
  }
  return await response.json();
};

/** Autocomplete game search */
export const fetchGameAutocomplete = async (query) => {
  if (!query || query.trim().length < 2) return [];
  const encoded = encodeURIComponent(query.trim());
  const response = await fetch(`${API_BASE}/Recommendations/autocomplete?q=${encoded}`);
  if (!response.ok) return [];
  return await response.json();
};

/** Blend recommendations from multiple games */
export const fetchBlendRecommendations = async (gameNamesOrIds) => {
  const response = await fetch(`${API_BASE}/Recommendations/blend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ games: gameNamesOrIds }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to blend game recommendations');
  }
  return await response.json();
};

/** Get all games from the database */
export const fetchAllGames = async () => {
  const response = await fetch(`${API_BASE}/Recommendations/all`);
  if (!response.ok) throw new Error('Failed to load database library');
  return await response.json();
};

/** Get live database stats and seeding progress */
export const fetchLiveStats = async () => {
  const response = await fetch(`${API_BASE}/Recommendations/stats`);
  if (!response.ok) throw new Error('Failed to load stats');
  return await response.json();
};

/** Get AI review breakdown summary from Groq AI */
export const fetchAiSummary = async (appId, lang = 'en') => {
  const response = await fetch(`${API_BASE}/reviews/${appId}/ai-summary?lang=${lang}`);
  if (!response.ok) throw new Error('Failed to generate AI review breakdown');
  return await response.json();
};

/** Get Series Story Timeline */
export const fetchSeriesTimeline = async (seriesId, onlyMainline = false) => {
  const response = await fetch(`${API_BASE}/Series/${seriesId}/timeline?onlyMainline=${onlyMainline}`);
  if (!response.ok) throw new Error('Failed to fetch series timeline');
  return await response.json();
};

/** Autocomplete franchise/series */
export const fetchSeriesAutocomplete = async (query) => {
  if (!query || query.trim().length < 2) return [];
  const encoded = encodeURIComponent(query.trim());
  const response = await fetch(`${API_BASE}/Series/autocomplete?q=${encoded}`);
  if (!response.ok) return [];
  return await response.json();
};

/**
 * Fetch Community Feedbacks
 */
export const fetchFeedbacks = async () => {
  const response = await fetch(`${API_BASE}/Recommendations/feedback`);
  if (!response.ok) return [];
  return await response.json();
};

/**
 * Submit User Feedback
 * NOTE: Fixed API DTO contract - sending `message` to match backend FeedbackInputDto.Message
 */
export const submitFeedback = async (message, rating) => {
  const response = await fetch(`${API_BASE}/Recommendations/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: message.trim(),
      rating: Number(rating) || 5,
    }),
  });

  if (!response.ok) throw new Error('Failed to submit feedback');
  return await response.json();
};
