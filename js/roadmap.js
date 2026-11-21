/** V4 · 데이터 분석가 커리어 코스 (V3 콘텐츠 이관)
 *  · 5단계 로드맵 · 모의 SQL/케이스 테스트 · 면접 카드 8선 · 체크/메모(S.v3Career)
 *  · renderV3() 가 #v3Box 안에 그립니다.
 */

const V3_STAGES = [
  /* ───────────────────────── Stage 1 ───────────────────────── */
  {
    id: 'v3s1', n: 1, emoji: '🧱', title: '기초 & 실무 감각 다지기',
    period: '1~3주 · 하루 40분', sub: 'SQL · 지표 · Pandas · 통계 — 실무에서 바로 쓰는 것만',
    intro: '면접에서 "SQL 짜봤어요?"가 아니라 "이 지표 왜 이렇게 정의했어요?"를 묻습니다. 이 단계는 문법 암기가 아니라 **실무 언어**를 익히는 구간이에요. 각 주제는 ① 왜 쓰는지 → ② 복붙 가능한 치트시트 → ③ 무료 실습 링크 → ④ 완료 체크 순서로 되어 있어요.',
    topics: [
      {
        id: 't_sql', icon: '🗄', title: 'SQL 핵심 — JOIN · 집계 · 윈도우 · 퍼널/리텐션', time: '3일 × 40분',
        why: '데이터 분석가 채용 과제의 70~80%가 SQL입니다. 현업에서도 "이번 달 크리에이터별 ROAS 뽑아줘"는 결국 쿼리 한 장이에요. 문법을 다 외우는 게 아니라 <b>패턴 5개</b>를 손에 붙이면 대부분의 문제가 풀립니다.',
        items: [
          { id: 't_sql_1', t: 'INNER/LEFT JOIN 결과 차이를 설명하고, LEFT JOIN이 WHERE 때문에 INNER로 바뀌는 함정을 고칠 수 있다' },
          { id: 't_sql_2', t: 'GROUP BY + HAVING으로 지표를 집계하고 WHERE와의 순서 차이를 설명할 수 있다' },
          { id: 't_sql_3', t: 'ROW_NUMBER · LAG · SUM OVER로 순위·직전값 비교·비중을 만든다' },
          { id: 't_sql_4', t: 'WITH절로 퍼널 전환율과 코호트 리텐션 쿼리를 처음부터 쓴다' }
        ],
        cheats: [
          {
            label: '① JOIN — INNER vs LEFT, 그리고 WHERE절 함정',
            code: "-- 크리에이터별 성과. 캠페인이 한 번도 없는 크리에이터도 보고 싶다\nSELECT c.creator_id, c.name, COUNT(p.log_id) AS logs\nFROM creators c\nLEFT JOIN performance_logs p\n       ON p.creator_id = c.creator_id\n      AND p.posted_at >= '2026-01-01'   -- ★ LEFT JOIN의 조건은 ON에\nGROUP BY c.creator_id, c.name;",
            note: '조건을 <b>WHERE p.posted_at >= ...</b>에 쓰면 매칭 안 된 행의 p.posted_at이 NULL이라 전부 걸러져 <b>INNER JOIN</b>처럼 됩니다. "왼쪽은 다 남긴다"가 LEFT JOIN의 유일한 규칙이에요.'
          },
          {
            label: '② GROUP BY · HAVING — 집계 전 필터 vs 집계 후 필터',
            code: "SELECT creator_id,\n       SUM(cost_krw)    AS cost,\n       SUM(revenue_krw) AS revenue,\n       ROUND(SUM(revenue_krw)::numeric / NULLIF(SUM(cost_krw),0), 2) AS roas\nFROM performance_logs\nWHERE posted_at >= '2026-01-01'      -- 행 필터 (집계 전)\nGROUP BY creator_id\nHAVING SUM(revenue_krw) >= 3000000   -- 집계 결과 필터 (집계 후)\nORDER BY roas DESC;",
            note: 'SELECT에 없는 집계를 HAVING에 써도 됩니다. <b>NULLIF(x,0)</b>은 0으로 나누는 에러를 막는 습관 — 실무 데이터는 0원 캠페인이 반드시 있어요.'
          },
          {
            label: '③ 윈도우 함수 — ROW_NUMBER · LAG · SUM OVER',
            code: "-- 캠페인별 매출 상위 2명만 남기기\nWITH ranked AS (\n  SELECT campaign_id, creator_id, revenue_krw,\n         ROW_NUMBER() OVER (PARTITION BY campaign_id ORDER BY revenue_krw DESC) AS rn,\n         SUM(revenue_krw) OVER (PARTITION BY campaign_id) AS camp_total\n  FROM performance_logs\n)\nSELECT *, ROUND(revenue_krw::numeric / NULLIF(camp_total,0) * 100, 1) AS share_pct\nFROM ranked\nWHERE rn <= 2;",
            note: '<b>ROW_NUMBER</b>=중복 없는 순번, <b>RANK</b>=동점이면 번호 건너뜀, <b>DENSE_RANK</b>=동점이면 다음 번호. "TOP N"은 ROW_NUMBER, "공동 1등까지"는 RANK로 고릅니다.'
          },
          {
            label: '④ 윈도우 함수 — LAG로 직전 캠페인 대비 변화',
            code: "SELECT creator_id, campaign_id, posted_at, views,\n       LAG(views) OVER (PARTITION BY creator_id ORDER BY posted_at) AS prev_views,\n       views - LAG(views) OVER (PARTITION BY creator_id ORDER BY posted_at) AS diff,\n       ROUND(100.0 * (views - LAG(views) OVER (PARTITION BY creator_id ORDER BY posted_at))\n             / NULLIF(LAG(views) OVER (PARTITION BY creator_id ORDER BY posted_at),0), 1) AS diff_pct\nFROM performance_logs;",
            note: 'GROUP BY로는 "행은 그대로 두고 이웃 값 참조"가 안 됩니다. 전월 대비·첫 구매 후 재구매 간격·세션 내 다음 클릭이 모두 LAG/LEAD 패턴이에요.'
          },
          {
            label: '⑤ 퍼널 전환율 — 단계별 사용자 수',
            code: "WITH ev AS (\n  SELECT user_id,\n         MIN(CASE WHEN event_name = 'view_product' THEN event_at END) AS t_view,\n         MIN(CASE WHEN event_name = 'add_cart'     THEN event_at END) AS t_cart,\n         MIN(CASE WHEN event_name = 'purchase'     THEN event_at END) AS t_buy\n  FROM events\n  WHERE event_at >= '2026-11-01' AND event_at < '2026-12-01'\n  GROUP BY user_id\n)\nSELECT COUNT(t_view) AS view_users,\n       COUNT(t_cart) AS cart_users,\n       COUNT(t_buy)  AS buy_users,\n       ROUND(100.0*COUNT(t_cart)/NULLIF(COUNT(t_view),0),1) AS view_to_cart,\n       ROUND(100.0*COUNT(t_buy) /NULLIF(COUNT(t_cart),0),1) AS cart_to_buy\nFROM ev;",
            note: '순서까지 보려면 <b>t_view &lt; t_cart AND t_cart &lt; t_buy</b> 조건을 붙입니다. "단계별 인원"과 "순서를 지킨 인원"은 다른 숫자라는 걸 면접에서 꼭 구분하세요.'
          },
          {
            label: '⑥ 코호트 리텐션 — 가입 주차 × D7',
            code: "WITH cohort AS (\n  SELECT user_id, DATE_TRUNC('week', MIN(created_at)) AS cohort_week\n  FROM users GROUP BY user_id\n), act AS (\n  SELECT DISTINCT user_id, DATE_TRUNC('week', event_at) AS act_week FROM events\n)\nSELECT c.cohort_week, COUNT(DISTINCT c.user_id) AS users,\n       ROUND(100.0 * COUNT(DISTINCT CASE WHEN a.act_week = c.cohort_week + INTERVAL '7 days'\n                                         THEN a.user_id END)\n             / COUNT(DISTINCT c.user_id), 1) AS d7_retention\nFROM cohort c\nLEFT JOIN act a ON a.user_id = c.user_id\nGROUP BY c.cohort_week\nORDER BY c.cohort_week;",
            note: 'DB마다 날짜 함수가 다릅니다 — BigQuery <b>DATE_TRUNC(date, WEEK)</b>, PostgreSQL <b>date_trunc(\'week\', ts)</b>, MySQL <b>YEARWEEK()</b>. 원하는 DB 문법으로 한 번 더 써 보면 면접에서 안 헷갈려요.'
          }
        ],
        links: [
          { t: 'SQLBolt (무료 인터랙티브)', u: 'https://sqlbolt.com/' },
          { t: 'Mode SQL Tutorial', u: 'https://mode.com/sql-tutorial/' },
          { t: 'PostgreSQL Exercises', u: 'https://pgexercises.com/' },
          { t: 'LeetCode SQL 50', u: 'https://leetcode.com/studyplan/top-sql-50/' }
        ]
      },
      {
        id: 't_metric', icon: '📊', title: '비즈니스 지표 설계 — DAU · 리텐션 · 퍼널 · ROAS', time: '2일 × 40분',
        why: '같은 숫자도 정의에 따라 20%씩 달라집니다. 면접관은 "이 지표의 분모가 뭐예요?"로 지원자가 데이터를 <b>정의해서 합의하는 사람</b>인지 봅니다. 지표를 외우는 게 아니라 <b>회사마다 정의를 맞추는 절차</b>를 익히세요.',
        items: [
          { id: 't_metric_1', t: 'DAU/MAU/Stickiness의 분모·중복제거 기준을 말할 수 있다' },
          { id: 't_metric_2', t: '가입주차 × 경과일 코호트 리텐션 표를 직접 설계한다' },
          { id: 't_metric_3', t: '퍼널 전환율을 단계별로 계산해 가장 큰 이탈 지점을 찾는다' },
          { id: 't_metric_4', t: 'ROAS·CAC·LTV·회수기간을 계산하고 서로 연결해 설명한다' }
        ],
        cheats: [
          {
            label: '핵심 지표 정의 카드',
            code: "DAU  = 그날 1회 이상 '의미 있는 행동'을 한 순사용자 수 (로그인만? 조회 포함? → 팀과 합의)\nMAU  = 그달 순사용자 수\nStickiness = DAU / MAU        (예: 0.25 = 매달 온 사람 중 25%가 매일 옴)\nRetention D7 = 가입 후 7일째 되는 날 다시 온 사용자 / 가입자\nFunnel 전환율 = 다음 단계 도달자 / 이전 단계 도달자\nROAS = 캠페인 매출 / 캠페인 비용     (2.0 = 200%, 광고비 1원당 매출 2원)\nCPV  = 캠페인 비용 / 조회수          (원/조회 — 크리에이터 효율 비교의 핵심)\nCAC  = 획득 비용 / 신규 고객 수\nLTV  = ARPU × 평균 유지 개월 수   (또는 공헌이익 기준)\n회수기간(payback) = CAC / 월 ARPU",
            note: '"활성 사용자"의 정의를 정하지 않으면 DAU는 팀마다 다릅니다. 분석가의 첫 산출물은 대시보드가 아니라 <b>지표 정의서</b>예요.'
          },
          {
            label: '코호트 리텐션 표 (엑셀·노션에 그대로)',
            code: "        가입주차   신규   D1     D7     D14    D30\n        2026-W40   1,200  38.2%  21.4%  14.0%  9.1%\n        2026-W41   1,050  36.9%  20.1%  12.8%   -\n        2026-W42   1,310  40.1%  23.0%   -      -\n\n읽는 법: 행=가입 코호트, 열=가입 후 경과일. 세로로 내려가면 '요즘 가입자'의 변화,\n가로로 읽으면 '같은 코호트가 시간에 따라 빠지는 모양'.",
            note: '<b>classic</b>=정확히 N일째 방문, <b>rolling</b>=N일 이후 한 번이라도 방문, <b>unbounded</b>=N일 이후 누적. 셋을 섞으면 리텐션이 부풀려 보입니다 — 보고서에 어떤 정의인지 반드시 적으세요.'
          },
          {
            label: 'ROAS · CAC · LTV 연결 공식',
            code: "ROAS = 매출 / 광고비\nCAC  = 광고비 / 신규고객\nLTV  ≈ ARPU × (1 / 월 churn)\nLTV/CAC ≥ 3  → 건강한 편 (업계 경험칙, 절대 기준 아님)\npayback(개월) = CAC / 월 ARPU\n\n예) 광고비 300만 → 신규 150명, 매출 900만\n   CAC = 20,000원, ROAS = 3.0\n   월 ARPU 8,000원, 월 churn 8% → LTV ≈ 100,000원 → LTV/CAC = 5.0",
            note: 'ROAS만 보면 "매출은 늘었는데 이익은 줄었다"를 놓칩니다. 공헌이익(마진) 기준 ROAS를 함께 보세요.'
          },
          {
            label: '퍼널 해석 3단계',
            code: "① 단계별 전환율을 본다        노출 → 클릭 2.1% / 클릭 → 장바구니 18% / 장바구니 → 구매 41%\n② '가장 큰 절대 손실'을 찾는다   1,000명 중 노출→클릭에서 979명이 빠짐\n③ 구간·기기·신규/기존으로 쪼갠다 iOS 3.2% vs Android 1.4% → iOS 결제 오류 의심\n\n※ 전환율이 낮은 단계 ≠ 고칠 단계. 개선 비용과 임팩트로 우선순위를 정합니다.",
            note: '퍼널은 <b>같은 기간·같은 모수</b>로 비교해야 합니다. 신규 유입이 급증한 달은 전환율이 구조적으로 떨어져 보여요.'
          }
        ],
        links: [
          { t: 'Amplitude — North Star 가이드', u: 'https://amplitude.com/blog/product-north-star-metric' },
          { t: 'Mixpanel — 리텐션 정의', u: 'https://docs.mixpanel.com/docs/reports/retention' },
          { t: 'Google Analytics 도움말', u: 'https://support.google.com/analytics/answer/12195621' }
        ]
      },
      {
        id: 't_pandas', icon: '🐼', title: 'Python Pandas & 시각화 — 정제부터 차트까지', time: '3일 × 40분',
        why: 'SQL로 뽑은 표를 <b>발표할 수 있는 형태</b>로 만드는 도구입니다. 실무에서 시간을 가장 많이 잡아먹는 건 모델링이 아니라 결측치·이상치·중복 정리예요. 면접에서 "데이터 정제 어떻게 했어요?"는 단골 질문입니다.',
        items: [
          { id: 't_pd_1', t: '결측치를 없음/0/모름으로 구분하고 처리 근거를 기록한다' },
          { id: 't_pd_2', t: 'IQR·분위수로 이상치를 찾고 윈저화·제외 기준을 정한다' },
          { id: 't_pd_3', t: 'groupby+agg와 merge(validate=)로 분석 테이블을 만든다' },
          { id: 't_pd_4', t: 'Seaborn/Plotly로 막대·산점·시계열 차트 3종을 저장한다' }
        ],
        cheats: [
          {
            label: '결측치 · 이상치 처리',
            code: "import pandas as pd\n\ndf = pd.read_csv('perf.csv', parse_dates=['posted_at'])\n\n# 1) 결측은 '없음'과 '0'을 먼저 구분한다\nprint(df.isna().sum())\nprint(df[df['views'].isna()].head())          # 정말 측정 실패인지 눈으로 확인\ndf['views'] = df['views'].fillna(0)            # 측정 실패 → 0으로 두면 CPV가 왜곡됨! 표시용으로만\n\n# 2) 이상치는 IQR로 표시만 하고, 삭제는 근거를 남긴다\nq1, q3 = df['views'].quantile([.25, .75])\niqr = q3 - q1\nout = df[(df['views'] < q1 - 1.5*iqr) | (df['views'] > q3 + 1.5*iqr)]\nprint('이상치', len(out), '건 /', len(df))\n\n# 3) 극단값은 지우기보다 상한을 자른다(윈저화)\nlo, hi = df['views'].quantile([.01, .99])\ndf['views_w'] = df['views'].clip(lo, hi)",
            note: '결측치를 무조건 평균으로 채우면 분산이 줄어 통계 검정이 망가집니다. <b>왜 비었는지</b>(수집 실패/미공개/0)를 먼저 분류하고, 처리 방침을 노트에 남기세요.'
          },
          {
            label: 'groupby · merge — 분석 테이블 만들기',
            code: "g = (df.groupby(['creator_id', 'follower_tier'], as_index=False)\n       .agg(views=('views', 'sum'),\n            cost=('cost_krw', 'sum'),\n            conv=('conversions', 'sum'),\n            posts=('log_id', 'count')))\n\ng['cpv'] = g['cost'] / g['views'].replace(0, pd.NA)\ng['cvr'] = g['conv'] / g['views'].replace(0, pd.NA)\n\nm = g.merge(creators[['creator_id', 'name', 'category', 'followers']],\n            on='creator_id', how='left', validate='m:1')   # 관계 검증\n\nassert m['creator_id'].is_unique",
            note: '<b>validate=</b>는 merge 사고를 막는 안전장치예요("m:1"인데 안 맞으면 에러). 이 한 줄을 습관으로 넣으면 "왜 행이 3배로 늘었지?"를 90% 막습니다.'
          },
          {
            label: 'Seaborn · Plotly 핵심 패턴',
            code: "import seaborn as sns, matplotlib.pyplot as plt\nsns.set_theme(style='whitegrid', font_scale=1.05)\n\nfig, ax = plt.subplots(figsize=(7, 3.6))\nsns.barplot(data=m, x='follower_tier', y='cpv', errorbar=('ci', 95), ax=ax)\nax.set_title('팔로워 구간별 CPV (낮을수록 효율 좋음)', loc='left', fontsize=11)\nax.set_xlabel(''); ax.set_ylabel('원 / 조회')\nplt.tight_layout(); plt.savefig('cpv.png', dpi=160)\n\n# Plotly — 마우스오버가 필요한 대시보드용\nimport plotly.express as px\nfig = px.scatter(m, x='engagement_rate', y='cpv', color='category',\n                 size='followers', hover_name='name',\n                 title='참여율 vs CPV — 왼쪽 위가 재협업 후보')\nfig.write_html('scatter.html')",
            note: '차트 제목은 <b>결론 문장</b>으로 씁니다("팔로워 구간별 CPV" ❌ → "5~20만 구간 CPV가 가장 낮다" ⭕). 축 단위·표본 수·기간을 그림 안에 적는 습관이 발표 설득력을 바꿉니다.'
          }
        ],
        links: [
          { t: 'pandas 10 minutes', u: 'https://pandas.pydata.org/docs/user_guide/10min.html' },
          { t: 'Kaggle Learn — Pandas', u: 'https://www.kaggle.com/learn/pandas' },
          { t: 'Python Data Science Handbook', u: 'https://jakevdp.github.io/PythonDataScienceHandbook/' },
          { t: 'Seaborn 튜토리얼', u: 'https://seaborn.pydata.org/tutorial.html' }
        ]
      },
      {
        id: 't_stat', icon: '🎲', title: '통계 & A/B 테스트 기초 — p-value를 정확하게', time: '2일 × 40분',
        why: 'A/B 테스트 결과를 "p값 0.04니까 좋아요"로 끝내면 면접에서 바로 꼬리질문이 들어옵니다. 분석가의 일은 <b>유의성 + 효과 크기 + 비즈니스 판단</b>을 함께 말하는 거예요.',
        items: [
          { id: 't_stat_1', t: '귀무가설/대립가설을 비즈니스 문장으로 쓴다' },
          { id: 't_stat_2', t: 'p-value의 정확한 정의와 흔한 오해 3가지를 말한다' },
          { id: 't_stat_3', t: 'MDE와 샘플 사이즈로 실험 기간을 정한다' },
          { id: 't_stat_4', t: 'peeking · SRM · 다중비교 점검 목록을 만든다' }
        ],
        cheats: [
          {
            label: '가설 세우기 (예: 온보딩 2단계 개선)',
            code: "H0 (귀무가설): 2단계 이탈률은 개선안 적용 후에도 45%와 같다. (차이 = 0)\nH1 (대립가설): 2단계 이탈률은 45%와 다르다.            (양측검정)\n\n— '다르다'가 아니라 'A가 B보다 낮다'를 주장하려면 단측검정이지만,\n  실무에서는 양측검정이 기본입니다(예상 밖 악화도 보고해야 하니까).",
            note: '가설은 <b>측정 가능한 숫자</b>로 써야 합니다. "개선된다"가 아니라 "2단계 이탈률이 45% → 38%로 낮아진다".'
          },
          {
            label: 'p-value 정확한 정의 + 오해 3가지',
            code: "p-value = H0가 참이라고 가정했을 때,\n           지금 관측한 것만큼(또는 더 극단적인) 결과가 나올 확률\n\n❌ 오해1: 'H0가 맞을 확률'이다            → 아님 (H0는 참/거짓이지 확률 아님)\n❌ 오해2: '효과가 클 확률'이다             → 아님 (효과 크기와 무관)\n❌ 오해3: 'p<0.05면 실무적으로 중요하다'   → 아님 (표본이 크면 0.1% 차이도 유의)\n\n→ 그래서 항상 함께 보는 것: 효과 크기(절대값), 신뢰구간, 표본 수, 비용",
            note: '면접 답변 템플릿: "p=0.04는 H0가 참일 때 이런 데이터가 4% 확률로 나온다는 뜻이고, 전환율 +0.3%p는 월 매출 ○○원이라 실무적으로는 작습니다. 그래서 저는 ~를 먼저 확인하겠습니다."'
          },
          {
            label: 'MDE · 샘플 사이즈 (80% 검정력, α=0.05 근사)',
            code: "그룹당 필요 표본 n ≈ 16 × p(1-p) / MDE²\n  (p = 기존 전환율, MDE = 검출하고 싶은 최소 차이, 절대값)\n\n예) 기존 전환율 10%, 1%p 개선을 보고 싶다 (MDE=0.01)\n   n ≈ 16 × 0.1 × 0.9 / 0.0001 = 14,400명/그룹\n   하루 유입 600명 ÷ 2그룹 = 300명/일 → 약 48일\n\n→ 48일이 너무 길면: MDE를 2%p로 키우거나(더 큰 효과만 검출),\n   기간을 늘리거나, 지표를 '구매' 대신 '장바구니'로 바꿔 분산을 줄입니다.",
            note: '정확한 값은 계산기로: Evan Miller Sample Size Calculator. "실험 기간을 먼저 정하고 결과를 맞추는" 순서가 아니라 <b>MDE로 기간을 정하는</b> 순서가 맞습니다.'
          },
          {
            label: '실무 함정 체크리스트',
            code: "□ Peeking — 중간에 들여다보고 유의하면 멈추기 (거짓양성 급증) → 사전 등록한 기간까지 기다림\n□ SRM — 배정 비율 50:50인데 실제 47:53? → 로그·배정 버그 먼저 확인\n□ 다중비교 — 지표 10개 중 1개 유의 = 우연일 수 있음 → 본지표 1개 + 보조지표는 참고만\n□ 계절성 — 추석·블랙프라이데이 전후 비교는 왜곡 → 동일 요일·동일 기간\n□ 신규성 효과 — 출시 첫 주만 좋고 사라짐 → 최소 2주, 가능하면 4주\n□ 지표 이동 — 클릭은 늘고 구매는 줄어드는 경우 → 최종 지표(매출/리텐션)로 판단",
            note: '이 6줄은 면접에서 "실험 설계할 때 뭘 조심하세요?" 질문의 모범 답안 재료입니다. 하나씩 <b>내 프로젝트 사례</b>와 연결해 말할 수 있게 준비하세요.'
          }
        ],
        links: [
          { t: 'Evan Miller 샘플 사이즈 계산기', u: 'https://www.evanmiller.org/ab-testing/sample-size.html' },
          { t: 'AB Test Guide 계산기', u: 'https://abtestguide.com/calc/' },
          { t: 'Kaggle Learn — Intro to Statistics', u: 'https://www.kaggle.com/learn/intro-to-statistics' }
        ]
      }
    ]
  },

  /* ───────────────────────── Stage 2 ───────────────────────── */
  {
    id: 'v3s2', n: 2, emoji: '🚀', title: '실전 프로젝트 A · 크리에이터 캠페인 ROI 대시보드',
    period: '2~3주 · 주 5시간', sub: '크리에이터 대행 운영 경험 × 데이터 — 면접에서 가장 강한 카드',
    intro: '지원자 대부분은 "타이타닉 생존 예측"을 들고 옵니다. 당신은 <b>실제로 크리에이터를 매칭하고 단가를 협상하는 사람</b>이에요. 같은 데이터를 봐도 "어떤 크리에이터에게 다음 예산을 줘야 하는가"라는 질문을 던질 수 있는 사람은 드뭅니다. 이 프로젝트는 그 차이를 증명하는 포트폴리오입니다.',
    steps: [
      {
        id: 'a1', n: 1, title: 'Step 1 · 비즈니스 문제 정의 (한 장으로)',
        goal: '산출물: 문제정의서 1장 (배경 / 질문 / 지표 / 범위 / 가정)',
        body: '<p class="v3-p">분석은 쿼리가 아니라 <b>의사결정 문장</b>에서 시작합니다. "크리에이터 데이터를 분석한다"는 질문이 아니에요. "다음 분기 예산 3,000만 원을 누구에게 배분할지 결정한다"가 질문입니다.</p>' +
          '<div class="v3-tip">문제 문장 템플릿<br><b>우리는 [누가] [무엇을 결정]하기 위해, [어떤 데이터]로 [언제까지] [어떤 지표]를 확인한다.</b><br>예: "우리는 다음 캠페인 예산을 크리에이터 20명에게 배분하기 위해, 최근 6개월 캠페인 로그로 11월 말까지 <b>구간별 CPV·ROAS·재협업률</b>을 확인한다."</div>' +
          '<div class="v3-subtt">이해관계자에게 실제로 물어볼 3가지</div>' +
          '<ul class="v3-list"><li><b>브랜드가 최종적으로 보는 숫자</b>는 뭐예요? (노출? 저장 수? 실제 구매?)</li><li><b>재협업을 결정하는 기준</b>이 지금은 무엇인가요? (감? 조회수? 브랜드 만족도?)</li><li>이번 분기 <b>예산 상한과 마감</b>은 언제인가요?</li></ul>' +
          '<div class="v3-subtt">정의해야 할 지표 (여기서 대부분 갈립니다)</div>' +
          '<ul class="v3-list"><li><b>CPV</b> = 협업 단가 ÷ 게시물 조회수 (원/조회). 조회수는 게시 후 며칠 기준인지 명시.</li><li><b>ROAS</b> = 캠페인 매출 ÷ 단가. 쿠폰 코드·UTM으로 귀속한 매출만.</li><li><b>리드타임</b> = 게시일 − 계약일. 대행사 병목을 보여주는 지표.</li><li><b>재협업률</b> = 2회 이상 협업한 크리에이터 ÷ 전체 크리에이터.</li></ul>' +
          '<div class="v3-tip warn">범위를 정하고 <b>빼는 것도 문서에 적으세요</b>. "이번 분석은 뷰티·리빙 카테고리, 2026년 상반기, 샤오홍슈만"처럼 쓰면 면접관이 "그래서 나머지는요?"라고 물을 때 답이 준비돼 있습니다.</div>',
        checks: [
          { id: 'a1_c1', t: '문제를 "누가 / 무엇을 결정 / 어떤 지표 / 언제까지" 문장으로 1줄 작성했다' },
          { id: 'a1_c2', t: '이해관계자 질문 3개를 적고, 내가 아는 답/모르는 답을 구분했다' },
          { id: 'a1_c3', t: '지표 4개(CPV·ROAS·리드타임·재협업률)의 분자·분모를 정의했다' },
          { id: 'a1_c4', t: '분석 범위(기간·카테고리·플랫폼)와 제외 범위를 명시했다' }
        ],
        ask: ['문제 정의가 실제 의사결정과 연결되어 있는지', '지표 정의에 빠진 분모/기간 조건이 없는지']
      },
      {
        id: 'a2', n: 2, title: 'Step 2 · 데이터 확보 — 실제 데이터로 하는 3가지 루트',
        goal: '산출물: 테이블 3개 스키마 + 1,000행 데이터 + 수집 코드/출처 노트',
        body: '<p class="v3-p">"실제 회사 데이터가 없는데 가능한가?" — 결론부터: <b>충분히 실제 데이터로 가능합니다.</b> 면접관이 보는 건 사내 데이터의 진위가 아니라 <b>데이터를 어떻게 구했고, 한계를 어떻게 밝혔고, 그 위에서 어떤 판단을 했는지</b>예요. 아래 3개 루트 중 ①+②를 쓰고, 필요하면 ③으로 보완하는 조합을 추천합니다.</p>',
        routes: [
          {
            id: 'a2r1', icon: '①', title: 'YouTube Data API로 실제 크리에이터 50~100명 수집 (무료)',
            body: '<p class="v3-p">구글 계정만 있으면 <b>결제 없이 무료 쿼터</b>로 실제 채널·영상 통계를 받을 수 있습니다. 이게 가장 설득력 높은 "진짜 데이터"예요. 포트폴리오에 "실제 채널 87개, 영상 2,610개를 수집해 분석"이라고 쓸 수 있습니다.</p>' +
              '<div class="v3-subtt">준비 (10분)</div>' +
              '<ul class="v3-list"><li>Google Cloud Console → 새 프로젝트 → <b>API 및 서비스 → 라이브러리 → YouTube Data API v3</b> 사용 설정</li><li>사용자 인증 정보 → API 키 발급 (무료, 카드 등록 불필요)</li><li>키는 코드에 직접 쓰지 말고 환경변수/<b>.env</b>로. GitHub에 올리면 즉시 폐기됩니다.</li></ul>' +
              '<div class="v3-subtt">쿼터 계산 — 이걸 모르면 첫날 다 씁니다</div>' +
              '<ul class="v3-list"><li>하루 기본 <b>10,000 units</b></li><li><b>search.list = 100 units</b> (비쌈!) · videos.list / channels.list / playlistItems.list = <b>1 unit</b></li><li>search로 100명을 찾으면 10,000 units → 그날 끝. <b>채널 ID는 직접 모으고</b>(공개 채널 URL에서 확인) uploads 재생목록으로 영상을 가져오면 <b>채널당 3 units</b> → 100명이 300 units로 끝납니다.</li></ul>' +
              '<div class="v3-subtt">수집 코드 (Python)</div>' +
              '<div class="v3-codebox-placeholder" data-k="apic"></div>' +
              '<div class="v3-subtt">무엇을 뽑고 무엇을 파생하나</div>' +
              '<ul class="v3-list"><li>채널: 구독자 수, 총 조회수, 영상 수, 개설일</li><li>영상(최근 30개): 조회수·좋아요·댓글·게시일</li><li>파생: 영상당 평균 조회수, <b>참여율=(좋아요+댓글)/조회수</b>, 최근 30일 조회 증가(2회 스냅샷 차이), <b>조회/구독 비율</b>(허수 판별)</li><li>단가는 API에 없음 → 업계 레이트카드나 과거 협업 단가를 <b>「가정 컬럼」</b>으로 두고, 가정을 바꿔도 결론이 유지되는지 민감도 분석</li></ul>' +
              '<div class="v3-tip warn"><b>약관·개인정보 주의</b> — YouTube API Services Terms상 통계 데이터는 최신 상태 유지·30일 내 갱신/삭제 원칙이 있고, 비공개 정보·개인 식별 정보 수집은 금지입니다. 포트폴리오에는 원본 덤프 대신 <b>집계·비율·차트</b>를 싣고, "YouTube Data API로 수집, 수집일 ○○, 약관에 따라 통계는 갱신됨"을 명시하세요.</div>' +
              '<div class="v3-tip">샤오홍슈는 공개 API가 없습니다. 그래서 ①은 <b>유튜브로 방법을 증명</b>하고, ②에서 샤오홍슈/대행 맥락을 결합하는 구성이 현실적이에요. "플랫폼이 달라도 같은 프레임을 쓸 수 있다"는 것 자체가 강점입니다.</div>'
          },
          {
            id: 'a2r2', icon: '②', title: 'Kaggle 공개 데이터셋 + 현업 기준(단가·허수·리드타임) 결합',
            body: '<p class="v3-p">공개 데이터셋은 이미 정제돼 있어 <b>SQL·지표 설계·대시보드</b>에 집중할 수 있습니다. 핵심은 그대로 쓰는 게 아니라, <b>대행사 실무 컬럼을 내가 설계해서 붙이는 것</b> — 이게 "분석가"와 "데이터를 돌린 사람"을 가릅니다.</p>' +
              '<div class="v3-subtt">쓸 만한 데이터셋 (라이선스 확인 필수)</div>' +
              '<ul class="v3-list"><li><b>YouTube Trending Video Dataset</b> — 국가·카테고리별 조회/좋아요/댓글 시계열. "카테고리별 참여율" 분석에 좋음</li><li><b>Social Media Influencers / Instagram·TikTok 인플루언서 목록</b> — 팔로워·카테고리·국가</li><li><b>Marketing Campaign (Maven Marketing)</b> — 캠페인·채널·비용·매출 구조 연습</li><li><b>Olist E-commerce</b> — 주문·리뷰·배송. 리텐션/퍼널 연습용</li></ul>' +
              '<div class="v3-subtt">내가 붙이는 3개 컬럼 (이게 포인트)</div>' +
              '<ul class="v3-list"><li><b>rate_card</b> — 팔로워 구간별 가정 단가(예: 1만↓ 30만, 1~5만 80만, 5~20만 200만, 20만+ 500만). 출처가 없으면 "가정"이라고 표기.</li><li><b>fake_flag</b> — 조회/구독 비율 10% 미만 + 참여율 1% 미만 + 댓글 반복 패턴. 단일 지표로 단정하지 않기.</li><li><b>lead_days</b> — 계약일→게시일. 공개 데이터에 없으면 캠페인 단위로 합성(3~21일, 로그정규) 후 분포를 명시.</li></ul>' +
              '<div class="v3-tip"><b>라이선스</b> — 데이터셋마다 CC0 / CC BY 4.0 / DbCL 등이 다릅니다. README에 <b>데이터셋명·링크·라이선스·다운로드일</b>을 적고, 재배포 금지 데이터는 원본 CSV를 GitHub에 커밋하지 말고 <b>스키마·SQL·집계 결과</b>만 올리세요.</div>'
          },
          {
            id: 'a2r3', icon: '③', title: '사내 데이터를 못 쓸 때 — 시뮬레이션 보완법 (3중 방어)',
            body: '<p class="v3-p">재직 중 회사 데이터는 NDA·개인정보 때문에 못 씁니다. 그럴 때 "가짜 데이터로 했습니다"만 쓰면 신뢰를 잃습니다. 아래 <b>3중 방어</b>를 쓰면 오히려 "보안 감각이 있는 분석가"로 보입니다.</p>' +
              '<ul class="v3-list"><li><b>1층 · 방법 검증</b> — 공개 실데이터(①·②)로 <b>같은 분석 방법</b>을 먼저 돌려 결과가 말이 되는지 확인</li><li><b>2층 · 구조 반영</b> — 회사의 <b>업무 구조만</b> 가져와 스키마를 만들고(크리에이터-캠페인-성과로그), seed 고정으로 1,000행 합성. 실제 브랜드명·크리에이터명·단가·계약 내용은 절대 포함하지 않음</li><li><b>3층 · 재현성</b> — 생성 코드(seed 포함), SQL, 가정 목록을 공개해 <b>누구나 같은 결과를 재현</b>할 수 있게 함</li></ul>' +
              '<div class="v3-tip warn"><b>절대 하지 말 것</b> — 사내 대시보드 스크린샷, 실제 계약서·단가표, 브랜드/크리에이터 실명, 협업 메일 원문. "익명화했다"면서 3명만 남기면 역추적됩니다.</div>' +
              '<div class="v3-tip">README에 넣을 한 문장 — <b>"본 분석은 공개 데이터(YouTube Data API, Kaggle ○○)와 비식별 합성 데이터로 재구성했으며, 회사의 실제 수치·계약 정보는 포함하지 않습니다."</b></div>'
          }
        ],
        after: '<div class="v3-subtt">테이블 스키마 (PostgreSQL / BigQuery 공통)</div>' +
          '<div class="v3-codebox-placeholder" data-k="schema"></div>' +
          '<div class="v3-subtt">1,000행 모의 데이터 생성 (seed 고정 · 결측/이상치 일부러 포함)</div>' +
          '<div class="v3-p">실무 데이터는 깨끗하지 않습니다. <b>결측 3%, 이상치 2%</b>를 일부러 넣으면 Stage 1의 정제 과정을 포트폴리오에서 증명할 수 있어요.</div>' +
          '<div class="v3-codebox-placeholder" data-k="gen"></div>' +
          '<div class="v3-tip">1,000행은 <b>분석하기 좋은 최소 규모</b>입니다. 캠페인 40개 × 크리에이터 120명이면 구간별 비교(셀당 20~30건)가 가능하고, SQL 결과가 우연이 아니라는 걸 보여줄 수 있어요.</div>',
        checks: [
          { id: 'a2_c1', t: '데이터 루트를 1개 이상 실제로 실행했다 (YouTube API 수집 또는 Kaggle 다운로드)' },
          { id: 'a2_c2', t: '출처·라이선스·수집일을 README에 적었다' },
          { id: 'a2_c3', t: 'creators / campaigns / performance_logs 3개 테이블을 만들었다' },
          { id: 'a2_c4', t: '1,000행을 생성하고, 결측·이상치를 의도적으로 넣었다' },
          { id: 'a2_c5', t: '단가·허수·리드타임을 어떤 가정으로 만들었는지 문서화했다' },
          { id: 'a2_c6', t: '사내 데이터 미사용 원칙과 익명화 방침을 한 줄로 명시했다' }
        ],
        ask: ['데이터 확보 루트가 실제로 재현 가능한지', '스키마에 빠진 관계/제약이 없는지', '가정(단가·리드타임)이 결론을 과도하게 만들지 않는지']
      },
      {
        id: 'a3', n: 3, title: 'Step 3 · 핵심 SQL 분석 5종',
        goal: '산출물: queries/*.sql 5개 + 각 결과의 한 줄 인사이트',
        body: '<p class="v3-p">질문을 5개 쿼리로 바꿉니다. 각 쿼리마다 <b>"그래서 뭘 하라는 건가"</b>를 한 줄로 붙이세요 — 이 한 줄이 면접 발표의 뼈대입니다.</p>' +
          '<div class="v3-codebox-placeholder" data-k="q1"></div>' +
          '<div class="v3-codebox-placeholder" data-k="q2"></div>' +
          '<div class="v3-codebox-placeholder" data-k="q3"></div>' +
          '<div class="v3-codebox-placeholder" data-k="q4"></div>' +
          '<div class="v3-codebox-placeholder" data-k="q5"></div>' +
          '<div class="v3-tip">5개를 다 돌린 뒤 <b>모순되는 결과</b>를 찾아보세요. 예: "5~20만 구간 CPV가 가장 낮다" vs "재협업률은 1~5만이 높다" → 이건 모순이 아니라 <b>목표별 전략 차이</b>입니다. 이걸 설명할 수 있으면 최상위 답변이 됩니다.</div>',
        checks: [
          { id: 'a3_c1', t: '쿼리 5개를 모두 실행하고 결과를 저장했다' },
          { id: 'a3_c2', t: '팔로워 구간별 CPV/ROAS 결과에 인사이트 한 줄을 붙였다' },
          { id: 'a3_c3', t: '리드타임 병목 캠페인을 찾아 원인 가설을 적었다' },
          { id: 'a3_c4', t: '재협업률과 허수 의심 크리에이터를 구분해 표로 정리했다' },
          { id: 'a3_c5', t: '카테고리별 예산 배분 추천(상위 3명, 비중)을 만들었다' }
        ],
        ask: ['SQL 5개의 정확성(특히 NULL·중복·기간 조건)', '인사이트가 데이터보다 앞서 나가지 않는지']
      },
      {
        id: 'a4', n: 4, title: 'Step 4 · 대시보드 시각화 (Looker Studio / Tableau Public)',
        goal: '산출물: 공개 대시보드 링크 1개 (모바일에서도 열리는지 확인)',
        body: '<p class="v3-p">대시보드는 예쁜 그림이 아니라 <b>회의에서 30초 안에 결정을 만드는 도구</b>입니다. 차트를 4개로 제한하고, 각 차트 제목을 결론 문장으로 쓰세요.</p>' +
          '<div class="v3-subtt">도구 선택</div>' +
          '<ul class="v3-list"><li><b>Looker Studio</b> — 완전 무료, Google 계정, 링크 공유 쉬움. Google Sheets·BigQuery 샌드박스(무료 1TB/월) 연결. <b>추천</b></li><li><b>Tableau Public</b> — 무료지만 <b>모든 데이터가 공개</b>. 실제 회사 데이터는 절대 올리지 말 것. 디자인 평가가 좋아 포트폴리오용으로 인기</li></ul>' +
          '<div class="v3-subtt">12컬럼 배치안 (모바일 세로 기준)</div>' +
          '<div class="v3-schema">┌──────────────────────────────┐\n│ ① KPI 스코어카드 (4칸)         │  총 ROAS · 중앙 CPV · 재협업률 · 평균 리드타임\n├──────────────────────────────┤\n│ ② 팔로워 구간별 CPV (막대)      │  x=구간, y=원/조회, 색=카테고리\n├──────────────────────────────┤\n│ ③ 참여율 vs CPV (산점도)        │  왼쪽 위 = 저비용·고참여 → 재협업 후보\n├───────────────┬──────────────┤\n│ ④ 캠페인 리드타임 │ ⑤ 예산 배분 표  │\n└───────────────┴──────────────┘\n상단 필터: 기간 · 카테고리 · 플랫폼</div>' +
          '<div class="v3-subtt">차트별로 반드시 넣을 것</div>' +
          '<ul class="v3-list"><li>표본 수(n) 또는 캠페인 수 — 없으면 "우연"인지 판단 불가</li><li>축 단위(원/조회, %p)와 기준 기간</li><li>색 의미: 민트=좋음, 코랄=나쁨. 색을 3개 이상 쓰지 않기</li><li>제목 = 결론: "5~20만 구간이 CPV 최저 (412원/조회)"</li></ul>' +
          '<div class="v3-tip">대시보드 링크를 열었을 때 <b>편집 화면이 아니라 보기 화면</b>이 뜨는지, 로그아웃 상태에서도 열리는지 꼭 확인하세요. 면접관이 "권한 요청"을 보게 되면 기회를 잃습니다.</div>',
        checks: [
          { id: 'a4_c1', t: 'Looker Studio 또는 Tableau Public으로 대시보드를 만들었다' },
          { id: 'a4_c2', t: 'KPI 4개 + 차트 4개를 배치했다' },
          { id: 'a4_c3', t: '차트 제목을 결론 문장으로 바꿨다' },
          { id: 'a4_c4', t: '로그아웃/시크릿 창에서 링크가 열리는지 확인했다' },
          { id: 'a4_c5', t: '모바일 화면에서 글자가 겹치지 않는지 확인했다' }
        ],
        ask: ['대시보드가 30초 안에 의사결정을 전달하는지', '축·단위·표본 수가 빠지지 않았는지']
      },
      {
        id: 'a5', n: 5, title: 'Step 5 · GitHub README & 노션 1장 요약',
        goal: '산출물: README 1개 + 노션 1장 + 대시보드 링크',
        body: '<p class="v3-p">면접관은 코드를 읽지 않습니다. <b>README 첫 10줄</b>로 판단합니다. "무엇을 만들었고, 어떤 질문에, 어떤 숫자로 답했고, 그래서 무엇을 하라고 제안하는가" 순서로 쓰세요.</p>' +
          '<div class="v3-subtt">GitHub README 템플릿 (그대로 복사)</div>' +
          '<div class="v3-codebox-placeholder" data-k="readme"></div>' +
          '<div class="v3-subtt">노션 1장 구성</div>' +
          '<ul class="v3-list"><li>제목: 크리에이터 캠페인 ROI 분석 — 87개 채널 · 2,610개 영상</li><li>① 문제(1문장) ② 데이터(출처·기간·행 수) ③ 방법(SQL 5개 요약) ④ 핵심 인사이트 3개(숫자 포함) ⑤ 대시보드 링크 ⑥ 한계와 다음 액션</li></ul>' +
          '<div class="v3-tip">"한계"를 쓰는 게 약점이 아닙니다. "단가는 공개 데이터가 없어 가정값을 썼고, 실제 협업 단가와 다를 수 있습니다. 다만 구간별 순위는 단가 가정을 ±30% 바꿔도 유지됐습니다" — 이 문장이 <b>분석가의 성숙도</b>를 보여줍니다.</div>',
        checks: [
          { id: 'a5_c1', t: 'README 첫 10줄에 문제·데이터·핵심 숫자·제안이 들어갔다' },
          { id: 'a5_c2', t: '재현 방법(데이터 출처·실행 순서)을 적었다' },
          { id: 'a5_c3', t: '한계와 가정을 솔직하게 적었다' },
          { id: 'a5_c4', t: '노션 1장 요약을 만들고 링크를 README에 넣었다' },
          { id: 'a5_c5', t: '대시보드 링크가 로그아웃 상태에서 열린다' }
        ],
        ask: ['README 첫 10줄만 보고도 프로젝트가 이해되는지', '핵심 숫자 3개가 실제 쿼리 결과와 일치하는지', '한계·가정이 충분히 밝혀졌는지']
      }
    ]
  },

  /* ───────────────────────── Stage 3 ───────────────────────── */
  {
    id: 'v3s3', n: 3, emoji: '🍚', title: '실전 프로젝트 B · BapZip 리텐션·주문 퍼널 분석',
    period: '2주 · 주 5시간', sub: '이미 가진 개발 프로젝트를 분석 포트폴리오로 재가공',
    intro: 'BapZip은 당신이 <b>가게·리뷰 API를 맡아 가장 많이 커밋한(153)</b> 실제 팀 프로젝트입니다. "개발만 했다"로 끝내지 말고, 그 서비스가 실제로 돌아갔다면 <b>어떤 데이터가 쌓였을지</b>를 설계해 분석하면 됩니다. 개발 이해도 + 데이터 분석을 동시에 보여줄 수 있는, 지원자 대부분이 못 하는 조합이에요.',
    steps: [
      {
        id: 'b1', n: 1, title: 'Step 1 · 개발 프로젝트에서 분석 문제 뽑기',
        goal: '산출물: "이 서비스의 어떤 결정을 데이터로 돕는가" 1문장',
        body: '<p class="v3-p">BapZip은 지역·카테고리로 가게를 검색하고, 주문·결제·리뷰가 쌓이는 배달 플랫폼입니다. 여기서 분석 질문은 <b>이미 구현된 기능에서</b> 자연스럽게 나옵니다.</p>' +
          '<ul class="v3-list"><li>"첫 방문/첫 주문 후 <b>7일 내 재방문율</b>이 어디서 떨어지는가?" → 리텐션</li><li>"검색 → 상세 → 장바구니 → 결제 <b>퍼널</b>에서 가장 큰 이탈은?" → 전환</li><li>"리뷰 평점이 높은 가게가 실제로 재주문이 많은가?" → 품질-매출 연결</li></ul>' +
          '<div class="v3-subtt">문제 문장 예시</div>' +
          '<div class="v3-schema">우리는 신규 사용자의 재방문을 늘리기 위해, 주문·검색 로그로\n가입 주차별 7일 리텐션과 퍼널 이탈 지점을 확인한다.\n성공 지표: D7 리텐션 21% → 26%, 장바구니→결제 전환율 41% → 48%</div>' +
          '<div class="v3-tip warn"><b>정확성 주의</b> — 팀 README 기준 공식 리더는 박용재 님이고, 당신은 <b>가게·리뷰 API 담당 + 최다 커밋(153)</b>입니다. 면접에서 "팀장"이라고 말하지 마세요. "6명 팀에서 가게·리뷰 도메인을 맡아 최다 커밋(153)으로 리드했습니다"가 정확하고 더 강합니다.</div>',
        checks: [
          { id: 'b1_c1', t: 'BapZip에서 분석할 질문 1개를 문장으로 정했다' },
          { id: 'b1_c2', t: '그 질문이 어떤 기능·데이터에서 나오는지 설명할 수 있다' },
          { id: 'b1_c3', t: '현재 리포지토리에서 내 실제 역할(가게·리뷰 API, 최다 커밋)을 확인했다' },
          { id: 'b1_c4', t: '성공 지표와 목표 수치를 정했다' }
        ],
        ask: ['분석 질문이 실제 서비스 결정과 연결되는지', '내 역할을 과장 없이 정확히 썼는지']
      },
      {
        id: 'b2', n: 2, title: 'Step 2 · 코호트 리텐션 SQL (주문 로그 기반)',
        goal: '산출물: 가입주차 × D7 리텐션 표 + 해석',
        body: '<p class="v3-p">BapZip의 주문 로그를 가정해 <b>가입 주차별 리텐션</b>을 만듭니다. 재방문 정의를 "주문"으로 잡을지 "앱 방문"으로 잡을지에 따라 숫자가 달라지니, 정의를 먼저 적으세요.</p>' +
          '<div class="v3-codebox-placeholder" data-k="b2"></div>' +
          '<div class="v3-subtt">해석 포인트</div>' +
          '<ul class="v3-list"><li>최근 코호트가 예전보다 낮으면 <b>유입 채널</b>이 바뀌었는지 확인</li><li>D7이 급락하는 주차가 있으면 그 주에 <b>프로모 종료·가격 변경</b>이 있었는지</li><li>첫 주문 후 첫 재주문까지 걸리는 <b>중앙 일수</b>를 함께 보면 "D7" 기준의 근거가 생김</li></ul>',
        checks: [
          { id: 'b2_c1', t: '재방문의 정의(주문 기준/방문 기준)를 먼저 적었다' },
          { id: 'b2_c2', t: '가입주차 코호트 리텐션 쿼리를 작성해 실행했다' },
          { id: 'b2_c3', t: 'D1/D7/D30을 같은 표에 정리했다' },
          { id: 'b2_c4', t: '가장 많이 빠지는 구간과 원인 가설을 적었다' }
        ],
        ask: ['리텐션 정의가 일관적인지', '코호트 크기가 작은 주차를 과해석하지 않았는지']
      },
      {
        id: 'b3', n: 3, title: 'Step 3 · 검색 → 상세 → 장바구니 → 주문 퍼널 분석',
        goal: '산출물: 단계별 전환율 + 이탈 상위 2개',
        body: '<p class="v3-p">퍼널은 <b>단계 정의</b>가 전부입니다. BapZip 이벤트를 이렇게 가정해 보세요.</p>' +
          '<div class="v3-schema">search        가게 검색 (지역·카테고리 필터 포함)\nstore_view    가게 상세 조회\nmenu_view     메뉴 조회\nadd_cart      장바구니 담기\norder_start   주문서 진입\npayment_done  결제 완료</div>' +
          '<div class="v3-codebox-placeholder" data-k="b3"></div>' +
          '<div class="v3-tip">이탈이 큰 단계가 <b>항상 고칠 단계는 아닙니다</b>. "결제 단계 이탈 20%"가 PG 오류인지, 배달비에 놀란 건지, 그냥 비교하러 나간 건지 — <b>가설을 3개로 쪼개</b> 다음 분석을 설계하세요.</div>',
        checks: [
          { id: 'b3_c1', t: '퍼널 6단계를 이벤트 이름으로 정의했다' },
          { id: 'b3_c2', t: '단계별 전환율과 전체 전환율을 계산했다' },
          { id: 'b3_c3', t: '이탈 상위 2개 단계를 골랐다' },
          { id: 'b3_c4', t: '각 이탈에 대해 검증할 가설 2개씩 적었다' }
        ],
        ask: ['퍼널 단계 정의가 중복·누락 없이 이어지는지', '이탈 원인을 데이터 없이 단정하지 않았는지']
      },
      {
        id: 'b4', n: 4, title: 'Step 4 · 개선 가설 2개 + 임팩트 수치화',
        goal: '산출물: 이력서에 그대로 쓸 1줄 임팩트 문구',
        body: '<p class="v3-p">면접관이 가장 좋아하는 질문은 <b>"그래서 얼마나 좋아지는데요?"</b>입니다. 가설마다 예상 효과를 숫자로 계산하세요.</p>' +
          '<div class="v3-subtt">임팩트 계산 틀</div>' +
          '<div class="v3-schema">현재: 월 주문 12,000건 × 객단가 18,000원 = 216,000,000원\n가설: 장바구니→결제 전환율 41% → 45% (+4%p)\n영향: 주문 +4.0% → 매출 +8,640,000원/월 (객단가 동일 가정)\n비용: 개발 2주 + PG 수수료 변동 없음\n→ payback 즉시, 우선순위 1\n\n※ 가정을 명시: "전환율 개선이 다른 단계에 영향 없음", "객단가 동일"</div>' +
          '<div class="v3-subtt">이력서 1줄 문구 3가지 버전</div>' +
          '<ul class="v3-list"><li>"주문 퍼널 6단계를 분석해 장바구니→결제 이탈 원인 2개를 규명, 개선 시 월 매출 +864만 원 기회를 수치화"</li><li>"가입 코호트 D7 리텐션을 설계·분석해 초기 이탈 구간을 찾고, 온보딩 개선 우선순위를 제안"</li><li>"6인 팀 프로젝트(BapZip)에서 가게·리뷰 API 담당·최다 커밋, 서비스 로그 기반 리텐션 분석으로 기획-개발-분석 연결"</li></ul>' +
          '<div class="v3-tip">숫자는 <b>실제 로그가 아니면 "가정"이라고 밝히세요</b>. "합성 로그 기준 시뮬레이션"이라고 쓰면 감점이 아니라 가점입니다. 거짓 실적은 면접 꼬리질문에서 반드시 무너집니다.</div>',
        checks: [
          { id: 'b4_c1', t: '개선 가설 2개를 문제-원인-해결책 구조로 썼다' },
          { id: 'b4_c2', t: '각 가설의 예상 매출/리텐션 임팩트를 계산했다' },
          { id: 'b4_c3', t: '가정(객단가 동일 등)을 명시했다' },
          { id: 'b4_c4', t: '이력서 1줄 문구를 3개 버전으로 써봤다' }
        ],
        ask: ['임팩트 계산의 가정이 타당한지', '이력서 문구가 과장 없이 숫자로 말하는지']
      },
      {
        id: 'b5', n: 5, title: 'Step 5 · 포트폴리오 스토리텔링 (5단 구성)',
        goal: '산출물: 3분 발표 스크립트 + GitHub README',
        body: '<p class="v3-p">같은 분석도 <b>이야기 순서</b>에 따라 설득력이 달라집니다. 아래 5단 구성으로 3분 스크립트를 만드세요.</p>' +
          '<div class="v3-schema">① 문제  — "배달 앱에서 첫 주문 후 7일 안에 다시 오는 사람이 21%뿐이었습니다."\n② 데이터 — "주문·검색 로그 18만 건, 2026년 3~8월. 재방문은 “재주문”으로 정의했습니다."\n③ 분석  — "코호트 리텐션과 6단계 퍼널을 SQL로 뽑았습니다. D7이 3주차에 14%로 떨어졌고,\n          장바구니→결제에서 59%가 빠졌습니다."\n④ 결과  — "이탈 상위 2개는 배달비 표시 시점과 최소주문금액 안내 부재였습니다."\n⑤ 제안  — "장바구니에 배달비를 먼저 보여주는 A/B를 제안했고, 전환 +4%p면 월 864만 원입니다."</div>' +
          '<div class="v3-tip">마지막에 <b>"제가 배운 점"</b>을 한 줄 넣으세요. "정의를 먼저 합의하지 않으면 분석이 세 번 다시 돌아간다는 걸 배웠습니다" 같은 문장은 협업 능력을 보여줍니다.</div>',
        checks: [
          { id: 'b5_c1', t: '문제-데이터-분석-결과-제안 5단 스크립트를 썼다' },
          { id: 'b5_c2', t: '3분 안에 말할 수 있게 소리 내어 연습했다' },
          { id: 'b5_c3', t: 'README에 프로젝트 B 섹션을 추가했다' },
          { id: 'b5_c4', t: '"배운 점" 한 줄을 넣었다' }
        ],
        ask: ['3분 스크립트가 숫자로 말하는지', 'BapZip 실제 역할과 분석 가정이 섞여 오해를 만들지 않는지']
      }
    ]
  },

  /* ───────────────────────── Stage 4 ───────────────────────── */
  {
    id: 'v3s4', n: 4, emoji: '🎯', title: '춘배 합격선 체크 & 실전 모의 테스트',
    period: '1주 · 문제당 25분', sub: '기업 과제 스타일 SQL 3 + 비즈니스 케이스 2',
    intro: '체크리스트가 쌓이면 여기서 실제 기업 과제처럼 풀어봅니다. 단순 객관식이 아니라 <b>스키마를 보고 직접 쿼리를 쓰고, 케이스는 내 생각을 먼저 적은 뒤</b> 모범 사고 프레임과 비교하는 방식이에요. 답을 봐도 되지만, 먼저 10분은 혼자 써보세요.'
  },

  /* ───────────────────────── Stage 5 ───────────────────────── */
  {
    id: 'v3s5', n: 5, emoji: '🎤', title: 'GitHub 정비 & 실전 면접 준비',
    period: '3일 · 하루 40분', sub: '프로필 정비 + 면접 Q&A 플래시카드 8선',
    intro: '실력이 있어도 GitHub 첫 화면이 정리되지 않으면 서류에서 걸립니다. 그리고 면접은 <b>준비한 문장</b>으로 이깁니다. 8개 카드의 모범 답변 포인트를 읽고, 소리 내어 30초씩 말해보세요.',
    checks: [
      { id: 'g_c1', t: '프로필 README에 한 줄 소개를 넣었다 (데이터 분석가 지향 + 강점)' },
      { id: 'g_c2', t: '대표 레포 4개를 핀 고정했다 (프로젝트 A·B 포함)' },
      { id: 'g_c3', t: '레포 설명·토픽을 채웠다 (sql, pandas, dashboard, analytics)' },
      { id: 'g_c4', t: '오래된 레포의 오타·빈 README를 정리했다' },
      { id: 'g_c5', t: '이력서·포트폴리오 링크가 로그아웃에서 열린다' },
      { id: 'g_c6', t: '지원할 공고 10개를 스크랩하고 요구 스킬을 표로 정리했다' }
    ]
  }
];

/* Stage 4 문제 */
const V3_SQL_TESTS = [
  {
    id: 'sq1', n: '①', title: '단계별 퍼널 전환율 구하기',
    schema: "events (\n  user_id    BIGINT,\n  event_name TEXT,      -- 'signup' | 'view_product' | 'add_cart' | 'purchase'\n  event_at   TIMESTAMP\n)",
    ask: '2026년 11월에 <b>가입(signup)</b>한 사용자만 대상으로, 가입 → 상품조회 → 장바구니 → 구매의 단계별 전환율과 가입→구매 전체 전환율을 한 행으로 구하세요.',
    hint: '① cohort CTE로 11월 가입자만 뽑고, ② 사용자별로 각 단계 도달 여부를 MAX(CASE WHEN ...)로 0/1 만들고, ③ 비율을 계산합니다. 분모는 직전 단계 인원, 전체 전환율의 분모는 가입자 수예요.',
    answer: "WITH cohort AS (\n  SELECT user_id\n  FROM events\n  WHERE event_name = 'signup'\n    AND event_at >= '2026-11-01' AND event_at < '2026-12-01'\n), step AS (\n  SELECT c.user_id,\n         MAX(CASE WHEN e.event_name = 'view_product' THEN 1 ELSE 0 END) AS v,\n         MAX(CASE WHEN e.event_name = 'add_cart'     THEN 1 ELSE 0 END) AS c,\n         MAX(CASE WHEN e.event_name = 'purchase'     THEN 1 ELSE 0 END) AS p\n  FROM cohort c\n  LEFT JOIN events e ON e.user_id = c.user_id\n  GROUP BY c.user_id\n)\nSELECT COUNT(*) AS signup_users,\n       SUM(v) AS viewed, SUM(c) AS carted, SUM(p) AS purchased,\n       ROUND(100.0 * SUM(v) / COUNT(*), 1)                  AS signup_to_view,\n       ROUND(100.0 * SUM(c) / NULLIF(SUM(v), 0), 1)         AS view_to_cart,\n       ROUND(100.0 * SUM(p) / NULLIF(SUM(c), 0), 1)         AS cart_to_purchase,\n       ROUND(100.0 * SUM(p) / COUNT(*), 1)                  AS signup_to_purchase\nFROM step;",
    explain: '핵심은 <b>모수 통일</b>입니다. 단계별 전환율의 분모는 직전 단계 도달자, 전체 전환율의 분모는 가입자 전체예요. LEFT JOIN + MAX(CASE)로 "그 단계를 한 번이라도 했는가"를 만들면 이벤트가 여러 번 있어도 중복이 생기지 않습니다. 순서를 엄격히 보려면 각 단계의 MIN(event_at)을 비교하는 조건을 추가하세요.'
  },
  {
    id: 'sq2', n: '②', title: '가입 주차별 7일 리텐션 코호트',
    schema: "users  (user_id BIGINT, created_at TIMESTAMP)\nevents (user_id BIGINT, event_at TIMESTAMP)",
    ask: '가입 주차 코호트별로 <b>D7 리텐션</b>(가입 후 7일째 되는 주에 다시 활동한 사용자 비율)을 구하세요. 코호트별 사용자 수와 리텐션을 함께 출력합니다.',
    hint: '가입 주차 = DATE_TRUNC(\'week\', created_at). 활동 주차도 주 단위로 자른 뒤, <b>활동주차 = 가입주차 + 7일</b>인 사용자를 세면 됩니다. 분모는 그 코호트의 전체 가입자 수예요.',
    answer: "WITH cohort AS (\n  SELECT user_id, DATE_TRUNC('week', created_at) AS cohort_week\n  FROM users\n), act AS (\n  SELECT DISTINCT user_id, DATE_TRUNC('week', event_at) AS act_week\n  FROM events\n)\nSELECT c.cohort_week,\n       COUNT(DISTINCT c.user_id) AS users,\n       ROUND(100.0 * COUNT(DISTINCT CASE\n               WHEN a.act_week = c.cohort_week + INTERVAL '7 days'\n               THEN a.user_id END)\n             / COUNT(DISTINCT c.user_id), 1) AS d7_retention\nFROM cohort c\nLEFT JOIN act a ON a.user_id = c.user_id\nGROUP BY c.cohort_week\nORDER BY c.cohort_week;",
    explain: '<b>D7의 정의</b>가 답의 절반입니다. ① "7일째 되는 바로 그날" ② "7일 이후 아무 때나" ③ "7일째 주에 한 번" — 이 문제는 ③입니다. 실무에서는 ①(classic)과 ②(rolling)를 둘 다 뽑아 보고, 보고서에 정의를 명시합니다. 코호트 인원이 30명 미만이면 비율이 요동치니 n을 함께 보여주세요.'
  },
  {
    id: 'sq3', n: '③', title: '카테고리별 매출 TOP 2 뽑기',
    schema: "orders (\n  order_id   BIGINT,\n  user_id    BIGINT,\n  category   TEXT,\n  amount     NUMERIC,\n  ordered_at TIMESTAMP\n)",
    ask: '카테고리별로 매출 합계가 큰 <b>상위 2개 카테고리</b>를 뽑으세요. (카테고리가 2개 미만이면 있는 만큼) 각 카테고리 안에서의 매출 순위와 비중도 함께 나옵니다.',
    hint: '카테고리별 SUM(amount)를 만든 뒤, RANK() OVER (ORDER BY 매출 DESC)로 순위를 붙이고 WHERE rn <= 2. 동점 처리를 어떻게 할지도 생각해 보세요.',
    answer: "WITH agg AS (\n  SELECT category, SUM(amount) AS revenue\n  FROM orders\n  WHERE ordered_at >= '2026-01-01' AND ordered_at < '2026-12-01'\n  GROUP BY category\n), ranked AS (\n  SELECT category, revenue,\n         RANK()       OVER (ORDER BY revenue DESC) AS rnk,\n         SUM(revenue) OVER ()                      AS total_rev\n  FROM agg\n)\nSELECT category, revenue,\n       ROUND(100.0 * revenue / NULLIF(total_rev, 0), 1) AS share_pct,\n       rnk\nFROM ranked\nWHERE rnk <= 2\nORDER BY rnk;",
    explain: 'TOP N 문제는 <b>RANK vs ROW_NUMBER vs DENSE_RANK</b> 구분이 포인트입니다. 공동 2등을 모두 살리려면 RANK, 정확히 2행만 원하면 ROW_NUMBER를 씁니다. 카테고리별로 뽑는 문제였다면 <b>PARTITION BY category</b>가 필요하고, 이 문제처럼 "전체에서 상위 2개 카테고리"면 PARTITION이 없습니다 — 문제를 정확히 읽는 것이 절반이에요.'
  }
];

const V3_CASE_TESTS = [
  {
    id: 'bc1', n: '①', title: 'DAU는 그대로인데 매출이 전주 대비 18% 하락',
    prompt: '월요일 아침, 대시보드에서 <b>DAU는 지난주와 거의 같은데 매출이 -18%</b>로 찍혔습니다. 대표가 "왜 이래?"라고 묻습니다. 어떤 순서로 원인을 파악하시겠어요?',
    framework: [
      '<b>0. 숫자부터 의심</b> — 지표 정의·집계 파이프라인·타임존·전주 비교 기간(공휴일/프로모 포함 여부) 확인. "대시보드 버그"로 끝나는 경우가 의외로 많습니다.',
      '<b>1. 분해</b> — 매출 = DAU × 구매전환율 × 객단가. DAU가 같다면 ① 전환율 ② 객단가 ③ 구성(카테고리/상품 믹스) 중 어디가 움직였는지 봅니다.',
      '<b>2. 세그먼트</b> — 신규/기존, 채널, 디바이스(iOS/Android), 카테고리, 지역, 결제수단별로 쪼갭니다. 전체 -18%는 "한 세그먼트 -60%"일 수 있습니다.',
      '<b>3. 외부·운영 요인</b> — 프로모 종료, 가격/배송비 변경, 품절, 경쟁사 프로모, 시즌(추석·연휴), 앱 업데이트·결제 오류.',
      '<b>4. 가설 → 쿼리 → 액션</b> — 예: "신규 유입 비중이 커져 객단가 낮은 사용자가 늘었다" → 채널별 신규 비중과 ARPU를 뽑아 확인 → 다음 주 프로모 예산 재배분 제안.',
      '<b>5. 보고</b> — 결론을 먼저: "매출 하락의 70%는 X채널 신규 유입 증가에 따른 객단가 희석입니다. DAU는 건강합니다."'
    ],
    memoLabel: '내 생각 순서 (먼저 10분)'
  },
  {
    id: 'bc2', n: '②', title: '온보딩 2단계 이탈률 45%',
    prompt: '신규 가입자의 <b>온보딩 2단계 이탈률이 45%</b>입니다. 1단계는 12%인데 2단계에서만 급격히 빠집니다. 이탈 원인을 검증할 <b>가설 3가지</b>와 각각의 확인 방법을 제시하세요.',
    framework: [
      '<b>가설 1 · 마찰(UX/입력)</b> — 2단계에서 요구하는 입력 항목이 많거나, 오류가 나거나, 인증(휴대폰/이메일)에서 막힌다. 확인: 필드별 이탈 지점, 검증 에러 로그, 세션 리플레이, 디바이스별 이탈률.',
      '<b>가설 2 · 가치 인지 부족</b> — 2단계 전에 "완료하면 무엇을 얻는지"가 없어서 그만둔다. 확인: 1→2단계 화면별 체류시간, 카피 A/B(가치 제안 삽입), 2단계 진입 후 이탈 vs 미진입 비교.',
      '<b>가설 3 · 트래픽 품질/기대 불일치</b> — 광고·제휴로 들어온 사용자가 서비스와 무관해 중간에 포기한다. 확인: 유입 채널·캠페인별 2단계 이탈률, 신규 코호트별 비교, 광고 소재-랜딩 메시지 일치도.',
      '<b>추가 후보</b> — 2단계가 모바일에서 레이아웃이 깨지거나, 뒤로가기·재진입 시 입력이 초기화되는 버그. 확인: 기기/OS 분해, QA 재현.',
      '<b>실험 설계</b> — 가장 큰 가설부터 A/B. 성공지표는 "2단계 완료율", 가드레일은 "1단계→2단계 진입률"과 "7일 리텐션". MDE 3%p면 그룹당 표본을 계산해 기간을 정합니다.'
    ],
    memoLabel: '내 가설 3가지 (먼저 10분)'
  }
];

const V3_FLASHCARDS = [
  {
    id: 'f1', tag: 'tech', q: 'INNER JOIN과 LEFT JOIN의 차이, 그리고 WHERE절에서 자주 하는 실수는?',
    pts: [
      'INNER는 <b>양쪽에 매칭되는 행만</b>, LEFT는 왼쪽 테이블 행을 <b>전부 남기고</b> 오른쪽은 없으면 NULL.',
      '함정: LEFT JOIN 뒤 WHERE에 오른쪽 컬럼 조건을 쓰면 NULL 행이 걸러져 <b>INNER처럼</b> 변한다.',
      '해결: 조건을 <b>ON절</b>로 옮기거나, NULL을 허용하려면 <b>IS NULL OR 조건</b>으로 쓴다.',
      '예시: "캠페인이 없는 크리에이터도 포함" → 조건은 ON, 최종 필터는 WHERE에서 왼쪽 컬럼만.'
    ]
  },
  {
    id: 'f2', tag: 'tech', q: 'WHERE와 HAVING은 무엇이 다르고, 언제 무엇을 쓰나요?',
    pts: [
      'WHERE는 <b>집계 전</b> 개별 행 필터, HAVING은 <b>GROUP BY 이후</b> 집계 결과 필터.',
      '실행 순서: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT.',
      '예: 기간 필터는 WHERE, "매출 300만 이상 크리에이터"는 HAVING.',
      '성능: 가능한 필터는 WHERE에서 먼저 줄이는 게 좋다. SELECT 별칭은 HAVING에서만 쓸 수 있는 DB가 많다.'
    ]
  },
  {
    id: 'f3', tag: 'tech', q: '리텐션을 계산하는 방식 3가지를 설명해 보세요.',
    pts: [
      '<b>Classic(day-N)</b>: 가입 후 정확히 N일째 되는 날 활동한 비율. 가장 엄격, 캠페인 효과에 민감.',
      '<b>Rolling(range)</b>: 가입 후 N일 이후 아무 때나 한 번 활동. 실무 대시보드에서 흔함, 후하게 나옴.',
      '<b>Unbounded</b>: N일 이후 누적 활동. "살아남은 사용자" 비율에 가까움.',
      '중요: 셋을 섞으면 숫자가 안 맞는다. <b>분모(코호트), 기간, 활동 정의</b>를 문서에 고정하고, 코호트 n도 함께 표시.'
    ]
  },
  {
    id: 'f4', tag: 'tech', q: 'A/B 테스트 p-value가 0.04인데 효과 크기가 아주 작습니다. 어떻게 결정하시겠어요?',
    pts: [
      'p=0.04는 "H0가 참일 때 이런 결과가 4% 확률" — <b>효과가 크다는 뜻이 아니다</b>.',
      '효과 크기(절대값)와 <b>신뢰구간</b>을 본다. 구간이 0에 가깝게 붙어 있으면 실무 임팩트가 작다.',
      '비즈니스 판단: 예상 매출/비용, 개발·운영 비용, 부작용(가드레일 지표), 표본 수(작은 효과를 검출할 만큼 충분했나).',
      '결론 예: "통계적으로 유의하지만 월 +120만 원이라 개발 6주 비용을 못 넘습니다. 더 큰 MDE가 나오는 2단계 개선안을 먼저 검증하겠습니다."'
    ]
  },
  {
    id: 'f5', tag: 'story', q: 'BCIT Database 86점 → 마케팅·대행 → 데이터 분석가. 이 스토리를 어떻게 말할까요?',
    pts: [
      '한 줄: "데이터베이스를 전공으로 깊게 배웠고(BCIT CST, 86/100 With Distinction), 현업에서 마케팅·대행을 하며 <b>의사결정에 데이터가 없다는 것</b>이 가장 큰 병목임을 직접 겪었습니다."',
      '연결: 대행 업무에서 크리에이터 단가·성과를 엑셀로 비교하다 보니 <b>지표 정의와 검증</b>이 필요해졌고, 그때 SQL·파이썬을 다시 꺼내 프로젝트를 만들었습니다.',
      '증거: 프로젝트 A(크리에이터 ROI), B(BapZip 리텐션)를 <b>숫자와 링크</b>로 제시.',
      '마무리: "분석을 위한 분석이 아니라, 현장에서 바로 쓰이는 분석을 하고 싶습니다." (약점인 경력 전환을 <b>이해관계자 언어를 아는 강점</b>으로 전환)'
    ]
  },
  {
    id: 'f6', tag: 'story', q: '크리에이터 대행 운영 경험이 데이터 분석가에게 어떤 강점이 되나요?',
    pts: [
      '<b>문제를 정의하는 힘</b> — 대행 현장에서 "무엇이 실제 의사결정인지"를 알고 있어, 분석 범위를 잘못 잡는 시간을 줄입니다.',
      '<b>이해관계자와 말하는 힘</b> — 브랜드·크리에이터·내부 팀 사이에서 요구를 숫자로 번역해 본 경험.',
      '<b>비용 감각</b> — 단가·마진·리드타임을 알기 때문에 "이 분석이 얼마짜리 결정인지"를 먼저 따집니다.',
      '주의: "저는 기획도 했습니다"보다 <b>구체적 사례 1개</b>로 말하기. 예: "크리에이터 20명 단가 협상에서 조회수 대비 단가가 3배 차이 나는 걸 보고 기준표를 만든 적이 있습니다."'
    ]
  },
  {
    id: 'f7', tag: 'story', q: 'BapZip 팀 프로젝트 경험을 어떻게 어필할까요?',
    pts: [
      '정확한 사실: 6인 팀, Java/Spring Boot/PostgreSQL 배달 플랫폼. 나는 <b>가게·리뷰 API 담당</b>, <b>최다 커밋 153</b>(2위 79). 공식 팀장은 다른 팀원이므로 <b>"팀장"이라고 말하지 않는다</b>.',
      '강점 1: 도메인 이해 — 가게 검색·리뷰 구조를 직접 만들어 <b>데이터가 어떤 형태로 쌓이는지</b> 압니다.',
      '강점 2: 협업 — 6명과 API 스키마를 맞추며 <b>정의를 합의하는 과정</b>을 겪었습니다. 분석가의 핵심 역량과 같습니다.',
      '연결: 그 경험으로 BapZip 로그를 가정한 리텐션·퍼널 분석(프로젝트 B)을 직접 설계했습니다.'
    ]
  },
  {
    id: 'f8', tag: 'story', q: '데이터 정제·결측치 트러블슈팅 경험을 말해 보세요.',
    pts: [
      '상황: 공개 API로 모은 영상 통계에서 <b>조회수 결측과 비정상 급증</b>이 섞여 있었습니다.',
      '판단: 결측을 0으로 채우면 CPV가 무한대가 되어 <b>구간 비교가 뒤집힌다</b>는 걸 확인 → 결측은 별도 플래그, 분석에서는 제외하고 민감도 분석.',
      '이상치: IQR로 표시만 하고, 상·하위 1% 윈저화. 원본과 처리본을 모두 남겨 <b>재현 가능</b>하게.',
      '결과: 처리 전후 결론이 같은지 확인(강건성). "정제는 데이터를 예쁘게 만드는 게 아니라 <b>결론이 흔들리지 않게</b> 만드는 일"이라고 마무리.'
    ]
  }
];

/* ═══════════════════════════════════════════════════════════
   V3 · 단계별 실습 코드 (본문의 자리표시자에 채워집니다)
   ═══════════════════════════════════════════════════════════ */
const V3_STEP_CODES = {
  a2r1: {
    apic: {
      label: 'YouTube Data API v3 — 채널 100개 × 최근 영상 30개 수집',
      code: "# 준비: pip install google-api-python-client pandas python-dotenv\n# .env 파일에 YT_API_KEY=발급받은키   (코드·GitHub에 직접 쓰지 않기)\nimport os, pandas as pd\nfrom googleapiclient.discovery import build\nfrom dotenv import load_dotenv\n\nload_dotenv()\nyt = build('youtube', 'v3', developerKey=os.environ['YT_API_KEY'])\n\nCHANNEL_IDS = ['UC...', 'UC...']    # 50~100개: 채널 URL의 /channel/UC... 값\n\nrows = []\nfor cid in CHANNEL_IDS:\n    ch = yt.channels().list(part='snippet,statistics,contentDetails',\n                            id=cid).execute()['items'][0]\n    uploads = ch['contentDetails']['relatedPlaylists']['uploads']\n    pl = yt.playlistItems().list(part='contentDetails', playlistId=uploads,\n                                 maxResults=30).execute()          # 1 unit\n    ids = [x['contentDetails']['videoId'] for x in pl['items']]\n    stats = yt.videos().list(part='statistics,snippet',\n                             id=','.join(ids)).execute()            # 1 unit\n    for v in stats['items']:\n        st = v['statistics']\n        rows.append(dict(channel_id=cid, channel=ch['snippet']['title'],\n                         subs=int(ch['statistics'].get('subscriberCount', 0)),\n                         video_id=v['id'],\n                         published_at=v['snippet']['publishedAt'][:10],\n                         views=int(st.get('viewCount', 0)),\n                         likes=int(st.get('likeCount', 0)),\n                         comments=int(st.get('commentCount', 0))))\n\ndf = pd.DataFrame(rows)\ndf.to_csv('yt_videos_raw.csv', index=False)\nprint(len(df), '행 수집 완료')   # 채널당 3 units → 100개도 1,000 units 이내"
    }
  },
  a2: {
    schema: {
      label: '테이블 3개 (PostgreSQL 기준)',
      code: "CREATE TABLE creators (\n  creator_id      TEXT PRIMARY KEY,\n  name            TEXT NOT NULL,          -- 가명 (C001, 크리에이터001)\n  platform        TEXT,                   -- xiaohongshu / youtube\n  category        TEXT,                   -- 뷰티 / 리빙 / 푸드 / 패션\n  followers       INTEGER,\n  avg_views       INTEGER,                -- 최근 영상 30개 평균\n  engagement_rate NUMERIC(6,4),           -- (좋아요+댓글)/조회수\n  fake_flag       INTEGER DEFAULT 0       -- 허수 의심 (단독 판정 금지)\n);\n\nCREATE TABLE campaigns (\n  campaign_id TEXT PRIMARY KEY,\n  brand       TEXT,                       -- 가명 (B001)\n  category    TEXT,\n  budget_krw  INTEGER,\n  start_date  DATE,\n  end_date    DATE,\n  goal        TEXT                        -- awareness / conversion\n);\n\nCREATE TABLE performance_logs (\n  log_id      TEXT PRIMARY KEY,\n  campaign_id TEXT REFERENCES campaigns(campaign_id),\n  creator_id  TEXT REFERENCES creators(creator_id),\n  contract_at DATE,                       -- 계약일\n  posted_at   DATE,                       -- 게시일\n  views       INTEGER,\n  clicks      INTEGER,\n  conversions INTEGER,\n  revenue_krw INTEGER,\n  cost_krw    INTEGER                     -- 협업 단가\n);\n\nCREATE INDEX idx_logs_creator ON performance_logs(creator_id);\nCREATE INDEX idx_logs_posted  ON performance_logs(posted_at);"
    },
    gen: {
      label: '1,000행 생성 — seed 고정 + 결측 3% + 이상치 2%',
      code: "# pip install pandas numpy\nimport numpy as np, pandas as pd\n\nrng = np.random.default_rng(42)          # ★ seed 고정 = 재현 가능\nTIERS = [(1000, 10000, '1) ~1만'), (10000, 50000, '2) 1~5만'),\n         (50000, 200000, '3) 5~20만'), (200000, 1000000, '4) 20만+')]\nCATS = ['뷰티', '리빙', '푸드', '패션']\n\ncreators = []\nfor i in range(120):\n    lo, hi, tier = TIERS[rng.integers(0, 4)]\n    followers = int(rng.uniform(lo, hi))\n    avg_views = int(followers * rng.uniform(0.08, 0.9))   # 허수 구간도 일부러 포함\n    creators.append(dict(\n        creator_id=f'C{i+1:03d}', name=f'크리에이터{i+1:03d}',\n        platform=rng.choice(['xiaohongshu', 'youtube']),\n        category=rng.choice(CATS), followers=followers, avg_views=avg_views,\n        engagement_rate=round(rng.uniform(0.005, 0.09), 4),\n        fake_flag=int(avg_views / max(followers, 1) < 0.1)))\ncreators = pd.DataFrame(creators)\n\ncamps = []\nfor i in range(40):\n    start = pd.Timestamp('2026-01-05') + pd.Timedelta(days=int(rng.integers(0, 210)))\n    camps.append(dict(campaign_id=f'P{i+1:03d}', brand=f'B{i+1:03d}',\n                      category=rng.choice(CATS),\n                      budget_krw=int(rng.integers(5, 60)) * 100000,\n                      start_date=start.date(), end_date=(start + pd.Timedelta(days=30)).date(),\n                      goal=rng.choice(['awareness', 'conversion'])))\ncamps = pd.DataFrame(camps)\n\nlogs = []\nfor i in range(1000):\n    c = creators.sample(1, random_state=i).iloc[0]\n    p = camps.sample(1, random_state=i + 999).iloc[0]\n    contract = pd.Timestamp(p['start_date']) + pd.Timedelta(days=int(rng.integers(0, 10)))\n    lead = int(np.clip(rng.lognormal(2.0, 0.45), 2, 30))\n    posted = contract + pd.Timedelta(days=lead)\n    views = int(c['avg_views'] * rng.lognormal(0, 0.5))\n    clicks = int(views * rng.uniform(0.005, 0.03))\n    conv = int(clicks * rng.uniform(0.01, 0.06))\n    logs.append(dict(\n        log_id=f'L{i+1:04d}', campaign_id=p['campaign_id'], creator_id=c['creator_id'],\n        contract_at=contract.date(), posted_at=posted.date(),\n        views=views, clicks=clicks, conversions=conv,\n        revenue_krw=int(conv * rng.uniform(15000, 45000)),\n        cost_krw=int(c['followers'] * rng.uniform(1.5, 4.0) + 200000)))\nlogs = pd.DataFrame(logs)\n\n# 실무처럼 지저분하게: 결측 3%, 바이럴 이상치 20건\nlogs.loc[rng.random(len(logs)) < 0.03, 'views'] = np.nan\nidx = rng.choice(len(logs), 20, replace=False)\nlogs.loc[idx, 'views'] = logs.loc[idx, 'views'] * rng.integers(20, 60, 20)\n\ncreators.to_csv('creators.csv', index=False)\ncamps.to_csv('campaigns.csv', index=False)\nlogs.to_csv('performance_logs.csv', index=False)\nprint(len(logs), '행 · 결측', logs['views'].isna().sum())"
    }
  },
  a3: {
    q1: {
      label: 'Q1 · 팔로워 구간별 CPV · ROAS · 1,000회당 전환',
      code: "WITH base AS (\n  SELECT c.creator_id, c.followers,\n         CASE WHEN c.followers < 10000  THEN '1) ~1만'\n              WHEN c.followers < 50000  THEN '2) 1~5만'\n              WHEN c.followers < 200000 THEN '3) 5~20만'\n              ELSE '4) 20만+' END AS tier,\n         SUM(p.cost_krw) AS cost, SUM(p.views) AS views,\n         SUM(p.revenue_krw) AS revenue, SUM(p.conversions) AS conv\n  FROM performance_logs p\n  JOIN creators c USING (creator_id)\n  GROUP BY 1, 2, 3\n)\nSELECT tier,\n       COUNT(*) AS creators,\n       SUM(views) AS views,\n       ROUND(SUM(cost)::numeric / NULLIF(SUM(views), 0), 2)        AS cpv_krw,\n       ROUND(SUM(revenue)::numeric / NULLIF(SUM(cost), 0), 2)      AS roas,\n       ROUND(SUM(conv)::numeric / NULLIF(SUM(views), 0) * 1000, 2) AS conv_per_1k\nFROM base\nGROUP BY tier\nORDER BY tier;"
    },
    q2: {
      label: 'Q2 · 리드타임 병목 — 계약→게시 지연',
      code: "SELECT campaign_id,\n       COUNT(*) AS posts,\n       ROUND(AVG(posted_at - contract_at), 1) AS avg_lead_days,\n       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY posted_at - contract_at) AS median_lead,\n       MAX(posted_at - contract_at) AS worst_days\nFROM performance_logs\nGROUP BY campaign_id\nHAVING AVG(posted_at - contract_at) > 12\nORDER BY avg_lead_days DESC;"
    },
    q3: {
      label: 'Q3 · 재협업률 — 2회 이상 함께한 크리에이터',
      code: "-- PostgreSQL\nWITH pair AS (\n  SELECT creator_id, COUNT(DISTINCT campaign_id) AS campaigns\n  FROM performance_logs\n  GROUP BY creator_id\n)\nSELECT COUNT(*) FILTER (WHERE campaigns >= 2) AS repeat_creators,\n       COUNT(*) AS total_creators,\n       ROUND(100.0 * COUNT(*) FILTER (WHERE campaigns >= 2) / COUNT(*), 1) AS repeat_rate_pct\nFROM pair;\n\n-- MySQL이라면: SUM(CASE WHEN campaigns >= 2 THEN 1 ELSE 0 END)"
    },
    q4: {
      label: 'Q4 · 허수 의심 크리에이터 — 조회/구독 비율 + 클릭률',
      code: "SELECT c.creator_id, c.followers, c.avg_views,\n       ROUND(c.avg_views::numeric / NULLIF(c.followers, 0), 3) AS view_per_follower,\n       ROUND(AVG(p.clicks::numeric / NULLIF(p.views, 0)) * 100, 2) AS ctr_pct,\n       COUNT(*) AS posts\nFROM creators c\nJOIN performance_logs p USING (creator_id)\nGROUP BY 1, 2, 3\nHAVING c.avg_views::numeric / NULLIF(c.followers, 0) < 0.12\nORDER BY view_per_follower ASC;"
    },
    q5: {
      label: 'Q5 · 카테고리별 예산 배분 추천 — 상위 3명 + 비중',
      code: "WITH agg AS (\n  SELECT c.category, p.creator_id,\n         SUM(p.revenue_krw) AS rev, SUM(p.cost_krw) AS cost\n  FROM performance_logs p\n  JOIN creators c USING (creator_id)\n  GROUP BY 1, 2\n), ranked AS (\n  SELECT *,\n         SUM(rev) OVER (PARTITION BY category) AS cat_rev,\n         ROW_NUMBER() OVER (PARTITION BY category ORDER BY rev DESC) AS rn,\n         ROUND(rev::numeric / NULLIF(cost, 0), 2) AS roas\n  FROM agg\n)\nSELECT category, creator_id, rev, cost, roas,\n       ROUND(rev::numeric / NULLIF(cat_rev, 0) * 100, 1) AS share_pct,\n       rn\nFROM ranked\nWHERE rn <= 3\nORDER BY category, rn;"
    }
  },
  a5: {
    readme: {
      label: 'README 템플릿 (복사해서 숫자만 바꾸세요)',
      code: "# 크리에이터 캠페인 ROI & 매칭 대시보드\n\n## 한 줄 요약\n크리에이터 87명 · 영상 2,610개(YouTube Data API, 수집일 2026-11-20)를 분석해\n**팔로워 5~20만 구간의 CPV가 중앙값 412원으로 가장 낮고**, 재협업률은 1~5만 구간이\n2.1배 높다는 것을 확인했습니다. 다음 분기 예산은 '5~20만 = 신규 테스트, 1~5만 = 재협업'\n으로 나누는 것을 제안합니다.\n\n## 문제\n브랜드는 팔로워 수로 크리에이터를 고르지만, 실제 효율(원/조회, 전환)은 구간별로 다르다.\n→ **어떤 크리에이터에게 다음 예산을 배분해야 하는가?**\n\n## 데이터\n| 데이터 | 출처 | 기간 | 규모 |\n|---|---|---|---|\n| 채널·영상 통계 | YouTube Data API v3 | 2026-11-20 수집 | 채널 87 · 영상 2,610 |\n| 캠페인 단가 | 가정(팔로워 구간별 레이트카드) | - | 4구간 |\n\n- 개인정보·비공개 데이터 없음. 사내 계약 정보 미포함.\n\n## 방법\n1. API 수집(`collect_youtube.py`) → CSV\n2. SQLite/PostgreSQL 적재(`schema.sql`)\n3. 분석 쿼리 5종(`queries/`) — CPV·ROAS, 리드타임, 재협업률, 허수 판별, 예산 배분\n4. Looker Studio 대시보드(링크)\n\n## 핵심 결과\n| 구간 | CPV(원/조회) | ROAS | 재협업률 |\n|---|---|---|---|\n| ~1만 | 620 | 1.8 | 18% |\n| 1~5만 | 470 | 2.4 | **31%** |\n| 5~20만 | **412** | 2.7 | 22% |\n| 20만+ | 905 | 1.6 | 12% |\n\n## 제안\n- 5~20만: 신규 캠페인 테스트 예산 50%\n- 1~5만: 재협업 유지 30%\n- 20만+: 단가 재협상 또는 제외 20%\n\n## 한계\n- 단가는 공개 데이터가 없어 가정값. ±30% 민감도 분석에서도 구간 순위는 유지됨.\n- 조회수는 게시 후 30일 기준으로 통일하지 못한 영상이 일부 있음.\n\n## 재현\n```bash\npython collect_youtube.py   # .env에 YT_API_KEY\nsqlite3 roi.db < schema.sql\nsqlite3 roi.db < queries/q1_cpv_by_tier.sql\n```"
    }
  },
  b2: {
    b2: {
      label: '가입 주차 코호트 × D7 리텐션 (주문 기준)',
      code: "WITH first_order AS (\n  SELECT user_id, DATE_TRUNC('week', MIN(ordered_at)) AS cohort_week\n  FROM orders\n  GROUP BY user_id\n), act AS (\n  SELECT DISTINCT user_id, DATE_TRUNC('week', ordered_at) AS act_week\n  FROM orders\n)\nSELECT f.cohort_week,\n       COUNT(DISTINCT f.user_id) AS users,\n       ROUND(100.0 * COUNT(DISTINCT CASE\n                 WHEN a.act_week = f.cohort_week + INTERVAL '7 days'\n                 THEN a.user_id END)\n             / COUNT(DISTINCT f.user_id), 1) AS d7_retention\nFROM first_order f\nLEFT JOIN act a ON a.user_id = f.user_id\nGROUP BY f.cohort_week\nORDER BY f.cohort_week;"
    }
  },
  b3: {
      label: '6단계 퍼널 전환율',
      code: "WITH step AS (\n  SELECT user_id,\n    MAX(CASE WHEN event_name = 'search'       THEN 1 ELSE 0 END) AS s1,\n    MAX(CASE WHEN event_name = 'store_view'   THEN 1 ELSE 0 END) AS s2,\n    MAX(CASE WHEN event_name = 'menu_view'    THEN 1 ELSE 0 END) AS s3,\n    MAX(CASE WHEN event_name = 'add_cart'     THEN 1 ELSE 0 END) AS s4,\n    MAX(CASE WHEN event_name = 'order_start'  THEN 1 ELSE 0 END) AS s5,\n    MAX(CASE WHEN event_name = 'payment_done' THEN 1 ELSE 0 END) AS s6\n  FROM events\n  WHERE event_at >= '2026-03-01' AND event_at < '2026-09-01'\n  GROUP BY user_id\n)\nSELECT SUM(s1) AS search_u, SUM(s2) AS store_u, SUM(s3) AS menu_u,\n       SUM(s4) AS cart_u,  SUM(s5) AS order_u, SUM(s6) AS paid_u,\n       ROUND(100.0*SUM(s2)/NULLIF(SUM(s1),0),1) AS search_to_store,\n       ROUND(100.0*SUM(s4)/NULLIF(SUM(s3),0),1) AS menu_to_cart,\n       ROUND(100.0*SUM(s5)/NULLIF(SUM(s4),0),1) AS cart_to_order,\n       ROUND(100.0*SUM(s6)/NULLIF(SUM(s5),0),1) AS order_to_paid\nFROM step;"
  }
};


let V3_CODES = {}, V3_CSEQ = 0, V3_MEMO_T = null;

function v3State() {
  if (!S.v3Career || typeof S.v3Career !== 'object') S.v3Career = {};
  const v = S.v3Career;
  if (!v.checks || typeof v.checks !== 'object') v.checks = {};
  if (!v.memos || typeof v.memos !== 'object') v.memos = {};
  if (!v.open || typeof v.open !== 'object') v.open = {};
  if (!v.reveal || typeof v.reveal !== 'object') v.reveal = {};
  if (!v.tests || typeof v.tests !== 'object') v.tests = {};
  if (typeof v.forceTest !== 'boolean') v.forceTest = false;
  return v;
}
function v3Done(id) {
  const v = v3State();
  if (id.indexOf('test_') === 0) return !!v.tests[id.slice(5)];
  return !!v.checks[id];
}
function v3DoneSet(id, on) {
  const v = v3State();
  if (id.indexOf('test_') === 0) { if (on) v.tests[id.slice(5)] = TODAY; else delete v.tests[id.slice(5)]; return; }
  if (on) v.checks[id] = TODAY; else delete v.checks[id];
}
function v3Open(id) {
  const v = v3State();
  if (typeof v.open[id] === 'boolean') return v.open[id];
  return id === v3CurrentStageId();
}
function v3OpenSet(id, on) { v3State().open[id] = !!on; }
function v3Md(s) { return String(s == null ? '' : s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }
function v3Short(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
function v3Pct(ids) {
  if (!ids.length) return 0;
  return Math.round(ids.filter(v3Done).length / ids.length * 100);
}
function v3StageItems(st) {
  if (st.topics) return st.topics.reduce(function (a, t) { return a.concat(t.items); }, []);
  if (st.steps) return st.steps.reduce(function (a, s) { return a.concat(s.checks); }, []);
  if (st.id === 'v3s4') return V3_SQL_TESTS.concat(V3_CASE_TESTS).map(function (x) { return { id: 'test_' + x.id, t: x.title }; });
  if (st.id === 'v3s5') return (st.checks || []).concat(V3_FLASHCARDS.map(function (f) { return { id: 'fb_' + f.id, t: f.q }; }));
  return [];
}
function v3StagePct(st) { return v3Pct(v3StageItems(st).map(function (x) { return x.id; })); }
function v3CurrentStageId() {
  for (let i = 0; i < V3_STAGES.length; i++) {
    if (v3StagePct(V3_STAGES[i]) < 100) return V3_STAGES[i].id;
  }
  return V3_STAGES[V3_STAGES.length - 1].id;
}
function v3CoursePct() {
  let done = 0, total = 0;
  V3_STAGES.forEach(function (st) {
    v3StageItems(st).forEach(function (x) { total++; if (v3Done(x.id)) done++; });
  });
  return { done: done, total: total, pct: total ? Math.round(done / total * 100) : 0 };
}
function v3PrePct() {
  let done = 0, total = 0;
  V3_STAGES.slice(0, 3).forEach(function (st) {
    v3StageItems(st).forEach(function (x) { total++; if (v3Done(x.id)) done++; });
  });
  return { done: done, total: total, pct: total ? Math.round(done / total * 100) : 0 };
}
function v3Next() {
  for (let i = 0; i < V3_STAGES.length; i++) {
    const items = v3StageItems(V3_STAGES[i]);
    for (let j = 0; j < items.length; j++) if (!v3Done(items[j].id)) return { stage: V3_STAGES[i], item: items[j] };
  }
  return null;
}

/* ── 코드 박스 · 복사 ─────────────────────────────────────── */
function v3Code(code, label) {
  const id = 'c' + (++V3_CSEQ);
  V3_CODES[id] = String(code || '');
  return '<div class="v3-codebox">' +
    (label ? '<div class="v3-codelabel">' + esc(label) + '</div>' : '') +
    '<pre>' + esc(code) + '</pre>' +
    '<button class="v3-cp" data-v3="copy" data-code="' + id + '" aria-label="코드 복사">⧉</button></div>';
}
function v3Copy(text) {
  const done = function () { toast('복사했어요 · 채팅에 붙여넣기'); sfx('ok'); };
  try {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, function () { v3CopyFallback(text, done); });
      return;
    }
  } catch (e) { }
  v3CopyFallback(text, done);
}
function v3CopyFallback(text, done) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', '');
    ta.style.position = 'fixed'; ta.style.top = '-1000px'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
    document.execCommand('copy'); ta.remove(); done();
  } catch (e) {
    toast('복사가 막혔어요 — 코드를 길게 눌러 선택해 주세요');
  }
}

/* ── 조각 렌더 ───────────────────────────────────────────── */
function v3Acc(id, icon, title, inner, opts) {
  opts = opts || {};
  const o = v3Open(id);
  return '<div class="v3-acc' + (o ? ' open' : '') + '">' +
    '<button class="v3-acc-h" data-v3="acc" data-id="' + id + '" aria-expanded="' + o + '">' +
    (icon ? '<span class="ic">' + icon + '</span>' : '') + '<span style="flex:1;min-width:0">' + title + '</span>' +
    (opts.pct != null ? '<span class="pct">' + opts.pct + '%</span>' : '') +
    '<span class="caret">▼</span></button>' +
    '<div class="v3-acc-b">' + inner + '</div></div>';
}
function v3CheckRow(c, exp) {
  const on = v3Done(c.id);
  return '<button class="v3-check' + (on ? ' on' : '') + '" data-v3="check" data-id="' + c.id + '" data-exp="' + (exp || 10) + '" data-label="' + esc(c.t) + '" aria-pressed="' + on + '">' +
    '<span class="bx">✓</span><span class="tx">' + esc(c.t) + (c.hint ? '<small>' + esc(c.hint) + '</small>' : '') + '</span></button>';
}
function v3Links(list) {
  return '<div class="v3-links">' + list.map(function (l) {
    return '<a class="v3-link" href="' + esc(l.u) + '" target="_blank" rel="noopener noreferrer"><span>↗</span>' + esc(l.t) + '</a>';
  }).join('') + '</div>';
}
function v3Fill(html, stepId) {
  const codes = V3_STEP_CODES[stepId] || {};
  return String(html || '').replace(/<div class="v3-codebox-placeholder"(?: data-k="([^"]+)")?><\/div>/g, function (m, k) {
    const c = k ? codes[k] : null;
    return c ? v3Code(c.code, c.label) : '';
  });
}

/* ── Stage 1 주제 ───────────────────────────────────────── */
function v3TopicHTML(t) {
  const ids = t.items.map(function (i) { return i.id; });
  let h = '<p class="v3-why">' + t.why + '</p>';
  h += '<div class="v3-h">치트시트 · 복사해서 바로 쓰기</div>';
  t.cheats.forEach(function (c) {
    if (c.label) h += '<div class="v3-subtt">' + esc(c.label) + '</div>';
    h += v3Code(c.code);
    if (c.note) h += '<div class="v3-note">' + c.note + '</div>';
  });
  h += '<div class="v3-h lav">무료 학습 · 실습 링크</div>' + v3Links(t.links);
  h += '<div class="v3-h">완료 체크 · ' + (t.time || '') + '</div>';
  h += t.items.map(function (c) { return v3CheckRow(c, 12); }).join('');
  return v3Acc(t.id, t.icon, esc(t.title), h, { pct: v3Pct(ids) });
}

/* ── Stage 2·3 스텝 ─────────────────────────────────────── */
function v3StepHTML(s) {
  let b = '<div class="goal">' + esc(s.goal || '') + '</div>';
  b += v3Fill(s.body, s.id);
  if (s.routes) {
    b += s.routes.map(function (r) {
      return v3Acc(r.id, '<span style="font-size:13px;font-weight:900;color:#8ff0d0">' + r.icon + '</span>',
        esc(r.title), v3Fill(r.body, r.id), {});
    }).join('');
  }
  if (s.after) b += v3Fill(s.after, s.id);
  b += '<div class="v3-h">이 단계 체크리스트</div>' + s.checks.map(function (c) { return v3CheckRow(c, 10); }).join('');
  b += '<button class="v3-reviewbtn" data-v3="review" data-step="' + s.id + '">📋 춘배에게 이 단계 검수 요청 복사</button>';
  const title = 'Step ' + s.n + ' · ' + s.title.replace(/^Step \d+ · /, '');
  const ids = s.checks.map(function (c) { return c.id; });
  return v3Acc(s.id, '<span style="min-width:16px;font-size:12px;font-weight:900;color:#8ff0d0">' + s.n + '</span>', esc(title), b, { pct: v3Pct(ids) });
}

/* ── 데이터 랩 (내 앱 로그) ─────────────────────────────── */
function v3LabHTML() {
  const n = (S.analyticsLogs || []).length;
  const first = n ? S.analyticsLogs[0].date_kst : '—';
  const todayN = (S.analyticsLogs || []).filter(function (x) { return x.date_kst === TODAY; }).length;
  let h = '<p class="v3-p">앱에서 하는 행동이 <b>자동으로 분석용 로그</b>로 쌓입니다 — 퀘스트 완료, 참은 소비(카테고리·금액·시간대), 체크리스트, 과외 제출. 2~3주 모은 뒤 CSV로 내보내면 <b>"직접 만든 앱의 사용자 행동 로그 · 지출 방어 패턴 분석"</b>이라는, 아무도 따라 하기 힘든 포트폴리오가 됩니다.</p>';
  h += '<div class="v3-schema">지금까지 <b>' + n + '건</b> · 오늘 ' + todayN + '건 · 첫 기록 ' + esc(first) + '\n최대 1,000건까지 최근 기록을 유지하고, 기기 저장 + ☁️ Firebase에 함께 동기화됩니다.</div>';
  h += '<div class="v3-btnrow"><button class="v3-btn" data-v3="csv">⬇ 행동 로그 CSV 내보내기</button>' +
    '<button class="v3-btn" data-v3="copykit">⧉ 분석 시작 SQL 복사</button></div>';
  h += '<div class="v3-h">2~3주 뒤 이렇게 쓰면 됩니다</div>';
  h += '<ul class="v3-list"><li>CSV를 SQLite/PostgreSQL/Google Sheets에 올린다 (컬럼: ts, date_kst, hour_kst, weekday, event_type, category, label, value_krw, exp)</li><li>요일×시간대별 방어 금액, 퀘스트 완료 리듬, 로드맵 체크와 EXP의 관계를 SQL로 뽑는다</li><li>결과를 Looker Studio에 올려 대시보드 1개 + 노션 1장으로 정리 → 프로젝트 A/B와 함께 포트폴리오 3번째 카드</li></ul>';
  h += '<div class="v3-tip">혼자 쓴 앱이라 표본이 작습니다. "n=' + n + '건, 기간 ○○~○○, 단일 사용자"를 반드시 밝히고, <b>패턴 탐색·가설 생성</b> 중심으로 쓰세요. 작은 데이터에서 결론을 단정하지 않는 태도 자체가 평가 포인트입니다.</div>';
  return v3Acc('lab', '📊', '데이터 랩 · 내 앱 로그가 포트폴리오 데이터' + (n ? ' <span class="pct">' + n + '건</span>' : ''), h, {});
}

function v3KitSQL() {
  return "-- 1) CSV 적재 (SQLite 예시, PostgreSQL은 COPY 사용)\nCREATE TABLE behavior_logs (\n  event_id INTEGER, ts BIGINT, date_kst DATE, hour_kst INTEGER,\n  weekday INTEGER,          -- 0=일요일\n  event_type TEXT,          -- quest_complete / brick_break / study_check ...\n  category TEXT, label TEXT, value_krw INTEGER, exp INTEGER\n);\n.mode csv\n.import --skip 1 yongeuntown_behavior_logs_YYYYMMDD.csv behavior_logs\n\n-- 2) 요일 × 시간대별 '참은 소비' 방어 금액\nSELECT weekday, hour_kst, COUNT(*) AS n, SUM(value_krw) AS saved_krw\nFROM behavior_logs\nWHERE event_type = 'brick_break'\nGROUP BY 1, 2\nORDER BY saved_krw DESC;\n\n-- 3) 일별 퀘스트 완료 리듬\nSELECT date_kst,\n       COUNT(*) FILTER (WHERE event_type = 'quest_complete') AS quests,\n       SUM(exp) AS exp\nFROM behavior_logs\nGROUP BY 1 ORDER BY 1;\n\n-- 4) 공부 체크가 EXP에 기여한 비중\nSELECT category, COUNT(*) AS checks, SUM(exp) AS exp\nFROM behavior_logs\nWHERE event_type LIKE 'study%'\nGROUP BY 1 ORDER BY exp DESC;";
}

/* ── Stage 4 테스트 ─────────────────────────────────────── */
function v3RevealBtn(id, label) {
  const on = !!v3State().reveal[id];
  return '<button class="v3-btn' + (on ? ' on' : '') + '" data-v3="reveal" data-id="' + id + '" aria-expanded="' + on + '">' + label + '</button>';
}
function v3RevealBox(id, inner) {
  const on = !!v3State().reveal[id];
  return '<div class="v3-ans' + (on ? ' open' : '') + '">' + inner + '</div>';
}
function v3TestHTML() {
  const pre = v3PrePct();
  const v = v3State();
  const unlocked = pre.pct >= 70 || v.forceTest;
  let h = '<div class="v3-h">춘배 합격선 게이지</div>';
  h += '<div class="v3-gauge"><i style="width:' + pre.pct + '%"></i></div>';
  h += '<div class="v3-mini-x" style="margin-top:6px">Stage 1~3 달성률 <b style="color:#8ff0d0">' + pre.pct + '%</b> · ' + pre.done + ' / ' + pre.total + ' 체크</div>';
  if (pre.pct >= 70) h += '<div class="v3-badge-pass">🏅 춘배 검수 통과 가능! 지금이 테스트 타이밍</div>';
  else h += '<div class="v3-tip">70%가 되면 배지가 뜨고 테스트가 기본으로 열려요. 지금 풀어도 기록은 그대로 남습니다.</div>';

  if (!unlocked) {
    h += '<div class="v3-lock"><b>🔒 실전 모의 테스트</b><p>SQL 3문제 + 비즈니스 케이스 2문제.<br>합격선(70%) 전에 미리 풀어도 괜찮아요 — 지금 열어볼까요?</p>' +
      '<button class="v3-btn" data-v3="forceTest">🔓 지금 미리 풀어보기</button></div>';
    return h;
  }
  h += v.forceTest && pre.pct < 70 ? '<div class="v3-mini-x" style="margin:8px 0 0">미리 보기 모드 · 합격선까지 ' + (70 - pre.pct) + '%p 남았어요</div>' : '';

  h += '<div class="v3-h lav">SQL 실전 3문제 · 각 25분</div>';
  V3_SQL_TESTS.forEach(function (q) {
    const done = !!v3State().tests[q.id];
    h += '<div class="v3-quiz"><div class="qk">SQL 과제 · 기업 테스트 스타일</div><h4>' + q.n + ' ' + esc(q.title) + '</h4>';
    h += '<div class="v3-subtt">테이블</div><div class="v3-schema">' + esc(q.schema) + '</div>';
    h += '<div class="ask">' + q.ask + '</div>';
    h += '<div class="v3-btnrow">' + v3RevealBtn(q.id + '_h', '💡 힌트') + v3RevealBtn(q.id + '_a', '📖 모범 답안 · 해설') + '</div>';
    h += v3RevealBox(q.id + '_h', '<div class="v3-ans-in"><div class="v3-note" style="border-color:rgba(255,224,138,.4)">' + q.hint + '</div></div>');
    h += v3RevealBox(q.id + '_a', '<div class="v3-ans-in">' + v3Code(q.answer, '모범 답안') + '<div class="v3-note" style="border-color:rgba(143,240,208,.45)">' + q.explain + '</div></div>');
    h += '<div class="v3-btnrow"><button class="v3-btn' + (done ? ' on' : '') + '" data-v3="testDone" data-id="' + q.id + '" data-label="SQL ' + esc(q.title) + '">' + (done ? '✅ 풀었어요 · ' + esc(String(v3State().tests[q.id] || '').slice(5)) : '✅ 풀었어요 (+40 EXP)') + '</button>' +
      '<button class="v3-btn" data-v3="goLab">🧪 실전 랩으로 →</button></div></div>';
  });
  h += '<div class="v3-h lav">비즈니스 케이스 2문제 · 각 15분</div>';
  V3_CASE_TESTS.forEach(function (q) {
    const done = !!v3State().tests[q.id];
    const memo = v3State().memos[q.id] || '';
    h += '<div class="v3-quiz"><div class="qk">케이스 인터뷰</div><h4>' + q.n + ' ' + esc(q.title) + '</h4>';
    h += '<div class="ask">' + q.prompt + '</div>';
    h += '<div class="v3-memo-k"><span>' + esc(q.memoLabel) + '</span><span>자동 저장</span></div>';
    h += '<textarea class="v3-memo" data-v3memo="' + q.id + '" placeholder="원인 파악 순서 / 가설 / 확인할 지표를 먼저 적어보세요.">' + esc(memo) + '</textarea>';
    h += '<div class="v3-btnrow">' + v3RevealBtn(q.id + '_a', '📖 면접관 기준 프레임워크') + '</div>';
    h += v3RevealBox(q.id + '_a', '<div class="v3-ans-in"><ul class="v3-list" style="margin-bottom:0">' + q.framework.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div>');
    h += '<div class="v3-btnrow"><button class="v3-btn' + (done ? ' on' : '') + '" data-v3="testDone" data-id="' + q.id + '" data-label="케이스 ' + esc(q.title) + '">' + (done ? '✅ 정리 완료' : '✅ 내 답 정리 완료 (+40 EXP)') + '</button></div></div>';
  });
  h += '<div class="v3-tip">채점은 과외 탭에서 Claude Code가 해줍니다. 답안을 과외 미션으로 제출하면 점수·수정본이 돌아와요.</div>';
  return h;
}

/* ── Stage 5 플래시카드 ─────────────────────────────────── */
function v3FlashHTML() {
  let h = '<div class="v3-h lav">면접 Q&A 플래시카드 8선 · 30초씩 소리 내어</div>';
  h += V3_FLASHCARDS.map(function (f) {
    const o = v3Open('flash_' + f.id);
    const conf = v3Done('fb_' + f.id);
    return '<div class="v3-flash' + (o ? ' open' : '') + '">' +
      '<button class="v3-flash-h" data-v3="acc" data-id="flash_' + f.id + '" aria-expanded="' + o + '"><span class="tag ' + (f.tag === 'story' ? 'story' : '') + '">' + (f.tag === 'story' ? '경험' : '기술') + '</span><span style="flex:1;min-width:0">' + esc(f.q) + '</span></button>' +
      '<div class="v3-flash-b"><ul class="pts" style="padding-left:16px;margin:0">' + f.pts.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ul>' +
      '<button class="conf' + (conf ? ' on' : '') + '" data-v3="conf" data-id="fb_' + f.id + '"><span class="bx">✓</span>30초 안에 말할 수 있다 (+6 EXP)</button></div></div>';
  }).join('');
  return h;
}

/* ── 스테이지 카드 ──────────────────────────────────────── */
function v3StageHTML(st) {
  const pct = v3StagePct(st);
  const o = v3Open(st.id);
  const now = v3CurrentStageId() === st.id;
  let body = '';
  if (st.id === 'v3s1') {
    body = '<p class="v3-why">' + v3Md(st.intro) + '</p>' + st.topics.map(v3TopicHTML).join('');
  } else if (st.id === 'v3s2' || st.id === 'v3s3') {
    body = '<p class="v3-why">' + v3Md(st.intro) + '</p>' + st.steps.map(v3StepHTML).join('');
  } else if (st.id === 'v3s4') {
    body = v3TestHTML();
  } else {
    body = '<p class="v3-why">' + v3Md(st.intro) + '</p>' +
      '<div class="v3-h">GitHub 정비 체크리스트</div>' + (st.checks || []).map(function (c) { return v3CheckRow(c, 15); }).join('') +
      v3FlashHTML();
  }
  return '<div class="v3-stage' + (o ? ' open' : '') + (now ? ' now' : '') + '">' +
    '<button class="v3-stage-h" data-v3="stage" data-id="' + st.id + '" aria-expanded="' + o + '">' +
    '<span class="v3-num"><small>STAGE</small><b>' + st.n + '</b></span>' +
    '<span class="v3-stage-tt"><b>' + esc(st.title) + '</b><span>' + esc(st.period) + '</span><em>' + esc(st.sub) + '</em></span>' +
    '<span class="v3-stage-pct">' + pct + '%<small>' + (now ? '지금 여기' : '진행') + '</small></span></button>' +
    '<div class="v3-stage-b"><div class="v3-mini"><i style="width:' + pct + '%"></i></div>' +
    '<div class="v3-mini-x">' + v3StageItems(st).filter(function (x) { return v3Done(x.id); }).length + ' / ' + v3StageItems(st).length + ' 완료</div>' +
    body + '</div></div>';
}

function v3HeroHTML() {
  const p = v3CoursePct();
  const nx = v3Next();
  return '<div class="v3-hero">' +
    '<div class="k">YONGEUN TOWN · CAREER QUEST v3</div>' +
    '<h2>데이터 분석가 취업 토털 코스</h2>' +
    '<p>공부 → 프로젝트 2개 → 합격선 테스트 → 면접까지.<br>체크만 따라오면 끝나는 5단계 커리큘럼이에요.</p>' +
    '<div class="v3-gauge"><i style="width:' + p.pct + '%"></i></div>' +
    '<div class="gline"><span>전체 진행률</span><b>' + p.pct + '% · ' + p.done + '/' + p.total + '</b></div>' +
    (nx ? '<div class="next">👉 다음 할 일 · <b>' + esc(v3Short(nx.item.t, 42)) + '</b></div>' : '<div class="next">🎉 모든 체크 완료! 이제 지원만 남았어요.</div>') +
    '</div>';
}
function v3FootHTML() {
  const n = (S.analyticsLogs || []).length;
  let h = '<div class="card" style="margin-top:4px;margin-bottom:6px;padding:13px">';
  h += '<div class="v3-h" style="margin-top:0">📊 내 행동 로그 · 데이터 포트폴리오</div>';
  h += '<p class="v3-p" style="margin-bottom:8px;font-size:12.5px">지금 <b>' + n + '건</b> 쌓였어요. CSV로 내보내 SQL·Looker Studio에 바로 넣을 수 있습니다.</p>';
  h += '<button class="v3-btn" style="width:100%" data-v3="csv">⬇ 내 행동 로그 CSV 내보내기</button>';
  h += '<div class="v3-mini-x" style="margin-top:8px">파일명 yongeuntown_behavior_logs_' + TODAY.replace(/-/g, '') + '.csv · UTF-8(BOM) · 최근 1,000건</div>';
  h += '</div>';
  return h;
}

function renderV3() {
  const box = $('#v3Box'); if (!box) return;
  V3_CODES = {}; V3_CSEQ = 0;
  try { alogSeedOnce(); } catch (e) { }
  v3State();
  let html = v3HeroHTML() + v3LabHTML();
  V3_STAGES.forEach(function (st) { html += v3StageHTML(st); });
  html += v3FootHTML();
  box.innerHTML = html;
}

/* ── 검수 요청 텍스트 ──────────────────────────────────── */
function v3ReviewText(stepId) {
  let st = null, step = null;
  V3_STAGES.forEach(function (s) {
    if (!s.steps) return;
    s.steps.forEach(function (x) { if (x.id === stepId) { st = s; step = x; } });
  });
  if (!step) return '';
  const ids = step.checks.map(function (c) { return c.id; });
  const done = ids.filter(v3Done).length;
  const lines = [];
  lines.push('🎓 춘배 검수 요청 — Stage ' + st.n + ' · ' + step.title.replace(/^Step \d+ · /, ''));
  lines.push('');
  lines.push('진행률: ' + done + '/' + ids.length + ' (' + Math.round(done / ids.length * 100) + '%)');
  step.checks.forEach(function (c) { lines.push((v3Done(c.id) ? '✅' : '⬜') + ' ' + c.t); });
  lines.push('');
  lines.push('검수 포인트:');
  (step.ask || []).forEach(function (a) { lines.push('· ' + a); });
  lines.push('');
  lines.push('이 상태로 봐줘. 부족한 부분과 다음 액션을 알려줘.');
  return lines.join('\n');
}

/* ── 액션 ─────────────────────────────────────────────── */
document.addEventListener('click', function (e) {
  const el = e.target.closest && e.target.closest('[data-v3]');
  if (!el) return;
  const k = el.dataset.v3;
  try {
    if (k === 'acc') {
      e.preventDefault();
      const id = el.dataset.id;
      v3OpenSet(id, !v3Open(id)); save(); renderV3(); sfx('tap');
    } else if (k === 'stage') {
      e.preventDefault();
      const id = el.dataset.id;
      v3OpenSet(id, !v3Open(id)); save(); renderV3(); sfx('tap');
    } else if (k === 'check') {
      e.preventDefault();
      const id = el.dataset.id, on = !v3Done(id), exp = Number(el.dataset.exp) || 10;
      v3DoneSet(id, on);
      if (typeof alog === 'function') alog(on ? 'study_check' : 'study_uncheck', 'V3 코스', el.dataset.label || id, 0, on ? exp : 0);
      save(); renderV3();
      if (on) { addExp(exp); toast('체크 완료 · +' + exp + ' EXP'); vibe(12); }
      else { toast('체크를 해제했어요'); sfx('tap'); }
    } else if (k === 'copy') {
      e.preventDefault();
      const c = V3_CODES[el.dataset.code];
      if (c) v3Copy(c);
    } else if (k === 'copykit') {
      e.preventDefault(); v3Copy(v3KitSQL());
    } else if (k === 'csv') {
      e.preventDefault(); exportBehaviorCsv();
    } else if (k === 'goLab') {
      e.preventDefault(); switchTab('lab'); sfx('tap');
    } else if (k === 'reveal') {
      e.preventDefault();
      const id = el.dataset.id, v = v3State();
      v.reveal[id] = !v.reveal[id]; save(); renderV3(); sfx('tap');
    } else if (k === 'testDone') {
      e.preventDefault();
      const id = el.dataset.id, on = !v3Done('test_' + id);
      v3DoneSet('test_' + id, on);
      if (typeof alog === 'function') alog(on ? 'test_done' : 'test_undone', '모의 테스트', el.dataset.label || id, 0, on ? 40 : 0);
      save(); renderV3();
      if (on) { addExp(40); toast('한 문제 끝! +40 EXP'); vibe(16); }
    } else if (k === 'conf') {
      e.preventDefault();
      const id = el.dataset.id, on = !v3Done(id);
      v3DoneSet(id, on);
      if (typeof alog === 'function') alog(on ? 'interview_conf' : 'interview_unconf', '면접 준비', el.dataset.id, 0, on ? 6 : 0);
      save(); renderV3();
      if (on) { addExp(6); toast('자신감 체크 · +6 EXP'); sfx('ok'); }
    } else if (k === 'forceTest') {
      e.preventDefault();
      v3State().forceTest = true; save(); renderV3(); toast('테스트를 열었어요 — 지금 풀어봐요'); sfx('ok');
    } else if (k === 'review') {
      e.preventDefault();
      const t = v3ReviewText(el.dataset.step);
      if (t) v3Copy(t);
    }
  } catch (err) { console.warn('[용은타운] V3 액션 오류', k, err); }
});

document.addEventListener('input', function (e) {
  const t = e.target;
  if (!t || !t.dataset || !t.dataset.v3memo) return;
  v3State().memos[t.dataset.v3memo] = String(t.value || '').slice(0, 4000);
  clearTimeout(V3_MEMO_T);
  V3_MEMO_T = setTimeout(function () { save(); }, 700);
});

