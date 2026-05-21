export function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(dateString, days) {
  const d = new Date(dateString + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isDue(word) {
  return word.sr.dueDate <= getTodayString();
}

export function getDueWords(words) {
  return words.filter(isDue);
}

export function applyResult(word, correct) {
  const sr = { ...word.sr };
  const today = getTodayString();

  if (correct) {
    sr.interval = sr.repetitions === 0
      ? 1
      : Math.max(1, Math.round(sr.interval * sr.easeFactor));
    sr.easeFactor = Math.min(4.0, sr.easeFactor + 0.1);
    sr.repetitions += 1;
    sr.totalCorrect += 1;
  } else {
    sr.interval = 1;
    sr.easeFactor = Math.max(1.3, sr.easeFactor - 0.2);
    sr.repetitions = 0;
    sr.totalWrong += 1;
  }

  sr.dueDate = addDays(today, sr.interval);
  sr.lastStudied = today;

  return { ...word, sr };
}

export function defaultSR(today) {
  return {
    interval: 1,
    easeFactor: 2.5,
    repetitions: 0,
    dueDate: today,
    totalCorrect: 0,
    totalWrong: 0,
    lastStudied: null,
  };
}
