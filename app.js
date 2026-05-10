import * as Words   from './modules/words.js';
import * as Session from './modules/session.js';
import * as Stats   from './modules/stats.js';
import * as UI      from './modules/ui.js';

// ── Bootstrap ────────────────────────────────────────────────
Words.seedDefaultWords();
refreshDashboard();
UI.showView('dashboard');

// ── Event Delegation ─────────────────────────────────────────
document.addEventListener('click', e => {
  const target = e.target.closest('[data-action]');
  if (!target) return;
  handleAction(target.dataset.action, target);
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const input = document.getElementById('session-input');
  if (document.activeElement === input) {
    handleAction('submit-answer', null);
  }
});

// ── Action Handler ───────────────────────────────────────────
function handleAction(action, el) {
  switch (action) {
    case 'go-dashboard':
      refreshDashboard();
      UI.showView('dashboard');
      break;

    case 'start-session':
      startSession();
      break;

    case 'manage-words':
      UI.renderWordList(Words.getWords());
      UI.showView('word-list');
      break;

    case 'add-word':
      handleAddWord();
      break;

    case 'edit-word': {
      const word = Words.getWord(el.dataset.id);
      if (word) UI.showEditRow(word.id, word.source, word.translation);
      break;
    }

    case 'save-word':
      handleSaveWord(el.dataset.id);
      break;

    case 'cancel-edit':
      UI.renderWordList(Words.getWords());
      break;

    case 'delete-word':
      Words.deleteWord(el.dataset.id);
      UI.renderWordList(Words.getWords());
      UI.showToast('Woord verwijderd', 'error');
      break;

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
  const words = Words.getWords();
  const dash  = Stats.computeDashboardStats(words);
  const stats = Stats.getStats();
  UI.renderDashboard(dash, stats);
}

// ── Session ──────────────────────────────────────────────────
function startSession() {
  const due = Words.getWords().filter(w => w.sr.dueDate <= new Date().toISOString().slice(0, 10));

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
  if (!typed) {
    input.focus();
    return;
  }

  document.getElementById('submit-btn').disabled = true;

  const result = Session.submitAnswer(typed);
  const word   = Session.getCurrentWord();

  UI.renderSessionCard(word, result.correct ? 'revealed-correct' : 'revealed-wrong');
  UI.showReveal(result);
}

function handleConfirmResult(userSaysCorrect) {
  Session.confirmResult(userSaysCorrect);

  UI.hideReveal();
  setTimeout(renderCurrentCard, 300);
}

// ── Word List ────────────────────────────────────────────────
function handleAddWord() {
  const form        = document.querySelector('[data-action="add-word"]');
  const source      = form.elements.source.value.trim();
  const translation = form.elements.translation.value.trim();

  if (!source || !translation) return;

  Words.addWord(source, translation);
  form.reset();
  form.elements.source.focus();
  UI.renderWordList(Words.getWords());
  UI.showToast('Woord toegevoegd!', 'success');
}

function handleSaveWord(id) {
  const li          = document.querySelector(`.word-row[data-id="${id}"]`);
  const source      = li.querySelector('[data-edit-source]').value.trim();
  const translation = li.querySelector('[data-edit-translation]').value.trim();

  if (!source || !translation) return;

  Words.updateWord(id, { source, translation });
  UI.renderWordList(Words.getWords());
  UI.showToast('Woord bijgewerkt!', 'success');
}
