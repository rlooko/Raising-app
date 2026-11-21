/* ═══════════════════════════════════════════════════════════════
   용은타운 V4 · app
   · 3탭: 🏠 오늘 / 🧪 실전 랩 / 🏰 타운 & 로그
   · 오늘의 10분 원픽 + 집중 타이머 · 참은 소비 원탭 → 빚 벽돌
   · 실전 SQL 랩 · GitHub 잔디 · 커리어 코스
   · 마을 진행도 · 내 데이터 대시보드
   ═══════════════════════════════════════════════════════════════ */

/* ── 집중 타이머 (원픽 10분) ───────────────── */
let LAB_VIEW = { mission: SQL_MISSIONS[0].id, hint: false, answer: false, last: null };

function paintFocus() {
  const total = Math.max(1, FOCUS.total);
  const rem = clamp(FOCUS.remaining, 0, total);
  const mm = Math.floor(rem / 60), ss = rem % 60;
  const t = $('#focusTime'); if (t) t.textContent = pad(mm) + ':' + pad(ss);
  const ring = $('#focusRing');
  if (ring) ring.setAttribute('stroke-dashoffset', (FOCUS_RING * (1 - rem / total)).toFixed(1));
  const mode = $('#focusMode');
  if (mode) mode.textContent = FOCUS.running ? 'FOCUS' : (rem === 0 ? 'DONE' : (rem < total ? 'PAUSED' : 'READY'));
  const btn = $('#focusToggle');
  if (btn) btn.textContent = FOCUS.running ? '일시정지' : (rem === 0 ? '다시 시작' : (rem < total ? '계속' : '10분 시작'));
  const wrap = $('#focusWrap'); if (wrap) wrap.classList.toggle('running', FOCUS.running);
  document.title = FOCUS.running ? (pad(mm) + ':' + pad(ss) + ' · 용은타운') : '용은타운 · 권용은 키우기';
}
function focusPersist() {
  S.timer = {
    minutes: Math.max(1, Math.round(FOCUS.total / 60)), running: FOCUS.running, endAt: FOCUS.endAt || 0,
    remaining: Math.max(0, Math.round(FOCUS.remaining)), questId: '', skillId: ''
  };
  save();
}
function focusLoop() {
  if (FOCUS.tick) clearInterval(FOCUS.tick);
  FOCUS.tick = setInterval(focusTick, 250);
}
function focusTick() {
  if (!FOCUS.running) return;
  FOCUS.remaining = Math.max(0, Math.round((FOCUS.endAt - Date.now()) / 1000));
  paintFocus();
  if (FOCUS.remaining <= 0) finishFocus();
}
function focusStart() {
  if (FOCUS.running) { focusPause(); return; }
  if (FOCUS.total <= 0) FOCUS.total = 600;
  if (FOCUS.remaining <= 0) FOCUS.remaining = FOCUS.total;
  FOCUS.running = true;
  FOCUS.endAt = Date.now() + FOCUS.remaining * 1000;
  focusPersist(); focusLoop(); paintFocus();
  TOWN.act = 'tower';
  try { townStay('tower', '원픽 집중 중!'); renderTown(); } catch (e) { }
  sfx('tap'); vibe(12);
}
function focusPause() {
  if (!FOCUS.running) return;
  FOCUS.remaining = Math.max(0, Math.round((FOCUS.endAt - Date.now()) / 1000));
  FOCUS.running = false; FOCUS.endAt = 0;
  if (FOCUS.tick) { clearInterval(FOCUS.tick); FOCUS.tick = null; }
  focusPersist(); paintFocus();
  try { townLeave('잠깐 쉬는 중'); } catch (e) { }
}
function focusReset() {
  FOCUS.running = false; FOCUS.endAt = 0;
  FOCUS.total = 600; FOCUS.remaining = 600;
  if (FOCUS.tick) { clearInterval(FOCUS.tick); FOCUS.tick = null; }
  focusPersist(); paintFocus();
}
function restoreFocus() {
  const t = S.timer || {};
  FOCUS.total = Math.max(60, (Number(t.minutes) || 10) * 60);
  if (FOCUS.total < 300) FOCUS.total = 600;
  if (t.running && t.endAt) {
    const rem = Math.max(0, Math.round((t.endAt - Date.now()) / 1000));
    FOCUS.remaining = rem; FOCUS.endAt = t.endAt;
    if (rem > 0) { FOCUS.running = true; focusLoop(); }
    else { FOCUS.running = false; FOCUS.remaining = 0; }
  } else {
    FOCUS.remaining = Math.max(0, Number(t.remaining != null ? t.remaining : FOCUS.total));
    FOCUS.running = false;
    if (FOCUS.remaining > FOCUS.total) FOCUS.remaining = FOCUS.total;
  }
  paintFocus();
}

/* ── 원픽 완료 ─────────────────────────────── */
function completePick(fromTimer) {
  const p = pickToday();
  const done = pickDoneInfo();
  if (done) { toast('오늘 원픽은 이미 끝났어요 · 내일 또 만나요'); return; }
  const mins = Math.round(FOCUS.total / 60) || 10;
  const exp = fromTimer ? 40 : 15;
  S.pickDone = S.pickDone || {};
  S.pickDone[TODAY] = { id: p.id, ts: Date.now(), mins: fromTimer ? mins : 0, fromTimer: !!fromTimer };
  save();
  alog('pick_done', p.id, p.title, 0, exp);
  logExec('pick', '🎯 원픽 완료 · ' + p.title);
  awardBadge('pick1');
  const beforeCombo = pickCombo();
  addExp(exp, { noLevelUp: true });
  FOCUS.running = false; FOCUS.endAt = 0;
  if (FOCUS.tick) { clearInterval(FOCUS.tick); FOCUS.tick = null; }
  FOCUS.remaining = 0;
  focusPersist(); paintFocus();
  renderToday(); renderTownTab();
  try { townLeave('오늘 하나 끝! 🔥'); } catch (e) { }
  sfx('done'); vibe([25, 70, 25, 70, 160]); confetti(34);
  showSheet({
    title: '🎯 오늘의 원픽 완료!',
    body: `<div style="text-align:center;padding:2px 0 12px">
      <div style="font-size:15px;font-weight:900;color:#fff">${esc(p.title)}</div>
      <div style="font-size:13px;color:var(--tx2);font-weight:700;margin-top:4px">+${exp} EXP${fromTimer ? ' · ' + mins + '분 집중' : ''}</div>
      <div class="pick-combo-big">🔥 ${beforeCombo}일 콤보</div></div>
      <div class="callout">10분은 짧아서 좋아요. 오늘 하나로 충분합니다 — 대신 내일도 하나.</div>`,
    actions: [{ label: '좋아!', kind: 'main', onClick: closeSheet }]
  });
}
function finishFocus() {
  if (FOCUS.tick) { clearInterval(FOCUS.tick); FOCUS.tick = null; }
  FOCUS.running = false; FOCUS.endAt = 0; FOCUS.remaining = 0;
  completePick(true);
}

/* ── 참은 소비 기록 ─────────────────────────── */
function recordSkip(label, amount, emoji) {
  amount = Math.max(0, Math.round(Number(amount) || 0));
  if (!amount) { toast('금액을 입력해 주세요'); return; }
  const mk = monthKey();
  S.brick = S.brick || { items: [], goal: 200000 };
  S.brick.items.push({ id: uid(), date: TODAY, month: mk, label: label || '참은 소비', amount, ts: Date.now(), emoji: emoji || '💸' });
  if (S.brick.items.length > 800) S.brick.items = S.brick.items.slice(-800);
  const n = brickItems().length;
  if (n >= 10) awardBadge('brick10');
  save();
  alog('brick_break', label || '참은 소비', label || '', amount, 0);
  logExec('brick', '🧱 참았어 · ' + (label || '참은 소비') + ' ' + won(amount));
  const gained = 8 + Math.min(22, Math.round(amount / 1000));
  addExp(gained, { noLevelUp: true });
  sfx('ok'); vibe(14);
  toast('🧱 ' + (label || '참은 소비') + ' ' + won(amount) + ' 참음 · +' + gained + ' EXP');
  try { bubbleSay(emoji + ' ' + won(amount) + ' 참았어! 벽돌 -' + Math.max(1, Math.round(amount / 1000))); townActivity('bank', '동전 넣는 중!', 2600); } catch (e) { }
  renderToday(); renderTownTab();
}
function openSkipSheet() {
  showSheet({
    title: '✍️ 직접 입력',
    body: `<label class="field"><span>뭘 참았어?</span><input id="skLabel" maxlength="30" placeholder="예: 스타벅스 라떼"></label>
      <label class="field" style="margin-top:10px"><span>아낀 금액 (원)</span><input id="skAmt" type="number" inputmode="numeric" min="0" step="500" placeholder="4500"></label>`,
    actions: [
      { label: '취소', onClick: closeSheet },
      { label: '벽돌 깨기', kind: 'main', onClick: () => {
          const l = $('#skLabel'), a = $('#skAmt');
          const label = (l && l.value || '').trim() || '참은 소비';
          const amt = num(a && a.value);
          closeSheet();
          if (!amt) { toast('금액을 입력해 주세요'); return; }
          recordSkip(label, amt, '💸');
        } }
    ]
  });
}

/* ── 렌더: 헤더 · 오늘 ─────────────────────── */
function renderHeader() {
  const L = levelInfo(S.exp);
  const set = (id, v) => { const el = $('#' + id); if (el) el.textContent = v; };
  set('lvBadge', 'Lv.' + L.level);
  set('charName', S.name || '몽글이');
  set('charTitle', L.title);
  set('todayExp', '오늘 +' + todayExpAmt() + ' EXP');
  set('streakVal', streakValue());
  const fill = $('#expFill'); if (fill) fill.style.width = L.pct + '%';
  set('expTxt', L.cur + ' / ' + L.need);
  const dd = $('#ddayRow');
  if (dd) {
    dd.innerHTML = V2_DDAY.map(d => {
      const n = v2Dday(d.date);
      return `<span class="dday-chip">${d.emoji} ${d.label} <b>${n >= 0 ? 'D-' + n : 'D+' + (-n)}</b></span>`;
    }).join('');
  }
}
function renderCharacter(force) { try { townSyncSprites(); } catch (e) { } }

function renderToday() {
  renderHeader();
  renderPick();
  renderSkip();
  renderTodayStats();
  renderQuests();
  renderBadges();
  renderMoneyBox();
  renderSettings();
}
function renderPick() {
  const p = pickToday();
  const slot = pickSlot(new Date().getHours());
  const done = pickDoneInfo();
  const set = (id, v) => { const el = $('#' + id); if (el) el.textContent = v; };
  set('pickSlot', slot.icon + ' ' + slot.label);
  set('pickEmoji', p.emoji);
  set('pickTitle', p.title);
  set('pickWhy', p.why);
  const combo = pickCombo();
  const todayDone = !!done;
  set('pickComboTxt', combo > 0
    ? '🔥 콤보 ' + combo + '일' + (todayDone ? '' : ' · 오늘 채우면 ' + (combo + 1) + '일')
    : '🔥 오늘부터 콤보 시작');
  set('pickDoneTxt', done ? '오늘 완료 · ' + hm(done.ts) : '아직 안 했어요');
  const card = $('#pickCard');
  if (card) card.classList.toggle('done', !!done);
  const actions = $('#pickActions');
  if (actions) {
    actions.innerHTML = done
      ? `<button class="btn btn-ghost" data-act="pickGo">${p.go === 'lab' ? '🧪 랩에서 이어하기' : '내일 또 하기'}</button>
         <button class="btn btn-ghost" data-act="pickSwap">다른 원픽 보기</button>`
      : `<button class="btn btn-main" id="focusToggle" data-act="pickStart">${FOCUS.running ? '일시정지' : (FOCUS.remaining < FOCUS.total && FOCUS.remaining > 0 ? '계속' : '10분 시작')}</button>
         <button class="btn btn-ghost" data-act="pickDone">이미 했어요</button>
         <button class="btn btn-ghost" data-act="pickSwap">다른 원픽</button>`;
  }
  paintFocus();
}
function renderTodayStats() {
  const box = $('#todayStats'); if (!box) return;
  const skips = brickOfMonth(monthKey());
  const solvedToday = Object.keys(S.sql.solved || {}).filter(k => S.sql.solved[k] === TODAY).length;
  const gh = GH.cached();
  const ghToday = gh && gh.fetchedAt && gh.todayCount > 0;
  const items = [
    { k: '오늘 방어', v: won(brickSum(skips.filter(x => x.date === TODAY))), e: '💸' },
    { k: '참은 소비', v: skips.filter(x => x.date === TODAY).length + '건', e: '🧱' },
    { k: 'SQL 통과', v: solvedToday ? '오늘 ' + solvedToday + '개' : sqlSolvedCount() + '/' + SQL_MISSIONS.length, e: '🧪' },
    { k: '오늘 잔디', v: ghToday ? '🌱 ' + gh.todayCount + '커밋' : '🥀 아직', e: '🌿' }
  ];
  box.innerHTML = items.map(i => `<div class="ts"><span>${i.e}</span><b>${esc(i.v)}</b><em>${esc(i.k)}</em></div>`).join('');
}
function renderBadges() {
  const box = $('#badgeRow'); if (!box) return;
  box.innerHTML = BADGE_DEFS.map(b => {
    const on = !!S.badges[b[0]];
    return `<span class="badge${on ? ' on' : ''}" title="${esc(b[2])}">${b[1]}<em>${esc(b[2])}</em></span>`;
  }).join('');
  const meta = $('#badgeMeta');
  if (meta) meta.textContent = BADGE_DEFS.filter(b => S.badges[b[0]]).length + '개';
}
function renderSkip() {
  const chips = $('#skipChips');
  if (chips && !chips.dataset.built) {
    chips.innerHTML = SKIP_CHIPS.map(c => `<button class="skip-chip" data-act="skipChip" data-key="${esc(c.key)}" data-amt="${c.amount}"><span>${c.emoji}</span><b>${esc(c.key)}</b><em>${c.amount.toLocaleString('ko-KR')}원</em></button>`).join('') +
      `<button class="skip-chip custom" data-act="skipCustom"><span>✍️</span><b>직접</b><em>금액 입력</em></button>`;
    chips.dataset.built = '1';
  }
  const mk = monthKey();
  const month = brickOfMonth(mk);
  const set = (id, v) => { const el = $('#' + id); if (el) el.textContent = v; };
  set('skipMonth', '이번 달 ' + won(brickSum(month)));
  const pct = debtPct();
  const cleared = debtCleared();
  set('debtLeft', won(Math.max(0, DEBT_TOTAL - cleared)));
  set('debtPctTxt', pct.toFixed(2) + '% 갚음');
  set('debtSumTxt', '방어 ' + won(brickSum(brickItems())) + ' · 상환 ' + won(debtState().repaid));
  const fill = $('#debtFill'); if (fill) fill.style.width = Math.max(0.6, pct) + '%';
  const goal = Number(S.brick.goal) || 200000;
  const gp = clamp(Math.round(brickSum(month) / goal * 100), 0, 100);
  set('skipGoal', '이번 달 목표 ' + won(goal) + ' · ' + gp + '%');
  const gfill = $('#skipGoalFill'); if (gfill) gfill.style.width = gp + '%';
  const net = monthNetV2(mk);
  const netEl = $('#netNow');
  if (netEl) { netEl.textContent = won(net); netEl.className = net >= 0 ? 'good' : 'bad'; }
}

/* ── 렌더: 퀘스트 ──────────────────────────── */
function renderQuests() {
  const box = $('#questList'); if (!box) return;
  const today = S.quests.filter(q => q.doneDate !== TODAY);
  const done = S.quests.filter(q => q.doneDate === TODAY);
  const all = done.concat(today);
  box.innerHTML = all.map(q => `<button class="quest-item${q.doneDate === TODAY ? ' done' : ''}" data-act="questToggle" data-id="${esc(q.id)}">
      <span class="qbox">${q.doneDate === TODAY ? '✓' : ''}</span>
      <span class="qtext">${esc(q.title)}</span>
      <span class="qmin">${q.minutes}분</span></button>`).join('') || '<div class="empty">오늘 퀘스트가 없어요</div>';
  const meta = $('#questMeta'); if (meta) meta.textContent = done.length + '/' + S.quests.length;
}
function toggleQuest(id) {
  const q = S.quests.find(x => x.id === id); if (!q) return;
  if (q.doneDate === TODAY) {
    q.doneDate = null;
    logExec('quest', '퀘스트 해제 · ' + q.title);
    toast('체크를 풀었어요');
  } else {
    q.doneDate = TODAY; q.deferDate = null;
    alog('quest_complete', '퀘스트', q.title, 0, q.exp);
    logExec('quest', '✓ ' + q.title);
    awardBadge('firstQuest');
    addExp(q.exp, { noLevelUp: true });
    toast('+ ' + q.exp + ' EXP · ' + short(q.title, 16));
    sfx('ok');
    try { bubbleSay('✓ ' + short(q.title, 14) + ' 완료!'); } catch (e) { }
  }
  save(); renderQuests(); renderHeader();
}
function openQuestSheet() {
  showSheet({
    title: '퀘스트 추가',
    body: `<label class="field"><span>할 일</span><input id="qTitle" maxlength="40" placeholder="예: SQLD 기출 10문제"></label>
      <label class="field" style="margin-top:10px"><span>예상 시간 (분)</span><input id="qMin" type="number" min="5" step="5" value="10"></label>`,
    actions: [
      { label: '취소', onClick: closeSheet },
      { label: '추가', kind: 'main', onClick: () => {
          const t = ($('#qTitle') && $('#qTitle').value || '').trim();
          if (!t) { toast('할 일을 적어 주세요'); return; }
          const m = Math.max(5, num($('#qMin') && $('#qMin').value) || 10);
          S.quests.push({ id: uid(), title: t, minutes: m, exp: 30 + m * 2, doneDate: null, deferDate: null, skillId: '' });
          save(); closeSheet(); renderQuests(); toast('퀘스트를 추가했어요');
        } }
    ]
  });
}

/* ── 렌더: 가계부 ──────────────────────────── */
function renderMoneyBox() {
  const box = $('#moneyBox'); if (!box) return;
  const mk = monthKey();
  const list = moneyOf(mk).slice().sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.ts || 0) - (a.ts || 0));
  const inc = sumType(list, 'income') + sumType(list, 'side');
  const out = sumType(list, 'expense') + sumType(list, 'fixed');
  const rows = list.slice(0, 12).map(e => {
    const t = MONEY_TYPES[e.type] || MONEY_TYPES.expense;
    return `<div class="mn-row"><span class="mn-ic">${t.emoji}</span><span class="mn-tx"><b>${esc(e.label || t.label)}</b><em>${esc((e.date || '').slice(5).replace('-', '/'))} · ${t.label}</em></span>
      <span class="mn-amt ${t.sign > 0 ? 'in' : 'out'}">${t.sign > 0 ? '+' : '-'}${won(e.amount)}</span>
      <button class="mn-del" data-act="moneyDel" data-id="${esc(e.id || '')}" aria-label="삭제">✕</button></div>`;
  }).join('') || '<div class="empty">이번 달 기록이 없어요</div>';
  box.innerHTML = `
    <div class="mn-sum"><div><span>수입+부업</span><b class="good">${won(inc)}</b></div><div><span>지출+고정비</span><b class="bad">${won(out)}</b></div><div><span>순현금</span><b class="${inc - out >= 0 ? 'good' : 'bad'}">${won(inc - out)}</b></div></div>
    <div class="quick-row">
      <button data-act="moneyNew" data-type="income">+ 수입</button>
      <button data-act="moneyNew" data-type="side">+ 부업</button>
      <button data-act="moneyNew" data-type="expense">+ 지출</button>
      <button data-act="moneyNew" data-type="fixed">+ 고정비</button>
    </div>
    <div class="safety-line">
      <div class="sl-top"><span>🛟 안전망</span><b>${won(safetyNow())}</b><em>목표 ${won(Number(S.safetyGoal) || 3000000)}</em>
        <button class="link-btn" data-act="editSafety">수정</button></div>
      <div class="goal-gauge"><i style="width:${clamp(Math.round(safetyNow() / Math.max(1, Number(S.safetyGoal) || 3000000) * 100), 0, 100)}%"></i></div>
    </div>
    <div class="mn-list">${rows}</div>`;
}
function openSafetySheet() {
  showSheet({
    title: '🛟 안전망',
    body: `<p class="hint" style="margin-bottom:10px">안전망 = 시작 비상금 + 이 앱에 기록한 순현금(수입·부업 − 지출·고정비)</p>
      <label class="field"><span>목표 금액 (원)</span><input id="sfGoal" type="number" inputmode="numeric" min="0" step="100000" value="${Number(S.safetyGoal) || 3000000}"></label>
      <label class="field" style="margin-top:10px"><span>시작 비상금 (원)</span><input id="sfBase" type="number" inputmode="numeric" min="0" step="100000" value="${Number(S.safetyBase) || 0}"></label>`,
    actions: [
      { label: '취소', onClick: closeSheet },
      { label: '저장', kind: 'main', onClick: () => {
          S.safetyGoal = Math.max(0, num($('#sfGoal') && $('#sfGoal').value) || 3000000);
          S.safetyBase = Math.max(0, num($('#sfBase') && $('#sfBase').value) || 0);
          save(); closeSheet(); renderMoneyBox(); toast('안전망을 저장했어요'); sfx('ok');
        } }
    ]
  });
}
function openMoneySheet(type) {
  const t = MONEY_TYPES[type] || MONEY_TYPES.expense;
  showSheet({
    title: t.emoji + ' ' + t.label + ' 기록',
    body: `<label class="field"><span>내용</span><input id="mLabel" maxlength="30" placeholder="예: 급여, 스타벅스, 넷플릭스"></label>
      <label class="field" style="margin-top:10px"><span>금액 (원)</span><input id="mAmt" type="number" inputmode="numeric" min="0" step="1000"></label>
      <label class="field" style="margin-top:10px"><span>날짜</span><input id="mDate" type="date" value="${TODAY}"></label>`,
    actions: [
      { label: '취소', onClick: closeSheet },
      { label: '저장', kind: 'main', onClick: () => {
          const amt = num($('#mAmt') && $('#mAmt').value);
          if (!amt) { toast('금액을 입력해 주세요'); return; }
          const label = ($('#mLabel') && $('#mLabel').value || '').trim() || t.label;
          const date = ($('#mDate') && $('#mDate').value) || TODAY;
          S.money.push({ id: uid(), type, label, amount: amt, date, ts: Date.now() });
          save();
          alog('money', type, label, t.sign > 0 ? amt : -amt, 0);
          logExec('money', t.emoji + ' ' + label + ' ' + won(amt));
          awardBadge('money1');
          closeSheet(); renderMoneyBox(); renderSkip(); toast('기록했어요 · ' + label);
          sfx('ok');
        } }
    ]
  });
}
function deleteMoney(id) {
  const i = S.money.findIndex(x => x.id === id);
  if (i < 0) return;
  S.money.splice(i, 1); save(); renderMoneyBox(); renderSkip(); toast('삭제했어요');
}

/* ── 렌더: 설정 ────────────────────────────── */
function renderSettings() {
  const n = $('#setName'); if (n && document.activeElement !== n) n.value = S.name || '';
  const g = $('#setGoal'); if (g && document.activeElement !== g) g.value = Number(S.brick.goal) || 200000;
  const sw1 = $('#swSound'); if (sw1) sw1.classList.toggle('on', !!S.settings.sound);
  const sw2 = $('#swVibe'); if (sw2) sw2.classList.toggle('on', !!S.settings.vibrate);
}
function saveSettings() {
  const n = $('#setName'), g = $('#setGoal');
  if (n) S.name = (n.value || '').trim() || '몽글이';
  if (g) S.brick.goal = Math.max(0, num(g.value) || 200000);
  save(); renderHeader(); renderSkip(); toast('저장했어요'); sfx('ok');
}

/* ── 렌더: 실전 랩 ─────────────────────────── */
function renderLab() {
  renderLabStatus();
  renderMissionChips();
  renderMission();
  renderSchema();
  renderGH();
}
function renderLabStatus() {
  const st = SQLLAB.state;
  const el = $('#labStatus');
  if (!el) return;
  const map = {
    loading: { c: 'wait', t: '⏳ SQLite 엔진 준비 중…' },
    sqlite: { c: 'ok', t: '🟢 SQLite WASM 연결됨 · 진짜 SQL이 돌아요' },
    fallback: { c: 'warn', t: '🟡 오프라인 폴백 모드 · 기본 SELECT만 실행돼요' }
  };
  const m = map[st.mode] || map.loading;
  el.className = 'lab-status ' + m.c;
  el.innerHTML = '<span class="dot"></span>' + m.t;
  const rt = $('#labRetry');
  if (rt) rt.style.display = st.mode === 'fallback' ? '' : 'none';
}
function renderMissionChips() {
  const box = $('#missionChips'); if (!box) return;
  const solved = S.sql.solved || {};
  box.innerHTML = SQL_MISSIONS.map((m, i) => `<button class="mis-chip${LAB_VIEW.mission === m.id ? ' on' : ''}${solved[m.id] ? ' done' : ''}" data-act="missionPick" data-id="${m.id}">
      <span>${m.emoji}</span><b>${i + 1}</b>${solved[m.id] ? '<i>✓</i>' : ''}</button>`).join('');
  const meta = $('#labMeta');
  if (meta) meta.textContent = sqlSolvedCount() + '/' + SQL_MISSIONS.length + ' 통과';
}
function renderMission() {
  const box = $('#missionBox'); if (!box) return;
  const m = missionById(LAB_VIEW.mission);
  if (!m) return;
  const solved = (S.sql.solved || {})[m.id];
  const res = LAB_VIEW.last && LAB_VIEW.last.id === m.id ? LAB_VIEW.last.res : null;
  const grade = LAB_VIEW.last && LAB_VIEW.last.id === m.id ? LAB_VIEW.last.grade : null;
  box.innerHTML = `
    <div class="mis-head">
      <span class="mis-emoji">${m.emoji}</span>
      <div><h3>${esc(m.title)}</h3><div class="mis-tabs">${m.tables.map(t => '<code>' + t + '</code>').join(' ')} · +${m.exp} EXP${solved ? ' · <b class="good">✓ ' + solved + ' 통과</b>' : ''}</div></div>
    </div>
    <p class="mis-ask">${m.ask}</p>
    ${LAB_VIEW.hint ? `<div class="mis-note">💡 ${m.hint}</div>` : ''}
    ${LAB_VIEW.answer ? `<div class="mis-answer"><div class="mis-note-k">모범 답안</div><pre>${esc(m.answer)}</pre><button class="link-btn" data-act="sqlUseAnswer">이 답안 넣어보기</button></div>` : ''}
    ${grade ? `<div class="grade ${grade.pass ? 'pass' : 'fail'}">${grade.pass ? '✅ ' + esc(grade.why) : '❌ ' + esc(grade.why)}</div>` : ''}
    ${res && !(grade && !grade.pass && !res.ok) ? renderResultTable(res) : ''}`;
}
function renderResultTable(res) {
  if (!res.ok) return `<div class="sql-err">⚠️ ${esc(res.msg || '오류')}</div>`;
  if (!res.rows.length) return `<div class="sql-empty">결과 0행 · 조건이 너무 좁은지 확인해 보세요</div>`;
  const head = res.cols.map(c => '<th>' + esc(c) + '</th>').join('');
  const rows = res.rows.slice(0, 60).map(r => '<tr>' + r.map(v => '<td>' + (v == null ? '<i>NULL</i>' : esc(String(v))) + '</td>').join('') + '</tr>').join('');
  return `<div class="sql-meta">${res.rows.length}행 · ${res.ms}ms${res.mini ? ' · 폴백' : ''}${res.rows.length > 60 ? ' · 앞 60행만' : ''}</div>
    <div class="sql-table-wrap"><table class="sql-table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
}
function renderSchema() {
  const box = $('#schemaBox'); if (!box) return;
  box.innerHTML = LAB_TABLES_META.map(t => `<div class="schema-row"><b>${t.t}</b><em>${esc(t.d)}</em><code>${esc(t.cols)}</code></div>`).join('') +
    `<div class="schema-row"><b>데이터</b><em>가게 60 · 유저 500 · 주문 ${LAB.orders.length} · 리뷰 ${LAB.reviews.length} · 베팅 ${LAB.bettings.length} · 이벤트 ${LAB.events.length}</em></div>`;
}
function renderGH() {
  const box = $('#ghCard'); if (!box) return;
  const c = GH.cached();
  const has = c && c.fetchedAt;
  const live = GH.state.status;
  const today = has ? c.todayCount : 0;
  box.innerHTML = `
    <div class="gh-head">
      <div class="gh-grass ${today > 0 ? 'on' : ''}">${today > 0 ? '🌱' : '🥀'}</div>
      <div class="gh-txt">
        <b>@rlooko 오늘의 잔디</b>
        <span>${today > 0 ? '오늘 ' + today + '커밋 · 연속 ' + (c.streakDays || 0) + '일' : (has ? '아직 커밋이 없어요 · 1커밋이면 잔디가 심어져요' : '아직 확인 전이에요')}</span>
        <em>${has ? '업데이트 ' + hm(c.fetchedAt) : (GH.state.msg || '')} ${live === 'loading' ? '· 새로 읽는 중…' : ''}</em>
      </div>
      <button class="gh-refresh" data-act="ghRefresh" aria-label="새로고침">⟳</button>
    </div>
    ${(c.recent && c.recent.length) ? `<div class="gh-list">${c.recent.slice(0, 5).map(e => `<div class="gh-item"><span>${e.type === 'PushEvent' ? '📌' : e.type === 'CreateEvent' ? '🌱' : '•'}</span><b>${esc(e.repo || '')}</b><em>${esc(short(e.detail || e.type, 34))}</em><i>${esc(relTime(e.when))}</i></div>`).join('')}</div>` : ''}
    <a class="gh-link" href="https://github.com/rlooko" target="_blank" rel="noopener">github.com/rlooko 열기 ↗</a>`;
}
function relTime(iso) {
  const t = Date.parse(iso || '');
  if (!isFinite(t)) return '';
  const d = Math.round((Date.now() - t) / 1000);
  if (d < 60) return '방금';
  if (d < 3600) return Math.round(d / 60) + '분 전';
  if (d < 86400) return Math.round(d / 3600) + '시간 전';
  return Math.round(d / 86400) + '일 전';
}

/* ── SQL 실행 ──────────────────────────────── */
function runSql() {
  const ta = $('#sqlInput'); if (!ta) return;
  const sql = (ta.value || '').trim();
  if (!sql) { toast('쿼리를 먼저 적어 주세요'); return; }
  const m = missionById(LAB_VIEW.mission);
  const res = SQLLAB.run(sql);
  S.sql.tries = (S.sql.tries || 0) + 1;
  S.sql.lastRun = { sql, at: Date.now(), ok: !!res.ok };
  let grade = null;
  if (m && res.ok) {
    grade = gradeResult(m, res);
    if (grade.pass) {
      const first = !(S.sql.solved || {})[m.id];
      S.sql.solved = S.sql.solved || {};
      S.sql.solved[m.id] = TODAY;
      save();
      alog('sql_pass', 'SQL 랩', m.title, 0, first ? m.exp : 0);
      logExec('sql', '🧪 SQL 통과 · ' + m.title);
      awardBadge('sql1');
      if (first) { addExp(m.exp, { noLevelUp: true }); sfx('done'); confetti(26); toast('✅ 통과! +' + m.exp + ' EXP'); }
      else { sfx('ok'); toast('✅ 또 통과!'); }
      renderHeader(); renderMissionChips(); renderTodayStats(); renderTownTab();
    } else {
      sfx('bad');
    }
  } else if (m && !res.ok) {
    grade = { pass: false, why: '쿼리 오류: ' + (res.msg || '') };
  }
  save();
  LAB_VIEW.last = { id: LAB_VIEW.mission, res, grade };
  renderMission();
}
function loadStarter() {
  const m = missionById(LAB_VIEW.mission);
  const ta = $('#sqlInput');
  if (!ta) return;
  ta.value = '-- ' + m.title + '\nSELECT *\nFROM ' + m.tables[0] + '\nLIMIT 5;';
  ta.focus();
  toast('시작 쿼리를 넣었어요 — 고쳐서 실행해 보세요');
}
function pickMission(id) {
  const m = missionById(id); if (!m) return;
  LAB_VIEW.mission = id; LAB_VIEW.hint = false; LAB_VIEW.answer = false;
  if (LAB_VIEW.last && LAB_VIEW.last.id !== id) LAB_VIEW.last = null;
  renderMissionChips(); renderMission();
  const ta = $('#sqlInput'); if (ta) ta.value = '';
  sfx('tap');
}

/* ── 렌더: 타운 & 로그 ─────────────────────── */
function townUnlockLevels() {
  const streak = Math.max(streakValue(), pickCombo());
  const bricks = brickItems().length;
  const sql = sqlSolvedCount();
  const exp = Math.floor(S.exp);
  const score = streak * 2 + bricks + sql * 4 + Math.floor(exp / 40);
  return { score, streak, bricks, sql, exp, level: clamp(Math.floor(score / 4), 0, 12) };
}
function moodOf() {
  const last = S.lastActive || '';
  if (!last) return 'new';
  const gap = Math.round((Date.parse(TODAY + 'T00:00:00') - Date.parse(last + 'T00:00:00')) / 86400000);
  if (gap >= 3) return 'idle';
  if (pickDoneInfo() || brickOfMonth(monthKey()).some(x => x.date === TODAY)) return 'sparkle';
  return 'sunny';
}
function renderTownTab() {
  try { renderTown(); } catch (e) { }
  renderMood();
  renderUnlocks();
  renderDashboard();
  renderLive();
  try { if (window.TOWN3D && window.TOWN3D.setProgress) window.TOWN3D.setProgress(townUnlockLevels().level); } catch (e) { }
}
function renderMood() {
  const pv = (S.town && S.town.moodPreview) || 'auto';
  const m = pv === 'auto' ? moodOf() : pv;
  const map = {
    sparkle: { t: '✨ 반짝이는 마을', s: '오늘도 하나 해냈어요 — 마을이 빛나요' },
    sunny: { t: '🌤 맑은 마을', s: '산책하기 좋은 날이에요' },
    idle: { t: '🌧 비 오는 마을', s: '3일 넘게 쉬었어요 · 10분이면 다시 맑아져요' },
    new: { t: '🌱 새로 시작한 마을', s: '첫 기록을 남겨볼까요?' }
  };
  const v = map[m] || map.sunny;
  const t = $('#moodTitle'), s = $('#moodSub');
  if (t) t.textContent = v.t;
  if (s) s.textContent = v.s;
  const el = $('#town'); if (el) el.dataset.mood = m;
  const year = $('#unlockCount'); if (year) year.textContent = townUnlockLevels().level + '/12';
  if (window.TOWN3D && window.TOWN3D.ok && window.TOWN3D.setMood) {
    try { window.TOWN3D.setMood(m); } catch (e) { }
  }
}
const UNLOCK_NAMES = ['첫 새싹', '꽃 한 송이', '가로등', '깃발', '나비', '분수', '풍선', '벤치', '별가루', '하트 조명', '무지개', '축제'];
function renderUnlocks() {
  const u = townUnlockLevels();
  const box = $('#unlockRow'); if (!box) return;
  box.innerHTML = UNLOCK_NAMES.map((n, i) => `<span class="unlock${i < u.level ? ' on' : ''}">${i < u.level ? '🌸' : '·'} ${esc(n)}</span>`).join('');
  const next = $('#unlockNext');
  if (next) {
    const need = (u.level + 1) * 4;
    next.innerHTML = u.level >= 12
      ? '🏆 마을 장식 전부 열렸어요 — 이제 산책만 해도 즐거운 마을입니다.'
      : `다음 장식 <b>${esc(UNLOCK_NAMES[u.level])}</b>까지 점수 <b>${Math.max(0, need - u.score)}</b>점 남았어요 · 점수 = 연속×2 + 참은 소비 + SQL×4 + EXP/40`;
  }
}
function renderDashboard() {
  const box = $('#dashStats'); if (!box) return;
  const logs = S.analyticsLogs || [];
  const totalSaved = brickSum(brickItems());
  const streak = Math.max(streakValue(), pickCombo());
  const passRate = sqlPassRate();
  const picks = Object.keys(S.pickDone || {}).length;
  box.innerHTML = [
    { k: '연속', v: streak + '일', e: '🔥' },
    { k: '참은 소비', v: won(totalSaved), e: '🧱' },
    { k: 'SQL 통과율', v: passRate + '%', e: '🧪' },
    { k: '원픽 완료', v: picks + '일', e: '🎯' },
    { k: '행동 로그', v: logs.length + '건', e: '📊' },
    { k: '총 EXP', v: Math.floor(S.exp).toLocaleString('ko-KR'), e: '⭐' }
  ].map(x => `<div class="ds"><span>${x.e}</span><b>${esc(x.v)}</b><em>${esc(x.k)}</em></div>`).join('');

  /* 1) 최근 7일 활동 */
  const act = activityRows(7);
  const maxA = Math.max(1, ...act.map(a => a.n));
  const wd = ['일', '월', '화', '수', '목', '금', '토'];
  const c1 = $('#chartWeek');
  if (c1) c1.innerHTML = `<div class="ch-title">최근 7일 활동 <em>행동 로그 건수</em></div>
    <div class="bars">${act.map(a => {
      const d = new Date(a.date + 'T00:00:00');
      return `<div class="bar-col"><div class="bar-wrap"><i style="height:${Math.max(3, Math.round(a.n / maxA * 100))}%"></i></div>
        <span class="${a.date === TODAY ? 'now' : ''}">${wd[d.getDay()]}</span><b>${a.n || ''}</b></div>`;
    }).join('')}</div>`;

  /* 2) 주별 방어 금액 */
  const ws = weeklySaved(8);
  const maxW = Math.max(1, ...ws.map(w => w.sum));
  const c2 = $('#chartSaved');
  if (c2) c2.innerHTML = `<div class="ch-title">주별 방어한 돈 <em>참은 소비 합계</em></div>
    <div class="bars">${ws.map((w, i) => `<div class="bar-col"><div class="bar-wrap"><i class="mint" style="height:${Math.max(2, Math.round(w.sum / maxW * 100))}%"></i></div>
      <span>${i === ws.length - 1 ? '이번' : '-' + (ws.length - 1 - i) + '주'}</span><b>${w.sum ? Math.round(w.sum / 1000) + 'k' : ''}</b></div>`).join('')}</div>`;

  /* 3) SQL 통과 */
  const c3 = $('#chartSql');
  if (c3) c3.innerHTML = `<div class="ch-title">SQL 미션 <em>${sqlSolvedCount()}/${SQL_MISSIONS.length} 통과 · 시도 ${S.sql.tries || 0}회</em></div>
    <div class="sql-dots">${SQL_MISSIONS.map(m => `<span class="sq-dot${(S.sql.solved || {})[m.id] ? ' on' : ''}" title="${esc(m.title)}">${m.emoji}</span>`).join('')}</div>
    <div class="diag">${diagnosisText()}</div>`;
}
function diagnosisText() {
  const ws = weeklySaved(2);
  const thisW = ws[1] ? ws[1].sum : 0, lastW = ws[0] ? ws[0].sum : 0;
  const net = monthNetV2(monthKey());
  const combo = pickCombo();
  const bits = [];
  if (combo >= 3) bits.push('콤보 ' + combo + '일 — 지금 리듬이 가장 강해요.');
  else if (combo === 0) bits.push('오늘 원픽 하나면 콤보가 다시 시작돼요.');
  if (thisW > lastW && thisW > 0) bits.push('지난주보다 ' + won(thisW - lastW) + ' 더 지켰어요.');
  else if (thisW < lastW) bits.push('지난주보다 ' + won(lastW - thisW) + ' 덜 지켰어요.');
  if (net < 0) bits.push('이번 달 순현금 ' + won(net) + ' — 고정비 하나만 점검해 봐요.');
  if (sqlSolvedCount() === 0) bits.push('SQL 첫 통과가 다음 레벨의 열쇠예요.');
  return esc(bits.join(' ')) || '기록이 쌓이면 여기에 진단이 나와요.';
}

/* ── 탭 ────────────────────────────────────── */
const TABS = ['today', 'lab', 'town'];
function switchTab(name, silent) {
  if (TABS.indexOf(name) < 0) name = 'today';
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + name));
  $$('#tabbar .tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  const mainEl = document.querySelector('main'); if (mainEl) mainEl.scrollTop = 0;
  try { window.scrollTo(0, 0); } catch (e) { }
  if (name === 'lab') renderLab();
  if (name === 'town') setTimeout(renderTownTab, 30);
  if (name === 'today') renderToday();
  if (!silent) sfx('tap');
}
window.switchTab = switchTab;

/* ── 마을 건물 시트 ───────────────────────── */
function openHouse() {
  try { townActivity('house', '꽃 심는 중!', 4200); } catch (e) { }
  const items = houseItems();
  const done = items.filter(i => i.done).length, total = items.length;
  const pct = Math.round(done / total * 100);
  const dd = d => Math.ceil((Date.parse(d + 'T00:00:00') - Date.parse(TODAY + 'T00:00:00')) / 86400000);
  const dm = dd(MOVE_DATE), dw = dd(WED_DATE);
  const row = it => `<button class="ck-item ${it.done ? 'done' : ''}" data-act="houseToggle" data-id="${it.id}">
      <span class="bx">${it.done ? '✓' : ''}</span>
      <span class="tx"><span class="tt">${esc(it.title)}</span>
      <span class="dt">${it.cat === 'move' ? '이사' : '결혼'}${it.doneDate ? ' · ' + it.doneDate.slice(5).replace('-', '/') + ' 완료' : ' · 대기'}</span></span></button>`;
  showSheet({
    title: '🏡 수은집',
    body: `<div class="bldg-hero"><div class="em">🏡</div><div><div class="t">이사 · 결혼 준비</div><div class="s">체크할수록 집 주변에 꽃이 늘어나요</div></div></div>
      <div class="wed-dday"><div class="d"><span>이사 ${MOVE_DATE.slice(5).replace('-', '/')}</span><b class="mint">${dm >= 0 ? 'D-' + dm : 'D+' + (-dm)}</b></div>
      <div class="d"><span>결혼 ${WED_DATE.slice(5).replace('-', '/')}</span><b class="pink">${dw >= 0 ? 'D-' + dw : 'D+' + (-dw)}</b></div></div>
      <div class="bldg-row"><span class="k">준비 진도</span><span class="v good">${done} / ${total} · ${pct}%</span></div>
      <div class="gauge-line"><i style="width:${pct}%"></i></div>
      <div class="sec-head" style="margin:12px 0 7px"><h2 style="font-size:12px">🧳 이사</h2><span class="sec-meta">${items.filter(i => i.cat === 'move' && i.done).length}/${items.filter(i => i.cat === 'move').length}</span></div>
      ${items.filter(i => i.cat === 'move').map(row).join('')}
      <div class="sec-head" style="margin:12px 0 7px"><h2 style="font-size:12px">💍 결혼</h2><span class="sec-meta">${items.filter(i => i.cat === 'wed' && i.done).length}/${items.filter(i => i.cat === 'wed').length}</span></div>
      ${items.filter(i => i.cat === 'wed').map(row).join('')}`,
    actions: [{ label: '닫기', onClick: closeSheet }]
  });
}
function applyHouseDecor() {
  try {
    const done = houseDone();
    $$('#townHouseDecor .decor').forEach(el => {
      const need = Number(el.dataset.need) || 0;
      el.style.transition = 'opacity .55s ease';
      el.setAttribute('opacity', done >= need ? '1' : '0');
    });
  } catch (e) { }
}
function houseToggle(id) {
  const items = houseItems();
  const it = items.find(x => x.id === id); if (!it) return;
  it.done = !it.done;
  it.doneDate = it.done ? TODAY : null;
  let exp = 0;
  if (it.done && !it.expGiven) { it.expGiven = true; exp = 12; }
  save();
  alog('house', it.cat, it.title, 0, exp);
  logExec('house', (it.cat === 'move' ? '🧳 이사 · ' : '💍 결혼 · ') + it.title + (it.done ? ' 완료' : ' 해제'));
  try { townActivity('house', it.done ? '꽃 심는 중!' : '잠깐 쉬는 중', 3200); } catch (e) { }
  applyHouseDecor();
  try { renderTown(); } catch (e) { }
  if (it.done && houseDone() === houseTotal()) { confetti(40); sfx('level'); try { bubbleSay('수은집 완성! 마을이 반짝여 ✨'); } catch (e) { } }
  if (exp) addExp(exp, { noLevelUp: true });
  openHouse();
}
function openBank() {
  try { townActivity('bank', '동전 넣는 중!', 4200); } catch (e) { }
  const d = debtState();
  const pct = clamp(d.repaid / d.total * 100, 0, 100);
  const cleared = debtCleared();
  showSheet({
    title: '🏦 청산 은행',
    body: `<div class="bldg-hero"><div class="em">🏦</div><div><div class="t">빚 5,000만 원</div><div class="s">참은 소비 + 상환액 = 갚은 돈</div></div></div>
      <div class="bldg-row"><span class="k">총 빚</span><span class="v">${won(d.total)}</span></div>
      <div class="bldg-row"><span class="k">갚은 돈 (방어+상환)</span><span class="v good">${won(cleared)}</span></div>
      <div class="bldg-row"><span class="k">남은 빚</span><span class="v">${won(Math.max(0, d.total - cleared))}</span></div>
      <div class="gauge-line" style="margin:12px 0 6px"><i style="width:${Math.max(0.6, pct)}%"></i></div>
      <p class="hint">${pct.toFixed(2)}% 갚았어요. 이번 달 참은 소비만큼 매달 상환에 더하면 2027년 안에 절반이 보여요.</p>
      <label class="field" style="margin-top:6px"><span>실제 상환액 (원)</span><input id="rpAmt" type="number" inputmode="numeric" min="0" step="10000" placeholder="500000"></label>`,
    actions: [
      { label: '닫기', onClick: closeSheet },
      { label: '상환 기록', kind: 'main', onClick: () => {
          const amt = num($('#rpAmt') && $('#rpAmt').value);
          if (!amt) { toast('금액을 입력해 주세요'); return; }
          d.repaid += amt;
          d.log.push({ date: TODAY, amount: amt, ts: Date.now() });
          save(); alog('debt_repay', '빚', '상환', -amt, 0);
          logExec('debt', '🏦 상환 ' + won(amt));
          closeSheet(); renderSkip(); renderTownTab(); toast('상환 기록 · ' + won(amt)); sfx('ok');
        } }
    ]
  });
}
function openWorkshop() {
  try { townActivity('shop', '작업 중!', 4200); } catch (e) { }
  showSheet({
    title: '☕ 아렐로 작업실',
    body: `<div class="bldg-hero"><div class="em">☕</div><div><div class="t">10분 작업실</div><div class="s">부업 · 체험단 · 블로그 · 영어</div></div></div>
      <p class="hint">여기서는 딱 10분만 씁니다. 타이머를 누르고 시작하면 마을 시계탑이 켜져요.</p>`,
    actions: [
      { label: '닫기', onClick: closeSheet },
      { label: '10분 시작', kind: 'main', onClick: () => { closeSheet(); switchTab('today', true); focusReset(); focusStart(); } }
    ]
  });
}
function openTower() {
  try { townActivity('tower', '시계탑 확인 중', 3600); } catch (e) { }
  const doneToday = pickDoneInfo();
  showSheet({
    title: '⏰ 시계탑',
    body: `<div class="bldg-hero"><div class="em">⏰</div><div><div class="t">원픽 집중 타이머</div><div class="s">${doneToday ? '오늘 원픽 완료 · ' + hm(doneToday.ts) : '아직 오늘 원픽 전'}</div></div></div>
      <div class="bldg-row"><span class="k">지금 남은 시간</span><span class="v">${pad(Math.floor(FOCUS.remaining / 60))}:${pad(FOCUS.remaining % 60)}</span></div>
      <p class="hint">10분은 짧아서 오히려 시작하기 쉬워요. 끝나면 원픽이 자동 완료됩니다.</p>`,
    actions: [
      { label: '닫기', onClick: closeSheet },
      { label: FOCUS.running ? '일시정지' : '10분 시작', kind: 'main', onClick: () => { closeSheet(); switchTab('today', true); focusStart(); } }
    ]
  });
}
function openCastle() {
  try { townActivity('castle', '데이터 성으로!', 3600); } catch (e) { }
  const p = (function () { try { return v3CoursePct(); } catch (e) { return { done: 0, total: 0, pct: 0 }; } })();
  showSheet({
    title: '🏰 데이터 성',
    body: `<div class="bldg-hero"><div class="em">🏰</div><div><div class="t">데이터 분석가 코스</div><div class="s">5단계 · 면접 카드 8선</div></div></div>
      <div class="bldg-row"><span class="k">코스 진행률</span><span class="v good">${p.pct}% · ${p.done}/${p.total}</span></div>
      <div class="gauge-line" style="margin:10px 0"><i style="width:${p.pct}%"></i></div>
      <p class="hint">SQL 랩에서 문제를 풀면 이 성의 불이 켜집니다. 코스 전체는 실전 랩 아래 '커리어 코스'에서 볼 수 있어요.</p>`,
    actions: [
      { label: '닫기', onClick: closeSheet },
      { label: '🧪 랩으로', onClick: () => { closeSheet(); switchTab('lab'); } },
      { label: '🎓 커리어 코스', kind: 'main', onClick: () => { closeSheet(); switchTab('lab'); setTimeout(() => { const f = $('#foldCourse'); if (f) { f.open = true; f.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, 120); } }
    ]
  });
}
function openStatus() {
  const L = levelInfo(S.exp);
  const u = townUnlockLevels();
  showSheet({
    title: '🐱 지금 상태',
    body: `<div class="bldg-hero"><div class="em">🐱</div><div><div class="t">${esc(S.name || '몽글이')} · Lv.${L.level}</div><div class="s">${esc(L.title)}</div></div></div>
      <div class="bldg-row"><span class="k">오늘 EXP</span><span class="v">+${todayExpAmt()}</span></div>
      <div class="bldg-row"><span class="k">연속</span><span class="v">${streakValue()}일</span></div>
      <div class="bldg-row"><span class="k">마을 점수</span><span class="v">${u.score}점 · 장식 ${u.level}/12</span></div>
      <p class="hint">${esc(moodOf() === 'idle' ? '3일 넘게 쉬었어요. 10분 하나면 다시 맑아집니다.' : '지금 리듬 좋아요. 오늘 하나만 더.')}</p>`,
    actions: [{ label: '닫기', onClick: closeSheet }]
  });
}
function tapCharacter() {
  try { bubbleSay(['오늘 10분만 하자!', '벽돌 하나 깨볼까?', '잔디 심으러 가자 🌱', '너는 이미 하고 있어'][Math.floor(Math.random() * 4)]); setExpr('happy', 1200); } catch (e) { }
  sfx('tap'); vibe(8);
  openStatus();
}

/* ── 액션 디스패치 ─────────────────────────── */
function handleAction(act, el) {
  const id = el && el.dataset ? el.dataset.id : '';
  switch (act) {
    /* 오늘 */
    case 'pickStart': if (FOCUS.running || (FOCUS.remaining > 0 && FOCUS.remaining < FOCUS.total)) focusStart(); else { focusReset(); focusStart(); } break;
    case 'pickDone': completePick(false); break;
    case 'pickSwap': { S.pick = { date: TODAY, idx: ((Number(S.pick.idx) || 0) + 1) % pickCandidates().length }; save(); renderPick(); sfx('tap'); break; }
    case 'pickGo': { const p = pickToday(); if (p.go === 'lab') switchTab('lab'); else toast('오늘은 충분히 했어요'); break; }
    case 'skipChip': recordSkip(el.dataset.key, num(el.dataset.amt), (el.textContent || '').trim().slice(0, 2)); break;
    case 'skipCustom': openSkipSheet(); break;
    case 'questToggle': toggleQuest(id); break;
    case 'questNew': openQuestSheet(); break;
    case 'moneyNew': openMoneySheet(el.dataset.type); break;
    case 'editSafety': openSafetySheet(); break;
    case 'moneyDel': deleteMoney(id); break;
    case 'saveSettings': saveSettings(); break;
    case 'toggleSound': S.settings.sound = !S.settings.sound; save(); renderSettings(); if (S.settings.sound) sfx('ok'); break;
    case 'toggleVibe': S.settings.vibrate = !S.settings.vibrate; save(); renderSettings(); vibe(15); break;
    case 'exportCsv': exportBehaviorCsv(); break;
    case 'exportData': exportData(); break;
    case 'importData': importData(); break;
    case 'resetData': resetData(); break;
    /* 랩 */
    case 'missionPick': pickMission(id); break;
    case 'sqlRun': runSql(); break;
    case 'sqlHint': LAB_VIEW.hint = !LAB_VIEW.hint; renderMission(); sfx('tap'); break;
    case 'sqlAnswer': LAB_VIEW.answer = !LAB_VIEW.answer; renderMission(); sfx('tap'); break;
    case 'sqlUseAnswer': { const m = missionById(LAB_VIEW.mission); const ta = $('#sqlInput'); if (m && ta) { ta.value = m.answer; ta.focus(); } break; }
    case 'sqlStarter': loadStarter(); break;
    case 'labRetry': { SQLLAB.boot().then(() => { renderLabStatus(); renderLab(); }); toast('엔진을 다시 불러옵니다'); break; }
    case 'ghRefresh': GH.fetchNow(true).then(() => { renderGH(); renderTodayStats(); }); toast('GitHub 새로 읽는 중…'); break;
    /* 타운 */
    case 'phaseToggle': townPhaseToggle(); break;
    case 'resetView': townResetView(); break;
    case 'openStatus': openStatus(); break;
    case 'tapChar': tapCharacter(); break;
    case 'openCastle': openCastle(); break;
    case 'openBank': openBank(); break;
    case 'openWorkshop': openWorkshop(); break;
    case 'openTower': openTower(); break;
    case 'openHouse': openHouse(); break;
    case 'houseToggle': houseToggle(id); break;
    case 'execToggle': toggleExec(); break;
    case 'weatherToggle': {
      const order = ['auto', 'sparkle', 'sunny', 'idle'];
      const cur = (S.town && S.town.moodPreview) || 'auto';
      const next = order[(order.indexOf(cur) + 1) % order.length];
      S.town = S.town || {}; S.town.moodPreview = next; save();
      applyMoodPreview(); toast('마을 날씨 미리보기 · ' + ({ auto: '자동', sparkle: '반짝', sunny: '맑음', idle: '비' }[next]));
      sfx('tap');
      break;
    }
    /* 공통 */
    case 'closeSheet': closeSheet(); break;
    case 'closeLevel': { const l = $('#levelOverlay'); if (l) l.classList.remove('open'); break; }
    default: break;
  }
}
function applyMoodPreview() {
  const p = (S.town && S.town.moodPreview) || 'auto';
  const mood = p === 'auto' ? moodOf() : p;
  const map = {
    sparkle: { t: '✨ 반짝이는 마을', s: '오늘도 하나 해냈어요 — 마을이 빛나요' },
    sunny: { t: '🌤 맑은 마을', s: '산책하기 좋은 날이에요' },
    idle: { t: '🌧 비 오는 마을', s: '3일 넘게 쉬었어요 · 10분이면 다시 맑아져요' },
    new: { t: '🌱 새로 시작한 마을', s: '첫 기록을 남겨볼까요?' }
  };
  const v = map[mood] || map.sunny;
  const tEl = $('#moodTitle'), sEl = $('#moodSub');
  if (tEl) tEl.textContent = v.t;
  if (sEl) sEl.textContent = v.s;
  if (window.TOWN3D && window.TOWN3D.ok && window.TOWN3D.setMood) { try { window.TOWN3D.setMood(mood); } catch (e) { } }
  const el = $('#town'); if (el) el.dataset.mood = mood;
  const btn = $('#moodBtn'); if (btn) btn.setAttribute('aria-pressed', p === 'auto' ? 'false' : 'true');
}

/* ── 전체 렌더 ─────────────────────────────── */
function renderAll() {
  renderHeader();
  renderCharacter();
  renderPick();
  renderSkip();
  renderTodayStats();
  renderQuests();
  renderBadges();
  renderMoneyBox();
  renderSettings();
  try { renderTown(); } catch (e) { }
  renderUnlocks();
  renderDashboard();
}
function refreshDaily() {
  if (!S.todayExp || S.todayExp.date !== TODAY) S.todayExp = { date: TODAY, amount: 0 };
  if (!S.dailyMoney || S.dailyMoney.date !== TODAY) S.dailyMoney = { date: TODAY, count: 0 };
  migrateQuests(S);
  save();
  renderAll();
}

/* ── 파라미터 (?start=20, ?tab=lab) ───────── */
function handleParams() {
  let p;
  try { p = new URLSearchParams(location.search); } catch (e) { return; }
  const tab = p.get('tab');
  if (tab && TABS.indexOf(tab) >= 0) switchTab(tab, true);
  const st = parseInt(p.get('start'), 10);
  if (st > 0) {
    FOCUS.total = st * 60; FOCUS.remaining = st * 60;
    focusPersist(); paintFocus();
    if (p.get('auto') !== '0') focusStart();
    try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) { }
  }
}

/* ── 부팅 ──────────────────────────────────── */
function init() {
  try { alogSeedOnce(); } catch (e) { }
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-today'));
  $$('#tabbar .tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'today'));
  renderAll();
  try { initTownChars(); } catch (e) { }
  restoreFocus();
  handleParams();

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    handleAction(el.dataset.act, el);
  });
  $$('#tabbar .tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));
  const ov = $('#overlay'); if (ov) ov.addEventListener('click', e => { if (e.target.id === 'overlay') closeSheet(); });
  const lo = $('#levelOverlay'); if (lo) lo.addEventListener('click', e => { if (e.target.id === 'levelOverlay') lo.classList.remove('open'); });
  const imp = $('#importFile'); if (imp) imp.addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    if (f) handleImport(f);
    e.target.value = '';
  });
  const ta = $('#sqlInput');
  if (ta) ta.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runSql(); } });
  document.addEventListener('pointerdown', () => { if (S.settings.sound) audioCtx(); }, { once: true });

  setInterval(() => {
    if (todayStr() !== TODAY) { TODAY = todayStr(); refreshDaily(); }
    applyPhase(); renderLive();
  }, 30000);

  /* 엔진 · GitHub 는 뒤에서 조용히 */
  SQLLAB.boot().then(() => {
    renderLabStatus();
    if (document.getElementById('screen-lab').classList.contains('active')) renderLab();
    if (SQLLAB.state.mode === 'sqlite') toast('🧪 SQLite 준비 완료 — 이제 폰에서 진짜 SQL이 돌아요');
  });
  GH.fetchNow(false).then(() => { renderGH(); renderTodayStats(); });
  setTimeout(() => { applyMoodPreview(); }, 1200);
}

document.addEventListener('DOMContentLoaded', init);
