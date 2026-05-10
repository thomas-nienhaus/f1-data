const WORDS_KEY = 'wordlearn_words';
const STATS_KEY = 'wordlearn_stats';
const LISTS_KEY = 'wordlearn_lists';

export function loadWords() {
  try {
    return JSON.parse(localStorage.getItem(WORDS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveWords(words) {
  try {
    localStorage.setItem(WORDS_KEY, JSON.stringify(words));
  } catch (e) {
    console.error('localStorage schrijven mislukt:', e);
  }
}

export function loadLists() {
  try {
    return JSON.parse(localStorage.getItem(LISTS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveLists(lists) {
  try {
    localStorage.setItem(LISTS_KEY, JSON.stringify(lists));
  } catch (e) {
    console.error('localStorage schrijven mislukt:', e);
  }
}

export function loadStats() {
  try {
    return JSON.parse(localStorage.getItem(STATS_KEY) || 'null') || defaultStats();
  } catch {
    return defaultStats();
  }
}

export function saveStats(stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error('localStorage schrijven mislukt:', e);
  }
}

export function generateId() {
  return crypto.randomUUID();
}

function defaultStats() {
  return {
    streak: 0,
    lastStudyDate: null,
    allTimeCorrect: 0,
    allTimeWrong: 0,
  };
}
