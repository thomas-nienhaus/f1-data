const PLOTLY_LAYOUT = {
  paper_bgcolor: '#0f0f0f',
  plot_bgcolor: '#0f0f0f',
  font: { color: '#f0f0f0', family: 'Segoe UI, system-ui, sans-serif', size: 12 },
  xaxis: { gridcolor: '#2a2a2a', zerolinecolor: '#2a2a2a' },
  yaxis: { gridcolor: '#2a2a2a', zerolinecolor: '#2a2a2a' },
  legend: { bgcolor: '#1a1a1a', bordercolor: '#2a2a2a', borderwidth: 1 },
  margin: { t: 40, r: 20, b: 60, l: 60 },
};

const DRIVER_COLORS = [
  '#e8002d','#ff6b35','#ffd700','#00d2be','#0067ff',
  '#ff8700','#dc0000','#005aff','#ffffff','#900000',
  '#2d826d','#b6babd','#358c75','#1e41ff','#f596c8',
  '#c92d4b','#6cd3bf','#f0d787','#5e8faa','#37dfbe',
];

let state = {
  year: null,
  event: null,
  lapsData: [],
  strategyData: [],
  driversInSession: [],
  activeDrivers: new Set(),
  driverColorMap: {},
};

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  const seasons = await api('/api/seasons');
  const sel = document.getElementById('season-select');
  seasons.slice().reverse().forEach(y => {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    sel.appendChild(opt);
  });

  sel.addEventListener('change', onSeasonChange);
  document.getElementById('event-select').addEventListener('change', onEventChange);
  document.getElementById('load-btn').addEventListener('click', onLoad);
  document.getElementById('tel-load-btn').addEventListener('click', onLoadTelemetry);

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

// ── Event handlers ─────────────────────────────────────────────────────────────

async function onSeasonChange() {
  const year = document.getElementById('season-select').value;
  const eventSel = document.getElementById('event-select');
  const loadBtn = document.getElementById('load-btn');
  eventSel.innerHTML = '<option value="">Race...</option>';
  eventSel.disabled = true;
  loadBtn.disabled = true;
  if (!year) return;

  const events = await api(`/api/events/${year}`);
  events.forEach(ev => {
    const opt = document.createElement('option');
    opt.value = ev.name;
    opt.textContent = `R${ev.round} – ${ev.name}`;
    eventSel.appendChild(opt);
  });
  eventSel.disabled = false;
}

function onEventChange() {
  const event = document.getElementById('event-select').value;
  document.getElementById('load-btn').disabled = !event;
}

async function onLoad() {
  state.year = parseInt(document.getElementById('season-select').value, 10);
  state.event = document.getElementById('event-select').value;

  showLoading('Sessie laden via FastF1 (dit kan even duren)...');

  try {
    const [laps, strategy, drivers, standings] = await Promise.all([
      api(`/api/laps/${state.year}/${encodeURIComponent(state.event)}`),
      api(`/api/strategy/${state.year}/${encodeURIComponent(state.event)}`),
      api(`/api/drivers/${state.year}/${encodeURIComponent(state.event)}`),
      api(`/api/standings/${state.year}`),
    ]);

    state.lapsData = laps;
    state.strategyData = strategy;
    state.driversInSession = drivers;
    state.activeDrivers = new Set(drivers);
    state.driverColorMap = {};
    drivers.forEach((d, i) => { state.driverColorMap[d] = DRIVER_COLORS[i % DRIVER_COLORS.length]; });

    renderStandings(standings);
    renderLaps();
    renderStrategy();
    populateTelemetrySelect(drivers);

    document.getElementById('standings-year').textContent = state.year;
    hideLoading();
    showMain();
  } catch (err) {
    hideLoading();
    alert('Fout bij laden: ' + err.message);
  }
}

async function onLoadTelemetry() {
  const driver = document.getElementById('tel-driver-select').value;
  if (!driver) return;
  const btn = document.getElementById('tel-load-btn');
  btn.disabled = true;
  btn.textContent = 'Laden...';
  try {
    const data = await api(`/api/telemetry/${state.year}/${encodeURIComponent(state.event)}/${driver}`);
    renderTelemetry(data);
  } catch (err) {
    alert('Telemetrie fout: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Toon telemetrie';
  }
}

// ── Charts ────────────────────────────────────────────────────────────────────

function renderStandings(data) {
  if (!data || data.length === 0) {
    document.getElementById('chart-standings').innerHTML =
      '<p style="color:#888;padding:40px">Geen klassementsdata beschikbaar voor dit seizoen.</p>';
    return;
  }
  const sorted = [...data].sort((a, b) => a.position - b.position);
  const trace = {
    type: 'bar',
    orientation: 'h',
    x: sorted.map(d => d.points),
    y: sorted.map(d => d.code || d.driver),
    text: sorted.map(d => `${d.points} pts`),
    textposition: 'outside',
    marker: {
      color: sorted.map((_, i) => DRIVER_COLORS[i % DRIVER_COLORS.length]),
    },
    hovertemplate: '<b>%{y}</b><br>%{x} punten<extra></extra>',
  };
  Plotly.newPlot('chart-standings', [trace], {
    ...PLOTLY_LAYOUT,
    xaxis: { ...PLOTLY_LAYOUT.xaxis, title: 'Punten' },
    yaxis: { ...PLOTLY_LAYOUT.yaxis, autorange: 'reversed' },
    height: Math.max(400, sorted.length * 28),
    margin: { t: 20, r: 80, b: 40, l: 60 },
  }, { responsive: true, displayModeBar: false });
}

function renderLaps() {
  const drivers = [...state.activeDrivers];
  const traces = drivers.map(driver => {
    const driverLaps = state.lapsData.filter(l => l.driver === driver);
    return {
      type: 'scatter',
      mode: 'lines+markers',
      name: driver,
      x: driverLaps.map(l => l.lap),
      y: driverLaps.map(l => l.time_s),
      line: { color: state.driverColorMap[driver], width: 1.5 },
      marker: { size: 4, color: state.driverColorMap[driver] },
      hovertemplate: `<b>${driver}</b><br>Ronde %{x}<br>%{y:.3f}s<extra></extra>`,
    };
  });

  Plotly.newPlot('chart-laps', traces, {
    ...PLOTLY_LAYOUT,
    xaxis: { ...PLOTLY_LAYOUT.xaxis, title: 'Ronde' },
    yaxis: { ...PLOTLY_LAYOUT.yaxis, title: 'Rondetijd (s)', autorange: true },
    height: 480,
  }, { responsive: true, displayModeBar: false });

  renderDriverToggles();
}

function renderDriverToggles() {
  const container = document.getElementById('driver-toggles');
  container.innerHTML = '';
  state.driversInSession.forEach(driver => {
    const btn = document.createElement('button');
    btn.className = 'driver-toggle' + (state.activeDrivers.has(driver) ? ' active' : '');
    btn.textContent = driver;
    btn.style.backgroundColor = state.activeDrivers.has(driver)
      ? state.driverColorMap[driver] : 'transparent';
    btn.style.color = state.activeDrivers.has(driver) ? '#fff' : '#888';
    btn.addEventListener('click', () => toggleDriver(driver, btn));
    container.appendChild(btn);
  });
}

function toggleDriver(driver, btn) {
  if (state.activeDrivers.has(driver)) {
    state.activeDrivers.delete(driver);
    btn.classList.remove('active');
    btn.style.backgroundColor = 'transparent';
    btn.style.color = '#888';
  } else {
    state.activeDrivers.add(driver);
    btn.classList.add('active');
    btn.style.backgroundColor = state.driverColorMap[driver];
    btn.style.color = '#fff';
  }
  renderLaps();
}

function renderTelemetry(data) {
  const sharedX = data.distance;

  const speedTrace = {
    type: 'scatter', mode: 'lines', name: 'Snelheid (km/h)',
    x: sharedX, y: data.speed,
    line: { color: '#e8002d', width: 2 },
    yaxis: 'y',
  };
  const throttleTrace = {
    type: 'scatter', mode: 'lines', name: 'Gas (%)',
    x: sharedX, y: data.throttle,
    line: { color: '#39b54a', width: 1.5 },
    yaxis: 'y2',
  };
  const brakeTrace = {
    type: 'scatter', mode: 'lines', name: 'Rem',
    x: sharedX, y: data.brake,
    line: { color: '#ff6b35', width: 1.5 },
    yaxis: 'y2',
    fill: 'tozeroy',
    fillcolor: 'rgba(255,107,53,0.15)',
  };

  Plotly.newPlot('chart-telemetry', [speedTrace, throttleTrace, brakeTrace], {
    ...PLOTLY_LAYOUT,
    xaxis: { ...PLOTLY_LAYOUT.xaxis, title: 'Afstand (m)' },
    yaxis: { ...PLOTLY_LAYOUT.yaxis, title: 'Snelheid (km/h)', titlefont: { color: '#e8002d' } },
    yaxis2: {
      title: 'Gas / Rem (%)', overlaying: 'y', side: 'right',
      gridcolor: '#2a2a2a', range: [0, 110], titlefont: { color: '#39b54a' },
    },
    height: 480,
    title: { text: `${data.driver} – snelste ronde`, font: { color: '#f0f0f0', size: 14 } },
  }, { responsive: true, displayModeBar: false });
}

function renderStrategy(data) {
  const stratData = data || state.strategyData;
  if (!stratData || stratData.length === 0) return;

  const traces = [];
  const drivers = stratData.map(d => d.driver);

  stratData.forEach(driverData => {
    driverData.stints.forEach(stint => {
      traces.push({
        type: 'bar',
        orientation: 'h',
        name: stint.compound,
        x: [stint.laps],
        y: [driverData.driver],
        base: [stint.start_lap - 1],
        marker: { color: stint.color, opacity: 0.85 },
        hovertemplate: `<b>${driverData.driver}</b><br>${stint.compound}<br>Ronde ${stint.start_lap}–${stint.end_lap}<br>${stint.laps} ronden<extra></extra>`,
        showlegend: false,
      });
    });
  });

  const compoundLegend = ['SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET'];
  const compoundColors = { SOFT: '#e8002d', MEDIUM: '#ffd700', HARD: '#efefef', INTERMEDIATE: '#39b54a', WET: '#0067ff' };
  compoundLegend.forEach(c => {
    traces.push({
      type: 'bar', orientation: 'h', name: c,
      x: [0], y: [drivers[0]],
      marker: { color: compoundColors[c] },
      showlegend: true,
      hoverinfo: 'skip',
    });
  });

  Plotly.newPlot('chart-strategy', traces, {
    ...PLOTLY_LAYOUT,
    barmode: 'stack',
    xaxis: { ...PLOTLY_LAYOUT.xaxis, title: 'Ronde' },
    yaxis: { ...PLOTLY_LAYOUT.yaxis, autorange: 'reversed' },
    height: Math.max(400, drivers.length * 26),
    legend: { ...PLOTLY_LAYOUT.legend, traceorder: 'normal' },
  }, { responsive: true, displayModeBar: false });
}

function populateTelemetrySelect(drivers) {
  const sel = document.getElementById('tel-driver-select');
  sel.innerHTML = '';
  drivers.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = d;
    sel.appendChild(opt);
  });
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-content').forEach(s => s.classList.toggle('active', s.id === `tab-${tab}`));
}

function showLoading(text) {
  document.getElementById('loading-text').textContent = text;
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('main').classList.add('hidden');
}

function hideLoading() {
  document.getElementById('loading').classList.add('hidden');
}

function showMain() {
  document.getElementById('main').classList.remove('hidden');
}

async function api(path) {
  const res = await fetch(path);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

init();
