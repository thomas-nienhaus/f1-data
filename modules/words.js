import { loadWords, saveWords, generateId } from './store.js';
import { getTodayString, defaultSR } from './scheduler.js';

const DEFAULT_WORDS = [
  { source: 'gato',    translation: 'kat' },
  { source: 'perro',   translation: 'hond' },
  { source: 'casa',    translation: 'huis' },
  { source: 'agua',    translation: 'water' },
  { source: 'libro',   translation: 'boek' },
  { source: 'tiempo',  translation: 'tijd' },
  { source: 'amigo',   translation: 'vriend' },
  { source: 'comer',   translation: 'eten' },
  { source: 'grande',  translation: 'groot' },
  { source: 'ciudad',  translation: 'stad' },
];

export function getWords() {
  return loadWords();
}

export function getWordsByList(listId) {
  return loadWords().filter(w => w.listId === listId);
}

export function getWord(id) {
  return loadWords().find(w => w.id === id);
}

export function addWord(source, translation, listId) {
  const words = loadWords();
  const today = getTodayString();
  const word = {
    id: generateId(),
    listId,
    source: source.trim(),
    translation: translation.trim(),
    createdAt: Date.now(),
    sr: defaultSR(today),
  };
  words.push(word);
  saveWords(words);
  return word;
}

export function addWords(pairs, listId) {
  const existing = loadWords();
  const today = getTodayString();
  const newWords = pairs.map(({ source, translation }) => ({
    id: generateId(),
    listId,
    source: source.trim(),
    translation: translation.trim(),
    createdAt: Date.now(),
    sr: defaultSR(today),
  }));
  saveWords([...existing, ...newWords]);
  return newWords;
}

export function updateWord(id, { source, translation }) {
  const words = loadWords();
  const idx = words.findIndex(w => w.id === id);
  if (idx === -1) return null;
  words[idx] = { ...words[idx], source: source.trim(), translation: translation.trim() };
  saveWords(words);
  return words[idx];
}

export function deleteWord(id) {
  saveWords(loadWords().filter(w => w.id !== id));
}

export function saveWordSR(updatedWord) {
  const words = loadWords();
  const idx = words.findIndex(w => w.id === updatedWord.id);
  if (idx !== -1) {
    words[idx] = updatedWord;
    saveWords(words);
  }
}

export function seedDefaultWords(listId) {
  const today = getTodayString();
  const words = DEFAULT_WORDS.map(({ source, translation }) => ({
    id: generateId(),
    listId,
    source,
    translation,
    createdAt: Date.now(),
    sr: defaultSR(today),
  }));
  const existing = loadWords();
  saveWords([...existing, ...words]);
}
