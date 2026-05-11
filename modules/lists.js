import * as db from './db.js';
import { generateId } from './store.js';

export async function getLists() {
  return db.fetchLists();
}

export async function getList(lists, id) {
  return lists.find(l => l.id === id) ?? null;
}

export async function createList(name, sourceLang = 'Bronwoord', targetLang = 'Vertaling') {
  const list = {
    id:         generateId(),
    name:       name.trim(),
    sourceLang: sourceLang || 'Bronwoord',
    targetLang: targetLang || 'Vertaling',
    createdAt:  Date.now(),
  };
  return db.insertList(list);
}

export async function renameList(id, name) {
  await db.updateList(id, { name: name.trim() });
}

export async function updateListLangs(id, sourceLang, targetLang) {
  await db.updateList(id, {
    sourceLang: sourceLang.trim() || 'Bronwoord',
    targetLang: targetLang.trim() || 'Vertaling',
  });
}

export async function deleteList(id) {
  await db.removeList(id);
}
