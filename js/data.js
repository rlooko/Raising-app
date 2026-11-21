/* ═══════════════════════════════════════════════════════════════
   용은타운 V4 · data
   · 저장 스키마(localStorage 'yongeun-raising-v1') — V1~V3 기록 그대로 호환
   · 레벨/배지/퀘스트/수은집/돈·빚 계산 · 오늘의 원픽 규칙
   ═══════════════════════════════════════════════════════════════ */

const KEY = 'yongeun-raising-v1';
let TODAY = todayStr();

/* ── 레벨/칭호 ────────────────────────────── */
const TITLES = [
  { lv: 1, title: '태어난 몽' },
  { lv: 3, title: '첫 걸음 몽' },
  { lv: 6, title: '루틴 수집가' },
  { lv: 10, title: '타임어택 마스터' },
  { lv: 15, title: '안전망 설계자' },
  { lv: 20, title: '인생 게임의 주인공' },
  { lv: 25, title: '전설의 실장' },
  { lv: 30, title: '권용은 키우기 클리어' }
];
const needFor = l => 40 + (l - 1) * 12;
function titleFor(l) { let t = TITLES[0].title; for (const x of TITLES) if (l >= x.lv) t = x.title; return t; }
function levelInfo(exp) {
  let l = 1, rest = Math.max(0, Math.floor(exp) || 0);
  while (rest >= needFor(l) && l < 999) { rest -= needFor(l); l++; }
  const need = needFor(l);
  return { level: l, cur: rest, need, title: titleFor(l), pct: Math.round(rest / need * 100) };
}
function stageIndexFor(l) { if (l < 3) return 0; if (l < 6) return 1; if (l < 10) return 2; if (l < 15) return 3; if (l < 20) return 4; return 5; }

/* ── 배지 ─────────────────────────────────── */
const BADGE_DEFS = [
  ['firstQuest', '🌱', '첫 퀘스트'],
  ['timerFirst', '⚡', '첫 타임어택'],
  ['streak3', '🔥', '3일 연속'],
  ['level5', '🌿', 'Lv.5 달성'],
  ['money1', '💰', '첫 돈 기록'],
  ['careerStage', '🎓', '관문 통과'],
  ['trackDone', '🏆', '트랙 완주'],
  ['skillDone', '🏅', '스킬 완료'],
  ['report1', '🧠', '첫 리포트'],
  ['pick1', '🎯', '첫 원픽'],
  ['sql1', '🧪', '첫 SQL 통과'],
  ['brick10', '🧱', '벽돌 10개']
];

/* ── 오늘의 퀘스트 (매일 새로 채우는 추천 3개) ── */
const QUEST_SEEDS = [
  { title: 'SQL 미션 1문제 풀기', minutes: 15 },
  { title: '오늘 영어 읽기 1건 + 1줄 영작', minutes: 10 },
  { title: 'Outlier/부업 10분 타임어택', minutes: 10 }
];
const LEGACY_QUEST_IDS = ['q_ads', 'q_eng', 'q_todo'];
let QUEST_MIGRATED = false;
function freshQuests(day) {
  const stamp = String(day || TODAY).replace(/-/g, '');
  return QUEST_SEEDS.map((s, i) => ({
    id: 'q_seed_' + stamp + '_' + i, title: s.title, minutes: s.minutes, exp: 30 + s.minutes * 2,
    doneDate: null, deferDate: null, skillId: '', seed: true
  }));
}
function migrateQuests(s) {
  if (!Array.isArray(s.quests)) s.quests = [];
  if (!Array.isArray(s.questArchive)) s.questArchive = [];
  const before = s.quests.length;
  s.quests = s.quests.filter(q => q && typeof q === 'object' && q.id !== 'q_ads');
  const adsRemoved = s.quests.length !== before;
  if (s.questDay === TODAY) return adsRemoved;
  const keep = [], arch = [];
  s.quests.forEach(q => {
    const doneBefore = !!q.doneDate && q.doneDate < TODAY;
    const stalePreset = q.doneDate !== TODAY && (q.seed === true || LEGACY_QUEST_IDS.indexOf(q.id) >= 0);
    if (doneBefore || stalePreset) arch.push(q); else keep.push(q);
  });
  if (arch.length) {
    s.questArchive = s.questArchive.concat(arch.map(q => ({
      title: q.title, minutes: q.minutes, exp: q.exp, doneDate: q.doneDate || null, closedDate: TODAY
    }))).slice(-60);
  }
  s.quests = keep;
  const active = keep.filter(q => q.doneDate !== TODAY).length;
  const need = Math.max(0, 3 - active);
  if (need > 0) s.quests = keep.concat(freshQuests(TODAY).slice(0, need));
  s.questDay = TODAY;
  return true;
}

/* ── 날짜 ─────────────────────────────────── */
const MOVE_DATE = '2027-01-16';
const WED_DATE = '2027-02-27';
const V2_DAY = 86400000;
const V2_DDAY = [
  { key: 'move', label: '안양 이사', emoji: '🏡', date: MOVE_DATE },
  { key: 'wedding', label: '결혼', emoji: '💍', date: WED_DATE }
];
function v2Dday(dateStr) {
  const d = new Date(dateStr + 'T00:00:00'), t = new Date(TODAY + 'T00:00:00');
  return Math.round((d - t) / V2_DAY);
}

/* ── 수은집(이사·결혼) 체크리스트 ───────────── */
function houseDefaults() {
  const rows = [
    ['mv1', 'move', '신혼집 최종 계약·잔금 일정 확인'],
    ['mv2', 'move', '이사업체 견적 비교하고 예약하기'],
    ['mv3', 'move', '가구·가전 배치 도면 그리기'],
    ['mv4', 'move', '버릴 물건 정리하고 폐기 예약'],
    ['mv5', 'move', '인터넷·공과금·주소 이전 신청'],
    ['mv6', 'move', '전입신고·확정일자 (이사 후)'],
    ['wd1', 'wed', '예식장 홀 최종 확정'],
    ['wd2', 'wed', '스드메(스튜디오·드레스·메이크업) 예약'],
    ['wd3', 'wed', '청첩장 제작·발송 (보자기카드)'],
    ['wd4', 'wed', '신혼여행 항공·숙소 예약'],
    ['wd5', 'wed', '예물·예복 준비'],
    ['wd6', 'wed', '양가 상견례·혼수 조율']
  ];
  return rows.map(r => ({ id: r[0], cat: r[1], title: r[2], done: false, doneDate: null, expGiven: false }));
}
function houseItems() {
  if (!S.house || !Array.isArray(S.house.items) || !S.house.items.length) {
    S.house = { items: houseDefaults() };
    save();
  }
  return S.house.items;
}
function houseDone() { return houseItems().filter(i => i.done).length; }
function houseTotal() { return houseItems().length; }

/* ── V2 3단계 로드맵 (라벨 참조용 · 화면은 V3 코스) ── */
const ROADMAP_STAGES = [
  { id: 's1', tag: 'S1', period: '지금 ~ 2026년 12월', title: '궤도 진입', items: [
    { id: 's1_sql', t: 'SQL 실전 미션 5개 제출' }, { id: 's1_en', t: '영어 1줄 영작 5개 제출' },
    { id: 's1_skip', t: '참은 소비 10번 기록' }, { id: 's1_net', t: '이번 달 적자 0원 만들기' },
    { id: 's1_track', t: '데이터 분석가 vs 9급 비교하고 하나 고르기' },
    { id: 's1_blog', t: '블로그·쇼츠 글 2편 발행' }, { id: 's1_cv', t: 'GitHub README·이력서 초안 정리' }
  ] },
  { id: 's2', tag: 'S2', period: '2027년 1월 ~ 2월', title: '안양 이사 & 결혼 준비', items: [
    { id: 's2_house', t: '수은집 체크리스트 12개 완료' }, { id: 's2_wed', t: '결혼 준비 3건 확정' },
    { id: 's2_invite', t: '청첩장 문구·명단 확정' }, { id: 's2_budget', t: '신혼살림 예산표 만들기' },
    { id: 's2_routine', t: '4주 동안 주 2회 블로그·쇼츠 발행' }, { id: 's2_move', t: '이사 당일 짐 정리 · 주소 이전' }
  ] },
  { id: 's3', tag: 'S3', period: '2027년 3월 ~', title: '이직 · 합격 포트폴리오', items: [
    { id: 's3_cert', t: 'SQLD 응시하고 합격' }, { id: 's3_pf', t: '포트폴리오 2건 공개 (GitHub Pages)' },
    { id: 's3_apply', t: '데이터 분석가 지원 10건' }, { id: 's3_interview', t: '면접 3회 경험하고 피드백 정리' },
    { id: 's3_offer', t: '세후 350만 원 이상 오퍼 받기' }
  ] }
];

/* ── 돈 ───────────────────────────────────── */
const MONEY_TYPES = {
  income: { label: '수입', sign: 1, emoji: '💵' },
  side: { label: '부업', sign: 1, emoji: '🪙' },
  expense: { label: '지출', sign: -1, emoji: '🧾' },
  fixed: { label: '고정비', sign: -1, emoji: '📌' }
};
function moneyOf(m) { return S.money.filter(e => (e.date || '').slice(0, 7) === m); }
function sumType(list, type) { return list.filter(e => e.type === type).reduce((a, b) => a + (Number(b.amount) || 0), 0); }
function allNet() { return S.money.reduce((a, e) => { const v = Number(e.amount) || 0; return a + ((e.type === 'income' || e.type === 'side') ? v : -v); }, 0); }
function safetyNow() { return (Number(S.safetyBase) || 0) + allNet(); }
function monthLabel(m) { const p = m.split('-'); return `${p[0]}년 ${Number(p[1])}월`; }
function monthNetV2(mk) {
  const list = moneyOf(mk);
  const inc = sumType(list, 'income') + sumType(list, 'side');
  const out = sumType(list, 'expense') + sumType(list, 'fixed');
  return inc - out;
}

/* ── 참은 소비 · 빚 벽돌 ───────────────────── */
const DEBT_TOTAL = 50000000;
function brickItems() { return (S.brick && Array.isArray(S.brick.items)) ? S.brick.items : []; }
function brickOfMonth(mk) { return brickItems().filter(x => (x.month || (x.date || '').slice(0, 7)) === mk); }
function brickSum(list) { return (list || []).reduce((a, b) => a + (Number(b.amount) || 0), 0); }
function debtState() {
  if (!S.debt || typeof S.debt !== 'object') S.debt = { total: DEBT_TOTAL, repaid: 0, log: [] };
  S.debt.total = Number(S.debt.total) || DEBT_TOTAL;
  S.debt.repaid = Math.max(0, Number(S.debt.repaid) || 0);
  if (!Array.isArray(S.debt.log)) S.debt.log = [];
  return S.debt;
}
/* 방어한 돈(참은 소비) + 실제 상환 = 갚은 돈 */
function debtCleared() { return brickSum(brickItems()) + debtState().repaid; }
function debtPct() { return clamp(debtCleared() / DEBT_TOTAL * 100, 0, 100); }

/* 원탭 칩 기본 금액 — 참은 소비 1탭 기록 */
const SKIP_CHIPS = [
  { key: '배달', emoji: '🛵', amount: 15000 },
  { key: '커피', emoji: '☕', amount: 4500 },
  { key: '쇼핑', emoji: '🛍', amount: 30000 },
  { key: '택시', emoji: '🚕', amount: 12000 },
  { key: '간식', emoji: '🍪', amount: 3000 },
  { key: '구독', emoji: '📱', amount: 9000 }
];

/* ═══════════════════════════════════════════
   오늘의 10분 원픽 — 시간대별 후보
   · 21~02 골든타임: SQL 1문제 / GitHub 1커밋
   · 낮:            참은 소비 1건 / 부업·체험단 10분
   ═══════════════════════════════════════════ */
const PICK_POOL = {
  golden: [
    { id: 'sql1', emoji: '🧪', title: 'SQL 1문제 풀기', why: '밤 10시 골든타임 — 머리 쓰는 일은 지금이 제일 잘 돼요.', go: 'lab', minutes: 10 },
    { id: 'gh1', emoji: '🌱', title: 'GitHub 1커밋 남기기', why: '잔디 한 칸이 면접관에게 보이는 증거가 됩니다.', go: 'lab', minutes: 10 }
  ],
  morning: [
    { id: 'en1', emoji: '📖', title: '영어 원문 1문단 읽기', why: '아침 머리에 영어를 먼저 넣으면 하루 종일 덜 무서워요.', go: 'today', minutes: 10 },
    { id: 'skip1', emoji: '💸', title: '오늘 참을 소비 1건 정하기', why: '아침에 정해두면 저녁에 안 흔들립니다.', go: 'today', minutes: 10 }
  ],
  day: [
    { id: 'side1', emoji: '🪙', title: '부업·체험단 10분', why: '실직 위기에서 제일 빠른 안전망은 오늘의 10분이에요.', go: 'today', minutes: 10 },
    { id: 'skip2', emoji: '💸', title: '참은 소비 1건 기록', why: '벽돌 하나가 빚 5,000만 원을 깎습니다.', go: 'today', minutes: 10 }
  ],
  evening: [
    { id: 'skip3', emoji: '💸', title: '참은 소비 1건 기록', why: '저녁 지출이 하루 적자의 절반이에요.', go: 'today', minutes: 10 },
    { id: 'gh2', emoji: '🌱', title: 'GitHub 1커밋 남기기', why: '퇴근 후 한 커밋이 3월 포트폴리오를 만듭니다.', go: 'lab', minutes: 10 }
  ]
};
function pickSlot(hour) {
  if (hour >= 21 || hour < 2) return { key: 'golden', label: '밤 10시 골든타임', icon: '🌙' };
  if (hour < 11) return { key: 'morning', label: '아침 시동', icon: '🌤' };
  if (hour < 17) return { key: 'day', label: '낮 시간', icon: '☀️' };
  return { key: 'evening', label: '저녁 마무리', icon: '🌇' };
}
function pickCandidates() { return PICK_POOL[pickSlot(new Date().getHours()).key]; }
function pickToday() {
  if (!S.pick || typeof S.pick !== 'object') S.pick = { date: TODAY, idx: 0 };
  if (S.pick.date !== TODAY) { S.pick = { date: TODAY, idx: 0 }; }
  const list = pickCandidates();
  const idx = ((Number(S.pick.idx) || 0) % list.length + list.length) % list.length;
  return Object.assign({ idx }, list[idx]);
}
function pickDoneInfo() { return (S.pickDone && S.pickDone[TODAY]) || null; }
function pickCombo() {
  const done = S.pickDone || {};
  let n = 0;
  for (let i = 0; i < 400; i++) {
    const d = daysAgoStr(i);
    if (done[d]) n++;
    else if (i === 0) continue;   /* 오늘 아직 안 했어도 어제까지의 콤보는 살립니다 */
    else break;
  }
  return n;
}

/* 대시보드용: 최근 n일 활동량 */
function activityRows(days) {
  const logs = S.analyticsLogs || [];
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = daysAgoStr(i);
    const list = logs.filter(x => x.date_kst === d);
    out.push({ date: d, n: list.length, saved: list.reduce((a, x) => a + (x.event_type === 'brick_break' ? (x.value_krw || 0) : 0), 0) });
  }
  return out;
}
function weeklySaved(weeks) {
  const items = brickItems();
  const out = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(Date.now() - (i * 7 + 6) * V2_DAY);
    const end = new Date(Date.now() - i * 7 * V2_DAY);
    const s = todayStr(start), e = todayStr(end);
    const sum = items.filter(x => x.date >= s && x.date <= e).reduce((a, x) => a + (Number(x.amount) || 0), 0);
    out.push({ start: s, end: e, sum });
  }
  return out;
}

/* ── 기본 상태 ────────────────────────────── */
function defaultState() {
  const t = todayStr();
  return {
    v: 1,
    created: t,
    name: '몽글이',
    exp: 0,
    streak: 0,
    lastActive: null,
    todayExp: { date: t, amount: 0 },
    quests: freshQuests(t),
    questDay: t,
    questArchive: [],
    money: [],
    subs: [],
    safetyGoal: 3000000,
    safetyBase: 0,
    skills: [],
    badges: {},
    settings: { sound: true, vibrate: true },
    dailyMoney: { date: t, count: 0 },
    log: [],
    timer: { minutes: 10, running: false, endAt: 0, remaining: 600, questId: '', skillId: '' },
    career: { active: null, passed: {}, deviations: 0, defers: 0, history: [] },
    tracks: [],
    focus: { hours: 2 },
    town: { mode: 'auto' },
    exec: [],
    house: { items: houseDefaults() },
    debt: { total: DEBT_TOTAL, repaid: 0, log: [] },
    roadmap: {},
    v3Career: { checks: {}, memos: {}, open: {}, reveal: {}, tests: {}, forceTest: false },
    analyticsLogs: [],
    alogSeeded: false,
    brick: { items: [], goal: 200000 },
    claude: { list: [], lastSync: 0, reqAt: 0, filter: 'all', cloudSeeded: false, pendingPush: [] },
    /* — V4 — */
    pick: { date: t, idx: 0 },
    pickDone: {},
    sql: { solved: {}, tries: 0, lastRun: null },
    gh: { login: 'rlooko', fetchedAt: 0, lastCommitDate: '', events: [] }
  };
}

function loadState() {
  const d = defaultState();
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) { }
  if (!raw) return d;
  try {
    const p = JSON.parse(raw);
    if (!p || typeof p !== 'object') return d;
    const s = Object.assign(d, p);
    s.settings = Object.assign(d.settings, p.settings || {});
    s.todayExp = Object.assign({ date: TODAY, amount: 0 }, p.todayExp || {});
    s.career = Object.assign(d.career, p.career || {});
    s.career.passed = (p.career && p.career.passed) || {};
    s.focus = Object.assign(d.focus, p.focus || {});
    s.dailyMoney = Object.assign({ date: TODAY, count: 0 }, p.dailyMoney || {});
    if (!Array.isArray(s.quests)) s.quests = d.quests;
    s.questDay = (p && typeof p.questDay === 'string') ? p.questDay : '';
    if (!Array.isArray(s.money)) s.money = [];
    if (!Array.isArray(s.subs)) s.subs = [];
    if (!Array.isArray(s.skills)) s.skills = [];
    if (!Array.isArray(s.log)) s.log = [];
    if (!Array.isArray(s.tracks)) s.tracks = [];
    if (!s.badges || typeof s.badges !== 'object') s.badges = {};
    if (!s.timer || typeof s.timer !== 'object') s.timer = d.timer;
    if (!s.town || typeof s.town !== 'object') s.town = { mode: 'auto' };
    if (['auto', 'day', 'sunset', 'night'].indexOf(s.town.mode) < 0) s.town.mode = 'auto';
    if (!Array.isArray(s.exec)) s.exec = [];
    if (!s.house || !Array.isArray(s.house.items) || !s.house.items.length) s.house = { items: houseDefaults() };
    if (!s.debt || typeof s.debt !== 'object') s.debt = { total: DEBT_TOTAL, repaid: 0, log: [] };
    if (!Array.isArray(s.debt.log)) s.debt.log = [];
    if (!s.roadmap || typeof s.roadmap !== 'object') s.roadmap = {};
    if (!s.v3Career || typeof s.v3Career !== 'object') s.v3Career = {};
    if (!Array.isArray(s.analyticsLogs)) s.analyticsLogs = [];
    if (typeof s.alogSeeded !== 'boolean') s.alogSeeded = false;
    if (!s.brick || typeof s.brick !== 'object') s.brick = { items: [], goal: 200000 };
    if (!Array.isArray(s.brick.items)) s.brick.items = [];
    if (!Number(s.brick.goal)) s.brick.goal = 200000;
    if (!s.claude || typeof s.claude !== 'object') s.claude = { list: [] };
    if (!Array.isArray(s.claude.list)) s.claude.list = [];
    if (!Array.isArray(s.claude.pendingPush)) s.claude.pendingPush = [];
    /* V4 추가 필드 */
    if (!s.pick || typeof s.pick !== 'object' || !s.pick.date) s.pick = { date: TODAY, idx: 0 };
    if (!s.pickDone || typeof s.pickDone !== 'object') s.pickDone = {};
    if (!s.sql || typeof s.sql !== 'object') s.sql = { solved: {}, tries: 0, lastRun: null };
    if (!s.sql.solved || typeof s.sql.solved !== 'object') s.sql.solved = {};
    if (!Number(s.sql.tries)) s.sql.tries = 0;
    if (!s.gh || typeof s.gh !== 'object') s.gh = { login: 'rlooko', fetchedAt: 0, lastCommitDate: '', events: [] };
    if (migrateQuests(s)) QUEST_MIGRATED = true;
    return s;
  } catch (e) { return d; }
}

let S = loadState();
let VIEW_MONTH = monthKey();

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('저장 공간이 부족해요'); }
}
if (QUEST_MIGRATED) save();
