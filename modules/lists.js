import { loadLists, saveLists, loadWords, saveWords, generateId } from './store.js';

export function getLists() {
  return loadLists();
}

export function getList(id) {
  return loadLists().find(l => l.id === id);
}

export function createList(name) {
  const lists = loadLists();
  const list = { id: generateId(), name: name.trim(), createdAt: Date.now() };
  lists.push(list);
  saveLists(lists);
  return list;
}

export function renameList(id, name) {
  const lists = loadLists();
  const idx = lists.findIndex(l => l.id === id);
  if (idx === -1) return;
  lists[idx] = { ...lists[idx], name: name.trim() };
  saveLists(lists);
}

export function deleteList(id) {
  saveLists(loadLists().filter(l => l.id !== id));
  saveWords(loadWords().filter(w => w.listId !== id));
}

// Assigns words without a listId to a new "Standaard" list.
// Called once on app start for backward compatibility.
export function migrateOrphanWords() {
  const words = loadWords();
  const orphans = words.filter(w => !w.listId);
  if (orphans.length === 0) return;

  let list = loadLists().find(l => l.name === 'Standaard');
  if (!list) {
    list = createList('Standaard');
  }

  const updated = words.map(w => w.listId ? w : { ...w, listId: list.id });
  saveWords(updated);
}
