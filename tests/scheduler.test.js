import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getTodayString,
  addDays,
  isDue,
  getDueWords,
  applyResult,
  defaultSR,
} from '../modules/scheduler.js';

describe('getTodayString', () => {
  it('retourneert YYYY-MM-DD formaat', () => {
    const today = getTodayString();
    assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
  });

  it('is gelijk aan de huidige datum', () => {
    const expected = new Date().toISOString().slice(0, 10);
    assert.equal(getTodayString(), expected);
  });
});

describe('addDays', () => {
  it('voegt dagen toe', () => {
    assert.equal(addDays('2024-01-01', 1), '2024-01-02');
    assert.equal(addDays('2024-01-01', 7), '2024-01-08');
    assert.equal(addDays('2024-01-31', 1), '2024-02-01');
  });

  it('trekt dagen af bij negatieve waarde', () => {
    assert.equal(addDays('2024-01-10', -3), '2024-01-07');
    assert.equal(addDays('2024-03-01', -1), '2024-02-29');
  });

  it('verwerkt jaarovergang', () => {
    assert.equal(addDays('2024-12-31', 1), '2025-01-01');
  });
});

describe('isDue', () => {
  const today = getTodayString();

  it('is due als dueDate vandaag is', () => {
    const word = { sr: { dueDate: today } };
    assert.equal(isDue(word), true);
  });

  it('is due als dueDate in het verleden is', () => {
    const word = { sr: { dueDate: '2000-01-01' } };
    assert.equal(isDue(word), true);
  });

  it('is niet due als dueDate in de toekomst is', () => {
    const word = { sr: { dueDate: addDays(today, 1) } };
    assert.equal(isDue(word), false);
  });
});

describe('getDueWords', () => {
  const today = getTodayString();

  it('filtert alleen te herhalen woorden', () => {
    const words = [
      { id: 1, sr: { dueDate: today } },
      { id: 2, sr: { dueDate: addDays(today, 5) } },
      { id: 3, sr: { dueDate: '2000-01-01' } },
    ];
    const due = getDueWords(words);
    assert.equal(due.length, 2);
    assert.deepEqual(due.map(w => w.id), [1, 3]);
  });

  it('geeft lege array terug als niets due is', () => {
    const words = [
      { sr: { dueDate: addDays(today, 1) } },
      { sr: { dueDate: addDays(today, 10) } },
    ];
    assert.equal(getDueWords(words).length, 0);
  });
});

describe('defaultSR', () => {
  it('initialiseert met correcte standaardwaarden', () => {
    const today = getTodayString();
    const sr = defaultSR(today);
    assert.equal(sr.interval, 1);
    assert.equal(sr.easeFactor, 2.5);
    assert.equal(sr.repetitions, 0);
    assert.equal(sr.dueDate, today);
    assert.equal(sr.totalCorrect, 0);
    assert.equal(sr.totalWrong, 0);
    assert.equal(sr.lastStudied, null);
  });
});

describe('applyResult', () => {
  const today = getTodayString();

  function makeWord(overrides = {}) {
    return {
      id: 'test',
      source: 'gato',
      translation: 'kat',
      sr: { ...defaultSR(today), ...overrides },
    };
  }

  it('correct antwoord verhoogt repetitions en easeFactor', () => {
    const word = makeWord({ interval: 1, easeFactor: 2.5, repetitions: 0 });
    const result = applyResult(word, true);
    assert.equal(result.sr.repetitions, 1);
    assert.equal(result.sr.totalCorrect, 1);
    assert.equal(result.sr.totalWrong, 0);
    assert.ok(result.sr.easeFactor > 2.5);
    assert.ok(result.sr.interval >= 1);
  });

  it('fout antwoord reset interval naar 1 en verlaagt easeFactor', () => {
    const word = makeWord({ interval: 10, easeFactor: 2.5, repetitions: 5 });
    const result = applyResult(word, false);
    assert.equal(result.sr.interval, 1);
    assert.equal(result.sr.repetitions, 0);
    assert.equal(result.sr.totalWrong, 1);
    assert.ok(result.sr.easeFactor < 2.5);
  });

  it('easeFactor gaat nooit onder 1.3', () => {
    let word = makeWord({ easeFactor: 1.3 });
    for (let i = 0; i < 10; i++) {
      word = applyResult(word, false);
    }
    assert.ok(word.sr.easeFactor >= 1.3);
  });

  it('easeFactor gaat nooit boven 4.0', () => {
    let word = makeWord({ easeFactor: 3.9 });
    for (let i = 0; i < 10; i++) {
      word = applyResult(word, true);
    }
    assert.ok(word.sr.easeFactor <= 4.0);
  });

  it('dueDate wordt correct berekend na correct antwoord', () => {
    const word = makeWord({ interval: 4, easeFactor: 2.5 });
    const result = applyResult(word, true);
    const expectedInterval = Math.max(1, Math.round(4 * 2.5));
    const expectedDue = addDays(today, expectedInterval);
    assert.equal(result.sr.dueDate, expectedDue);
  });

  it('muteert het originele woord niet', () => {
    const word = makeWord();
    const original = JSON.stringify(word.sr);
    applyResult(word, true);
    assert.equal(JSON.stringify(word.sr), original);
  });
});
