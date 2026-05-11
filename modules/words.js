import * as db from './db.js';
import { getTodayString, defaultSR } from './scheduler.js';
import { generateId } from './store.js';

const DEFAULT_WORDS = [
  { source: 'gato',   translation: 'kat' },
  { source: 'perro',  translation: 'hond' },
  { source: 'casa',   translation: 'huis' },
  { source: 'agua',   translation: 'water' },
  { source: 'libro',  translation: 'boek' },
  { source: 'tiempo', translation: 'tijd' },
  { source: 'amigo',  translation: 'vriend' },
  { source: 'comer',  translation: 'eten' },
  { source: 'grande', translation: 'groot' },
  { source: 'ciudad', translation: 'stad' },
];

export async function getWords() {
  return db.fetchWords();
}

export async function getWordsByList(listId) {
  const all = await db.fetchWords();
  return all.filter(w => w.listId === listId);
}

export function getWordFromList(words, id) {
  return words.find(w => w.id === id);
}

export async function addWord(source, translation, listId) {
  const today = getTodayString();
  const word = {
    id: generateId(),
    listId,
    source: source.trim(),
    translation: translation.trim(),
    createdAt: Date.now(),
    sr: defaultSR(today),
  };
  const [inserted] = await db.insertWords([word]);
  return inserted;
}

export async function addWords(pairs, listId) {
  const today = getTodayString();
  const words = pairs.map(({ source, translation }) => ({
    id: generateId(),
    listId,
    source: source.trim(),
    translation: translation.trim(),
    createdAt: Date.now(),
    sr: defaultSR(today),
  }));
  return db.insertWords(words);
}

export async function updateWord(id, { source, translation }) {
  await db.updateWordFields(id, { source: source.trim(), translation: translation.trim() });
}

export async function deleteWord(id) {
  await db.removeWord(id);
}

export async function saveWordSR(updatedWord) {
  await db.upsertWordSR(updatedWord);
}

export async function seedDefaultWords(listId) {
  const today = getTodayString();
  const words = DEFAULT_WORDS.map(({ source, translation }) => ({
    id: generateId(),
    listId,
    source,
    translation,
    createdAt: Date.now(),
    sr: defaultSR(today),
  }));
  await db.insertWords(words);
}
