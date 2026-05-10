import { loadStats, saveStats } from './store.js';
import { getTodayString, addDays, getDueWords } from './scheduler.js';

export function getStats() {
  return loadStats();
}

export function computeListStats(words, listId) {
  const listWords = words.filter(w => w.listId === listId);
  return {
    total:    listWords.length,
    dueToday: getDueWords(listWords).length,
    learned:  listWords.filter(w => w.sr.repetitions >= 3 && w.sr.interval >= 7).length,
  };
}

export function computeGlobalStats(words) {
  return {
    total:    words.length,
    dueToday: getDueWords(words).length,
    learned:  words.filter(w => w.sr.repetitions >= 3 && w.sr.interval >= 7).length,
  };
}

export function updateStreakAfterSession() {
  const stats = loadStats();
  const today = getTodayString();
  const yesterday = addDays(today, -1);

  if (stats.lastStudyDate === today) {
    return;
  } else if (stats.lastStudyDate === yesterday) {
    stats.streak += 1;
  } else {
    stats.streak = 1;
  }

  stats.lastStudyDate = today;
  saveStats(stats);
}

export function recordSessionResults(correct, wrong) {
  const stats = loadStats();
  stats.allTimeCorrect += correct;
  stats.allTimeWrong += wrong;
  saveStats(stats);
}
