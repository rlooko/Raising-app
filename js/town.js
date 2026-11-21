/* ═══════════════════════════════════════════════════════════════
   용은타운 V4 · town
   · 2.5D SVG 마을(3D를 못 쓸 때의 안전망) · 캐릭터 산책 · 말풍선
   · 실행 로그 · 마을 독/필 바 · 건물 이동
   ═══════════════════════════════════════════════════════════════ */

const TW = 360, TH = 430;
const TOWN_PATH = [
  [62, 348], [104, 360], [150, 350], [186, 356], [222, 350], [262, 358], [300, 346],
  [326, 312], [306, 268], [272, 246], [232, 236], [186, 232], [140, 238], [100, 252],
  [72, 286], [58, 318]
];
const TOWN_LOOP = (() => {
  const segs = []; let total = 0;
  for (let i = 0; i < TOWN_PATH.length; i++) {
    const a = TOWN_PATH[i], b = TOWN_PATH[(i + 1) % TOWN_PATH.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    segs.push({ a, b, len, start: total }); total += len;
  }
  return { segs, total };
})();
function townAtDist(d) {
  d = ((d % TOWN_LOOP.total) + TOWN_LOOP.total) % TOWN_LOOP.total;
  for (const s of TOWN_LOOP.segs) {
    if (d <= s.start + s.len) {
      const k = (d - s.start) / s.len;
      return { x: s.a[0] + (s.b[0] - s.a[0]) * k, y: s.a[1] + (s.b[1] - s.a[1]) * k };
    }
  }
  return { x: TOWN_PATH[0][0], y: TOWN_PATH[0][1] };
}
function townAt(t) { return townAtDist(t * TOWN_LOOP.total); }
function townNearestT(x, y) {
  let best = 0, bd = 1e9;
  for (let i = 0; i < 300; i++) {
    const t = i / 300, p = townAt(t), d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
    if (d < bd) { bd = d; best = t; }
  }
  return best;
}

/* 건물 — front: 건물 앞 길 좌표, base: 바닥 y, box: 가로 범위(캐릭터 가림 판정) */
const TOWN_BLD = {
  castle: { name: '데이터 성', emoji: '🏰', front: [100, 252], base: 208, box: [40, 150] },
  house: { name: '수은집', emoji: '🏡', front: [272, 246], base: 224, box: [236, 308] },
  tower: { name: '시계탑', emoji: '⏰', front: [186, 356], base: 292, box: [156, 204] },
  bank: { name: '청산 은행', emoji: '🏦', front: [62, 348], base: 330, box: [24, 100] },
  shop: { name: '아렐로 작업실', emoji: '☕', front: [300, 346], base: 334, box: [262, 334] }
};
let TOWN_SPEED = 25;        // 초당 이동 거리(뷰 단위) — 3D 마을에서는 더 빠르게
const TOWN_FOLLOW = 0.042;  // 춘배가 용은 뒤에 붙는 거리(루프 비율)

const TOWN = {
  ready: false, raf: 0, last: 0, phase: 'day', bub: '', bubUntil: 0, act: null,
  yg: { t: 0.10, target: 0.10, mode: 'wander', after: null, pause: 1.6, hold: 0, workText: '', face: 1, x: 0, y: 0, layer: '', moving: false, el: null, sp: null },
  cb: { t: 0.055, target: 0.055, mode: 'follow', pause: 0, face: 1, x: 0, y: 0, layer: '', moving: false, el: null, sp: null }
};

/* ── 시간대 ───────────────────────────────── */
function townPhaseNow() {
  const h = new Date().getHours();
  if (h >= 6 && h < 17) return 'day';
  if (h >= 17 && h < 20) return 'sunset';
  return 'night';
}
function townMode() { return (S.town && S.town.mode) || 'auto'; }
function townPhase() { const m = townMode(); return m === 'auto' ? townPhaseNow() : m; }
const TOWN_PHASE_LABEL = { day: '낮', sunset: '노을', night: '밤' };
const TOWN_MODE_LABEL = { auto: '자동', day: '낮', sunset: '노을', night: '밤' };
function townPhaseIcon() {
  const m = townMode(), p = m === 'auto' ? townPhaseNow() : m;
  return m === 'auto' ? (p === 'day' ? '🌤' : p === 'sunset' ? '🌇' : '🌙') : (m === 'day' ? '☀️' : m === 'sunset' ? '🌇' : '🌙');
}
function applyPhase() {
  const el = $('#town'); if (!el) return;
  const p = townPhase();
  TOWN.phase = p;
  el.classList.remove('ph-day', 'ph-sunset', 'ph-night');
  el.classList.add('ph-' + p);
  if (window.TOWN3D && window.TOWN3D.ok) window.TOWN3D.setPhase(p);
  const icon = $('#phaseIcon'); if (icon) icon.textContent = townPhaseIcon();
  const pti = $('#pillThemeIcon'); if (pti) pti.textContent = townPhaseIcon();
  const btn = $('#phaseBtn');
  if (btn) btn.setAttribute('aria-label', '시간대 ' + TOWN_MODE_LABEL[townMode()] + ' — 눌러서 바꾸기');
}
function townResetView() {
  if (window.TOWN3D && window.TOWN3D.ok) { window.TOWN3D.resetView(); sfx('tap'); }
  else toast('시점 리셋은 3D 마을에서만 돼요');
}
function townPhaseToggle() {
  const order = ['auto', 'day', 'sunset', 'night'];
  const cur = townMode();
  const next = order[(order.indexOf(cur) + 1) % order.length];
  S.town = S.town || {};
  S.town.mode = next;
  save(); applyPhase(); renderLive();
  toast('시간대 · ' + (next === 'auto' ? '자동 (' + TOWN_PHASE_LABEL[townPhaseNow()] + ')' : TOWN_PHASE_LABEL[next] + ' 미리보기'));
  sfx('tap');
}

/* ── 캐릭터 ───────────────────────────────── */
function townIsBehind(x, y) {
  for (const k in TOWN_BLD) {
    const b = TOWN_BLD[k];
    if (y < b.base - 5 && x > b.box[0] && x < b.box[1]) return true;
  }
  return false;
}
function placeChar(c) {
  const p = townAt(c.t);
  c.x = p.x; c.y = p.y;
  if (window.TOWN3D && window.TOWN3D.ok) return;   // 3D 마을이 그립니다
  if (!c.el) return;
  c.el.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ',' + p.y.toFixed(1) + ') scale(' + (c.face * 1.14) + ',1.14)');
  const lid = townIsBehind(p.x, p.y) ? 'townCharsBack' : 'townCharsFront';
  if (c.layer !== lid) {
    const g = document.getElementById(lid);
    if (g) { g.appendChild(c.el); c.layer = lid; }
  }
}
function setWork(on) {
  const sp = TOWN.yg.sp; if (!sp) return;
  sp.classList.toggle('work', !!on);
  if (on) sp.dataset.expr = 'focus';
  else if (sp.dataset.expr === 'focus') sp.dataset.expr = 'idle';
}
function stepAlong(c, dt, dist) {
  const diff = (((c.target - c.t + 1.5) % 1) - 0.5);
  const step = dist / TOWN_LOOP.total * dt;
  if (Math.abs(diff) <= step) { c.t = c.target; return true; }
  c.t = (c.t + Math.sign(diff) * step + 1) % 1;
  c.face = Math.sign(diff) > 0 ? 1 : -1;
  return false;
}
function updateYongeun(dt) {
  const c = TOWN.yg;
  let moving = false;
  if (c.pause > 0) {
    c.pause -= dt;
    if (c.pause <= 0) {
      if (c.mode === 'work') { c.mode = 'wander'; setWork(false); }
      c.pause = 0;
    }
  } else if (c.mode === 'goto') {
    const arrived = stepAlong(c, dt, TOWN_SPEED);
    if (arrived) {
      if (c.after === 'work') {
        c.mode = 'work'; c.pause = c.hold || 4;
        setWork(true);
        bubbleRaw(c.workText || '작업 중...', (c.hold || 4) * 1000);
      } else {
        c.mode = 'wander'; c.pause = 0.7 + Math.random() * 2.4;
      }
      c.after = null;
    } else moving = true;
  } else if (c.mode === 'wander') {
    if (Math.random() < 0.55) {
      c.target = (c.t + (Math.random() * 0.16 - 0.08) + 1) % 1;
      c.mode = 'goto'; c.after = 'wander'; c.hold = 0;
    } else c.pause = 1 + Math.random() * 2.2;
  }
  c.moving = moving;
  if (c.sp) c.sp.classList.toggle('walk', moving);
}
function updateChunbae(dt) {
  const c = TOWN.cb;
  c.target = (TOWN.yg.t - TOWN_FOLLOW + 1) % 1;
  const arrived = stepAlong(c, dt, TOWN_SPEED + 8);
  c.moving = !arrived;
  if (c.sp) c.sp.classList.toggle('walk', !arrived);
}
function townTick(ts) {
  TOWN.raf = requestAnimationFrame(townTick);
  if (!TOWN.ready) return;
  if (!TOWN.last) { TOWN.last = ts; return; }
  const dt = Math.min(0.1, (ts - TOWN.last) / 1000);
  TOWN.last = ts;
  if (document.hidden) return;
  const home = $('#screen-town');
  if (!home || !home.classList.contains('active')) return;
  updateYongeun(dt);
  updateChunbae(dt);
  placeChar(TOWN.yg); placeChar(TOWN.cb);
  paintBubblePos();
}
function initTownChars() {
  if (TOWN.ready) return;
  const ygEl = document.querySelector('#town .char-yongeun');
  const cbEl = document.querySelector('#town .char-chunbae');
  if (!ygEl || !cbEl) return;
  TOWN.yg.el = ygEl; TOWN.yg.sp = ygEl.querySelector('.sp');
  TOWN.cb.el = cbEl; TOWN.cb.sp = cbEl.querySelector('.sp');
  placeChar(TOWN.yg); placeChar(TOWN.cb);
  TOWN.ready = true;
  if (!TOWN.raf) { TOWN.last = 0; TOWN.raf = requestAnimationFrame(townTick); }
}
let lastBubPos = '';
function paintBubblePos() {
  const el = $('#townBub'); if (!el) return;
  if (window.TOWN3D && window.TOWN3D.ok) { window.TOWN3D.paintBubble(el); return; }
  const c = TOWN.yg;
  const left = clamp(c.x / TW * 100, 9, 91);
  const top = Math.max(8, (c.y - 42) / TH * 100);
  const key = left.toFixed(1) + ',' + top.toFixed(1);
  if (key !== lastBubPos) {
    lastBubPos = key;
    el.style.left = left + '%';
    el.style.top = top + '%';
  }
  el.classList.toggle('on', !!TOWN.bub && Date.now() < TOWN.bubUntil);
}
function bubbleRaw(text, ms) {
  TOWN.bub = text || '';
  TOWN.bubUntil = Date.now() + (ms || 4200);
  const el = $('#townBub');
  if (el) {
    el.textContent = TOWN.bub;
    el.classList.toggle('on', !!TOWN.bub);
  }
  paintBubblePos();
}
function bubbleSay(text) { bubbleRaw(text, 4600); }

/* 활동: 건물 앞으로 걸어가서 작업 모션 + 말풍선 */
function townActivity(key, text, ms) {
  const b = TOWN_BLD[key]; if (!b || !TOWN.ready) { if (text) bubbleRaw(text, ms); return; }
  const c = TOWN.yg;
  c.target = townNearestT(b.front[0], b.front[1]);
  c.mode = 'goto'; c.after = 'work';
  c.hold = Math.max(2.4, (ms || 4500) / 1000);
  c.workText = text || (b.emoji + ' ' + b.name);
  c.pause = 0;
  TOWN.act = key;
}
function townStay(key, text) {
  townActivity(key, text, 3600);
  TOWN.yg.hold = 3600;
}
function townLeave(text) {
  TOWN.act = null;
  const c = TOWN.yg;
  if (c.mode === 'work') { c.mode = 'wander'; c.pause = 0.4; }
  setWork(false);
  if (text) bubbleRaw(text, 4000);
}

/* ── 렌더 ─────────────────────────────────── */
function renderTown() {
  const el = $('#town'); if (!el) return;
  applyPhase();
  initTownChars();
  const tw = document.querySelector('#town .tower');
  if (tw) tw.classList.toggle('tower-lit', !!FOCUS.running);
  const d = debtState();
  const pct = clamp(debtPct(), 0, 100);
  const g = $('#bankGauge'); if (g) g.style.width = Math.max(0.6, pct) + '%';
  const gt = $('#bankGaugeTxt'); if (gt) gt.textContent = '갚음 ' + (pct < 10 ? pct.toFixed(1) : Math.round(pct)) + '%';
  applyHouseDecor();
  if (window.TOWN3D && window.TOWN3D.ok) {
    window.TOWN3D.setState({
      stage: stageIndexFor(levelInfo(S.exp).level),
      towerLit: !!FOCUS.running,
      debtPct: pct,
      houseDone: houseDone(),
      phase: townPhase()
    });
  }
  const sp = TOWN.yg.sp;
  if (sp) {
    const st = stageIndexFor(levelInfo(S.exp).level);
    sp.classList.remove('st0', 'st1', 'st2', 'st3', 'st4', 'st5');
    sp.classList.add('st' + st);
  }
  renderLive();
  renderExecLog();
}
function renderLive() {
  const t = $('#liveText'); if (!t) return;
  let s;
  if (FOCUS.running) {
    const rem = Math.max(0, T.remaining);
    s = '타임어택 ' + pad(Math.floor(rem / 60)) + ':' + pad(rem % 60) + ' 집중 중';
    if (TOWN.act === 'tower') bubbleRaw('타임어택 중! ' + pad(Math.floor(rem / 60)) + ':' + pad(rem % 60), 2500);
  } else if (FOCUS.remaining === 0 && FOCUS.total > 60) {
    s = '타임어택 완료 · ' + Math.round(FOCUS.total / 60) + '분';
  } else {
    const done = S.quests.filter(q => q.doneDate === TODAY).length;
    s = '마을 산책 중 · 오늘 ' + done + '/' + S.quests.length + ' 완료';
  }
  t.textContent = s;
}


const EXEC_BADGE = { quest: '✓ DONE', timer: '✓ DONE', stage: '✓ DONE', skill: '✓ DONE', house: '✓ DONE', money: '₩ 기록', debt: '₩ 상환' };
function logExec(kind, text) {
  if (!Array.isArray(S.exec)) S.exec = [];
  const now = new Date();
  S.exec.push({ ts: now.getTime(), date: TODAY, kind: kind || 'etc', text: String(text || '').slice(0, 80) });
  if (S.exec.length > 200) S.exec = S.exec.slice(-200);
  save();
  renderExecLog();
}
function renderExecLog() {
  const list = $('#execList'); if (!list) return;
  const all = Array.isArray(S.exec) ? S.exec : [];
  const n = $('#execCount'); if (n) n.textContent = all.length;
  const arr = all.slice(-24).reverse();
  const lastEl = $('#execLast');
  if (lastEl) lastEl.textContent = arr.length ? arr[0].text : '아직 기록이 없어요';
  if (!arr.length) {
    list.innerHTML = '<div class="exec-empty">퀘스트를 끝내거나 돈을 기록하면 여기에 <b>✓ DONE</b>으로 쌓여요.</div>';
    return;
  }
  list.innerHTML = arr.map(e => {
    const d = new Date(e.ts || Date.parse(e.date + 'T09:00:00'));
    const tm = isFinite(d.getTime()) ? pad(d.getHours()) + ':' + pad(d.getMinutes()) : '--:--';
    const warm = e.kind === 'money' || e.kind === 'debt';
    return '<div class="ex-item"><span class="ex-time">' + tm + '</span>' +
      '<span class="ex-txt">' + esc(e.text) + '</span>' +
      '<span class="ex-badge' + (warm ? ' warm' : '') + '">' + (EXEC_BADGE[e.kind] || '•') + '</span></div>';
  }).join('');
}
function toggleExec() {
  const p = $('#execPanel'); if (!p) return;
  const open = p.classList.toggle('open');
  const more = $('#execMore'); if (more) more.textContent = open ? '접기 ▴' : '펼치기 ▾';
  const head = p.querySelector('.exec-head'); if (head) head.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) renderExecLog();
  sfx('tap');
}


/* ── 초기화 시 캐릭터 외형 동기화 ───────────── */
function townSyncSprites() {
  const sp = TOWN.yg.sp;
  if (!sp) return;
  const st = stageIndexFor(levelInfo(S.exp).level);
  sp.classList.remove('st0', 'st1', 'st2', 'st3', 'st4', 'st5');
  sp.classList.add('st' + st);
}

/* ── 캐릭터 반응 ──────────────────────────── */
let exprTimer = null;
function setExpr(expr, ms) {
  const sp = TOWN.yg.sp;
  if (!sp) return;
  sp.dataset.expr = expr;
  if (exprTimer) clearTimeout(exprTimer);
  if (ms) exprTimer = setTimeout(() => { if (sp.dataset.expr === expr) sp.dataset.expr = 'idle'; }, ms);
}

const TOWN_ACT = { castle: 'openCastle', house: 'openHouse', tower: 'openTower', bank: 'openBank', shop: 'openWorkshop' };
let TOWN_JUMP_T = 0, TOWN_DOCK_KEY = '';

function townFocus(key) {
  if (window.TOWN3D && window.TOWN3D.ok && typeof window.TOWN3D.focus === 'function') return window.TOWN3D.focus(key);
  return false;
}
function townJump(key) {
  const b = TOWN_BLD[key]; if (!b) return;
  TOWN_DOCK_KEY = key;
  $$('#townDock .dock-btn').forEach(el => el.classList.toggle('on', el.dataset.town === key));
  if (TOWN.ready) townActivity(key, b.emoji + ' ' + b.name + ' 가는 중…', 3000);
  townFocus(key);
  sfx('tap');
  clearTimeout(TOWN_JUMP_T);
  TOWN_JUMP_T = setTimeout(function () {
    if (typeof handleAction === 'function') {
      const tapEl = document.createElement('button');
      tapEl.dataset.act = TOWN_ACT[key];
      handleAction(TOWN_ACT[key], tapEl);
    }
    TOWN_DOCK_KEY = '';
    $$('#townDock .dock-btn').forEach(el => el.classList.remove('on'));
  }, 820);
}
function townWalkTo(t) {
  if (!TOWN.ready) return;
  const c = TOWN.yg;
  c.target = ((t % 1) + 1) % 1;
  c.mode = 'goto'; c.after = null; c.hold = 0; c.pause = 0;
  TOWN.act = null;
  setWork(false);
}
function townPill(name) {
  if (name === 'theme') { townPhaseToggle(); return; }
  if (name === 'log') {
    const fold = document.getElementById('foldExec');
    if (fold) {
      fold.open = true;
      if (fold.scrollIntoView) fold.scrollIntoView({ behavior: 'smooth', block: 'center' });
      renderExecLog();
    }
    return;
  }
  if (name === 'sync') {
    const st = (window.YONG_SYNC && window.YONG_SYNC.status && window.YONG_SYNC.status()) || '';
    if (st === 'synced') toast('☁️ Firebase에 저장됐어요 · 폰과 컴퓨터가 같이 써요');
    else if (st === 'saving') toast('☁️ 저장 중…');
    else { toast('☁️ 다시 연결해 볼게요'); if (window.YONG_SYNC && window.YONG_SYNC.boot) window.YONG_SYNC.boot(); }
    return;
  }
  if (!(window.TOWN3D && window.TOWN3D.ok)) { toast('이 기능은 3D 마을에서만 돼요'); return; }
  if (name === 'freeze') {
    const on = window.TOWN3D.setFrozen(!window.TOWN3D.isFrozen());
    const el = $('#pillFreeze');
    if (el) { el.classList.toggle('on', !!on); el.setAttribute('aria-pressed', on ? 'true' : 'false'); }
    sfx('tap');
    return;
  }
  if (name === 'names') {
    const on = window.TOWN3D.toggleNames();
    const el = $('#pillNames');
    if (el) { el.classList.toggle('on', !!on); el.setAttribute('aria-pressed', on ? 'true' : 'false'); }
    sfx('tap');
    return;
  }
  if (name === 'bubbles') {
    const on = window.TOWN3D.toggleBubbles();
    const el = $('#pillBubbles');
    if (el) { el.classList.toggle('on', !!on); el.setAttribute('aria-pressed', on ? 'true' : 'false'); }
    sfx('tap');
    return;
  }
}
const TOWN_KEY_OF = { openCastle: 'castle', openHouse: 'house', openTower: 'tower', openBank: 'bank', openWorkshop: 'shop' };
document.addEventListener('click', function (e) {
  const tag = e.target.closest && e.target.closest('#town .town-tag');
  if (tag && tag.dataset.act && TOWN_KEY_OF[tag.dataset.act]) {
    e.preventDefault(); e.stopImmediatePropagation();
    townJump(TOWN_KEY_OF[tag.dataset.act]);
    return;
  }
  const d = e.target.closest && e.target.closest('[data-town]');
  if (d) { e.preventDefault(); townJump(d.dataset.town); return; }
  const p = e.target.closest && e.target.closest('[data-townpill]');
  if (p) { e.preventDefault(); townPill(p.dataset.townpill); }
});
window.townJump = townJump;
window.townWalkTo = townWalkTo;

