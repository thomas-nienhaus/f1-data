let toastTimer = null;

export function showView(name) {
  document.querySelectorAll('main > section').forEach(s => {
    s.hidden = s.dataset.view !== name;
  });

  const backBtn = document.getElementById('back-btn');
  backBtn.hidden = name === 'dashboard';
}

export function renderDashboard(dashStats, stats) {
  document.getElementById('stat-total').textContent   = dashStats.total;
  document.getElementById('stat-due').textContent     = dashStats.dueToday;
  document.getElementById('stat-learned').textContent = dashStats.learned;
  document.getElementById('stat-streak').textContent  = stats.streak;

  const startBtn = document.getElementById('start-session-btn');
  startBtn.disabled = dashStats.dueToday === 0;
  startBtn.textContent = dashStats.dueToday === 0
    ? 'Niets te herhalen vandaag'
    : `Sessie starten (${dashStats.dueToday})`;
}

export function renderWordList(words) {
  const list = document.getElementById('word-list-items');
  const empty = document.getElementById('word-list-empty');

  if (words.length === 0) {
    list.innerHTML = '';
    empty.hidden = false;
    return;
  }

  empty.hidden = true;
  list.innerHTML = words.map(w => `
    <li class="word-row" data-id="${w.id}">
      <span class="word-source">${escHtml(w.source)}</span>
      <span class="word-arrow">→</span>
      <span class="word-translation">${escHtml(w.translation)}</span>
      <span class="word-sr-info">interval: ${w.sr.interval}d</span>
      <div class="word-actions">
        <button class="btn btn--sm btn--secondary" data-action="edit-word" data-id="${w.id}">Bewerk</button>
        <button class="btn btn--sm btn--danger" data-action="delete-word" data-id="${w.id}">Verwijder</button>
      </div>
    </li>
  `).join('');
}

export function showEditRow(id, source, translation) {
  const li = document.querySelector(`.word-row[data-id="${id}"]`);
  if (!li) return;
  li.classList.add('word-row--editing');
  li.innerHTML = `
    <div class="edit-form">
      <input class="input" data-edit-source value="${escHtml(source)}" placeholder="Spaans woord">
      <span class="word-arrow">→</span>
      <input class="input" data-edit-translation value="${escHtml(translation)}" placeholder="Nederlandse vertaling">
      <button class="btn btn--sm btn--primary" data-action="save-word" data-id="${id}">Opslaan</button>
      <button class="btn btn--sm btn--secondary" data-action="cancel-edit" data-id="${id}">Annuleer</button>
    </div>
  `;
  li.querySelector('[data-edit-source]').focus();
}

export function renderSessionCard(word, state) {
  document.getElementById('session-word').textContent = word.source;

  const flashcard = document.getElementById('flashcard');
  const resultIcon = document.getElementById('result-icon');
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

  const flashcard = document.getElementById('flashcard');
  flashcard.classList.add('is-flipped');
  flashcard.classList.add(result.correct ? 'result-correct' : 'result-wrong');
}

export function hideReveal() {
  const flashcard = document.getElementById('flashcard');
  flashcard.classList.remove('is-flipped', 'result-correct', 'result-wrong');
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

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
