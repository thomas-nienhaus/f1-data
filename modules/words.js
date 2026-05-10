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

export function getWord(id) {
  return loadWords().find(w => w.id === id);
}

export function addWord(source, translation) {
  const words = loadWords();
  const today = getTodayString();
  const word = {
    id: generateId(),
    source: source.trim(),
    translation: translation.trim(),
    createdAt: Date.now(),
    sr: defaultSR(today),
  };
  words.push(word);
  saveWords(words);
  return word;
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
  const words = loadWords().filter(w => w.id !== id);
  saveWords(words);
}

export function saveWordSR(updatedWord) {
  const words = loadWords();
  const idx = words.findIndex(w => w.id === updatedWord.id);
  if (idx !== -1) {
    words[idx] = updatedWord;
    saveWords(words);
  }
}

export function seedDefaultWords() {
  if (loadWords().length > 0) return;
  const today = getTodayString();
  const words = DEFAULT_WORDS.map(({ source, translation }) => ({
    id: generateId(),
    source,
    translation,
    createdAt: Date.now(),
    sr: defaultSR(today),
  }));
  saveWords(words);
}
