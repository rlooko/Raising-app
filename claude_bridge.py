#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
용은타운 · Claude Bridge — 맥북의 Claude Code와 폰 웹앱을 잇는 1개 파일 브릿지

  폰(용은타운 → 🎓 과외 탭)에서 영어/SQL 답안을 제출하면 Firebase(claude_missions)에 쌓이고,
  이 스크립트가 그 답안을 Claude Code에게 보여 채점·피드백을 받아 다시 Firebase에 돌려놓습니다.

준비
  · 파이썬 3.9+ 만 있으면 됩니다. (pip 설치 없음 · 표준 라이브러리만 사용)
  · Claude Code CLI 가 설치되어 있어야 자동 채점(`tutor`)이 됩니다:  claude --version

1줄 사용법
  python3 claude_bridge.py tutor

자주 쓰는 명령
  python3 claude_bridge.py doctor              연결·대기 현황 확인
  python3 claude_bridge.py pending             채점 대기 답안 보기
  python3 claude_bridge.py prompt              채점 프롬프트만 출력 (직접 Claude에 붙여넣기)
  python3 claude_bridge.py tutor               대기 답안 자동 채점 + 새 문제 요청 처리
  python3 claude_bridge.py tutor --new         채점 + 새 미션 2개 생성
  python3 claude_bridge.py new                 새 미션만 생성
  python3 claude_bridge.py push --kind sql --title "..." --prompt "..."
  python3 claude_bridge.py grade --id seed-en-1 --score 85 --feedback "..." --corrected "..."
  python3 claude_bridge.py watch               새 제출이 올라오면 알려주기 (Ctrl+C 종료)
  python3 claude_bridge.py rules               Firebase 보안 규칙 예시 출력

Firebase
  프로젝트 yongeun-town · 컬렉션 claude_missions (문서 1개 = 미션 1개)
  · 저장되는 것: 미션, 내 답안, 점수, 피드백. 실명·주소·계좌 같은 개인정보는 넣지 않습니다.
"""
import argparse
import json
import os
import random
import re
import shutil
import string
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path

PROJECT = "yongeun-town"
API_KEY = "AIzaSyASwhf_PEgFLG6lyx8O9VO6Me-zJz3RPIA"
COL = "claude_missions"
BASE = "https://firestore.googleapis.com/v1/projects/{p}/databases/(default)/documents".format(p=PROJECT)
KST = timezone(timedelta(hours=9))
STATE_FILE = Path.home() / ".yongeuntown_bridge.json"

SEEDS = [
    {
        "id": "seed-en-1", "kind": "en", "level": "실무 · B1",
        "title": "계약 승인 재촉 슬랙 한 줄",
        "prompt": "A client hasn't replied for 3 days and your contract approval is stuck. Write ONE Slack message (2 sentences, in English) that nudges them politely — no guilt-tripping, no \"sorry to bother you\".",
        "hint": "Just checking in on… / Happy to hop on a quick call if that's easier.",
        "sample": "Hi Sarah — just checking in on the contract approval; we're ready to move as soon as you sign off. Happy to hop on a quick call today if that's easier.",
        "createdAt": 1795152000000,
    },
    {
        "id": "seed-en-2", "kind": "en", "level": "실무 · B1",
        "title": "밴쿠버 팀 스탠드업 오프닝",
        "prompt": "Your Vancouver teammate covered your task yesterday. Write ONE opening line for today's standup: thank them naturally, then move into your update. Keep it under 25 words.",
        "hint": "Thanks for picking up… — I'll keep this quick.",
        "sample": "Thanks for picking up the client deck yesterday, Maya — I'll keep this quick: today I'm finishing the SQL report and need a review by 3.",
        "createdAt": 1795152060000,
    },
    {
        "id": "seed-en-3", "kind": "en", "level": "실무 · B2",
        "title": "브랜드 매니저에게 첫 협업 메일",
        "prompt": "Write a 3-sentence email in English to a brand manager you've never met: (1) you lead creator partnerships at a Korean agency, (2) name two creators and their niche, (3) ask for a 15-minute call this week. Canadian-friendly tone: warm, direct, no fluff.",
        "hint": "I lead… / Two of our creators… / Would you be open to a 15-minute call?",
        "sample": "Hi Jordan, I lead creator partnerships at Dragonfruit, a Korean agency working with Xiaohongshu and Instagram creators. Two of our creators — Daeun (quiet lifestyle vlogs) and Jen (data-career content) — might fit your spring campaign. Would you be open to a 15-minute call this week to see if there's a fit?",
        "createdAt": 1795152120000,
    },
    {
        "id": "seed-sql-1", "kind": "sql", "level": "실무 · JOIN + GROUP BY",
        "title": "채널별 완료 미션 매출",
        "prompt": "2026년에 완료된(status = 'completed') 미션을 채널별로 묶어, 채널마다 완료 미션 수와 예산 합계를 예산 합계 큰 순서로 보여주세요.",
        "schema": "creators(id, name, channel, country)\nmissions(id, creator_id, brand, status, budget_krw, created_at)\n-- status: 'open' | 'completed' | 'canceled'\n-- created_at: DATE",
        "hint": "JOIN creators ON missions.creator_id = creators.id → WHERE status + 연도 → GROUP BY channel → ORDER BY SUM(budget_krw) DESC",
        "sample": "SELECT c.channel,\n       COUNT(*) AS done_missions,\n       SUM(m.budget_krw) AS total_budget\nFROM missions m\nJOIN creators c ON c.id = m.creator_id\nWHERE m.status = 'completed'\n  AND m.created_at >= '2026-01-01'\n  AND m.created_at <  '2027-01-01'\nGROUP BY c.channel\nORDER BY total_budget DESC;",
        "createdAt": 1795152180000,
    },
    {
        "id": "seed-sql-2", "kind": "sql", "level": "실무 · MAX + HAVING",
        "title": "크리에이터별 마지막 미션과 경과일",
        "prompt": "미션을 2건 이상 가진 크리에이터마다 마지막 미션일과, 2026-11-21 기준 경과일(days_since)을 구하세요. 마지막 미션일이 최근인 순서로 정렬하세요.",
        "schema": "creators(id, name, channel, country)\nmissions(id, creator_id, brand, status, budget_krw, created_at)\n-- PostgreSQL 기준. MySQL이면 DATEDIFF('2026-11-21', MAX(created_at))",
        "hint": "MAX(created_at) + GROUP BY … HAVING COUNT(*) >= 2. 날짜 차이는 DB마다 문법이 달라요.",
        "sample": "SELECT c.id, c.name,\n       MAX(m.created_at) AS last_mission,\n       DATE '2026-11-21' - MAX(m.created_at) AS days_since\nFROM creators c\nJOIN missions m ON m.creator_id = c.id\nGROUP BY c.id, c.name\nHAVING COUNT(*) >= 2\nORDER BY last_mission DESC;",
        "createdAt": 1795152240000,
    },
    {
        "id": "seed-sql-3", "kind": "sql", "level": "실무 · 중복 점검",
        "title": "같은 달, 금액이 다른 중복 지급 찾기",
        "prompt": "payouts에서 같은 크리에이터가 같은 달(month)에 서로 다른 금액으로 두 번 이상 기록된 경우를 찾으세요. creator_id, month, 서로 다른 금액 개수, 최소·최대 금액을 보여주세요.",
        "schema": "payouts(id, creator_id, month, amount_krw, paid_at)\n-- month: '2026-10' 형식의 문자열",
        "hint": "GROUP BY creator_id, month → HAVING COUNT(DISTINCT amount_krw) > 1",
        "sample": "SELECT creator_id, month,\n       COUNT(DISTINCT amount_krw) AS variants,\n       MIN(amount_krw) AS min_amount,\n       MAX(amount_krw) AS max_amount\nFROM payouts\nGROUP BY creator_id, month\nHAVING COUNT(DISTINCT amount_krw) > 1\nORDER BY month DESC, creator_id;",
        "createdAt": 1795152300000,
    },
]


# ─────────────────────────── Firestore REST ────────────────────────────
def _enc(v):
    if v is None:
        return {"nullValue": None}
    if isinstance(v, bool):
        return {"booleanValue": v}
    if isinstance(v, int):
        return {"integerValue": str(v)}
    if isinstance(v, float):
        return {"doubleValue": v}
    return {"stringValue": str(v)}


def _dec(fields):
    out = {}
    for k, v in (fields or {}).items():
        if "stringValue" in v:
            out[k] = v["stringValue"]
        elif "integerValue" in v:
            out[k] = int(v["integerValue"])
        elif "doubleValue" in v:
            out[k] = float(v["doubleValue"])
        elif "booleanValue" in v:
            out[k] = bool(v["booleanValue"])
        elif "nullValue" in v:
            out[k] = None
        elif "mapValue" in v:
            out[k] = _dec(v["mapValue"].get("fields"))
        elif "arrayValue" in v:
            out[k] = [_dec(x.get("mapValue", {}).get("fields")) for x in v["arrayValue"].get("values", [])]
    return out


def _req(method, url, body=None):
    data = None
    headers = {
        "Content-Type": "application/json",
        "Referer": "https://rlooko.github.io/",
    }
    if body is not None:
        data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "ignore")[:300]
        raise RuntimeError("Firestore %s %s → HTTP %s %s" % (method, url.split("?")[0], e.code, detail))
    except urllib.error.URLError as e:
        raise RuntimeError("네트워크 오류: %s (인터넷 연결을 확인하세요)" % e.reason)


def list_missions(limit=100):
    url = "%s/%s?key=%s&pageSize=%d" % (BASE, COL, API_KEY, limit)
    d = _req("GET", url)
    docs = []
    for x in d.get("documents", []):
        mid = x["name"].split("/")[-1]
        docs.append(dict(_dec(x.get("fields")), id=mid))
    docs.sort(key=lambda m: (m.get("createdAt") or 0))
    return docs


def patch_mission(mid, fields):
    mask = "&".join("updateMask.fieldPaths=" + urllib.parse.quote(k) for k in fields)
    url = "%s/%s/%s?key=%s&%s" % (BASE, COL, urllib.parse.quote(mid), API_KEY, mask)
    body = {"fields": {k: _enc(v) for k, v in fields.items()}}
    return _req("PATCH", url, body)


def get_town_state(mask=None):
    url = "%s/town_state/yongeun_main?key=%s" % (BASE, API_KEY)
    if mask:
        url += "&" + "&".join("mask.fieldPaths=" + urllib.parse.quote(m) for m in mask)
    try:
        d = _req("GET", url)
    except RuntimeError:
        return {}
    return _dec(d.get("fields"))


def pending_missions(docs=None):
    docs = docs if docs is not None else list_missions()
    out = []
    for m in docs:
        if int(m.get("submittedAt") or 0) > 0 and m.get("status") != "graded" and (m.get("answer") or "").strip():
            out.append(m)
    out.sort(key=lambda m: m.get("submittedAt") or 0)
    return out


# ─────────────────────────── 프롬프트 ────────────────────────────
GRADE_RULES = """당신은 권용은(캐나다 BCIT 졸업, 데이터 분석가 지망, 실무 영어에 자신이 없음)의 실전 과외 선생님입니다.
아래 제출물을 하나씩 채점하세요.

채점 규칙
- score: 0~100 정수. 70 이상이면 통과.
- feedback: 한국어 3~5문장. ① 잘한 점 1개 ② 고칠 점 1개(어디를 어떻게) ③ 실무에서 바로 쓰는 팁 1개.
- corrected: 영어는 의미를 유지하며 자연스럽게 고친 완성 문장(캐나다 실무 톤). SQL은 고친 전체 쿼리(주석 없이).
- 문법·논리 오류를 정확히 짚고, 틀린 부분이 없으면 더 좋은 표현을 제안하세요. 빈말 칭찬은 하지 마세요.
- 이름·주소·계좌 같은 개인정보를 새로 만들지 마세요.
- 출력은 JSON 배열 하나만. 설명, 인사말, 마크다운 코드펜스 금지.

출력 형식
[{"id":"문서 id","score":85,"feedback":"...","corrected":"..."}]
"""


def grade_prompt(items):
    blocks = []
    for m in items:
        b = ["---", "id: %s" % m.get("id"), "종류: %s (%s)" % ("영어" if m.get("kind") == "en" else "SQL", m.get("level") or ""), "문제: %s" % (m.get("prompt") or "")]
        if m.get("schema"):
            b.append("스키마:\n" + m["schema"])
        b.append("내 답안:\n" + (m.get("answer") or ""))
        blocks.append("\n".join(b))
    return GRADE_RULES + "\n[제출물]\n" + "\n".join(blocks) + "\n\nJSON 배열만 출력하세요."


NEW_RULES = """당신은 권용은의 실전 과외 선생님입니다. 그녀는 캐나다에서 7년 살았고 BCIT Computer Systems Technology(Database)를 졸업했지만 실무 영어에 자신이 없고, 데이터 분석가 취업을 준비합니다. 회사에서는 샤오홍슈 크리에이터 대행(마케팅 대행) 실장입니다.

다음 미션 2개를 새로 만드세요.
1) 영어 1개: 실무에서 바로 쓰는 1~3문장 영작 또는 표현. 슬랙·이메일·스탠드업·협상 상황. 난이도 B1~B2. 캐나다/북미 톤.
2) SQL 1개: 실무 데이터 쿼리. JOIN/GROUP BY/HAVING/윈도우/중복 점검/코호트 중 하나. 작은 스키마와 샘플 조건을 함께 주세요.

규칙
- prompt 는 한국어 지시문(무엇을 하라는지 명확히), 답안은 영어/SQL로 쓰게.
- 힌트는 한 줄, 모범 예시(sample)도 함께.
- 개인정보(실명·주소·계좌) 금지. 회사명은 'Dragonfruit' 같은 일반명만.
- 출력은 JSON 배열 하나만. 설명·마크다운 금지.

출력 형식
[{"kind":"en","level":"실무 · B1","title":"...","prompt":"...","schema":"","hint":"...","sample":"..."},
 {"kind":"sql","level":"실무 · ...","title":"...","prompt":"...","schema":"...","hint":"...","sample":"..."}]
"""


def parse_json_array(text):
    if not text:
        return None
    t = text.strip()
    t = re.sub(r"^```(?:json)?\s*", "", t)
    t = re.sub(r"\s*```$", "", t)
    i, j = t.find("["), t.rfind("]")
    if i < 0 or j < 0 or j <= i:
        return None
    try:
        return json.loads(t[i:j + 1])
    except json.JSONDecodeError:
        return None


# ─────────────────────────── Claude Code 호출 ────────────────────────────
def find_claude():
    for name in ("claude", "claude-code"):
        p = shutil.which(name)
        if p:
            return p
    for p in (Path("/opt/homebrew/bin/claude"), Path("/usr/local/bin/claude"), Path.home() / ".claude/local/claude"):
        if p.exists():
            return str(p)
    return None


def call_claude(prompt, timeout=600):
    exe = find_claude()
    if not exe:
        return None, "claude CLI를 찾지 못했어요"
    try:
        r = subprocess.run([exe, "-p", prompt, "--output-format", "text"],
                           capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        return None, "claude 응답이 %d초 안에 오지 않았어요" % timeout
    except Exception as e:  # noqa: BLE001
        return None, str(e)
    if r.returncode != 0:
        return None, (r.stderr or "").strip()[:400] or "claude 종료 코드 %d" % r.returncode
    return r.stdout, None


# ─────────────────────────── 상태 파일 ────────────────────────────
def load_state():
    try:
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return {}


def save_state(st):
    try:
        STATE_FILE.write_text(json.dumps(st, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:  # noqa: BLE001
        pass


# ─────────────────────────── 명령들 ────────────────────────────
def cmd_doctor(args):
    print("용은타운 · Claude Bridge 점검")
    print("  프로젝트:", PROJECT, "/ 컬렉션:", COL)
    exe = find_claude()
    print("  claude CLI:", exe or "없음 (tutor 자동 채점 불가 · prompt 수동 모드 사용)")
    try:
        docs = list_missions()
    except RuntimeError as e:
        print("  Firebase:", "실패 —", e)
        return 1
    print("  Firebase: OK · 미션 %d개" % len(docs))
    pend = pending_missions(docs)
    print("  채점 대기: %d개" % len(pend))
    graded = [m for m in docs if m.get("status") == "graded"]
    if graded:
        avg = sum(int(m.get("score") or 0) for m in graded) / len(graded)
        print("  채점 완료: %d개 · 평균 %.0f점" % (len(graded), avg))
    st = get_town_state(["state.claude.reqAt"])
    cl = ((st.get("state") or {}).get("claude") or {})
    req = int(cl.get("reqAt") or 0)
    handled = int(load_state().get("handledReqAt") or 0)
    print("  새 문제 요청:", ("있음 (%s)" % datetime.fromtimestamp(req / 1000, KST).strftime("%m/%d %H:%M")) if req > handled else "없음")
    return 0


def cmd_list(args: argparse.Namespace):
    docs = list_missions()
    if args.kind:
        docs = [m for m in docs if m.get("kind") == args.kind]
    if not docs:
        print("미션이 없어요. `python3 claude_bridge.py seed` 로 기본 6개를 넣을 수 있어요.")
        return 0
    for m in docs:
        st = "채점" if m.get("status") == "graded" else ("제출" if int(m.get("submittedAt") or 0) else "열림")
        sc = " %s점" % m.get("score") if m.get("status") == "graded" else ""
        print("%-14s %-3s %-4s %-12s %s%s" % (m.get("id"), m.get("kind"), st, (m.get("level") or "")[:12], m.get("title"), sc))
    return 0


def cmd_pending(args: argparse.Namespace):
    pend = pending_missions()
    if not pend:
        print("채점 대기 답안이 없어요.")
        return 0
    if args.json:
        print(json.dumps([{k: m.get(k) for k in ("id", "kind", "level", "title", "prompt", "schema", "answer")} for m in pend], ensure_ascii=False, indent=2))
        return 0
    for m in pend:
        t = datetime.fromtimestamp(int(m.get("submittedAt") or 0) / 1000, KST).strftime("%m/%d %H:%M")
        print("\n[%s] %s · %s  (%s 제출)" % (m.get("id"), ("영어" if m.get("kind") == "en" else "SQL"), m.get("title"), t))
        print("  문제:", m.get("prompt"))
        if m.get("schema"):
            print("  스키마:\n" + "\n".join("    " + l for l in m["schema"].splitlines()))
        print("  내 답안:\n" + "\n".join("    " + l for l in (m.get("answer") or "").splitlines()))
    print("\n→ `python3 claude_bridge.py tutor` 로 자동 채점하거나, `prompt` 를 복사해 Claude Code에 붙여넣으세요.")
    return 0


def cmd_prompt(args: argparse.Namespace):
    pend = pending_missions()
    if not pend:
        print("채점 대기 답안이 없어요.")
        return 0
    print(grade_prompt(pend))
    return 0


def _apply_grades(grades, pend):
    by_id = {m.get("id"): m for m in pend}
    ok = 0
    now = int(time.time() * 1000)
    for g in grades:
        mid = g.get("id")
        if mid not in by_id:
            print("  ! 알 수 없는 id 건너뜀:", mid)
            continue
        try:
            score = int(g.get("score"))
        except (TypeError, ValueError):
            score = 0
        score = max(0, min(100, score))
        fields = {
            "status": "graded",
            "score": score,
            "feedback": str(g.get("feedback") or "")[:4000],
            "corrected": str(g.get("corrected") or "")[:4000],
            "gradedAt": now,
            "updatedAt": now,
        }
        patch_mission(mid, fields)
        ok += 1
        print("  ✓ %s → %d점 · %s" % (mid, score, (fields["feedback"][:60] + "…") if len(fields["feedback"]) > 60 else fields["feedback"]))
    return ok


def cmd_grade(args: argparse.Namespace):
    docs = list_missions()
    m = next((x for x in docs if x.get("id") == args.id), None)
    if not m:
        print("그 id의 미션이 없어요:", args.id)
        return 1
    now = int(time.time() * 1000)
    fields = {
        "status": "graded",
        "score": max(0, min(100, int(args.score))),
        "feedback": args.feedback,
        "corrected": args.corrected or "",
        "gradedAt": now,
        "updatedAt": now,
    }
    patch_mission(args.id, fields)
    print("✓ %s 채점 저장 → %d점" % (args.id, fields["score"]))
    return 0


def cmd_seed(args: argparse.Namespace):
    docs = list_missions()
    have = {m.get("id") for m in docs}
    n = 0
    for s in SEEDS:
        if s["id"] in have:
            continue
        now = int(time.time() * 1000)
        fields = dict(s)
        fields.update({"source": "seed", "answer": "", "status": "open", "submittedAt": 0,
                       "gradedAt": 0, "feedback": "", "corrected": "", "score": None,
                       "updatedAt": fields.get("createdAt") or now})
        fields.pop("id", None)
        patch_mission(s["id"], fields)
        n += 1
    print("시드 미션 %d개 추가 (이미 있던 건 그대로)" % n)
    return 0


def _make_id():
    return "m" + base36(int(time.time() * 1000)) + "".join(random.choice(string.ascii_lowercase) for _ in range(2))


def base36(n):
    chars = "0123456789abcdefghijklmnopqrstuvwxyz"
    s = ""
    while n:
        n, r = divmod(n, 36)
        s = chars[r] + s
    return s or "0"


def cmd_push(args: argparse.Namespace):
    mid = args.id or _make_id()
    now = int(time.time() * 1000)
    fields = {
        "kind": args.kind, "level": args.level or "", "title": args.title, "prompt": args.prompt,
        "schema": args.schema or "", "hint": args.hint or "", "sample": args.sample or "",
        "source": "claude-code", "answer": "", "status": "open", "submittedAt": 0,
        "gradedAt": 0, "feedback": "", "corrected": "", "score": None,
        "createdAt": now, "updatedAt": now,
    }
    patch_mission(mid, fields)
    print("✓ 새 미션 보냄:", mid, "·", args.kind, "·", args.title)
    return 0


def _wants_new_mission():
    st = get_town_state(["state.claude.reqAt"])
    cl = ((st.get("state") or {}).get("claude") or {})
    req = int(cl.get("reqAt") or 0)
    handled = int(load_state().get("handledReqAt") or 0)
    return req > handled, req


def cmd_new(args: argparse.Namespace):
    print("Claude Code에 새 미션을 요청하는 중…")
    out, err = call_claude(NEW_RULES, timeout=420)
    if out is None:
        print("자동 생성 실패:", err)
        print("\n대신 이 프롬프트를 Claude Code에 붙여넣고, 나온 JSON을 `push` 로 넣어주세요:\n")
        print(NEW_RULES)
        return 1
    arr = parse_json_array(out)
    if not arr:
        print("Claude 응답에서 JSON을 찾지 못했어요. 원문:\n", out[:1200])
        return 1
    n = 0
    for m in arr[:3]:
        if not m.get("kind") or not m.get("prompt"):
            continue
        mid = _make_id()
        now = int(time.time() * 1000)
        fields = {
            "kind": "sql" if str(m.get("kind")).lower() == "sql" else "en",
            "level": str(m.get("level") or "")[:40], "title": str(m.get("title") or "새 미션")[:80],
            "prompt": str(m.get("prompt"))[:2000], "schema": str(m.get("schema") or "")[:1500],
            "hint": str(m.get("hint") or "")[:500], "sample": str(m.get("sample") or "")[:2000],
            "source": "claude-code", "answer": "", "status": "open", "submittedAt": 0,
            "gradedAt": 0, "feedback": "", "corrected": "", "score": None,
            "createdAt": now + n, "updatedAt": now + n,
        }
        patch_mission(mid, fields)
        n += 1
        print("  + 새 미션:", fields["kind"], "·", fields["title"])
    return 0 if n else 1


def cmd_tutor(args: argparse.Namespace):
    # 1) 채점
    pend = pending_missions()
    if pend:
        lim = max(1, int(args.limit))
        batch = pend[:lim]
        print("채점 대기 %d개 중 %d개를 Claude Code에 보냅니다…" % (len(pend), len(batch)))
        out, err = call_claude(grade_prompt(batch), timeout=900)
        if out is None:
            print("자동 채점 실패:", err)
            print("→ `python3 claude_bridge.py prompt` 출력을 Claude Code에 붙여넣고, 결과를 `grade` 로 저장하세요.")
            return 1
        grades = parse_json_array(out)
        if not grades:
            print("Claude 응답에서 JSON을 찾지 못했어요. 원문 앞부분:\n", out[:800])
            return 1
        n = _apply_grades(grades, batch)
        print("채점 저장 %d건 완료" % n)
    else:
        print("채점 대기 답안이 없어요.")

    # 2) 새 문제 요청
    want, req = _wants_new_mission()
    if want or args.new:
        print("새 문제 요청을 처리합니다…")
        cmd_new(args)
        st = load_state()
        st["handledReqAt"] = max(req, int(time.time() * 1000))
        save_state(st)

    print("\n폰에서 용은타운 → 🎓 과외 탭을 열면 결과가 보여요.")
    return 0


def cmd_watch(args: argparse.Namespace):
    print("새 제출을 기다리는 중… (Ctrl+C 로 종료)")
    seen = set()
    try:
        while True:
            try:
                pend = pending_missions()
                for m in pend:
                    if m.get("id") in seen:
                        continue
                    seen.add(m.get("id"))
                    t = datetime.fromtimestamp(int(m.get("submittedAt") or 0) / 1000, KST).strftime("%H:%M")
                    print("\n🔔 새 제출 [%s] %s · %s  (%s)" % (m.get("id"), "영어" if m.get("kind") == "en" else "SQL", m.get("title"), t))
                    print("   → `python3 claude_bridge.py tutor` 로 채점")
            except RuntimeError as e:
                print("연결 오류:", e)
            time.sleep(max(5, int(args.interval)))
    except KeyboardInterrupt:
        print("\n종료했어요.")
    return 0


def cmd_rules(args: argparse.Namespace):
    print("""Firebase 콘솔 → Firestore → 규칙(Rules) 에 붙여넣으세요.
(내 프로젝트 전용 · 앱에 공개된 웹 API 키만으로 접근하는 개인용 설정입니다)

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /town_state/yongeun_main { allow read, write: if true; }
    match /claude_missions/{docId} { allow read, write: if true; }
  }
}
""")
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(description="용은타운 · Claude Bridge")
    sub = ap.add_subparsers(dest="cmd")

    sub.add_parser("doctor", help="연결·대기 현황 점검")
    p = sub.add_parser("list", help="미션 목록")
    p.add_argument("--kind", choices=["en", "sql"])
    p = sub.add_parser("pending", help="채점 대기 답안")
    p.add_argument("--json", action="store_true")
    sub.add_parser("prompt", help="채점 프롬프트 출력")
    p = sub.add_parser("grade", help="채점 결과 직접 저장")
    p.add_argument("--id", required=True)
    p.add_argument("--score", required=True, type=int)
    p.add_argument("--feedback", required=True)
    p.add_argument("--corrected", default="")
    p = sub.add_parser("push", help="새 미션 보내기")
    p.add_argument("--kind", choices=["en", "sql"], required=True)
    p.add_argument("--title", required=True)
    p.add_argument("--prompt", required=True)
    p.add_argument("--level", default="")
    p.add_argument("--schema", default="")
    p.add_argument("--hint", default="")
    p.add_argument("--sample", default="")
    p.add_argument("--id", default="")
    sub.add_parser("seed", help="기본 6개 미션 넣기")
    sub.add_parser("new", help="Claude로 새 미션 생성")
    p = sub.add_parser("tutor", help="대기 답안 자동 채점 (+ 새 문제 요청)")
    p.add_argument("--limit", default=5)
    p.add_argument("--new", action="store_true", help="새 미션도 생성")
    p = sub.add_parser("watch", help="새 제출 감시")
    p.add_argument("--interval", default=20)
    sub.add_parser("rules", help="Firestore 규칙 예시")

    args = ap.parse_args(argv)
    if not args.cmd:
        ap.print_help()
        return 0
    fn = {
        "doctor": cmd_doctor, "list": cmd_list, "pending": cmd_pending, "prompt": cmd_prompt,
        "grade": cmd_grade, "push": cmd_push, "seed": cmd_seed, "new": cmd_new,
        "tutor": cmd_tutor, "watch": cmd_watch, "rules": cmd_rules,
    }[args.cmd]
    return fn(args)


if __name__ == "__main__":
    sys.exit(main())
