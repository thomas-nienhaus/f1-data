import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as Session from '../modules/session.js';
import { defaultSR, addDays, getTodayString } from '../modules/scheduler.js';

function makeWord(id, source, translation, overrides = {}) {
  const today = getTodayString();
  return {
    id,
    source,
    translation,
    listId: 'list1',
    sr: { ...defaultSR(today), ...overrides },
  };
}

describe('submitAnswer', () => {
  beforeEach(() => {
    Session.initSession([makeWord('1', 'gato', 'kat')]);
  });

  it('exact match is correct', () => {
    const result = Session.submitAnswer('kat');
    assert.equal(result.correct, true);
  });

  it('case-insensitief vergelijken', () => {
    const result = Session.submitAnswer('KAT');
    assert.equal(result.correct, true);
  });

  it('spaties worden getrimd', () => {
    const result = Session.submitAnswer('  kat  ');
    assert.equal(result.correct, true);
  });

  it('fout antwoord geeft correct: false', () => {
    const result = Session.submitAnswer('hond');
    assert.equal(result.correct, false);
  });

  it('leeg antwoord is fout', () => {
    const result = Session.submitAnswer('');
    assert.equal(result.correct, false);
  });
});

describe('submitAnswer met meerdere vertalingen', () => {
  beforeEach(() => {
    Session.initSession([makeWord('1', 'ciao', 'hallo, dag')]);
  });

  it('eerste vertaling is correct', () => {
    assert.equal(Session.submitAnswer('hallo').correct, true);
  });

  it('tweede vertaling is correct', () => {
    assert.equal(Session.submitAnswer('dag').correct, true);
  });

  it('niet-bestaande vertaling is fout', () => {
    assert.equal(Session.submitAnswer('goedemorgen').correct, false);
  });
});

describe('submitAnswer met slash-scheiding', () => {
  beforeEach(() => {
    Session.initSession([makeWord('1', 'agua', 'water/H2O')]);
  });

  it('eerste variant correct', () => {
    assert.equal(Session.submitAnswer('water').correct, true);
  });

  it('tweede variant correct', () => {
    assert.equal(Session.submitAnswer('H2O').correct, true);
  });
});

describe('sessie voortgang', () => {
  const words = [
    makeWord('1', 'gato', 'kat'),
    makeWord('2', 'perro', 'hond'),
    makeWord('3', 'casa', 'huis'),
  ];

  beforeEach(() => {
    Session.initSession(words);
  });

  it('isSessionComplete is false bij start', () => {
    assert.equal(Session.isSessionComplete(), false);
  });

  it('getProgress toont 0/3 bij start', () => {
    const p = Session.getProgress();
    assert.equal(p.done, 0);
    assert.equal(p.total, 3);
  });

  it('getCurrentWord geeft een woord terug', () => {
    const word = Session.getCurrentWord();
    assert.ok(word !== null);
    assert.ok(['kat', 'hond', 'huis'].includes(word.translation));
  });

  it('isSessionComplete is true na alle woorden', async () => {
    await Session.confirmResult(true);
    await Session.confirmResult(true);
    await Session.confirmResult(true);
    assert.equal(Session.isSessionComplete(), true);
  });

  it('getProgress klopt na bevestiging', async () => {
    await Session.confirmResult(true);
    const p = Session.getProgress();
    assert.equal(p.done, 1);
    assert.equal(p.total, 3);
  });
});

describe('getSessionSummary', () => {
  beforeEach(() => {
    Session.initSession([
      makeWord('1', 'gato', 'kat'),
      makeWord('2', 'perro', 'hond'),
      makeWord('3', 'casa', 'huis'),
    ]);
  });

  it('telt correct en fout correct', async () => {
    await Session.confirmResult(true);
    await Session.confirmResult(false);
    await Session.confirmResult(true);
    const summary = Session.getSessionSummary();
    assert.equal(summary.correct, 2);
    assert.equal(summary.wrong, 1);
    assert.equal(summary.total, 3);
  });
});

describe('lege sessie', () => {
  it('initSession met lege array: sessie direct compleet', () => {
    Session.initSession([]);
    assert.equal(Session.isSessionComplete(), true);
    assert.equal(Session.getCurrentWord(), null);
  });
});
