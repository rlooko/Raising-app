/* ═══════════════════════════════════════════════════════════════
   용은타운 V4 · core
   · 공용 유틸 · 소리/진동 · 토스트/시트 · 경험치/스트릭/배지
   · 행동 로그(analyticsLogs) · CSV/백업 내보내기
   데이터(S)는 js/data.js 가 만들고, 여기서는 읽고 쓰기만 합니다.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

/* ── 유틸 ─────────────────────────────────── */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const pad = n => String(n).padStart(2, '0');
const todayStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const won = n => (n < 0 ? '-' : '') + Math.abs(Math.round(n)).toLocaleString('ko-KR') + '원';
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const uid = () => Math.random().toString(36).slice(2, 9);
const daysAgoStr = n => todayStr(new Date(Date.now() - n * 86400000));
const num = v => { const n = Number(String(v == null ? '' : v).replace(/[^0-9.-]/g, '')); return isFinite(n) ? n : 0; };
const short = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const hm = ts => { const d = new Date(Number(ts) || 0); return isFinite(d.getTime()) ? pad(d.getHours()) + ':' + pad(d.getMinutes()) : ''; };

/* ── 집중 타이머 상태 (원픽 10분) ─────────────── */
const FOCUS = { running: false, endAt: 0, total: 600, remaining: 600, tick: null };
const FOCUS_RING = 2 * Math.PI * 52;

/* ── 소리 · 진동 ───────────────────────────── */
let AC = null;
function audioCtx() {
  if (!S.settings.sound) return null;
  try {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    return AC;
  } catch (e) { return null; }
}
function note(freq, at, dur, type = 'triangle', vol = 0.14) {
  const a = audioCtx(); if (!a) return;
  try {
    const t0 = a.currentTime + at;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  } catch (e) { }
}
function sfx(kind) {
  if (!S.settings.sound) return;
  if (kind === 'tap') { note(880, 0, 0.09, 'sine', 0.07); }
  else if (kind === 'done') { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(f, i * 0.13, 0.55, 'triangle', 0.16)); }
  else if (kind === 'level') { [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => note(f, i * 0.1, 0.7, 'triangle', 0.15)); note(1567.98, 0.55, 1.1, 'sine', 0.08); }
  else if (kind === 'ok') { [784, 1046.5].forEach((f, i) => note(f, i * 0.08, 0.28, 'triangle', 0.1)); }
  else if (kind === 'bad') { note(220, 0, 0.24, 'sine', 0.09); }
}
function vibe(p) {
  if (!S.settings.vibrate) return;
  try {
    if (!navigator.vibrate) return;
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    navigator.vibrate(p);
  } catch (e) { }
}
window.sfx = sfx;

/* ── 토스트 · 축하 효과 ─────────────────────── */
function toast(msg) {
  const t = $('#toast'); if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2300);
}
function confetti(n = 24) {
  const fx = $('#fx'); if (!fx) return;
  const colors = ['#8ff0d0', '#bcabff', '#ffb1c8', '#ffe08a', '#ffffff'];
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.className = 'conf';
    s.style.left = (50 + (Math.random() * 44 - 22)) + '%';
    s.style.top = (42 + Math.random() * 12) + '%';
    s.style.background = colors[i % colors.length];
    s.style.setProperty('--dx', (Math.random() * 240 - 120).toFixed(0) + 'px');
    s.style.setProperty('--dy', (-110 - Math.random() * 190).toFixed(0) + 'px');
    s.style.setProperty('--rot', (Math.random() * 720 - 360).toFixed(0) + 'deg');
    s.style.animationDelay = (Math.random() * 0.12).toFixed(2) + 's';
    fx.appendChild(s);
    setTimeout(() => s.remove(), 1500);
  }
}
function showFloat(text) {
  const fx = $('#fx'); if (!fx) return;
  const d = document.createElement('div'); d.className = 'float-exp'; d.textContent = text;
  fx.appendChild(d); setTimeout(() => d.remove(), 1600);
}

/* ── 바텀시트 ─────────────────────────────── */
function showSheet({ title, body, actions = [], onOpen }) {
  $('#sheetTitle').textContent = title;
  $('#sheetBody').innerHTML = body;
  const box = $('#sheetActions'); box.innerHTML = '';
  actions.forEach(a => {
    const b = document.createElement('button');
    b.className = 'btn ' + (a.kind === 'main' ? 'btn-main' : a.kind === 'danger' ? 'btn-danger' : 'btn-ghost');
    b.textContent = a.label;
    b.addEventListener('click', () => { if (a.onClick) a.onClick(); });
    box.appendChild(b);
  });
  $('#overlay').classList.add('open');
  if (onOpen) onOpen();
}
function closeSheet() {
  const o = $('#overlay'); if (o) o.classList.remove('open');
  const lv = $('#levelOverlay'); if (lv) lv.classList.remove('open');
}
function confirmSheet(title, text, yesLabel, onYes, danger) {
  showSheet({
    title, body: `<p style="font-size:14px;line-height:1.65;color:var(--tx2)">${text}</p>`,
    actions: [
      { label: '취소', onClick: closeSheet },
      { label: yesLabel, kind: danger ? 'danger' : 'main', onClick: () => { closeSheet(); onYes(); } }
    ]
  });
}

/* ── 경험치 · 스트릭 · 배지 ────────────────── */
function todayExpAmt() {
  if (!S.todayExp || S.todayExp.date !== TODAY) { S.todayExp = { date: TODAY, amount: 0 }; return 0; }
  return S.todayExp.amount || 0;
}
function streakValue() {
  if (S.lastActive === TODAY || S.lastActive === daysAgoStr(1)) return S.streak || 0;
  return 0;
}
function bumpStreak() {
  if (S.lastActive === TODAY) return;
  const y = daysAgoStr(1);
  S.streak = (S.lastActive === y) ? (S.streak || 0) + 1 : 1;
  S.lastActive = TODAY;
  if (S.streak >= 3) awardBadge('streak3');
}
function awardBadge(id) {
  if (!id || S.badges[id]) return;
  const def = BADGE_DEFS.find(b => b[0] === id);
  if (!def) return;
  S.badges[id] = TODAY;
  save();
  toast('배지 획득! ' + def[1] + ' ' + def[2]);
  sfx('ok');
}
function addExp(amount, opts) {
  opts = opts || {};
  amount = Math.round(amount || 0);
  if (amount === 0) return { before: levelInfo(S.exp).level, after: levelInfo(S.exp).level, leveled: false };
  const before = levelInfo(S.exp).level;
  S.exp = Math.max(0, S.exp + amount);
  if (!S.todayExp || S.todayExp.date !== TODAY) S.todayExp = { date: TODAY, amount: 0 };
  S.todayExp.amount += amount;
  bumpStreak();
  save();
  const after = levelInfo(S.exp).level;
  try { renderHeader(); renderCharacter(); } catch (e) { }
  showFloat('+' + amount + ' EXP');
  if (after > before) {
    if (after >= 5) awardBadge('level5');
    if (!opts.noLevelUp) showLevelUp(levelInfo(S.exp));
  } else {
    sfx('ok');
  }
  return { before, after, leveled: after > before };
}
function showLevelUp(L) {
  const box = $('#levelOverlay'); if (!box) return;
  const n = $('#lvupNum'), t = $('#lvupTitle'), m = $('#lvupMsg');
  if (n) n.textContent = 'Lv.' + L.level;
  if (t) t.textContent = L.title;
  if (m) m.textContent = '몸이 조금 커졌어! 다음엔 뭘 해볼까?';
  box.classList.add('open');
  sfx('level'); confetti(46); vibe([18, 40, 18, 40]);
}

/* ═══════════════════════════════════════════
   행동 로그 (analyticsLogs) — 내 데이터 대시보드 / CSV
   ═══════════════════════════════════════════ */
const ALOG_MAX = 1000;

function kstParts(ts) {
  const d = new Date(ts);
  try {
    const p = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', hourCycle: 'h23', weekday: 'short'
    }).formatToParts(d);
    const get = t => { const x = p.find(y => y.type === t); return x ? x.value : ''; };
    const wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[get('weekday')];
    return { date: get('year') + '-' + get('month') + '-' + get('day'), hour: Number(get('hour')) % 24, weekday: (wd == null ? d.getDay() : wd) };
  } catch (e) {
    const k = new Date(d.getTime() + 9 * 3600 * 1000);
    return { date: k.toISOString().slice(0, 10), hour: k.getUTCHours(), weekday: k.getUTCDay() };
  }
}
function alogBuild(ts, type, category, label, value, exp) {
  const k = kstParts(ts);
  return {
    ts: Number(ts) || Date.now(),
    date_kst: k.date, hour_kst: k.hour, weekday: k.weekday,
    event_type: String(type || 'event'),
    category: String(category == null ? '' : category).slice(0, 40),
    label: String(label == null ? '' : label).slice(0, 90),
    value_krw: Math.round(Number(value) || 0),
    exp: Math.round(Number(exp) || 0)
  };
}
function alog(type, category, label, value, exp) {
  try {
    if (!Array.isArray(S.analyticsLogs)) S.analyticsLogs = [];
    S.analyticsLogs.push(alogBuild(Date.now(), type, category, label, value, exp));
    if (S.analyticsLogs.length > ALOG_MAX) S.analyticsLogs = S.analyticsLogs.slice(-ALOG_MAX);
    save();
  } catch (e) { }
}
/* 기존 벽돌·퀘스트·로드맵 기록을 한 번만 로그로 변환합니다. */
function alogSeedOnce() {
  try {
    if (!Array.isArray(S.analyticsLogs)) S.analyticsLogs = [];
    if (S.alogSeeded) return;
    if (S.analyticsLogs.length) { S.alogSeeded = true; save(); return; }
    const out = [];
    brickItems().forEach(x => {
      let ts = Number(x.ts) || new Date((x.date || TODAY) + 'T12:00:00').getTime();
      if (x.date && kstParts(ts).date !== x.date) ts = new Date(x.date + 'T12:00:00').getTime();
      out.push(alogBuild(ts, 'brick_break', x.label || '참은 소비', x.label || '', Number(x.amount) || 0, 0));
    });
    const seen = {};
    (S.questArchive || []).concat((S.quests || []).filter(q => q.doneDate)).forEach(q => {
      const day = q.doneDate || q.closedDate;
      if (!day) return;
      const key = day + '|' + q.title;
      if (seen[key]) return;
      seen[key] = 1;
      out.push(alogBuild(new Date(day + 'T12:00:00').getTime(), 'quest_complete', '퀘스트', q.title || '', 0, Number(q.exp) || 0));
    });
    Object.keys(S.roadmap || {}).forEach(id => {
      const day = S.roadmap[id];
      if (!day) return;
      let title = id;
      ROADMAP_STAGES.forEach(st => st.items.forEach(it => { if (it.id === id) title = it.t; }));
      out.push(alogBuild(new Date(day + 'T12:00:00').getTime(), 'roadmap_check', 'V2 로드맵', title, 0, 12));
    });
    out.sort((a, b) => a.ts - b.ts);
    S.analyticsLogs = out.slice(-ALOG_MAX);
    S.alogSeeded = true;
    if (out.length) { try { logExec('log', '📊 기존 기록 ' + out.length + '건을 행동 로그로 변환'); } catch (e) { } }
    save();
  } catch (e) {
    console.warn('[용은타운] 행동 로그 변환을 건너뛰었어요.', e && e.message);
  }
}
function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function download(filename, text, mime) {
  try {
    const blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return true;
  } catch (e) { toast('파일을 만들지 못했어요 — 잠시 뒤 다시 시도해 주세요'); return false; }
}
function exportBehaviorCsv() {
  alogSeedOnce();
  const rows = (S.analyticsLogs || []).slice().sort((a, b) => (a.ts || 0) - (b.ts || 0));
  if (!rows.length) { toast('아직 로그가 없어요 — 참은 소비나 미션을 하나 기록해 봐요'); return; }
  const head = ['event_id', 'ts', 'date_kst', 'hour_kst', 'weekday', 'event_type', 'category', 'label', 'value_krw', 'exp'];
  const lines = [head.join(',')];
  rows.forEach((r, i) => {
    lines.push([i + 1, r.ts, r.date_kst, r.hour_kst, r.weekday, r.event_type, r.category, r.label, r.value_krw, r.exp].map(csvCell).join(','));
  });
  if (!download('yongeuntown_behavior_logs_' + TODAY.replace(/-/g, '') + '.csv', '\ufeff' + lines.join('\r\n'), 'text/csv;charset=utf-8;')) return;
  toast('행동 로그 ' + rows.length + '건 CSV를 내려받았어요');
  try { logExec('log', '📊 행동 로그 CSV 내보내기 · ' + rows.length + '건'); } catch (e) { }
  sfx('ok');
}

/* ── 백업 · 복구 ──────────────────────────── */
function exportData() {
  const body = JSON.stringify(S, null, 2);
  if (download('yongeuntown_backup_' + TODAY.replace(/-/g, '') + '.json', body, 'application/json;charset=utf-8;')) {
    toast('백업 파일을 내려받았어요');
    sfx('ok');
  }
}
function importData() { const f = $('#importFile'); if (f) f.click(); }
function handleImport(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const p = JSON.parse(String(r.result || '{}'));
      if (!p || typeof p !== 'object') throw new Error('형식이 달라요');
      confirmSheet('백업 불러오기', '지금 기록을 백업 파일의 기록으로 바꿉니다. 계속할까요?', '불러오기', () => {
        try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { }
        location.reload();
      });
    } catch (e) { toast('불러오지 못했어요 — 백업 파일인지 확인해 주세요'); }
  };
  r.readAsText(file);
}
function resetData() {
  confirmSheet('데이터 초기화', '이 기기의 기록을 모두 지웁니다. 되돌릴 수 없어요. (백업을 먼저 내려받는 걸 추천해요)', '모두 지우기', () => {
    try { localStorage.removeItem(KEY); } catch (e) { }
    location.reload();
  }, true);
}
