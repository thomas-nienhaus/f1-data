import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeGlobalStats } from '../modules/stats.js';
import { defaultSR, addDays, getTodayString } from '../modules/scheduler.js';

function makeWord(id, repetitions = 0, interval = 1, dueOffsetDays = 0) {
  const today = getTodayString();
  return {
    id,
    source: 'test',
    translation: 'test',
    sr: {
      ...defaultSR(today),
      repetitions,
      interval,
      dueDate: addDays(today, dueOffsetDays),
    },
  };
}

describe('computeGlobalStats', () => {
  it('telt het totaal aantal woorden', () => {
    const words = [makeWord(1), makeWord(2), makeWord(3)];
    const stats = computeGlobalStats(words);
    assert.equal(stats.total, 3);
  });

  it('telt dueToday correct', () => {
    const words = [
      makeWord(1, 0, 1, 0),   // vandaag due
      makeWord(2, 0, 1, -5),  // achterstallig, ook due
      makeWord(3, 0, 1, 1),   // morgen, nog niet due
      makeWord(4, 0, 1, 5),   // over 5 dagen
    ];
    const stats = computeGlobalStats(words);
    assert.equal(stats.dueToday, 2);
  });

  it('telt learned woorden (repetitions >= 3 en interval >= 7)', () => {
    const words = [
      makeWord(1, 3, 7),   // geleerd
      makeWord(2, 3, 6),   // repetitions ok maar interval te laag
      makeWord(3, 2, 7),   // interval ok maar repetitions te laag
      makeWord(4, 5, 14),  // zeker geleerd
      makeWord(5, 0, 1),   // nieuw
    ];
    const stats = computeGlobalStats(words);
    assert.equal(stats.learned, 2);
  });

  it('werkt correct met lege woordenlijst', () => {
    const stats = computeGlobalStats([]);
    assert.equal(stats.total, 0);
    assert.equal(stats.dueToday, 0);
    assert.equal(stats.learned, 0);
  });

  it('alle woorden learned als allemaal voldoen', () => {
    const words = [makeWord(1, 4, 10), makeWord(2, 5, 15), makeWord(3, 3, 7)];
    const stats = computeGlobalStats(words);
    assert.equal(stats.learned, 3);
  });
});
