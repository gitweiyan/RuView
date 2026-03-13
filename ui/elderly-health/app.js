/* ═══════════════════════════════════════════════════════════
   CareWatch — Elderly Health Monitor
   Main Application Logic
═══════════════════════════════════════════════════════════ */

'use strict';

// ── INIT ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  initNavigation();
  initClock();
  initSparklines();
  initVitalsCharts();
  initActivityCharts();
  initCSIHeatmap();
  initLocationTrail();
  initAlerts();
  initFamilyLog();
  initSliders();
  initSOS();
  startLiveUpdates();
  showToast('warn', 'Medication Reminder', 'Vitamin D3 1000IU due at 12:00 PM', 6000);
  setTimeout(() => showToast('ok', 'All Clear', 'No falls or anomalies detected in the last hour', 5000), 3000);
});

// ── NAVIGATION ────────────────────────────────────────────
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item[data-view]');
  const views    = document.querySelectorAll('.view');
  const titles   = {
    dashboard: 'Dashboard', vitals: 'Vital Signs',
    activity:  'Activity',  location: 'Location & Zones',
    alerts:    'Alerts',    family:   'Family Circle',
    settings:  'Settings'
  };

  function switchView(name) {
    navItems.forEach(n => n.classList.toggle('active', n.dataset.view === name));
    views.forEach(v => {
      const active = v.id === 'view-' + name;
      v.classList.toggle('active', active);
      if (active) v.style.display = 'flex';
      else v.style.display = 'none';
    });
    document.getElementById('topbar-title').textContent = titles[name] || name;
    if (window.innerWidth <= 700) {
      document.getElementById('sidebar').classList.remove('open');
    }
  }

  navItems.forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));

  // "View all" / panel links
  document.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.goto));
  });

  // Sidebar toggle (mobile)
  document.getElementById('sidebar-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Active view on start
  document.querySelectorAll('.view').forEach(v => {
    v.style.display = v.classList.contains('active') ? 'flex' : 'none';
  });

  // Filter buttons on alerts
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterAlerts(btn.dataset.filter);
    });
  });

  // Vitals time range buttons
  document.querySelectorAll('.time-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

// ── CLOCK ─────────────────────────────────────────────────
function initClock() {
  const el = document.getElementById('live-clock');
  const greetEl = document.getElementById('time-greeting');
  function tick() {
    const now = new Date();
    const h = now.getHours();
    el.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    greetEl.textContent = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
  }
  tick();
  setInterval(tick, 1000);
}

// ── SPARKLINE HELPER ──────────────────────────────────────
function drawSparkline(canvasId, data, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  ctx.clearRect(0, 0, w, h);

  // Gradient fill
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, color + '55');
  grad.addColorStop(1, color + '00');

  ctx.beginPath();
  data.forEach((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  // fill area
  const lastX = w, lastY = h, firstX = 0;
  ctx.lineTo(lastX, h); ctx.lineTo(firstX, h); ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();

  // Line
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.lineJoin = 'round'; ctx.stroke();
}

function initSparklines() {
  drawSparkline('spark-hr',    [68,70,72,69,74,73,72,71,73,72], '#FF4757');
  drawSparkline('spark-spo2',  [97,97,98,97,97,96,97,98,97,97], '#3B82F6');
  drawSparkline('spark-breath',[15,16,16,15,17,16,16,15,16,16], '#32B8C6');
  drawSparkline('spark-temp',  [36.4,36.5,36.6,36.5,36.6,36.6,36.7,36.6,36.6,36.6], '#FFA502');
  drawSparkline('spark-bp',    [120,122,125,121,124,122,123,124,122,122], '#9B59B6');
  drawSparkline('spark-sleep', [6.8,7.1,6.5,7.3,7.0,7.2,6.9,7.4,7.1,7.2], '#2ED573');
}

// ── CHART HELPERS ─────────────────────────────────────────
const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: {
    backgroundColor: '#1A2233',
    borderColor: '#1E293B', borderWidth: 1,
    titleColor: '#E2E8F0', bodyColor: '#94A3B8',
    padding: 10
  }},
  scales: {
    x: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#475569', font: { size: 10 } } },
    y: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#475569', font: { size: 10 } } }
  }
};

function timeLabels(n, minsBack = 60) {
  const labels = [];
  for (let i = n; i >= 0; i--) {
    const d = new Date(Date.now() - i * (minsBack / n) * 60000);
    labels.push(d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
  }
  return labels;
}

function rnd(base, noise) {
  return Array.from({ length: 25 }, () => base + (Math.random() - .5) * noise * 2);
}

// ── VITALS CHARTS ─────────────────────────────────────────
function initVitalsCharts() {
  const labels = timeLabels(24, 60);

  new Chart(document.getElementById('chart-hr'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: rnd(72, 8),
        borderColor: '#FF4757', backgroundColor: 'rgba(255,71,87,.1)',
        fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2,
      }]
    },
    options: {
      ...chartDefaults,
      scales: {
        ...chartDefaults.scales,
        y: { ...chartDefaults.scales.y, min: 45, max: 110, ticks: { color: '#475569', font: { size: 10 } } }
      }
    }
  });

  new Chart(document.getElementById('chart-spo2'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: rnd(97, 2),
        borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,.1)',
        fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2,
      }]
    },
    options: {
      ...chartDefaults,
      scales: {
        ...chartDefaults.scales,
        y: { ...chartDefaults.scales.y, min: 90, max: 100, ticks: { color: '#475569', font: { size: 10 } } }
      }
    }
  });

  new Chart(document.getElementById('chart-breath'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: rnd(16, 3),
        borderColor: '#32B8C6', backgroundColor: 'rgba(50,184,198,.1)',
        fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2,
      }]
    },
    options: {
      ...chartDefaults,
      scales: {
        ...chartDefaults.scales,
        y: { ...chartDefaults.scales.y, min: 8, max: 28, ticks: { color: '#475569', font: { size: 10 } } }
      }
    }
  });

  const bpSys = rnd(124, 10);
  const bpDia = bpSys.map(v => v - 45 + (Math.random() - .5) * 6);
  new Chart(document.getElementById('chart-bp'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Systolic',
          data: bpSys,
          borderColor: '#9B59B6', backgroundColor: 'rgba(155,89,182,.08)',
          fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2,
        },
        {
          label: 'Diastolic',
          data: bpDia,
          borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,.06)',
          fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2,
        }
      ]
    },
    options: {
      ...chartDefaults,
      plugins: {
        ...chartDefaults.plugins,
        legend: { display: true, labels: { color: '#94A3B8', font: { size: 10 }, boxWidth: 12 } }
      },
      scales: {
        ...chartDefaults.scales,
        y: { ...chartDefaults.scales.y, min: 55, max: 160, ticks: { color: '#475569', font: { size: 10 } } }
      }
    }
  });
}

// ── ACTIVITY CHARTS ───────────────────────────────────────
function initActivityCharts() {
  // Fall history dots
  const hist = document.getElementById('fall-hist');
  const falls = [false, false, false, false, true, false, false];
  falls.forEach(f => {
    const d = document.createElement('div');
    d.className = 'fall-hist-dot' + (f ? ' had-fall' : '');
    d.title = f ? 'Fall detected' : 'No fall';
    hist.appendChild(d);
  });

  // Activity timeline (bar chart showing room activity by hour)
  const actLabels = Array.from({ length: 24 }, (_, i) => i + ':00');
  const walkData    = [0,0,0,0,0,0,0,0.3,0.6,0.4,0.2,0.5,0.4,0.1,0.3,0.5,0.3,0.2,0.4,0.2,0.1,0,0,0];
  const sitData     = [0.9,0.9,0.9,0.9,0.9,0.8,0.3,0.4,0.2,0.4,0.6,0.3,0.4,0.7,0.5,0.3,0.5,0.6,0.4,0.6,0.7,0.8,0.9,0.9];
  const standData   = [0,0,0,0,0,0,0,0.2,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0,0,0];

  new Chart(document.getElementById('chart-activity-timeline'), {
    type: 'bar',
    data: {
      labels: actLabels,
      datasets: [
        { label: 'Walking',  data: walkData,  backgroundColor: '#32B8C6', stack: 'act' },
        { label: 'Sitting',  data: sitData,   backgroundColor: '#2ED573', stack: 'act' },
        { label: 'Standing', data: standData, backgroundColor: '#9B59B6', stack: 'act' }
      ]
    },
    options: {
      ...chartDefaults,
      scales: {
        x: { stacked: true, grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#475569', font: { size: 9 }, maxTicksLimit: 12 } },
        y: { stacked: true, min: 0, max: 1, grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#475569', font: { size: 9 }, callback: v => v === 1 ? 'Active' : '' } }
      }
    }
  });

  // Sleep chart
  new Chart(document.getElementById('chart-sleep'), {
    type: 'bar',
    data: {
      labels: Array.from({ length: 48 }, (_, i) => {
        const hr = Math.floor(i / 2) + 21;
        const min = i % 2 === 0 ? '00' : '30';
        return (hr % 24) + ':' + min;
      }),
      datasets: [{
        data: Array.from({ length: 48 }, (_, i) => {
          if (i < 4) return 1;
          if (i < 8) return 2;
          if (i < 12) return 3;
          if (i < 14) return 4;
          if (i < 22) return 3;
          if (i < 26) return 2;
          if (i < 30) return 4;
          if (i < 34) return 3;
          if (i < 36) return 1;
          if (i < 40) return 2;
          if (i < 42) return 4;
          return 2;
        }),
        backgroundColor: ctx => {
          const v = ctx.dataset.data[ctx.dataIndex];
          if (v === 4) return '#1e40af';  // deep
          if (v === 3) return '#9B59B6';  // REM
          if (v === 2) return '#3B82F6';  // light
          return '#FFA502';               // awake
        },
        borderRadius: 2,
        borderSkipped: false,
      }]
    },
    options: {
      ...chartDefaults,
      scales: {
        x: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#475569', font: { size: 9 }, maxTicksLimit: 8 } },
        y: { display: false, min: 0, max: 5 }
      }
    }
  });

  // 7-day sleep trend
  new Chart(document.getElementById('chart-sleep-week'), {
    type: 'bar',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        data: [6.5, 7.1, 6.8, 7.3, 7.0, 7.8, 7.2],
        backgroundColor: data => data.raw >= 7 ? '#2ED573' : '#FFA502',
        borderRadius: 4,
      }]
    },
    options: {
      ...chartDefaults,
      scales: {
        x: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#475569', font: { size: 11 } } },
        y: { min: 4, max: 10, grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#475569', font: { size: 10 }, callback: v => v + 'h' } }
      }
    }
  });
}

// ── CSI HEATMAP ───────────────────────────────────────────
const heatmapColors = ['#0A0E1A', '#1A2233', '#1a4a52', '#32B8C6', '#FFA502', '#FF4757'];

function initCSIHeatmap() {
  const grid = document.getElementById('csi-heatmap');
  if (!grid) return;
  const cols = 16, rows = 8;
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  grid.style.gridTemplateRows = `repeat(${rows}, 20px)`;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');
      cell.className = 'csi-cell';
      cell.dataset.r = r; cell.dataset.c = c;
      grid.appendChild(cell);
    }
  }
  updateHeatmap();
  setInterval(updateHeatmap, 800);
}

function updateHeatmap() {
  const cells = document.querySelectorAll('.csi-cell');
  const cols = 16, rows = 8;
  // Simulate person at ~(10,3) with gaussian spread
  const px = 10, py = 3;
  cells.forEach(cell => {
    const c = +cell.dataset.c, r = +cell.dataset.r;
    const dist = Math.sqrt((c - px) ** 2 + (r - py) ** 2);
    const noise = (Math.random() - .5) * .8;
    let intensity = Math.max(0, 1 - dist / 6 + noise);
    intensity = Math.min(1, Math.max(0, intensity));
    const idx = Math.floor(intensity * (heatmapColors.length - 1));
    cell.style.background = heatmapColors[idx];
  });
}

// ── LOCATION TRAIL ────────────────────────────────────────
function initLocationTrail() {
  const trail = [
    { room: 'Bedroom',     time: '06:45 AM', duration: '45 min', active: false },
    { room: 'Bathroom',    time: '07:30 AM', duration: '20 min', active: false },
    { room: 'Kitchen',     time: '07:50 AM', duration: '35 min', active: false },
    { room: 'Dining Room', time: '08:25 AM', duration: '30 min', active: false },
    { room: 'Living Room', time: '08:55 AM', duration: '2h 10m (ongoing)', active: true }
  ];

  const el = document.getElementById('location-trail');
  trail.forEach(t => {
    el.innerHTML += `
      <div class="lt-item">
        <div class="lt-dot ${t.active ? '' : 'inactive'}"></div>
        <div class="lt-info">
          <span class="lt-room">${t.room}</span>
          <span class="lt-time">${t.time}</span>
          <span class="lt-duration">${t.duration}</span>
        </div>
      </div>`;
  });
}

// ── ALERTS DATA ───────────────────────────────────────────
const ALERTS = [
  {
    id: 1, type: 'warning', icon: 'gauge', title: 'Blood Pressure Elevated',
    desc: 'Systolic reading 138 mmHg — above 130 mmHg threshold. Consider contacting Dr. Lau.',
    time: '2h 15m ago', resolved: false
  },
  {
    id: 2, type: 'info', icon: 'pill', title: 'Medication Reminder',
    desc: 'Vitamin D3 1000IU is due at 12:00 PM. Margaret has not confirmed intake yet.',
    time: '45m ago', resolved: false
  },
  {
    id: 3, type: 'info', icon: 'moon', title: 'Sleep Quality Report',
    desc: 'Margaret slept 7.2 hours last night. REM sleep slightly below average (1h 28m vs target 1h 45m).',
    time: '8h ago', resolved: false
  },
  {
    id: 4, type: 'critical', icon: 'alert-triangle', title: 'Fall Detected — Wednesday',
    desc: 'A fall event was detected in the Bathroom at 7:22 PM. Margaret confirmed she was okay. No injury reported.',
    time: 'Wed, 7:22 PM', resolved: true
  },
  {
    id: 5, type: 'warning', icon: 'thermometer', title: 'Temperature Slightly Low',
    desc: 'Body temperature recorded at 35.8°C at 3:14 AM. Reverted to normal by 6:00 AM.',
    time: 'Thu, 3:14 AM', resolved: true
  },
  {
    id: 6, type: 'info', icon: 'heart-pulse', title: 'Resting Heart Rate Improved',
    desc: 'Resting heart rate has decreased from 72 to 65 bpm over the past 2 weeks. Good progress!',
    time: 'Mon, 9:00 AM', resolved: true
  }
];

function initAlerts() {
  renderAlerts(ALERTS);

  // Inject recent 3 into dashboard
  const recent = document.getElementById('recent-alert-list');
  ALERTS.slice(0, 3).forEach(a => {
    recent.innerHTML += `
      <div class="alert-item ${a.resolved ? 'resolved' : a.type}">
        <div class="alert-icon"><i data-lucide="${a.icon}"></i></div>
        <div class="alert-body">
          <span class="alert-title">${a.title}</span>
          <span class="alert-desc">${a.desc}</span>
        </div>
        <span class="alert-time">${a.time}</span>
      </div>`;
  });
  lucide.createIcons();
}

function renderAlerts(list) {
  const el = document.getElementById('alerts-full-list');
  el.innerHTML = '';
  list.forEach(a => {
    const status = a.resolved ? 'resolved' : a.type;
    el.innerHTML += `
      <div class="alert-full-item ${status}" data-id="${a.id}" data-type="${a.type}" data-resolved="${a.resolved}">
        <div class="afi-icon"><i data-lucide="${a.icon}"></i></div>
        <div class="afi-body">
          <span class="afi-title">${a.title}</span>
          <span class="afi-desc">${a.desc}</span>
          <div class="afi-footer">
            <span class="afi-time">${a.time}</span>
            <span class="afi-badge ${status}">${status.toUpperCase()}</span>
          </div>
        </div>
        <div class="afi-actions">
          ${!a.resolved ? `<button class="afi-action-btn primary" onclick="resolveAlert(${a.id})">Resolve</button>` : ''}
          <button class="afi-action-btn">Details</button>
        </div>
      </div>`;
  });
  lucide.createIcons();
}

window.resolveAlert = function(id) {
  const a = ALERTS.find(x => x.id === id);
  if (a) { a.resolved = true; renderAlerts(ALERTS); }
};

function filterAlerts(filter) {
  let filtered;
  if (filter === 'all')      filtered = ALERTS;
  else if (filter === 'critical') filtered = ALERTS.filter(a => a.type === 'critical' && !a.resolved);
  else if (filter === 'warning')  filtered = ALERTS.filter(a => a.type === 'warning' && !a.resolved);
  else if (filter === 'info')     filtered = ALERTS.filter(a => a.type === 'info' && !a.resolved);
  else if (filter === 'resolved') filtered = ALERTS.filter(a => a.resolved);
  renderAlerts(filtered);
}

// ── FAMILY LOG ────────────────────────────────────────────
const FAMILY_LOG_INIT = [
  { name: 'Sarah Chen', seed: 'sarah', time: '11:42 AM', msg: 'Spoke with mom — she sounds well. Reminded her about the noon medication.', alert: false },
  { name: 'Michael Chen', seed: 'mike', time: '9:15 AM', msg: 'Checked the app. Vitals look good! Will visit Saturday.', alert: false },
  { name: 'System', seed: 'system', time: '8:55 AM', msg: 'Margaret entered Living Room (from Kitchen). Presence confirmed via WiFi CSI.', alert: true }
];

function initFamilyLog() {
  const log = document.getElementById('family-log');
  FAMILY_LOG_INIT.forEach(entry => appendLogEntry(entry));

  document.getElementById('note-send-btn').addEventListener('click', sendNote);
  document.getElementById('note-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') sendNote();
  });
}

function appendLogEntry(entry) {
  const log = document.getElementById('family-log');
  const avatarSrc = entry.seed === 'system'
    ? 'https://api.dicebear.com/7.x/bottts/svg?seed=carewatch&backgroundColor=1A2233'
    : `https://api.dicebear.com/7.x/adventurer/svg?seed=${entry.seed}&backgroundColor=1A2233`;
  const div = document.createElement('div');
  div.className = 'fl-item';
  div.innerHTML = `
    <div class="fl-avatar"><img src="${avatarSrc}" alt="${entry.name}" /></div>
    <div class="fl-body">
      <div class="fl-name-time">
        <span class="fl-name">${entry.name}</span>
        <span class="fl-time">${entry.time}</span>
      </div>
      <div class="fl-msg">${entry.msg} ${entry.alert ? '<span class="fl-alert-tag">System</span>' : ''}</div>
    </div>`;
  log.prepend(div);
}

function sendNote() {
  const input = document.getElementById('note-input');
  const text = input.value.trim();
  if (!text) return;
  const now = new Date();
  appendLogEntry({
    name: 'Sarah Chen', seed: 'sarah',
    time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    msg: text, alert: false
  });
  input.value = '';
  document.getElementById('family-log').scrollTop = 0;
}

// ── SLIDERS ───────────────────────────────────────────────
function initSliders() {
  [['hr-low-thresh','hr-low-val'], ['hr-high-thresh','hr-high-val'],
   ['spo2-thresh','spo2-thresh-val'], ['inact-thresh','inact-thresh-val']].forEach(([sid, vid]) => {
    const slider = document.getElementById(sid);
    const valEl  = document.getElementById(vid);
    if (slider && valEl) {
      valEl.textContent = slider.value;
      slider.addEventListener('input', () => {
        valEl.textContent = slider.value;
        const pct = (slider.value - slider.min) / (slider.max - slider.min) * 100;
        slider.style.background = `linear-gradient(to right, #32B8C6 ${pct}%, #2A3A52 ${pct}%)`;
      });
      // Init gradient
      const pct0 = (slider.value - slider.min) / (slider.max - slider.min) * 100;
      slider.style.background = `linear-gradient(to right, #32B8C6 ${pct0}%, #2A3A52 ${pct0}%)`;
    }
  });
}

// ── SOS MODAL ─────────────────────────────────────────────
function initSOS() {
  document.getElementById('sos-btn').addEventListener('click', () => {
    document.getElementById('sos-modal').style.display = 'flex';
  });
  document.getElementById('sos-close').addEventListener('click', () => {
    document.getElementById('sos-modal').style.display = 'none';
  });
  document.getElementById('sos-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('sos-modal')) {
      document.getElementById('sos-modal').style.display = 'none';
    }
  });
  document.querySelectorAll('.sos-contact-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showToast('ok', 'Calling…', btn.querySelector('strong').textContent, 4000);
      document.getElementById('sos-modal').style.display = 'none';
    });
  });
}

// ── TOAST ─────────────────────────────────────────────────
function showToast(type, title, msg, duration = 5000) {
  const icons = { ok: 'check-circle', warn: 'alert-circle', danger: 'alert-triangle', info: 'info' };
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon"><i data-lucide="${icons[type] || 'info'}"></i></div>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${msg}</div>
    </div>
    <button class="toast-close"><i data-lucide="x"></i></button>`;
  container.appendChild(toast);
  lucide.createIcons({ nodes: [toast] });
  toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity .4s'; setTimeout(() => toast.remove(), 400); }, duration);
}

// ── LIVE DATA UPDATES ─────────────────────────────────────
function startLiveUpdates() {
  let hrBase = 72, spo2Base = 97, breathBase = 16;

  setInterval(() => {
    hrBase     = clamp(hrBase    + (Math.random() - .5) * 3, 55, 105);
    spo2Base   = clamp(spo2Base  + (Math.random() - .5) * .5, 93, 100);
    breathBase = clamp(breathBase+ (Math.random() - .5) * 1, 10, 24);

    setText('d-hr',    Math.round(hrBase));
    setText('vhr-val', Math.round(hrBase));
    setText('d-spo2',  spo2Base.toFixed(0));
    setText('vspo2-val', spo2Base.toFixed(0));
    setText('d-breath', Math.round(breathBase));
    setText('vbreath-val', Math.round(breathBase));

    // Alert badge
    const alertCount = ALERTS.filter(a => !a.resolved).length;
    const badge = document.getElementById('alert-count');
    if (badge) badge.textContent = alertCount;

    // SpO2 danger alert
    if (spo2Base < 94) {
      showToast('danger', 'Low SpO₂ Alert!', `SpO₂ dropped to ${spo2Base.toFixed(0)}%. Check on Margaret.`, 8000);
    }
  }, 3500);
}

function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
