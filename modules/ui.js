let toastTimer = null;

export function showView(name) {
  document.querySelectorAll('main > section').forEach(s => {
    s.hidden = s.dataset.view !== name;
  });
  const backBtn = document.getElementById('back-btn');
  backBtn.hidden = name === 'dashboard';
}

// ── Dashboard ────────────────────────────────────────────────

export function renderDashboard(lists, allWords, stats) {
  document.getElementById('stat-total').textContent  = allWords.length;
  document.getElementById('stat-streak').textContent = stats.streak;

  const today = new Date().toISOString().slice(0, 10);
  const totalDue = allWords.filter(w => w.sr.dueDate <= today).length;
  const allDueBtn = document.getElementById('start-all-btn');
  allDueBtn.disabled = totalDue === 0;
  allDueBtn.textContent = totalDue === 0
    ? 'Niets te herhalen vandaag'
    : `Alle lijsten starten (${totalDue})`;

  const container = document.getElementById('list-cards');
  if (lists.length === 0) {
    container.innerHTML = '<p class="empty-state">Nog geen lijsten. Maak je eerste lijst aan!</p>';
    return;
  }

  container.innerHTML = lists.map(list => {
    const listWords = allWords.filter(w => w.listId === list.id);
    const due = listWords.filter(w => w.sr.dueDate <= today).length;
    return `
      <div class="list-card">
        <div class="list-card__info">
          <span class="list-card__name">${escHtml(list.name)}</span>
          <span class="list-card__meta">
            ${escHtml(list.sourceLang || 'Bronwoord')} → ${escHtml(list.targetLang || 'Vertaling')} ·
            ${listWords.length} woorden · <strong>${due} te herhalen</strong>
          </span>
        </div>
        <div class="list-card__actions">
          <button class="btn btn--sm btn--primary" data-action="start-list-session" data-list-id="${list.id}" ${due === 0 ? 'disabled' : ''}>
            Start
          </button>
          <button class="btn btn--sm btn--secondary" data-action="open-list" data-list-id="${list.id}">
            Beheer
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// ── List Detail ──────────────────────────────────────────────

export function renderListDetail(list, words) {
  document.getElementById('list-detail-name').value       = list.name;
  document.getElementById('list-detail-id').value         = list.id;
  document.getElementById('list-source-lang').value       = list.sourceLang || 'Bronwoord';
  document.getElementById('list-target-lang').value       = list.targetLang || 'Vertaling';

  const today  = new Date().toISOString().slice(0, 10);
  const due    = words.filter(w => w.sr.dueDate <= today).length;
  const startBtn = document.getElementById('list-session-btn');
  startBtn.disabled = due === 0;
  startBtn.dataset.listId = list.id;
  startBtn.textContent = due === 0 ? 'Niets te herhalen' : `Sessie starten (${due})`;

  renderWordListItems(words);
  clearBulkPreview();
}

export function renderWordListItems(words) {
  const list  = document.getElementById('list-word-items');
  const empty = document.getElementById('list-word-empty');

  if (words.length === 0) {
    list.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  list.innerHTML = words.map(w => {
    const chips = translationChips(w.translation);
    return `
      <li class="word-row" data-id="${w.id}">
        <span class="word-source">${escHtml(w.source)}</span>
        <span class="word-arrow">→</span>
        <span class="word-translation">${chips}</span>
        <span class="word-sr-info">interval: ${w.sr.interval}d</span>
        <div class="word-actions">
          <button class="btn btn--sm btn--secondary" data-action="edit-word" data-id="${w.id}">Bewerk</button>
          <button class="btn btn--sm btn--danger"    data-action="delete-word" data-id="${w.id}">Verwijder</button>
        </div>
      </li>
    `;
  }).join('');
}

export function showEditRow(id, source, translation) {
  const li = document.querySelector(`.word-row[data-id="${id}"]`);
  if (!li) return;
  li.classList.add('word-row--editing');
  li.innerHTML = `
    <div class="edit-form">
      <input class="input" data-edit-source value="${escHtml(source)}" placeholder="Bronwoord">
      <span class="word-arrow">→</span>
      <input class="input" data-edit-translation value="${escHtml(translation)}" placeholder="vertaling, vertaling2">
      <button class="btn btn--sm btn--primary"   data-action="save-word"    data-id="${id}">Opslaan</button>
      <button class="btn btn--sm btn--secondary" data-action="cancel-edit"  data-id="${id}">Annuleer</button>
    </div>
  `;
  li.querySelector('[data-edit-source]').focus();
}

// ── Bulk Add ─────────────────────────────────────────────────

export function showBulkPreview(pairs, errorLines) {
  const preview = document.getElementById('bulk-preview');
  preview.hidden = false;

  const cap   = 5;
  const shown = pairs.slice(0, cap);
  const more  = pairs.length - cap;

  let html = `<p class="bulk-preview__count">${pairs.length} woord${pairs.length !== 1 ? 'en' : ''} herkend</p>`;

  if (shown.length > 0) {
    html += '<table class="bulk-table"><thead><tr><th>Bronwoord</th><th></th><th>Vertaling</th></tr></thead><tbody>';
    html += shown.map(p =>
      `<tr><td>${escHtml(p.source)}</td><td>→</td><td>${translationChips(p.translation)}</td></tr>`
    ).join('');
    if (more > 0) {
      html += `<tr><td colspan="3" class="bulk-table__more">... en ${more} meer</td></tr>`;
    }
    html += '</tbody></table>';
  }

  if (errorLines.length > 0) {
    html += `<p class="bulk-preview__errors">${errorLines.length} regel${errorLines.length !== 1 ? 's' : ''} overgeslagen (geen geldig formaat)</p>`;
  }

  const confirmBtn = document.getElementById('bulk-confirm-btn');
  confirmBtn.disabled = pairs.length === 0;

  preview.innerHTML = html;
  preview.appendChild(confirmBtn);
}

export function clearBulkPreview() {
  const preview = document.getElementById('bulk-preview');
  preview.hidden = true;
  preview.innerHTML = '';
  const textarea = document.getElementById('bulk-textarea');
  if (textarea) textarea.value = '';
}

// ── Session ──────────────────────────────────────────────────

export function renderSessionCard(word, state, list) {
  document.getElementById('session-word').textContent = word.source;

  const sourceLangEl = document.getElementById('card-source-lang');
  const targetLangEl = document.getElementById('card-target-lang');
  if (list) {
    sourceLangEl.textContent = list.sourceLang || 'Bronwoord';
    targetLangEl.textContent = list.targetLang || 'Vertaling';
  } else {
    sourceLangEl.textContent = '';
    targetLangEl.textContent = '';
  }

  const flashcard  = document.getElementById('flashcard');
  const resultIcon  = document.getElementById('result-icon');
  const resultLabel = document.getElementById('result-label');

  if (state === 'question') {
    flashcard.classList.remove('is-flipped', 'result-correct', 'result-wrong');
    return;
  }

  const correct = state === 'revealed-correct';
  resultIcon.textContent  = correct ? '✓' : '✗';
  resultLabel.textContent = correct ? 'Goed!' : 'Niet goed';
}

export function showReveal(result) {
  document.getElementById('result-user-answer').textContent    = result.typed;
  document.getElementById('result-correct-answer').textContent = result.expected;

  // Highlight the suggested button based on auto-detected result
  const correctBtn = document.getElementById('btn-confirm-correct');
  const wrongBtn   = document.getElementById('btn-confirm-wrong');
  if (result.correct) {
    correctBtn.classList.remove('btn--override');
    wrongBtn.classList.add('btn--override');
  } else {
    wrongBtn.classList.remove('btn--override');
    correctBtn.classList.add('btn--override');
  }

  const flashcard = document.getElementById('flashcard');
  flashcard.classList.add('is-flipped');
  flashcard.classList.add(result.correct ? 'result-correct' : 'result-wrong');
}

export function hideReveal() {
  const flashcard = document.getElementById('flashcard');
  flashcard.classList.remove('is-flipped', 'result-correct', 'result-wrong');
  // Reset button styles for next card
  document.getElementById('btn-confirm-correct').classList.remove('btn--override');
  document.getElementById('btn-confirm-wrong').classList.remove('btn--override');
}

export function renderProgress(done, total) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  document.getElementById('progress-bar').style.width = pct + '%';
  document.getElementById('progress-text').textContent = `${done} / ${total}`;
}

export function renderSessionComplete(summary) {
  document.getElementById('session-summary').innerHTML = `
    <div class="summary-item">
      <span class="summary-value summary-value--correct">${summary.correct}</span>
      <span class="summary-label">Goed</span>
    </div>
    <div class="summary-item">
      <span class="summary-value summary-value--wrong">${summary.wrong}</span>
      <span class="summary-label">Fout</span>
    </div>
    <div class="summary-item">
      <span class="summary-value">${summary.total}</span>
      <span class="summary-label">Totaal</span>
    </div>
  `;
}

// ── Toast ────────────────────────────────────────────────────

export function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast toast--visible' + (type ? ` toast--${type}` : '');
  toast.hidden = false;

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => { toast.hidden = true; }, 300);
  }, 2500);
}

// ── Helpers ──────────────────────────────────────────────────

function translationChips(translation) {
  const variants = translation.split(/[,\/]/).map(v => v.trim()).filter(Boolean);
  if (variants.length <= 1) return escHtml(translation);
  return variants.map(v => `<span class="translation-chip">${escHtml(v)}</span>`).join('');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
