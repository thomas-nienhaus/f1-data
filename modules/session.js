import { applyResult } from './scheduler.js';
import { saveWordSR } from './words.js';

let queue = [];
let currentIndex = 0;
let sessionCorrect = 0;
let sessionWrong = 0;
let lastResult = null;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function initSession(dueWords, dir = 'forward') {
  queue = shuffle(dueWords).map(w => ({
    ...w,
    _dir: dir === 'mixed' ? (Math.random() < 0.5 ? 'forward' : 'reverse') : dir,
  }));
  currentIndex = 0;
  sessionCorrect = 0;
  sessionWrong = 0;
  lastResult = null;
}

export function getCurrentWord() {
  return queue[currentIndex] ?? null;
}

export function getProgress() {
  return { done: currentIndex, total: queue.length };
}

export function isSessionComplete() {
  return currentIndex >= queue.length;
}

export function submitAnswer(typedText) {
  const word = queue[currentIndex];
  const typed = typedText.trim().toLowerCase();
  let correct, expected;

  if (word._dir === 'reverse') {
    correct  = word.source.trim().toLowerCase() === typed;
    expected = word.source;
  } else {
    const variants = word.translation
      .split(/[,\/]/)
      .map(v => v.trim().toLowerCase())
      .filter(Boolean);
    correct  = variants.some(v => v === typed);
    expected = word.translation;
  }

  lastResult = { correct, typed: typedText.trim(), expected };
  return lastResult;
}

export async function confirmResult(userSaysCorrect) {
  const word = queue[currentIndex];
  const updated = applyResult(word, userSaysCorrect);
  queue[currentIndex] = updated;
  await saveWordSR(updated);

  if (userSaysCorrect) {
    sessionCorrect += 1;
  } else {
    sessionWrong += 1;
  }

  currentIndex += 1;
}

export function getSessionSummary() {
  return {
    correct: sessionCorrect,
    wrong: sessionWrong,
    total: queue.length,
  };
}

export function getLastResult() {
  return lastResult;
}
