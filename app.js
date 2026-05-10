import * as Lists   from './modules/lists.js';
import * as Words   from './modules/words.js';
import * as Session from './modules/session.js';
import * as Stats   from './modules/stats.js';
import * as UI      from './modules/ui.js';

// ── Bootstrap ────────────────────────────────────────────────
Lists.migrateOrphanWords();

// First-ever run: no lists yet → create "Standaard" and seed words
if (Lists.getLists().length === 0) {
  const defaultList = Lists.createList('Standaard');
  Words.seedDefaultWords(defaultList.id);
}

refreshDashboard();
UI.showView('dashboard');

// Active list for list-detail view
let activeListId = null;
// Pending bulk pairs waiting for confirmation
let pendingBulkPairs = [];

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
    if (document.activeElement === document.getElementById('new-list-name')) {
      handleAction('confirm-new-list', null);
    }
  }
  if (e.key === 'Escape') {
    handleAction('cancel-new-list', null);
  }
});

document.getElementById('csv-file-input').addEventListener('change', e => {
  const file = e.target.files[0];
  document.getElementById('csv-file-name').textContent = file ? file.name : 'Geen bestand gekozen';
});

// ── Action Handler ───────────────────────────────────────────
function handleAction(action, el) {
  switch (action) {
    case 'go-dashboard':
      refreshDashboard();
      UI.showView('dashboard');
      break;

    // ── Lists ──────────────────────────────────────────────
    case 'new-list':
      openNewListModal();
      break;

    case 'confirm-new-list': {
      const name = document.getElementById('new-list-name').value.trim();
      if (!name) return;
      Lists.createList(name);
      closeNewListModal();
      refreshDashboard();
      UI.showToast('Lijst aangemaakt!', 'success');
      break;
    }

    case 'cancel-new-list':
      closeNewListModal();
      break;

    case 'open-list': {
      const listId = el.dataset.listId;
      openListDetail(listId);
      break;
    }

    case 'save-list-name': {
      const id   = document.getElementById('list-detail-id').value;
      const name = document.getElementById('list-detail-name').value.trim();
      if (!name) return;
      Lists.renameList(id, name);
      UI.showToast('Naam opgeslagen', 'success');
      break;
    }

    case 'delete-list': {
      const id = document.getElementById('list-detail-id').value;
      if (!confirm('Weet je zeker dat je deze lijst wilt verwijderen? Alle woorden worden ook verwijderd.')) return;
      Lists.deleteList(id);
      refreshDashboard();
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
      handleParseCSV();
      break;

    case 'confirm-bulk': {
      if (pendingBulkPairs.length === 0) return;
      Words.addWords(pendingBulkPairs, activeListId);
      const count = pendingBulkPairs.length;
      pendingBulkPairs = [];
      UI.clearBulkPreview();
      document.getElementById('bulk-confirm-btn').hidden = true;
      openListDetail(activeListId);
      UI.showToast(`${count} woord${count !== 1 ? 'en' : ''} toegevoegd!`, 'success');
      break;
    }

    // ── Words ──────────────────────────────────────────────
    case 'edit-word': {
      const word = Words.getWord(el.dataset.id);
      if (word) UI.showEditRow(word.id, word.source, word.translation);
      break;
    }

    case 'save-word': {
      const li          = document.querySelector(`.word-row[data-id="${el.dataset.id}"]`);
      const source      = li.querySelector('[data-edit-source]').value.trim();
      const translation = li.querySelector('[data-edit-translation]').value.trim();
      if (!source || !translation) return;
      Words.updateWord(el.dataset.id, { source, translation });
      UI.renderWordListItems(Words.getWordsByList(activeListId));
      UI.showToast('Woord bijgewerkt!', 'success');
      break;
    }

    case 'cancel-edit':
      UI.renderWordListItems(Words.getWordsByList(activeListId));
      break;

    case 'delete-word':
      Words.deleteWord(el.dataset.id);
      UI.renderWordListItems(Words.getWordsByList(activeListId));
      UI.showToast('Woord verwijderd', 'error');
      break;

    // ── Sessions ───────────────────────────────────────────
    case 'start-list-session': {
      const listId = el.dataset.listId || document.getElementById('list-detail-id').value;
      startSession(Words.getWordsByList(listId));
      break;
    }

    case 'start-all-session':
      startSession(Words.getWords());
      break;

    // ── Session actions ────────────────────────────────────
    case 'submit-answer':
      handleSubmitAnswer();
      break;

    case 'confirm-correct':
      handleConfirmResult(true);
      break;

    case 'confirm-wrong':
      handleConfirmResult(false);
      break;
  }
}

// ── Dashboard ────────────────────────────────────────────────
function refreshDashboard() {
  UI.renderDashboard(Lists.getLists(), Words.getWords(), Stats.getStats());
}

// ── List Detail ──────────────────────────────────────────────
function openListDetail(listId) {
  activeListId = listId;
  const list  = Lists.getList(listId);
  const words = Words.getWordsByList(listId);
  UI.renderListDetail(list, words);
  UI.showView('list-detail');
}

// ── New List Modal ───────────────────────────────────────────
function openNewListModal() {
  const modal = document.getElementById('new-list-modal');
  const input = document.getElementById('new-list-name');
  modal.hidden = false;
  input.value = '';
  input.focus();
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

  UI.renderProgress(progress.done, progress.total);
  UI.renderSessionCard(word, 'question');

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
  UI.renderSessionCard(Session.getCurrentWord(), result.correct ? 'revealed-correct' : 'revealed-wrong');
  UI.showReveal(result);
}

function handleConfirmResult(userSaysCorrect) {
  Session.confirmResult(userSaysCorrect);
  UI.hideReveal();
  setTimeout(renderCurrentCard, 300);
}

// ── Parsing ──────────────────────────────────────────────────
function parseTextInput(text) {
  const pairs      = [];
  const errorLines = [];

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;

    const pair = parsePair(line);
    if (pair) {
      pairs.push(pair);
    } else {
      errorLines.push(line);
    }
  }
  return { pairs, errorLines };
}

function parsePair(line) {
  // Try tab separator first, then = and -
  const separators = ['\t', '=', ' - '];
  for (const sep of separators) {
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
  const pairs      = [];
  const errorLines = [];
  const lines      = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const sep = line.includes(';') ? ';' : ',';
    const parts = line.split(sep).map(p => p.trim().replace(/^"|"$/g, ''));

    if (parts.length >= 2 && parts[0] && parts[1]) {
      // Skip likely header row (first line, both values look like labels)
      if (i === 0 && /^[a-zA-Z\s]+$/.test(parts[0]) && /^[a-zA-Z\s]+$/.test(parts[1]) && pairs.length === 0) {
        continue;
      }
      pairs.push({ source: parts[0], translation: parts[1] });
    } else {
      errorLines.push(line);
    }
  }
  return { pairs, errorLines };
}

async function handleParseCSV() {
  const fileInput = document.getElementById('csv-file-input');
  const file = fileInput.files[0];
  if (!file) {
    UI.showToast('Kies eerst een CSV-bestand', '');
    return;
  }

  const text = await file.text();
  const { pairs, errorLines } = parseCSVText(text);

  const MAX = 500;
  const capped = pairs.slice(0, MAX);
  if (pairs.length > MAX) {
    UI.showToast(`Maximaal ${MAX} woorden per import. Eerste ${MAX} worden gebruikt.`, '');
  }

  pendingBulkPairs = capped;
  UI.showBulkPreview(capped, errorLines);
  document.getElementById('bulk-confirm-btn').hidden = capped.length === 0;
}
