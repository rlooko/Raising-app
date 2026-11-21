/* ═══════════════════════════════════════════════════════════════
   용은타운 V4 · 실전 랩 (sql-lab)
   · 브라우저 안에서 진짜 SQLite(sql.js WASM)를 돌립니다. 맥북/터미널 불필요.
   · 데이터: BapZip 스타일 배달 플랫폼(p_shops·p_orders·p_reviews·p_events)
            + 11trillion/1-1 스타일 베팅 로그(p_users·p_bettings)
   · CDN이 막히면 가벼운 JS SQL 폴백(단일 테이블 SELECT)으로 내려갑니다.
   ═══════════════════════════════════════════════════════════════ */

/* ── 0. 고정 시드 난수 (새로고침해도 같은 데이터) ───────────── */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* ── 1. 데이터 생성 ──────────────────────────────────────────── */
const LAB = (function buildData() {
  const rnd = mulberry32(20261121);
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const dayStr = d => d.toISOString().slice(0, 10);
  const addDays = (iso, n) => dayStr(new Date(Date.parse(iso + 'T00:00:00Z') + n * 86400000));

  const DISTRICTS = ['강남구', '마포구', '성동구', '송파구', '종로구', '관악구'];
  const CATS = ['한식', '분식', '치킨', '카페', '중식', '일식', '디저트'];
  const BRANDS = ['바프집', '한입식당', '분식왕', '치킨공방', '카페모리', '홍콩반점', '스시로', '달콤상점', '국밥집', '김밥천국'];

  /* 가게 60곳 */
  const shops = [];
  for (let i = 1; i <= 60; i++) {
    const cat = CATS[i % CATS.length];
    const dist = DISTRICTS[i % DISTRICTS.length];
    shops.push({
      shop_id: i,
      name: BRANDS[i % BRANDS.length] + ' ' + dist,
      category: cat,
      district: dist,
      rating: 0,          /* 나중에 리뷰 평균으로 채우고 일부는 일부러 틀리게 */
      review_cnt: 0,
      opened_at: addDays('2025-03-01', int(0, 420))
    });
  }

  /* 유저 500명 */
  const users = [];
  const CH = ['search', 'ad', 'referral', 'sns'];
  for (let i = 1; i <= 500; i++) {
    users.push({
      user_id: i,
      nickname: 'user' + String(i).padStart(3, '0'),
      channel: pick(CH),
      created_at: addDays('2026-07-01', int(0, 137))
    });
  }

  /* 이벤트 — 가입 → 검색 → 가게조회 → 메뉴 → 장바구니 → 주문서 → 결제 */
  const EV = ['signup', 'search', 'store_view', 'menu_view', 'add_cart', 'order_start', 'payment_done'];
  const events = [];
  let eid = 1;
  const paidByUserShop = {};
  users.forEach(u => {
    events.push({ event_id: eid++, user_id: u.user_id, event_name: 'signup', event_at: u.created_at });
    let t = u.created_at;
    let pLive = 0.86;
    if (rnd() > 0.12) {
      for (let s = 1; s < EV.length; s++) {
        /* 단계가 내려갈수록 이탈 */
        const keep = [0.86, 0.72, 0.68, 0.55, 0.78, 0.72][s - 1];
        if (rnd() > keep) break;
        t = addDays(t, int(0, 3));
        events.push({ event_id: eid++, user_id: u.user_id, event_name: EV[s], event_at: t });
        if (EV[s] === 'payment_done') {
          const shop = shops[int(0, shops.length - 1)];
          const key = u.user_id + '-' + shop.shop_id;
          paidByUserShop[key] = { user_id: u.user_id, shop_id: shop.shop_id, date: t };
        }
      }
    }
    /* 재방문(리텐션용) — 가입 후 7~13일 사이에 절반쯤 다시 활동 */
    if (rnd() < 0.46) {
      const back = addDays(u.created_at, int(7, 13));
      events.push({ event_id: eid++, user_id: u.user_id, event_name: rnd() < 0.5 ? 'store_view' : 'add_cart', event_at: back });
      if (rnd() < 0.4) events.push({ event_id: eid++, user_id: u.user_id, event_name: 'payment_done', event_at: addDays(back, int(0, 2)) });
    }
  });

  /* 재방문 세션 — 가입 뒤 1~60일 사이에 다시 둘러보는 사용자 */
  users.forEach(u => {
    if (rnd() > 0.55) return;
    let t = addDays(u.created_at, int(1, 60));
    for (let s2 = 1; s2 < 5; s2++) {
      if (rnd() > 0.7) break;
      events.push({ event_id: eid++, user_id: u.user_id, event_name: EV[s2 + 1] || 'store_view', event_at: t });
      t = addDays(t, int(0, 2));
    }
  });

  /* 주문 — 결제 이벤트를 주문으로 */
  const orders = [];
  let oid = 1;
  Object.keys(paidByUserShop).forEach(k => {
    const p = paidByUserShop[k];
    const st = rnd() < 0.9 ? 'paid' : (rnd() < 0.5 ? 'cancelled' : 'refunded');
    orders.push({
      order_id: oid++,
      user_id: p.user_id,
      shop_id: p.shop_id,
      status: st,
      amount: Math.round(int(7000, 42000) / 100) * 100,
      created_at: p.date,
      paid_at: st === 'paid' ? p.date : null
    });
  });
  /* 주문이 조금 더 쌓이도록 (재방문 주문) */
  for (let i = 0; i < 820; i++) {
    const u = pick(users), s = pick(shops);
    const span = Math.min(120, Math.max(0, Math.round((Date.parse('2026-11-20') - Date.parse(u.created_at)) / 86400000)));
    const d = addDays(u.created_at, int(0, span));
    const st2 = rnd() < 0.9 ? 'paid' : (rnd() < 0.5 ? 'cancelled' : 'refunded');
    orders.push({
      order_id: oid++, user_id: u.user_id, shop_id: s.shop_id,
      status: st2,
      amount: Math.round(int(7000, 42000) / 100) * 100,
      created_at: d, paid_at: st2 === 'paid' ? d : null
    });
  }

  /* 리뷰 — 결제 주문 대부분 + 가게별 최소 8개 */
  const reviews = [];
  let rid = 1;
  const BODY = ['맛있어요', '배달이 빨라요', '양이 적어요', '포장이 꼼꼼해요', '다음에 또 시킬게요', '조금 짜요', '가성비 좋아요'];
  /* 가게마다 숨은 품질(q) — 리뷰 별점이 이 주변에 몰립니다 */
  const quality = {};
  shops.forEach(s => { quality[s.shop_id] = Math.round((3.0 + rnd() * 1.8) * 10) / 10; });
  function pushReview(o) {
    const q = quality[o.shop_id];
    let r = Math.round(q + (rnd() - 0.55) * 1.8);
    r = Math.max(1, Math.min(5, r));
    reviews.push({
      review_id: rid++, shop_id: o.shop_id, order_id: o.order_id, user_id: o.user_id,
      rating: r, body: pick(BODY), created_at: addDays(o.created_at, int(0, 5))
    });
  }
  orders.filter(o => o.status === 'paid').forEach(o => { if (rnd() < 0.82) pushReview(o); });
  /* 리뷰가 적은 가게는 채워서 표본을 만듭니다(현실의 단골 리뷰처럼) */
  shops.forEach(s => {
    let n = reviews.filter(r => r.shop_id === s.shop_id).length;
    let guard = 0;
    while (n < 8 && guard++ < 40) {
      const u = pick(users);
      pushReview({ shop_id: s.shop_id, order_id: null, user_id: u.user_id, created_at: addDays('2026-07-15', int(0, 120)) });
      n++;
    }
  });
  const sumBy = {};
  reviews.forEach(r => { sumBy[r.shop_id] = sumBy[r.shop_id] || { s: 0, n: 0 }; sumBy[r.shop_id].s += r.rating; sumBy[r.shop_id].n++; });
  shops.forEach(s => {
    const a = sumBy[s.shop_id];
    s.review_cnt = a ? a.n : 0;
    s.rating = a ? Math.round(a.s / a.n * 10) / 10 : 0;
  });
  /* 별점 캐시가 실제와 어긋난 가게 6곳 (별점 수정 배포 검증 미션) */
  shops.slice()
    .sort((a, b) => b.review_cnt - a.review_cnt)
    .slice(0, 6)
    .forEach(s => {
      const avg = reviews.filter(r => r.shop_id === s.shop_id).reduce((a, r) => a + r.rating, 0) / Math.max(1, s.review_cnt);
      const delta = avg <= 4.0 ? 0.4 : -0.4;
      s.rating = Math.round(Math.max(1, Math.min(5, avg + delta)) * 10) / 10;
    });

  /* 베팅 로그 — 11trillion 스타일 */
  const GAMES = [{ g: '슬롯', rtp: 0.92 }, { g: '블랙잭', rtp: 0.985 }, { g: '룰렛', rtp: 0.95 }, { g: '스포츠', rtp: 0.97 }];
  const bettings = [];
  for (let i = 1; i <= 900; i++) {
    const u = pick(users);
    const gm = pick(GAMES);
    const stake = int(1, 50) * 1000;
    const win = rnd() < gm.rtp * 0.42;
    const payout = win ? Math.round(stake * (rnd() < 0.06 ? int(8, 30) : int(150, 320) / 100)) : 0;
    bettings.push({
      bet_id: i,
      user_id: u.user_id,
      game: gm.g,
      stake,
      payout,
      created_at: addDays('2026-08-01', int(0, 110))
    });
  }

  return { shops, users, events, orders, reviews, bettings };
})();

/* ── 2. 미션 정의 + 정답(JS로 계산) ─────────────────────────── */
const SQL_MISSIONS = [
  {
    id: 'm1',
    emoji: '🔻',
    title: '가을 프로모 가입자의 6단계 퍼널',
    ask: '2026년 10월에 <b>가입(signup)</b>한 사용자만 모아, 가게조회 → 메뉴 → 장바구니 → 주문서 → 결제까지 단계별 인원과 <b>메뉴→장바구니 전환율</b>, <b>가입→결제 전환율</b>을 한 행으로 뽑아보세요.',
    hint: 'cohort CTE로 10월 가입자만 뽑고, 사용자별로 MAX(CASE WHEN ...) 0/1을 만든 뒤 SUM 하세요. CTE는 SQLite에서도 그대로 됩니다.',
    tables: ['p_events'],
    exp: 60,
    expected: function () {
      const oct = LAB.users.filter(u => u.created_at >= '2026-10-01' && u.created_at < '2026-11-01').map(u => u.user_id);
      const set = new Set(oct);
      const has = { search: new Set(), store_view: new Set(), menu_view: new Set(), add_cart: new Set(), order_start: new Set(), payment_done: new Set() };
      LAB.events.forEach(e => { if (set.has(e.user_id) && has[e.event_name]) has[e.event_name].add(e.user_id); });
      const n = oct.length;
      const c = k => has[k].size;
      return {
        cols: ['signup_users', 'store_u', 'menu_u', 'cart_u', 'order_u', 'paid_u', 'menu_to_cart', 'signup_to_paid'],
        rows: [[n, c('store_view'), c('menu_view'), c('add_cart'), c('order_start'), c('payment_done'),
          Math.round(1000 * c('add_cart') / (c('menu_view') || 1)) / 10,
          Math.round(1000 * c('payment_done') / (n || 1)) / 10]]
      };
    },
    answer: "WITH cohort AS (\n  SELECT DISTINCT user_id\n  FROM p_events\n  WHERE event_name = 'signup'\n    AND event_at >= '2026-10-01' AND event_at < '2026-11-01'\n), step AS (\n  SELECT c.user_id,\n    MAX(CASE WHEN e.event_name = 'store_view'   THEN 1 ELSE 0 END) AS s2,\n    MAX(CASE WHEN e.event_name = 'menu_view'    THEN 1 ELSE 0 END) AS s3,\n    MAX(CASE WHEN e.event_name = 'add_cart'     THEN 1 ELSE 0 END) AS s4,\n    MAX(CASE WHEN e.event_name = 'order_start'  THEN 1 ELSE 0 END) AS s5,\n    MAX(CASE WHEN e.event_name = 'payment_done' THEN 1 ELSE 0 END) AS s6\n  FROM cohort c\n  LEFT JOIN p_events e ON e.user_id = c.user_id\n  GROUP BY c.user_id\n)\nSELECT COUNT(*) AS signup_users,\n       SUM(s2) AS store_u, SUM(s3) AS menu_u, SUM(s4) AS cart_u,\n       SUM(s5) AS order_u, SUM(s6) AS paid_u,\n       ROUND(100.0 * SUM(s4) / NULLIF(SUM(s3), 0), 1) AS menu_to_cart,\n       ROUND(100.0 * SUM(s6) / NULLIF(COUNT(*), 0), 1) AS signup_to_paid\nFROM step;"
  },
  {
    id: 'm2',
    emoji: '⭐',
    title: '별점 수정 배포 검증',
    ask: '가게에 캐시된 별점(<b>p_shops.rating</b>)이 실제 리뷰 평균과 <b>0.3점 이상</b> 어긋난 가게를 찾으세요. 리뷰가 5개 이상인 가게만 봅니다. (가게ID·이름·캐시별점·실제평균·리뷰수, 차이 큰 순)',
    hint: 'GROUP BY로 AVG(r.rating)를 구하고, HAVING 절에 COUNT(r.review_id) >= 5 와 ABS(s.rating - AVG(r.rating)) >= 0.3 을 함께 쓰세요.',
    tables: ['p_shops', 'p_reviews'],
    exp: 60,
    expected: function () {
      const rows = LAB.shops.map(s => {
        const rs = LAB.reviews.filter(r => r.shop_id === s.shop_id);
        const avg = rs.length ? rs.reduce((a, r) => a + r.rating, 0) / rs.length : null;
        return { s, n: rs.length, avg };
      }).filter(x => x.n >= 5 && x.avg != null && Math.abs(x.s.rating - x.avg) >= 0.3)
        .sort((a, b) => Math.abs(b.s.rating - b.avg) - Math.abs(a.s.rating - a.avg));
      return {
        cols: ['shop_id', 'name', 'cached', 'real_avg', 'n'],
        rows: rows.map(x => [x.s.shop_id, x.s.name, Math.round(x.s.rating * 100) / 100, Math.round(x.avg * 100) / 100, x.n])
      };
    },
    answer: "SELECT s.shop_id,\n       s.name,\n       ROUND(s.rating, 2)        AS cached,\n       ROUND(AVG(r.rating), 2)   AS real_avg,\n       COUNT(r.review_id)        AS n\nFROM p_shops s\nLEFT JOIN p_reviews r ON r.shop_id = s.shop_id\nGROUP BY s.shop_id, s.name, s.rating\nHAVING COUNT(r.review_id) >= 5\n   AND ABS(s.rating - AVG(r.rating)) >= 0.3\nORDER BY ABS(s.rating - AVG(r.rating)) DESC;"
  },
  {
    id: 'm3',
    emoji: '🔁',
    title: '가입 주차 D7 리텐션',
    ask: '2026년 8~9월에 가입한 사용자를 <b>가입 주(週)</b>로 묶고, 가입 후 <b>7~13일</b> 사이에 한 번이라도 활동한 비율(D7)을 주차별로 구하세요. (주차·가입자수·리텐션 인원·D7 %)',
    hint: "SQLite: strftime('%Y-%W', created_at) 로 주차를 만듭니다. 가입일과 이벤트일의 차이는 julianday(date) - julianday(date) 로 계산해요.",
    tables: ['p_users', 'p_events'],
    exp: 70,
    expected: function () {
      const users = LAB.users.filter(u => u.created_at >= '2026-08-01' && u.created_at < '2026-10-01');
      const byWeek = {};
      users.forEach(u => {
        const wk = weekKey(u.created_at);
        byWeek[wk] = byWeek[wk] || { users: 0, kept: 0 };
        byWeek[wk].users++;
        const kept = LAB.events.some(e => {
          if (e.user_id !== u.user_id) return false;
          const d = (Date.parse(e.event_at + 'T00:00:00Z') - Date.parse(u.created_at + 'T00:00:00Z')) / 86400000;
          return d >= 7 && d <= 13;
        });
        if (kept) byWeek[wk].kept++;
      });
      return {
        cols: ['week', 'users', 'retained', 'd7_pct'],
        rows: Object.keys(byWeek).sort().map(k => [k, byWeek[k].users, byWeek[k].kept, Math.round(1000 * byWeek[k].kept / byWeek[k].users) / 10])
      };
    },
    answer: "WITH c AS (\n  SELECT user_id, date(created_at) AS d0\n  FROM p_users\n  WHERE created_at >= '2026-08-01' AND created_at < '2026-10-01'\n), a AS (\n  SELECT c.user_id, c.d0,\n    MAX(CASE WHEN julianday(date(e.event_at)) - julianday(c.d0) BETWEEN 7 AND 13\n             THEN 1 ELSE 0 END) AS d7\n  FROM c\n  LEFT JOIN p_events e ON e.user_id = c.user_id\n  GROUP BY c.user_id, c.d0\n)\nSELECT strftime('%Y-%W', d0) AS week,\n       COUNT(*) AS users,\n       SUM(d7) AS retained,\n       ROUND(100.0 * SUM(d7) / COUNT(*), 1) AS d7_pct\nFROM a\nGROUP BY week\nORDER BY week;"
  },
  {
    id: 'm4',
    emoji: '🎰',
    title: '베팅 순손익 상위 5명',
    ask: '<b>p_bettings</b>로 유저별 베팅 수·총 베팅액·순손익(payout − stake)을 구하고, 순손익 <b>상위 5명</b>을 뽑으세요. (유저ID·닉네임·베팅수·총베팅·순손익)',
    hint: 'p_users와 p_bettings를 JOIN하고 GROUP BY. ORDER BY net DESC LIMIT 5. payout - stake 합계가 net입니다.',
    tables: ['p_users', 'p_bettings'],
    exp: 60,
    expected: function () {
      const m = {};
      LAB.bettings.forEach(b => {
        m[b.user_id] = m[b.user_id] || { bets: 0, staked: 0, net: 0 };
        m[b.user_id].bets++; m[b.user_id].staked += b.stake; m[b.user_id].net += b.payout - b.stake;
      });
      const rows = Object.keys(m).map(uid => {
        const u = LAB.users.find(x => x.user_id === Number(uid));
        return [Number(uid), u.nickname, m[uid].bets, m[uid].staked, m[uid].net];
      }).sort((a, b) => b[4] - a[4] || a[0] - b[0]).slice(0, 5);
      return { cols: ['user_id', 'nickname', 'bets', 'staked', 'net'], rows: rows };
    },
    answer: "SELECT u.user_id,\n       u.nickname,\n       COUNT(b.bet_id)             AS bets,\n       SUM(b.stake)                AS staked,\n       SUM(b.payout - b.stake)     AS net\nFROM p_users u\nJOIN p_bettings b ON b.user_id = u.user_id\nGROUP BY u.user_id, u.nickname\nORDER BY net DESC\nLIMIT 5;"
  },
  {
    id: 'm5',
    emoji: '📉',
    title: '게임별 환수율(RTP) 점검',
    ask: '게임별로 베팅 수·총 베팅액·총 지급액·<b>환수율(RTP = payout/stake × 100)</b>을 구해 RTP 낮은 순으로 정렬하세요. (게임·베팅수·총베팅·총지급·RTP%)',
    hint: 'GROUP BY game, SUM(payout) * 100.0 / SUM(stake), ROUND(...,1).',
    tables: ['p_bettings'],
    exp: 50,
    expected: function () {
      const m = {};
      LAB.bettings.forEach(b => {
        m[b.game] = m[b.game] || { n: 0, stake: 0, payout: 0 };
        m[b.game].n++; m[b.game].stake += b.stake; m[b.game].payout += b.payout;
      });
      const rows = Object.keys(m).map(g => [g, m[g].n, m[g].stake, m[g].payout, Math.round(1000 * m[g].payout / m[g].stake) / 10])
        .sort((a, b) => a[4] - b[4]);
      return { cols: ['game', 'bets', 'staked', 'paid', 'rtp_pct'], rows: rows };
    },
    answer: "SELECT game,\n       COUNT(*)                        AS bets,\n       SUM(stake)                      AS staked,\n       SUM(payout)                     AS paid,\n       ROUND(100.0 * SUM(payout) / NULLIF(SUM(stake), 0), 1) AS rtp_pct\nFROM p_bettings\nGROUP BY game\nORDER BY rtp_pct;"
  }
];

function weekKey(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  const day = (d.getUTCDay() + 6) % 7;           /* 월=0 */
  const th = new Date(d.getTime() - day * 86400000);
  const year = th.getUTCFullYear();
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const wk = Math.floor((th - jan1) / (7 * 86400000)) + 1;
  return year + '-' + pad(wk);
}

/* ── 3. 스키마 · 적재 SQL ───────────────────────────────────── */
const LAB_SCHEMA = [
  "CREATE TABLE p_shops (shop_id INTEGER PRIMARY KEY, name TEXT, category TEXT, district TEXT, rating REAL, review_cnt INTEGER, opened_at TEXT);",
  "CREATE TABLE p_users (user_id INTEGER PRIMARY KEY, nickname TEXT, channel TEXT, created_at TEXT);",
  "CREATE TABLE p_orders (order_id INTEGER PRIMARY KEY, user_id INTEGER, shop_id INTEGER, status TEXT, amount INTEGER, created_at TEXT, paid_at TEXT);",
  "CREATE TABLE p_reviews (review_id INTEGER PRIMARY KEY, shop_id INTEGER, order_id INTEGER, user_id INTEGER, rating INTEGER, body TEXT, created_at TEXT);",
  "CREATE TABLE p_bettings (bet_id INTEGER PRIMARY KEY, user_id INTEGER, game TEXT, stake INTEGER, payout INTEGER, created_at TEXT);",
  "CREATE TABLE p_events (event_id INTEGER PRIMARY KEY, user_id INTEGER, event_name TEXT, event_at TEXT);"
];

const LAB_TABLES_META = [
  { t: 'p_shops', d: '가게 60곳 · 별점 캐시', cols: 'shop_id · name · category · district · rating · review_cnt · opened_at' },
  { t: 'p_orders', d: '주문 · 상태(paid/cancelled/refunded)', cols: 'order_id · user_id · shop_id · status · amount · created_at · paid_at' },
  { t: 'p_reviews', d: '리뷰 · 별점 1~5', cols: 'review_id · shop_id · order_id · user_id · rating · body · created_at' },
  { t: 'p_events', d: '앱 이벤트 로그(퍼널·리텐션)', cols: 'event_id · user_id · event_name · event_at' },
  { t: 'p_users', d: '유저 500명 · 가입 채널', cols: 'user_id · nickname · channel · created_at' },
  { t: 'p_bettings', d: '베팅 900건 · stake/payout', cols: 'bet_id · user_id · game · stake · payout · created_at' }
];

/* ── 4. 엔진 (sql.js → CDN 2곳 → JS 폴백) ─────────────────── */
const SQLLAB = (function () {
  const SRC = [
    { js: 'https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/sql-wasm.js', wasm: 'https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/sql-wasm.wasm' },
    { js: 'https://unpkg.com/sql.js@1.10.3/dist/sql-wasm.js', wasm: 'https://unpkg.com/sql.js@1.10.3/dist/sql-wasm.wasm' }
  ];
  const state = { mode: 'loading', db: null, err: '', rows: 0 };

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.async = true; s.onload = () => resolve(); s.onerror = () => reject(new Error('load fail: ' + src));
      document.head.appendChild(s);
      setTimeout(() => reject(new Error('timeout')), 12000);
    });
  }

  function insertAll(db, table, cols, rows) {
    const ph = cols.map(() => '?').join(',');
    const stmt = db.prepare('INSERT INTO ' + table + ' (' + cols.join(',') + ') VALUES (' + ph + ')');
    db.run('BEGIN');
    rows.forEach(r => stmt.run(cols.map(c => r[c] == null ? null : r[c])));
    db.run('COMMIT');
    stmt.free();
  }

  async function boot() {
    for (let i = 0; i < SRC.length; i++) {
      try {
        if (!window.initSqlJs) await loadScript(SRC[i].js);
        if (!window.initSqlJs) throw new Error('initSqlJs 없음');
        const SQL = await window.initSqlJs({ locateFile: f => (SRC[i].wasm || '').replace(/sql-wasm\.wasm$/, f) });
        const db = new SQL.Database();
        LAB_SCHEMA.forEach(s => db.run(s));
        insertAll(db, 'p_shops', ['shop_id', 'name', 'category', 'district', 'rating', 'review_cnt', 'opened_at'], LAB.shops);
        insertAll(db, 'p_users', ['user_id', 'nickname', 'channel', 'created_at'], LAB.users);
        insertAll(db, 'p_orders', ['order_id', 'user_id', 'shop_id', 'status', 'amount', 'created_at', 'paid_at'], LAB.orders);
        insertAll(db, 'p_reviews', ['review_id', 'shop_id', 'order_id', 'user_id', 'rating', 'body', 'created_at'], LAB.reviews);
        insertAll(db, 'p_bettings', ['bet_id', 'user_id', 'game', 'stake', 'payout', 'created_at'], LAB.bettings);
        insertAll(db, 'p_events', ['event_id', 'user_id', 'event_name', 'event_at'], LAB.events);
        state.db = db; state.mode = 'sqlite'; state.rows = LAB.events.length;
        return state;
      } catch (e) {
        state.err = String(e && e.message || e);
      }
    }
    state.mode = 'fallback';
    state.rows = LAB.events.length;
    return state;
  }

  /* SQLite 실행 → {ok, cols, rows, ms, msg} */
  function runSqlite(sql) {
    const t0 = performance.now();
    try {
      const res = state.db.exec(sql);
      const ms = Math.round(performance.now() - t0);
      if (!res.length) return { ok: true, cols: [], rows: [], ms, msg: '실행됐어요 (결과 행 없음)' };
      const cols = res[0].columns, rows = res[0].values;
      return { ok: true, cols, rows, ms };
    } catch (e) {
      return { ok: false, cols: [], rows: [], ms: 0, msg: String(e && e.message || e) };
    }
  }

  function run(sql) {
    if (state.mode === 'sqlite') return runSqlite(sql);
    if (state.mode === 'fallback') return MINISQL.run(sql, LAB);
    return { ok: false, cols: [], rows: [], ms: 0, msg: '엔진을 아직 불러오는 중이에요' };
  }

  return { boot, run, state };
})();

/* ── 5. JS 폴백 — 단일 테이블 SELECT (가볍게) ────────────────── */
const MINISQL = (function () {
  const FNS = {
    COUNT: (vals, rows) => rows.length,
    SUM: vals => vals.reduce((a, v) => a + (Number(v) || 0), 0),
    AVG: vals => vals.length ? vals.reduce((a, v) => a + (Number(v) || 0), 0) / vals.length : null,
    MIN: vals => vals.length ? vals.reduce((a, v) => Math.min(a, Number(v))) : null,
    MAX: vals => vals.length ? vals.reduce((a, v) => Math.max(a, Number(v))) : null
  };
  function splitTop(s, sep) {
    const out = []; let depth = 0, q = null, cur = '';
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (q) { cur += ch; if (ch === q) q = null; continue; }
      if (ch === "'" || ch === '"') { q = ch; cur += ch; continue; }
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (depth === 0 && s.slice(i, i + sep.length).toUpperCase() === sep.toUpperCase()) { out.push(cur); cur = ''; i += sep.length - 1; continue; }
      cur += ch;
    }
    out.push(cur);
    return out;
  }
  function colVal(row, ref) {
    const key = ref.trim().replace(/["`]/g, '');
    const bare = key.split('.').pop();
    if (key === '*') return row;
    if (Object.prototype.hasOwnProperty.call(row, bare)) return row[bare];
    if (Object.prototype.hasOwnProperty.call(row, key)) return row[key];
    throw new Error('컬럼을 찾을 수 없어요: ' + key);
  }
  function evalExpr(expr, row, rows) {
    let e = String(expr).trim();
    e = e.replace(/\bCASE\s+WHEN\s+(.+?)\s+THEN\s+(.+?)(?:\s+ELSE\s+(.+?))?\s+END\b/gi, (m, cond, a, b) => String(evalCond(cond, row) ? evalExpr(a, row, rows) : (b != null ? evalExpr(b, row, rows) : null)));
    const agg = e.match(/^(COUNT|SUM|AVG|MIN|MAX)\s*\(\s*(DISTINCT\s+)?(.+?)\s*\)$/i);
    if (agg) {
      const fn = agg[1].toUpperCase();
      let vals = agg[3].trim() === '*' ? rows.map(() => 1) : rows.map(r => evalExpr(agg[3], r, null));
      if (agg[2]) vals = Array.from(new Set(vals.map(String))).map(Number);
      return FNS[fn](vals, rows);
    }
    const r = e.match(/^ROUND\s*\(\s*(.+?)\s*(?:,\s*(\d+)\s*)?\)$/i);
    if (r) {
      const v = evalExpr(r[1], row, rows);
      const d = r[2] == null ? 0 : Number(r[2]);
      const f = Math.pow(10, d);
      return v == null ? null : Math.round(Number(v) * f) / f;
    }
    const ab = e.match(/^ABS\s*\(\s*(.+)\s*\)$/i);
    if (ab) return Math.abs(Number(evalExpr(ab[1], row, rows)));
    if (/^NULLIF\s*\(/i.test(e)) {
      const inner = e.slice(7, -1);
      const parts = splitTop(inner, ',');
      const a = evalExpr(parts[0], row, rows), b = evalExpr(parts[1] || '0', row, rows);
      return Number(a) === Number(b) ? null : a;
    }
    if (/^-?\d+(\.\d+)?$/.test(e)) return Number(e);
    if (/^'.*'$/.test(e)) return e.slice(1, -1);
    const op = e.match(/^(.+?)\s*([+\-*/])\s*(.+)$/);
    if (op && !/^['"]/.test(e)) {
      const a = Number(evalExpr(op[1], row, rows)), b = Number(evalExpr(op[3], row, rows));
      if (op[2] === '+') return a + b;
      if (op[2] === '-') return a - b;
      if (op[2] === '*') return a * b;
      return b === 0 ? null : a / b;
    }
    return colVal(row, e);
  }
  function evalCond(cond, row) {
    const ors = splitTop(cond, ' OR ');
    return ors.some(part => splitTop(part, ' AND ').every(c => {
      const t = c.trim().replace(/^\(|\)$/g, '');
      let m = t.match(/^(.+?)\s+IS\s+NOT\s+NULL$/i);
      if (m) return colVal(row, m[1]) != null;
      m = t.match(/^(.+?)\s+IS\s+NULL$/i);
      if (m) return colVal(row, m[1]) == null;
      m = t.match(/^(.+?)\s+NOT\s+IN\s*\((.+)\)$/i);
      if (m) return !splitTop(m[2], ',').map(x => evalExpr(x, row, null)).some(v => String(v) === String(colVal(row, m[1])));
      m = t.match(/^(.+?)\s+IN\s*\((.+)\)$/i);
      if (m) return splitTop(m[2], ',').map(x => evalExpr(x, row, null)).some(v => String(v) === String(colVal(row, m[1])));
      m = t.match(/^(.+?)\s+LIKE\s+(.+)$/i);
      if (m) {
        const pat = String(evalExpr(m[2], row, null)).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.');
        return new RegExp('^' + pat + '$', 'i').test(String(colVal(row, m[1])));
      }
      m = t.match(/^(.+?)\s+BETWEEN\s+(.+?)\s+AND\s+(.+)$/i);
      if (m) { const v = Number(colVal(row, m[1])); return v >= Number(evalExpr(m[2], row, null)) && v <= Number(evalExpr(m[3], row, null)); }
      m = t.match(/^(.+?)\s*(>=|<=|<>|!=|=|>|<)\s*(.+)$/);
      if (m) {
        const a = evalExpr(m[1], row, null), b = evalExpr(m[3], row, null);
        const na = Number(a), nb = Number(b);
        const numeric = !isNaN(na) && !isNaN(nb) && a !== '' && b !== '';
        const A = numeric ? na : String(a), B = numeric ? nb : String(b);
        switch (m[2]) {
          case '=': return A === B;
          case '<>': case '!=': return A !== B;
          case '>': return A > B;
          case '<': return A < B;
          case '>=': return A >= B;
          default: return A <= B;
        }
      }
      return true;
    }));
  }
  function run(sql, LAB) {
    const t0 = performance.now();
    try {
      const q = String(sql).replace(/--[^\n]*/g, ' ').replace(/\s+/g, ' ').trim().replace(/;+\s*$/, '');
      if (/\bJOIN\b|\bWITH\b/i.test(q)) throw new Error('이 폴백 모드에서는 JOIN·WITH(CTE)를 지원하지 않아요. 인터넷이 연결되면 진짜 SQLite로 실행됩니다.');
      const m = q.match(/^SELECT\s+(.+?)\s+FROM\s+([a-z0-9_]+)(.*)$/i);
      if (!m) throw new Error("SELECT ... FROM ... 형식만 실행할 수 있어요 (폴백 모드)");
      const sel = m[1], table = m[2], rest = m[3] || '';
      const TBL = {
        p_shops: LAB.shops, p_users: LAB.users, p_orders: LAB.orders,
        p_reviews: LAB.reviews, p_bettings: LAB.bettings, p_events: LAB.events
      };
      const data = TBL[table];
      if (!data) throw new Error('테이블을 찾을 수 없어요: ' + table);
      let rows = data.slice();
      const wm = rest.match(/\bWHERE\b([\s\S]*?)(\bGROUP BY\b|\bORDER BY\b|\bLIMIT\b|$)/i);
      if (wm) rows = rows.filter(r => evalCond(wm[1], r));
      const gm = rest.match(/\bGROUP BY\b([\s\S]*?)(\bHAVING\b|\bORDER BY\b|\bLIMIT\b|$)/i);
      const om = rest.match(/\bORDER BY\b([\s\S]*?)(\bLIMIT\b|$)/i);
      const lm = rest.match(/\bLIMIT\s+(\d+)/i);
      const hm = rest.match(/\bHAVING\b([\s\S]*?)(\bORDER BY\b|\bLIMIT\b|$)/i);
      const fields = splitTop(sel === '*' ? Object.keys(data[0] || {}).join(',') : sel, ',');
      let out = [], cols = [];
      if (gm) {
        const keys = splitTop(gm[1], ',').map(s => s.trim());
        const groups = new Map();
        rows.forEach(r => {
          const k = keys.map(x => String(colVal(r, x))).join('\u0001');
          if (!groups.has(k)) groups.set(k, []);
          groups.get(k).push(r);
        });
        cols = fields.map(f => (f.split(/\s+AS\s+/i)[1] || f).trim());
        groups.forEach(grp => {
          const fake = Object.assign({}, grp[0]);
          keys.forEach(k => { fake[k.replace(/.*\./, '')] = colVal(grp[0], k); });
          if (hm && !evalCond(hm[1], Object.assign({}, fake, { __rows: grp }))) return;
          out.push(fields.map(f => {
            const body = f.split(/\s+AS\s+/i)[0];
            if (/^(COUNT|SUM|AVG|MIN|MAX)\s*\(/i.test(body.trim())) return evalExpr(body, fake, grp);
            return evalExpr(body, grp[0], grp);
          }));
        });
      } else {
        cols = fields.map(f => (f.split(/\s+AS\s+/i)[1] || f).trim());
        out = rows.map(r => fields.map(f => { const e = f.split(/\s+AS\s+/i)[0]; return /COUNT|SUM|AVG|MIN|MAX\(/i.test(e) ? evalExpr(e, r, rows) : evalExpr(e, r, null); }));
      }
      if (om) {
        const parts = splitTop(om[1], ',').map(s => s.trim());
        out.sort((a, b) => {
          for (const p of parts) {
            const desc = /\bDESC$/i.test(p);
            const ref = p.replace(/\s+(ASC|DESC)$/i, '').trim();
            const idx = cols.indexOf(ref) >= 0 ? cols.indexOf(ref) : Number(ref) - 1;
            if (idx < 0) continue;
            const va = a[idx], vb = b[idx];
            const na = Number(va), nb = Number(vb);
            const cmp = (!isNaN(na) && !isNaN(nb) && va !== null && vb !== null) ? na - nb : String(va).localeCompare(String(vb));
            if (cmp) return desc ? -cmp : cmp;
          }
          return 0;
        });
      }
      if (lm) out = out.slice(0, Number(lm[1]));
      return { ok: true, cols, rows: out, ms: Math.round(performance.now() - t0), mini: true };
    } catch (e) {
      return { ok: false, cols: [], rows: [], ms: 0, msg: String(e && e.message || e) };
    }
  }
  return { run };
})();

/* ── 6. 채점 ────────────────────────────────────────────────── */
function normCell(v) {
  if (v == null) return '';
  if (typeof v === 'number') return String(Math.round(v * 100) / 100);
  const n = Number(v);
  if (v !== '' && !isNaN(n) && /^-?\d+(\.\d+)?$/.test(String(v).trim())) return String(Math.round(n * 100) / 100);
  return String(v).trim();
}
function gradeResult(mission, res) {
  if (!res.ok) return { pass: false, why: '쿼리 오류: ' + res.msg };
  const exp = mission.expected();
  const want = exp.rows.map(r => r.map(normCell));
  const got = res.rows.map(r => r.map(normCell));
  if (res.cols.length !== exp.cols.length) {
    return { pass: false, why: '컬럼 수가 달라요 — 기대 ' + exp.cols.length + '개(' + exp.cols.join(', ') + '), 지금 ' + res.cols.length + '개' };
  }
  if (got.length !== want.length) {
    return { pass: false, why: '행 수가 달라요 — 기대 ' + want.length + '행, 지금 ' + got.length + '행' };
  }
  const canon = rows => rows.map(r => r.join(' | ')).sort();
  const a = canon(want), b = canon(got);
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return { pass: false, why: '값이 달라요.\n기대: ' + a[i] + '\n지금: ' + b[i] };
    }
  }
  return { pass: true, why: '정답! 기대한 표와 똑같아요.' };
}
function missionById(id) { return SQL_MISSIONS.find(m => m.id === id) || null; }
function sqlSolvedCount() { const s = S.sql.solved || {}; return SQL_MISSIONS.filter(m => s[m.id]).length; }
function sqlPassRate() { return Math.round(sqlSolvedCount() / SQL_MISSIONS.length * 100); }

/* ── 7. GitHub 잔디 (@rlooko) ─────────────────────────────── */
const GH = (function () {
  const URL = 'https://api.github.com/users/rlooko/events/public?per_page=30';
  const CACHE_KEY = 'yongeun-gh-cache-v1';
  const state = { status: 'idle', msg: '' };

  function cacheGet() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch (e) { return null; }
  }
  function cacheSet(d) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch (e) { }
  }
  function summarize(events) {
    const pushes = (events || []).filter(e => e.type === 'PushEvent');
    const days = {};
    pushes.forEach(e => { const d = kstParts(Date.parse(e.created_at)).date; days[d] = (days[d] || 0) + (e.payload && e.payload.commits ? e.payload.commits.length : 1); });
    const list = Object.keys(days).sort().reverse();
    const today = TODAY;
    const todayCount = days[today] || 0;
    const TYPE_LABEL = { CreateEvent: '생성', WatchEvent: '스타', ForkEvent: '포크', IssuesEvent: '이슈', PullRequestEvent: 'PR', ReleaseEvent: '릴리스', DeleteEvent: '삭제', PublicEvent: '공개' };
    const recent = (events || []).slice(0, 6).map(e => {
      const pl = e.payload || {};
      let detail = TYPE_LABEL[e.type] || '';
      if (e.type === 'PushEvent') {
        const branch = String(pl.ref || '').replace('refs/heads/', '');
        detail = (branch ? branch + ' 브랜치 푸시' : '푸시') + (pl.size ? ' · ' + pl.size + '커밋' : '');
      } else if (e.type === 'CreateEvent') {
        detail = (pl.ref_type || '레포') + (pl.ref ? ' ' + pl.ref : '') + ' 생성';
      }
      return {
        type: e.type,
        repo: (e.repo && e.repo.name || '').replace('rlooko/', ''),
        when: e.created_at,
        detail: detail
      };
    });
    return { todayCount, lastDate: list[0] || '', streakDays: (function () {
      let n = 0;
      for (let i = 0; i < 60; i++) { const d = daysAgoStr(i); if (days[d]) n++; else if (i === 0) continue; else break; }
      return n;
    })(), recent };
  }
  async function fetchNow(force) {
    const c = cacheGet();
    if (!force && c && Date.now() - (c.fetchedAt || 0) < 10 * 60 * 1000) {
      state.status = 'cached'; state.msg = '10분 캐시'; return c;
    }
    state.status = 'loading';
    try {
      const res = await fetch(URL, { headers: { Accept: 'application/vnd.github+json' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const events = await res.json();
      const sum = summarize(events);
      const data = Object.assign({ fetchedAt: Date.now(), ok: true }, sum);
      cacheSet(data);
      S.gh = Object.assign({ login: 'rlooko' }, data);
      save();
      state.status = 'live'; state.msg = '';
      return data;
    } catch (e) {
      const cs = cacheGet();
      state.status = cs ? 'cached' : 'error';
      state.msg = cs ? '캐시로 표시 (레이트리밋/오프라인)' : '불러오지 못했어요';
      if (cs) return cs;
      return { fetchedAt: 0, ok: false, todayCount: 0, recent: [], streakDays: 0, lastDate: '' };
    }
  }
  function cached() {
    const c = cacheGet();
    if (c) return c;
    if (S.gh && S.gh.fetchedAt) return S.gh;
    return { fetchedAt: 0, ok: false, todayCount: 0, recent: [], streakDays: 0, lastDate: '' };
  }
  return { fetchNow, cached, state, summarize };
})();
