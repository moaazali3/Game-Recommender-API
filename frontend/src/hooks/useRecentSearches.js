import { useState, useEffect } from 'react';

const STORAGE_KEY = 'ludova_recent_searches';
const MAX_RECENT = 6;

export const useRecentSearches = () => {
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentSearches));
    } catch (e) {
      console.warn('Failed to persist recent searches', e);
    }
  }, [recentSearches]);

  const addSearch = (term) => {
    if (!term || typeof term !== 'string') return;
    const clean = term.trim();
    if (!clean) return;

    setRecentSearches(prev => {
      const filtered = prev.filter(item => item.toLowerCase() !== clean.toLowerCase());
      return [clean, ...filtered].slice(0, MAX_RECENT);
    });
  };

  const removeSearch = (term) => {
    setRecentSearches(prev => prev.filter(item => item !== term));
  };

  const clearSearches = () => {
    setRecentSearches([]);
  };

  return { recentSearches, addSearch, removeSearch, clearSearches };
};
