import * as db      from './modules/db.js';
import * as Lists   from './modules/lists.js';
import * as Words   from './modules/words.js';
import * as Session from './modules/session.js';
import * as Stats   from './modules/stats.js';
import * as UI      from './modules/ui.js';

// ── Bootstrap ────────────────────────────────────────────────
let allLists = [];
let allWords = [];
let activeListId  = null;
let sessionListId = null;
let pendingBulkPairs = [];

async function bootstrap() {
  UI.showLoading(true);
  try {
    const user = await db.ensureAuth();
    updateSyncStatus(user);

    allLists = await Lists.getLists();
    allWords = await Words.getWords();

    // Eerste keer: geen lijsten → seed standaardlijst
    if (allLists.length === 0) {
      const defaultList = await Lists.createList('Standaard', 'Spaans', 'Nederlands');
      await Words.seedDefaultWords(defaultList.id);
      allLists = await Lists.getLists();
      allWords = await Words.getWords();
    }

    // Migreer eventuele oude localStorage-data
    await offerLocalStorageMigration();

    UI.renderDashboard(allLists, allWords, await Stats.getStats());
    UI.showView('dashboard');
  } catch (e) {
    console.error('Bootstrap mislukt:', e);
    UI.showToast('Verbindingsprobleem. Probeer de pagina te herladen.', 'error');
  } finally {
    UI.showLoading(false);
  }
}

bootstrap();

// ── Auth state listener ───────────────────────────────────────
db.onAuthStateChange(user => {
  updateSyncStatus(user);
});

function updateSyncStatus(user) {
  const statusEl = document.getElementById('sync-status');
  const linkBtn  = document.getElementById('link-email-btn');
  const signinBtn = document.getElementById('signin-email-btn');
  if (!statusEl) return;

  const isAnon = !user?.email;
  statusEl.textContent = isAnon
    ? 'Alleen op dit apparaat'
    : `Gesynchroniseerd als ${user.email}`;
  statusEl.className = 'sync-status ' + (isAnon ? 'sync-status--anon' : 'sync-status--linked');

  linkBtn.hidden   = !isAnon;
  signinBtn.hidden = !isAnon;
}

// ── Migratie van localStorage ────────────────────────────────
async function offerLocalStorageMigration() {
  try {
    const localWords = JSON.parse(localStorage.getItem('wordlearn_words') || '[]');
    const localLists = JSON.parse(localStorage.getItem('wordlearn_lists') || '[]');
    if (localWords.length === 0 && localLists.length === 0) return;

    // Sla migratie over als al eerder gedaan
    if (localStorage.getItem('wordlearn_migrated')) return;

    const doIt = confirm(
      `Je hebt ${localLists.length} lijst(en) en ${localWords.length} woord(en) lokaal opgeslagen.\n\nWil je deze uploaden naar de cloud zodat ze ook op andere apparaten beschikbaar zijn?`
    );
    if (!doIt) {
      localStorage.setItem('wordlearn_migrated', '1');
      return;
    }

    // Maak een "import" lijst aan als er geen lijsten zijn
    let listIdMap = {};
    for (const l of localLists) {
      const created = await Lists.createList(
        l.name,
        l.sourceLang || 'Bronwoord',
        l.targetLang || 'Vertaling'
      );
      listIdMap[l.id] = created.id;
    }

    // Als er woorden zijn zonder bijbehorende lijst, maak een standaard lijst
    const orphanWords = localWords.filter(w => !listIdMap[w.listId]);
    if (orphanWords.length > 0) {
      const fallback = await Lists.createList('Geïmporteerd');
      orphanWords.forEach(w => { listIdMap[w.listId ?? '__orphan__'] = fallback.id; });
    }

    const wordsToInsert = localWords.map(w => ({
      ...w,
      listId: listIdMap[w.listId] ?? listIdMap['__orphan__'],
    }));
    if (wordsToInsert.length > 0) {
      await Words.addWords(
        wordsToInsert.map(w => ({ source: w.source, translation: w.translation })),
        wordsToInsert[0].listId
      );
    }

    localStorage.setItem('wordlearn_migrated', '1');
    UI.showToast('Data succesvol geüpload naar de cloud!', 'success');

    // Herlaad data
    allLists = await Lists.getLists();
    allWords = await Words.getWords();
  } catch (e) {
    console.error('Migratie mislukt:', e);
  }
}

// ── Event Delegation ─────────────────────────────────────────
document.addEventListener('click', e => {
  const target = e.target.closest('[data-action]');
  if (!target) return;
  handleAction(target.dataset.action, target);
});

document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    if (document.activeElement === document.getElementById('session-input')) {
      handleAction('submit-answer', null);
    }
    if (['new-list-name', 'new-list-source-lang', 'new-list-target-lang']
        .includes(document.activeElement.id)) {
      handleAction('confirm-new-list', null);
    }
  }
  if (e.key === 'Enter' && ['auth-email', 'auth-password'].includes(document.activeElement.id)) {
    handleAction('confirm-auth', null);
  }
  if (e.key === 'Escape') {
    handleAction('cancel-new-list', null);
    handleAction('cancel-auth', null);
  }
});

document.getElementById('csv-file-input').addEventListener('change', e => {
  const file = e.target.files[0];
  document.getElementById('csv-file-name').textContent = file ? file.name : 'Geen bestand gekozen';
});

// ── Action Handler ───────────────────────────────────────────
async function handleAction(action, el) {
  switch (action) {

    case 'go-dashboard':
      await refreshDashboard();
      UI.showView('dashboard');
      break;

    // ── Auth ───────────────────────────────────────────────
    case 'link-email':
      openAuthModal('link');
      break;

    case 'signin-email':
      openAuthModal('signin');
      break;

    case 'confirm-auth':
      await handleConfirmAuth();
      break;

    case 'cancel-auth':
      closeAuthModal();
      break;

    // ── Lists ──────────────────────────────────────────────
    case 'new-list':
      openNewListModal();
      break;

    case 'confirm-new-list': {
      const name = document.getElementById('new-list-name').value.trim();
      if (!name) break;
      const sourceLang = document.getElementById('new-list-source-lang').value.trim();
      const targetLang = document.getElementById('new-list-target-lang').value.trim();
      await Lists.createList(name, sourceLang || 'Bronwoord', targetLang || 'Vertaling');
      closeNewListModal();
      await refreshDashboard();
      UI.showToast('Lijst aangemaakt!', 'success');
      break;
    }

    case 'cancel-new-list':
      closeNewListModal();
      break;

    case 'open-list':
      await openListDetail(el.dataset.listId);
      break;

    case 'save-list-name': {
      const id   = document.getElementById('list-detail-id').value;
      const name = document.getElementById('list-detail-name').value.trim();
      if (!name) break;
      await Lists.renameList(id, name);
      UI.showToast('Naam opgeslagen', 'success');
      break;
    }

    case 'save-list-langs': {
      const id         = document.getElementById('list-detail-id').value;
      const sourceLang = document.getElementById('list-source-lang').value.trim();
      const targetLang = document.getElementById('list-target-lang').value.trim();
      await Lists.updateListLangs(id, sourceLang, targetLang);
      allLists = await Lists.getLists();
      UI.showToast('Taalinstellingen opgeslagen', 'success');
      break;
    }

    case 'delete-list': {
      const id = document.getElementById('list-detail-id').value;
      if (!confirm('Weet je zeker dat je deze lijst wilt verwijderen? Alle woorden worden ook verwijderd.')) break;
      await Lists.deleteList(id);
      await refreshDashboard();
      UI.showView('dashboard');
      UI.showToast('Lijst verwijderd', 'error');
      break;
    }

    // ── Bulk Add ───────────────────────────────────────────
    case 'bulk-tab': {
      const tab = el.dataset.tab;
      document.querySelectorAll('.bulk-tab').forEach(b => b.classList.remove('bulk-tab--active'));
      el.classList.add('bulk-tab--active');
      document.getElementById('bulk-tab-text').hidden = tab !== 'text';
      document.getElementById('bulk-tab-csv').hidden  = tab !== 'csv';
      UI.clearBulkPreview();
      document.getElementById('bulk-confirm-btn').hidden = true;
      break;
    }

    case 'parse-bulk': {
      const text = document.getElementById('bulk-textarea').value;
      const { pairs, errorLines } = parseTextInput(text);
      pendingBulkPairs = pairs;
      UI.showBulkPreview(pairs, errorLines);
      document.getElementById('bulk-confirm-btn').hidden = pairs.length === 0;
      break;
    }

    case 'parse-csv':
      await handleParseCSV();
      break;

    case 'confirm-bulk': {
      if (pendingBulkPairs.length === 0) break;
      await Words.addWords(pendingBulkPairs, activeListId);
      const count = pendingBulkPairs.length;
      pendingBulkPairs = [];
      UI.clearBulkPreview();
      document.getElementById('bulk-confirm-btn').hidden = true;
      await openListDetail(activeListId);
      UI.showToast(`${count} woord${count !== 1 ? 'en' : ''} toegevoegd!`, 'success');
      break;
    }

    // ── Words ──────────────────────────────────────────────
    case 'edit-word': {
      const listWords = await Words.getWordsByList(activeListId);
      const word = Words.getWordFromList(listWords, el.dataset.id);
      if (word) UI.showEditRow(word.id, word.source, word.translation);
      break;
    }

    case 'save-word': {
      const li          = document.querySelector(`.word-row[data-id="${el.dataset.id}"]`);
      const source      = li.querySelector('[data-edit-source]').value.trim();
      const translation = li.querySelector('[data-edit-translation]').value.trim();
      if (!source || !translation) break;
      await Words.updateWord(el.dataset.id, { source, translation });
      const updated = await Words.getWordsByList(activeListId);
      UI.renderWordListItems(updated);
      UI.showToast('Woord bijgewerkt!', 'success');
      break;
    }

    case 'cancel-edit': {
      const listWords = await Words.getWordsByList(activeListId);
      UI.renderWordListItems(listWords);
      break;
    }

    case 'delete-word': {
      await Words.deleteWord(el.dataset.id);
      const remaining = await Words.getWordsByList(activeListId);
      UI.renderWordListItems(remaining);
      UI.showToast('Woord verwijderd', 'error');
      break;
    }

    // ── Sessions ───────────────────────────────────────────
    case 'start-list-session': {
      const listId = el.dataset.listId || document.getElementById('list-detail-id').value;
      sessionListId = listId;
      const words = await Words.getWordsByList(listId);
      startSession(words);
      break;
    }

    case 'start-all-session': {
      sessionListId = null;
      startSession(allWords);
      break;
    }

    case 'submit-answer':
      handleSubmitAnswer();
      break;

    case 'confirm-correct':
      await handleConfirmResult(true);
      break;

    case 'confirm-wrong':
      await handleConfirmResult(false);
      break;
  }
}

// ── Dashboard ────────────────────────────────────────────────
async function refreshDashboard() {
  allLists = await Lists.getLists();
  allWords = await Words.getWords();
  UI.renderDashboard(allLists, allWords, await Stats.getStats());
}

// ── List Detail ──────────────────────────────────────────────
async function openListDetail(listId) {
  activeListId = listId;
  const list      = Lists.getList(allLists, listId);
  const listWords = await Words.getWordsByList(listId);
  UI.renderListDetail(list, listWords);
  UI.showView('list-detail');
}

// ── New List Modal ───────────────────────────────────────────
function openNewListModal() {
  const modal = document.getElementById('new-list-modal');
  modal.hidden = false;
  document.getElementById('new-list-name').value        = '';
  document.getElementById('new-list-source-lang').value = '';
  document.getElementById('new-list-target-lang').value = '';
  document.getElementById('new-list-name').focus();
}

function closeNewListModal() {
  document.getElementById('new-list-modal').hidden = true;
}

// ── Session ──────────────────────────────────────────────────
function startSession(wordPool) {
  const today = new Date().toISOString().slice(0, 10);
  const due   = wordPool.filter(w => w.sr.dueDate <= today);

  if (due.length === 0) {
    UI.showToast('Geen woorden te herhalen vandaag!', '');
    return;
  }

  Session.initSession(due);
  UI.showView('session');
  renderCurrentCard();
}

function renderCurrentCard() {
  if (Session.isSessionComplete()) {
    const summary = Session.getSessionSummary();
    Stats.updateStreakAfterSession();
    Stats.recordSessionResults(summary.correct, summary.wrong);
    UI.renderSessionComplete(summary);
    UI.showView('session-complete');
    return;
  }

  const word     = Session.getCurrentWord();
  const progress = Session.getProgress();
  const list     = sessionListId ? Lists.getList(allLists, sessionListId) : null;

  UI.renderProgress(progress.done, progress.total);
  UI.renderSessionCard(word, 'question', list);

  const input = document.getElementById('session-input');
  input.value = '';
  input.focus();
  document.getElementById('submit-btn').disabled = false;
}

function handleSubmitAnswer() {
  const input = document.getElementById('session-input');
  const typed = input.value.trim();
  if (!typed) { input.focus(); return; }

  document.getElementById('submit-btn').disabled = true;

  const result = Session.submitAnswer(typed);
  const word   = Session.getCurrentWord();
  const list   = sessionListId ? Lists.getList(allLists, sessionListId) : null;

  UI.renderSessionCard(word, result.correct ? 'revealed-correct' : 'revealed-wrong', list);
  UI.showReveal(result);
}

async function handleConfirmResult(userSaysCorrect) {
  await Session.confirmResult(userSaysCorrect);
  UI.hideReveal();
  setTimeout(renderCurrentCard, 300);
}

// ── Auth Modal ───────────────────────────────────────────────
let authModalMode = null; // 'link' | 'signin'

function openAuthModal(mode) {
  authModalMode = mode;
  const modal = document.getElementById('auth-modal');
  document.getElementById('auth-modal-title').textContent =
    mode === 'link' ? 'Account koppelen' : 'Inloggen';
  document.getElementById('auth-email').value    = '';
  document.getElementById('auth-password').value = '';
  document.getElementById('auth-error').hidden   = true;
  modal.hidden = false;
  document.getElementById('auth-email').focus();
}

function closeAuthModal() {
  document.getElementById('auth-modal').hidden = true;
  authModalMode = null;
}

async function handleConfirmAuth() {
  const email    = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const errorEl  = document.getElementById('auth-error');

  if (!email || !password) {
    errorEl.textContent = 'Vul e-mailadres en wachtwoord in.';
    errorEl.hidden = false;
    return;
  }

  const btn = document.getElementById('auth-confirm-btn');
  btn.disabled = true;

  try {
    if (authModalMode === 'link') {
      await db.linkEmail(email, password);
      closeAuthModal();
      UI.showToast('Account aangemaakt!', 'success');
      updateSyncStatus(await db.getCurrentUser());
    } else {
      await db.signInWithEmail(email, password);
      closeAuthModal();
      UI.showToast('Ingelogd!', 'success');
      updateSyncStatus(await db.getCurrentUser());
      await refreshDashboard();
    }
  } catch (e) {
    errorEl.textContent = e.message;
    errorEl.hidden = false;
  } finally {
    btn.disabled = false;
  }
}

// ── Parsing ──────────────────────────────────────────────────
function parseTextInput(text) {
  const pairs = [], errorLines = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const pair = parsePair(line);
    pair ? pairs.push(pair) : errorLines.push(line);
  }
  return { pairs, errorLines };
}

function parsePair(line) {
  for (const sep of ['\t', '=', ' - ']) {
    const idx = line.indexOf(sep);
    if (idx > 0) {
      const source      = line.slice(0, idx).trim();
      const translation = line.slice(idx + sep.length).trim();
      if (source && translation) return { source, translation };
    }
  }
  return null;
}

function parseCSVText(text) {
  const pairs = [], errorLines = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const sep   = line.includes(';') ? ';' : ',';
    const parts = line.split(sep).map(p => p.trim().replace(/^"|"$/g, ''));
    if (parts.length >= 2 && parts[0] && parts[1]) {
      if (i === 0 && /^[a-zA-Z\s]+$/.test(parts[0]) && /^[a-zA-Z\s]+$/.test(parts[1]) && pairs.length === 0) continue;
      pairs.push({ source: parts[0], translation: parts[1] });
    } else {
      errorLines.push(line);
    }
  }
  return { pairs, errorLines };
}

async function handleParseCSV() {
  const file = document.getElementById('csv-file-input').files[0];
  if (!file) { UI.showToast('Kies eerst een CSV-bestand', ''); return; }
  const text = await file.text();
  const { pairs, errorLines } = parseCSVText(text);
  const MAX    = 500;
  const capped = pairs.slice(0, MAX);
  if (pairs.length > MAX) UI.showToast(`Maximaal ${MAX} woorden. Eerste ${MAX} gebruikt.`, '');
  pendingBulkPairs = capped;
  UI.showBulkPreview(capped, errorLines);
  document.getElementById('bulk-confirm-btn').hidden = capped.length === 0;
}
