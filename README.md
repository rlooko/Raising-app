# 🏘️ 용은타운 (권용은 키우기) v3.0

하루 10분으로 **나를 레벨업하는 작은 인생 게임**입니다. 홈은 **Three.js 캔디·토이 파스텔 마을 「용은타운」**, 그 위에 **오늘의 1순위·방어한 소비·D-Day** 요약 카드가 한눈에 들어옵니다.

**배포 주소:** <https://rlooko.github.io/Raising-app/>

- **파일**: `index.html` 하나 (3D 마을은 Three.js, ☁️ 동기화는 Firebase SDK를 CDN에서 불러오고, 그 외 기능은 외부 의존성 0)
- **오프라인**: 인터넷·CDN·WebGL이 없으면 자동으로 **2D SVG 마을**로 돌아갑니다 (모든 기능 그대로)
- **저장**: 이 기기 `localStorage`(`yongeun-raising-v1`) → 인터넷이 되면 내 Firebase(**yongeun-town** `town_state/yongeun_main`)에 ☁️ 자동 백업
- **미션(과외)**: Firebase **`claude_missions`** 컬렉션에서 실시간으로 주고받습니다

---

## 0. V3 — 🎓 데이터 분석가 취업 토털 코스

`🗺️ 로드맵` 탭이 **데이터 분석가 취업 토털 코스(5단계)** 로 업그레이드됐습니다. 기존 V2 3단계 로드맵과 체크 기록은 탭 하단 `🗂 V2 3단계 로드맵` 안에 그대로 보존됩니다.

| 단계 | 내용 | 산출물 |
|---|---|---|
| **Stage 1 · 기초 & 실무 감각** | SQL(JOIN·GROUP BY/HAVING·윈도우·퍼널/리텐션), 비즈니스 지표(DAU/MAU·코호트·ROAS/CAC), Pandas·시각화, 통계·A/B 테스트 — 주제별 ① 왜 쓰는지 ② 복사 가능한 치트시트 ③ 무료 학습 링크 ④ 완료 체크 | 치트시트 17개, 완료 체크 16개 |
| **Stage 2 · 프로젝트 A** | 「크리에이터 캠페인 ROI & 매칭 대시보드」 5스텝 매뉴얼 — 문제 정의 → **데이터 확보 3루트**(YouTube Data API 실데이터 / Kaggle + 현업 기준 / 사내 데이터 불가 시 시뮬레이션 3중 방어) → 스키마·1,000행 생성 → SQL 5종 → Looker Studio 4차트 → README·노션 템플릿 | 스키마 DDL, 생성 코드(seed 고정), SQL 5개, README 템플릿, 단계별 검수 요청 복사 |
| **Stage 3 · 프로젝트 B** | 기존 `BapZip`(가게·리뷰 API 담당, 최다 커밋 153)을 분석 포트폴리오로 재가공 — 코호트 리텐션 SQL, 6단계 퍼널, 개선 가설 2개·임팩트 계산, 3분 스토리텔링 | 리텐션/퍼널 SQL, 이력서 1줄 문구 3종 |
| **Stage 4 · 합격선 & 모의 테스트** | Stage 1~3 달성률 게이지(70% 이상 「춘배 검수 통과 가능」 배지, 미리 풀어보기 토글) + SQL 실전 3문제(스키마·힌트·모범답안/해설) + 비즈니스 케이스 2문제(내 생각 메모 + 면접관 프레임워크) | 채점은 🎓 과외 탭 Claude Code |
| **Stage 5 · GitHub & 면접** | 프로필/README 정비 체크 6개 + 면접 Q&A 플래시카드 8선(기술 4·경험 4, 모범 답변 포인트 + 자신감 체크) | 면접 답변 스크립트 |

### 📊 내 행동 로그 → 데이터 포트폴리오

앱을 쓰는 행동이 자동으로 분석용 이벤트 로그로 쌓입니다.

- **기록되는 것**: 퀘스트 완료/해제, 참은 소비(카테고리·금액·시간대), 로드맵/V3 체크리스트 체크·해제, 과외 답안 제출
- **형태**: `{ ts, date_kst, hour_kst, weekday, event_type, category, label, value_krw, exp }`
- **보관**: 최근 **1,000건**(안전 상한) · `localStorage` + ☁️ Firebase `town_state/yongeun_main` 동기화에 함께 실림
- **기존 기록**: 처음 한 번, 기존 벽돌·퀘스트·V2 로드맵 체크를 로그로 자동 변환
- **내보내기**: `⚙️ 더보기 → 📊 내 행동 로그 CSV 내보내기` 또는 `🗺️ 로드맵` 상단/하단 버튼 → **UTF-8(BOM)** `yongeuntown_behavior_logs_YYYYMMDD.csv` 즉시 다운로드
- 2~3주 모은 뒤 SQL/Looker Studio에 넣으면 **“직접 만든 앱의 사용자 행동 로그 · 지출 방어 패턴 분석”** 포트폴리오가 됩니다. 로드맵 상단 `📊 데이터 랩`에 분석 시작 SQL도 복사 버튼으로 들어 있습니다.

> ⚠️ 표본이 작은 단일 사용자 로그입니다. 분석 글에는 기간·n·정의를 밝히고 **패턴 탐색·가설 생성** 중심으로 쓰세요.

---

## 0-1. V2에서 새로 생긴 것

| 탭 | 하는 일 |
|---|---|
| 🏠 **홈** | 요약 카드 3개(오늘의 1순위 / 오늘 방어한 소비 / D-Day) + 3D 마을 + 오늘의 퀘스트 |
| 🗺️ **로드맵** | 3단계 인생 로드맵, 단계별 체크리스트·진행률 (일부는 앱 기록으로 자동 계산) |
| 🧱 **벽돌** | 오늘 살 뻔한 것을 참고 금액을 적으면 **빚 벽돌이 깨지는 애니메이션** + 이번 달 방어 금액 게이지 |
| 🎓 **과외** | 맥북 **Claude Code**가 보낸 영어·SQL 실전 미션에 답하고, 채점·피드백을 받는 화면 |
| ⚙️ **더보기** | 타임어택·돈·커리어·리포트는 여기 '빠른 이동'과 마을 건물(🏰·🏦·☕…)에서 그대로 열려요 |

- **가독성 개편**: 카드 글씨·대비·터치 영역을 키우고(본문 16px, 퀘스트 15.5px, 버튼 48px 이상), 레벨 카드는 낮게 줄여 **마을 독(건물 버튼)까지 한 화면**에 들어옵니다.
- **1탭 완료**: 홈 요약 카드의 ✓를 누르면 퀘스트가 끝나고, 용은·춘배가 관련 건물로 걸어가 축하합니다.
- **3단계 로드맵**
  - **Stage 1 (지금~12월 · 궤도 진입)**: SQL 실전·영어 10분·월 적자 탈출 → 데이터 vs 9급 결정
  - **Stage 2 (1~2월 · 안양 이사 & 결혼 준비)**: 이사·결혼 체크 + 주 2회 블로그/쇼츠 루틴
  - **Stage 3 (3월~ · 이직/합격 포트폴리오)**: SQLD, 포트폴리오 2건, 지원 10건, 오퍼
  - 점선 상자(↻)는 **자동** 항목: 제출한 미션 수, 참은 소비 수, 수은집 체크, 이번 달 순현금, 트랙 선택으로 채워집니다.
- **빚 벽돌**: 이번 달 목표(기본 200,000원)를 20개 벽돌로 나눠 보여주고, 기록할 때마다 벽이 무너집니다. 1,000원 = 벽돌 1개, EXP는 금액에 비례(2~24).

---

## 1. 🎓 Claude 과외 — 맥북 Claude Code 직통

**구조**

```
폰(용은타운)  ──제출──▶  Firebase Firestore  ──▶  맥북 claude_bridge.py
     ▲                   claude_missions               │ Claude Code가 채점
     └────────── 피드백(점수·수정본) ◀──────────────────┘
```

- 앱은 켜지면 `claude_missions`를 실시간 구독하고, 답안을 내면 그 문서에 바로 씁니다. 오프라인이면 기기에 쌓아두었다가 연결되면 올립니다.
- **첫 접속에 바로 쓸 수 있는 시드 미션 6개**가 들어 있습니다 — 영어 3(슬랙 재촉·스탠드업 오픈·브랜드 협업 메일), SQL 3(채널별 매출·마지막 미션 경과일·중복 지급 점검).
- 저장되는 것: 미션·내 답안·점수·피드백. **실명·주소·계좌 같은 개인정보는 넣지 않습니다.**

### 준비 (맥북, 1분)

1. Claude Code가 설치되어 있어야 자동 채점이 됩니다: `claude --version`
2. 이 폴더(또는 원하는 폴더)에 `claude_bridge.py`를 둡니다. 파이썬 3.9+만 있으면 되고 **pip 설치 없음**(표준 라이브러리만 사용).

### 1줄 사용법

```bash
python3 claude_bridge.py tutor
```

→ 채점 대기 답안을 Claude Code에 보내 채점하고, 결과를 Firebase에 돌려놓습니다. 폰 과외 탭을 새로고침하면 점수·피드백이 보입니다.

### 자주 쓰는 명령

```bash
python3 claude_bridge.py doctor      # 연결·대기·평균 점수 점검
python3 claude_bridge.py pending     # 채점 대기 답안 보기
python3 claude_bridge.py prompt      # 채점 프롬프트만 출력(직접 Claude에 붙여넣기)
python3 claude_bridge.py tutor --new # 채점 + 새 미션 2개 생성
python3 claude_bridge.py new         # 새 미션만 생성
python3 claude_bridge.py push --kind sql --title "..." --prompt "..."
python3 claude_bridge.py grade --id seed-en-1 --score 88 --feedback "..." --corrected "..."
python3 claude_bridge.py watch       # 새 제출 올라오면 알림 (Ctrl+C 종료)
python3 claude_bridge.py rules       # Firestore 규칙 예시
```

폰 과외 탭의 **✉️ 새 문제 요청**을 누르면 요청 시각이 저장되고, 다음 `tutor` 실행 때 새 미션이 생깁니다.

### Firebase 규칙 (`python3 claude_bridge.py rules`)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /town_state/yongeun_main { allow read, write: if true; }
    match /claude_missions/{docId} { allow read, write: if true; }
  }
}
```

---

## 2. 🔒 `.claudeignore` 보안 템플릿

`claude_bridge.py` 옆에 **`.claudeignore`** 가 있습니다. Claude Code를 실행할 폴더에 복사하면 비밀키·결혼/가족 문서·고객 개인정보·사적인 메모가 컨텍스트에 올라가지 않습니다.

```bash
cp .claudeignore ~/work/my-project/.claudeignore   # 프로젝트 루트에 두고 그 폴더에서 claude 실행
```

한 번 더 잠그려면 `.claude/settings.json`의 `permissions.deny`에도 같은 경로를 넣으세요.

---

## 3. 아이폰에서 열기

1. Safari에서 <https://rlooko.github.io/Raising-app/> 열기
2. 하단 **공유 → 홈 화면에 추가** → 이름 `권용은 키우기`
3. 홈 화면 아이콘 → 주소창 없는 전체 화면 앱

`?start=20`(타임어택 20분 자동 시작), `?tab=money`·`?tab=roadmap`·`?tab=brick`·`?tab=claude` 로 바로 열 수 있습니다. 애플워치 단축어는 기존과 동일합니다.

---

## 4. 무엇이 들어 있나 (기존 기능 그대로)

- **타임어택** 10/20/25분·커스텀, 원형 링, 일시정지·재시작, 완료 시 효과음·진동·EXP
- **돈** 수입/부업/지출/고정비, 월 요약·순현금, 안전망 게이지, 고정비 점검
- **커리어** 데이터 분석가·9급 공무원 트랙, 관문 퀴즈 잠금 해제, 병행 비교 경고, 자격증·스킬
- **리포트** 실행/돈/커리어 점수와 진단, 내 상태 복사
- **마을** 건물 탭·캐릭터 이동·낮/노을/밤·실행 로그·수은집(이사·결혼 체크)
- **동기화** 상단 `☁️ 동기화됨 / 저장 중… / 오프라인` 배지, JSON 백업·불러오기

---

## 5. 데이터에 대해

- 기록은 브라우저(`localStorage`)에 먼저 저장되고, 인터넷이 되면 내 Firebase(`yongeun-town`)로만 갑니다.
- 저장 키는 예전과 같은 **`yongeun-raising-v1`** 하나입니다. V2에서 추가된 `roadmap`·`brick`·`claude`는 **기존 기록을 그대로 둔 채** 자동으로 채워지고, 예전 백업 JSON도 그대로 불러와집니다.
- 미션 답안은 `claude_missions` 문서에만, 나머지 기록은 `town_state/yongeun_main` 한 문서에 들어갑니다.
- Safari에서 “방문 기록 및 웹사이트 데이터 지우기”를 하면 사라질 수 있으니 가끔 **더보기 → 백업 내보내기**로 JSON을 저장해 두세요. (백업 파일에는 이름·금액이 들어 있으니 공유 금지)

---

## 6. 검증 내역 (2026-11-21 · V2)

실제 브라우저(Chromium headless, iPhone 390×844·터치·2x)로 자동 테스트했습니다.

**오프라인 UI (Firebase·CDN 차단, 36개 중 35 PASS — 실패 1건은 차단으로 인한 브라우저 네트워크 로그)**

- 로드·모든 탭 전환에서 **pageerror 0건**, 390px **가로 스크롤 없음**
- 3D 마을 렌더, 요약 카드 3개(1순위·방어 소비 85,500원·D-56), 1탭 완료 → 퀘스트 완료 + 캐릭터 `goto`(건물로 이동)
- 벽돌: 기록 추가(85,500→91,300), 파티클 19개 생성, 게이지 45.65% 갱신, 새로고침 후 유지
- 로드맵: 3단계 렌더·진행률 링, 수동 체크 저장, 자동 항목은 계산 안내
- 과외: 미션 6개, 채점 피드백 표시, 오프라인 제출 → `⏳ 채점 대기` + 대기열(`pendingPush`) 적재, Firebase 채점 수신 → 카드에 92점·피드백 반영
- 더보기 빠른 이동으로 타임어택·돈·커리어·리포트 정상 진입

**온라인 (Firestore 실시간, 9/9 PASS)**

- `☁️ 동기화됨`, 미션 구독 `on`, 시드 6개 수신, 맥북이 보낸 새 미션 실시간 표시
- **콘솔 에러·경고 0건**, pageerror 0건
- 테스트가 `town_state`를 바꾸지 않았음(updateTime 동일) 확인

**브리지 (`claude_bridge.py`)**

- `doctor`·`list`·`pending`·`prompt`·`grade`·`seed`(멱등)·`push` 실동작 확인 (임시 문서는 테스트 후 삭제)
- 이 개발 환경에는 `claude` CLI가 없어 `tutor` 자동 채점은 “claude CLI 없음 → prompt 수동 모드” 안내로 정상 종료 (맥북에서는 `claude`가 있으면 자동 채점)

스크린샷: `downloads/yongeuntown_v2_home.png`, `downloads/yongeuntown_v2_brick.png`, `downloads/yongeuntown_v2_claude.png`

---

## 7. 참고

- 레벨 곡선: Lv.n → n+1에 `40 + (n-1)×12` EXP / 퀘스트 보상 10분 +60, 20분 +70, 25분 +80
- 타임어택 보상 `분×2.5 + 10` EXP, 관문 +120, 트랙 완주 +300, 로드맵 체크 +12, 미션 제출 +8, 채점 도착 +6
- 참은 소비 EXP: `2 × (금액/1,000)`, 최대 24
- V3 코스 EXP: 주제 체크 +12, 프로젝트 스텝 체크 +10, GitHub 정비 +15, 모의 테스트 +40, 면접 카드 자신감 +6
- V3 검증(2026-11-21, 모바일 390×844 오프라인): 5단계 펼침·치트시트 복사·프로젝트 A/B 매뉴얼·모의 테스트 해설 토글·면접 카드·체크 새로고침 유지·CSV 다운로드(UTF-8 BOM)·가로 스크롤 0·콘솔 에러 0

스크린샷: `downloads/yongeuntown_v3_roadmap.png`, `downloads/yongeuntown_v3_project.png`, `downloads/yongeuntown_v3_interview.png`
