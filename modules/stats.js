import * as db from './db.js';
import { getTodayString, addDays, getDueWords } from './scheduler.js';

export async function getStats() {
  return db.fetchStats();
}

export function computeGlobalStats(words) {
  return {
    total:    words.length,
    dueToday: getDueWords(words).length,
    learned:  words.filter(w => w.sr.repetitions >= 3 && w.sr.interval >= 7).length,
  };
}

export async function updateStreakAfterSession() {
  const stats    = await db.fetchStats();
  const today    = getTodayString();
  const yesterday = addDays(today, -1);

  if (stats.lastStudyDate === today) return;

  stats.streak = (stats.lastStudyDate === yesterday) ? stats.streak + 1 : 1;
  stats.lastStudyDate = today;
  await db.upsertStats(stats);
}

export async function recordSessionResults(correct, wrong) {
  const stats = await db.fetchStats();
  stats.allTimeCorrect += correct;
  stats.allTimeWrong   += wrong;
  await db.upsertStats(stats);
}
