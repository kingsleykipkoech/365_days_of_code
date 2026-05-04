(function() {
  'use strict';

  const START_DATE = new Date('2026-05-04');
  const TOTAL_DAYS = 365;
  const STORAGE_KEY = '365doc_logs';
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DAY_LABELS = ['Mon','','Wed','','Fri','',''];

  let chartInstance = null;

  // --- Data ---
  function getLogs() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  }
  function saveLogs(logs) { localStorage.setItem(STORAGE_KEY, JSON.stringify(logs)); }
  function addLog(entry) { const logs = getLogs(); logs.unshift(entry); saveLogs(logs); }
  function deleteLog(id) { saveLogs(getLogs().filter(l => l.id !== id)); }

  // --- Helpers ---
  function getCurrentDay() {
    const now = new Date(); now.setHours(0,0,0,0);
    const start = new Date(START_DATE); start.setHours(0,0,0,0);
    return Math.max(1, Math.min(Math.floor((now - start) / 86400000) + 1, TOTAL_DAYS));
  }

  function dayToDate(dayNum) {
    const d = new Date(START_DATE);
    d.setDate(d.getDate() + dayNum - 1);
    return d;
  }

  function formatDate(d) {
    return d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
  }

  function getLoggedDays() {
    const logs = getLogs();
    const map = {};
    logs.forEach(l => { map[l.dayNumber] = (map[l.dayNumber] || 0) + 1; });
    return map;
  }

  function getStreak() {
    const logged = new Set(getLogs().map(l => l.dayNumber));
    let streak = 0;
    for (let d = getCurrentDay(); d >= 1; d--) {
      if (logged.has(d)) streak++;
      else break;
    }
    return streak;
  }

  // ========== RENDER ==========

  function renderStats() {
    document.getElementById('currentDay').textContent = getCurrentDay();
    document.getElementById('streak').textContent = getStreak();
  }

  function renderHeatmap() {
    const grid = document.getElementById('heatmapGrid');
    const monthsEl = document.getElementById('heatmapMonths');
    const dayLabelsEl = document.getElementById('dayLabels');
    const loggedDays = getLoggedDays();
    const today = getCurrentDay();
    const loggedSet = new Set(Object.keys(loggedDays).map(Number));

    // Day labels
    dayLabelsEl.innerHTML = DAY_LABELS.map(l => `<span>${l}</span>`).join('');

    const startDow = START_DATE.getDay();
    const adj = (startDow + 6) % 7; // Mon=0
    const totalWeeks = Math.ceil((TOTAL_DAYS + adj) / 7);

    let html = '';
    let monthMarkers = [];
    let lastMonth = -1;

    for (let w = 0; w < totalWeeks; w++) {
      html += '<div class="heatmap-week">';
      for (let d = 0; d < 7; d++) {
        const idx = w * 7 + d - adj;
        const dayNum = idx + 1;

        if (idx < 0 || dayNum > TOTAL_DAYS) {
          html += '<div class="heatmap-cell" style="visibility:hidden"></div>';
          continue;
        }

        const date = dayToDate(dayNum);
        const month = date.getMonth();
        if (month !== lastMonth) {
          monthMarkers.push({ week: w, month });
          lastMonth = month;
        }

        const isActive = loggedSet.has(dayNum);
        const isToday = dayNum === today;
        const isFuture = dayNum > today;

        let cls = 'heatmap-cell';
        if (isActive) cls += ' active';
        if (isToday) cls += ' today';
        if (isFuture) cls += ' future';

        const status = isActive ? '✅ Logged' : isFuture ? 'Upcoming' : isToday ? '⬅️ Today' : '—';

        html += `<div class="${cls}"><div class="tip">Day ${dayNum} · ${formatDate(date)}<br>${status}</div></div>`;
      }
      html += '</div>';
    }
    grid.innerHTML = html;

    const cw = 23; // 18px cell + 5px gap
    monthsEl.innerHTML = monthMarkers.map(m =>
      `<span style="left:${m.week * cw}px">${MONTH_NAMES[m.month]}</span>`
    ).join('');

    document.getElementById('heatmapBadge').textContent = `${loggedSet.size} / ${TOTAL_DAYS} days`;
  }

  function renderChart() {
    if (chartInstance) chartInstance.destroy();

    const ctx = document.getElementById('progressChart').getContext('2d');
    const logs = getLogs();
    const today = getCurrentDay();

    // Show at least 14 days so the chart never looks empty
    const showDays = Math.max(today, 14);
    const labels = [];
    const data = [];

    for (let d = 1; d <= showDays; d++) {
      labels.push('Day ' + d);
      data.push(logs.filter(l => l.dayNumber === d).length);
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Activity',
          data,
          fill: true,
          backgroundColor: gradient,
          borderColor: '#6366f1',
          borderWidth: 2,
          pointBackgroundColor: '#6366f1',
          pointBorderColor: '#6366f1',
          pointRadius: data.map(v => v > 0 ? 5 : 2),
          pointHoverRadius: 7,
          tension: 0.4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1a1a2e',
            titleColor: '#f5f5f7',
            bodyColor: '#9ca3af',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            cornerRadius: 8,
            padding: 10,
            callbacks: {
              label: (ctx) => ctx.parsed.y === 0 ? 'No activity' : ctx.parsed.y + ' log entries',
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              color: '#4b5563',
              font: { family: 'JetBrains Mono', size: 11 }
            },
            grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false }
          },
          x: {
            ticks: {
              color: '#4b5563',
              font: { family: 'JetBrains Mono', size: 10 },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 15,
            },
            grid: { display: false, drawBorder: false }
          }
        },
        interaction: {
          mode: 'index',
          intersect: false,
        }
      }
    });
  }

  function renderTimeline() {
    const container = document.getElementById('timeline');
    const logs = getLogs();

    document.getElementById('entryCount').textContent = logs.length + ' entries';

    if (!logs.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <p>Your journey starts when you log your first day.<br>Use the form to record what you learned today.</p>
        </div>`;
      return;
    }

    container.innerHTML = logs.map(log => `
      <div class="tl-entry">
        <div class="tl-header">
          <span class="tl-day">Day ${log.dayNumber}</span>
          <span class="tl-date">${log.date}</span>
        </div>
        ${log.topic ? `<span class="tl-topic">${log.topic}</span>` : ''}
        <div class="tl-title">${log.title}</div>
        <div class="tl-content">${log.content}</div>
      </div>
    `).join('');
  }

  function renderAll() {
    renderStats();
    renderHeatmap();
    renderChart();
    renderTimeline();
  }

  // ========== FORM ==========
  document.getElementById('logForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const title = document.getElementById('logTitle').value.trim();
    const content = document.getElementById('logContent').value.trim();
    if (!title || !content) return;

    addLog({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
      dayNumber: getCurrentDay(),
      date: formatDate(new Date()),
      title,
      content,
      timestamp: new Date().toISOString(),
    });

    this.reset();
    renderAll();
  });

  // Focus glow on inputs
  document.querySelectorAll('input, textarea').forEach(el => {
    el.addEventListener('focus', () => el.style.borderColor = '#6366f1');
    el.addEventListener('blur', () => el.style.borderColor = 'var(--border)');
  });

  // ========== AUTO-SYNC from log.json ==========
  async function tryLoadFromJSON() {
    try {
      const res = await fetch('log.json?t=' + Date.now());
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) return;

      const existing = getLogs();
      const existingIds = new Set(existing.map(l => l.id));
      let added = 0;

      data.forEach(entry => {
        if (!existingIds.has(entry.id)) {
          existing.push(entry);
          added++;
        }
      });

      if (added > 0) {
        existing.sort((a,b) => b.dayNumber - a.dayNumber);
        saveLogs(existing);
        renderAll();
      }
    } catch {}
  }

  // ========== INIT ==========
  renderAll();
  tryLoadFromJSON();

})();
