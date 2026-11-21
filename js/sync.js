/* ═══════════════════════════════════════════════════════════════
   용은타운 V4 · sync
   ☁️ Firebase Firestore 실시간 자동 동기화
   · localStorage 기록 위에 클라우드 사본을 얹습니다.
   · 프로젝트(yongeun-town) · 경로(town_state/yongeun_main) 그대로 — 기존 기록 유지
   ═══════════════════════════════════════════════════════════════ */
const SYNC = (function () {
  const CFG = {
    apiKey: 'AIzaSyASwhf_PEgFLG6lyx8O9VO6Me-zJz3RPIA',
    authDomain: 'yongeun-town.firebaseapp.com',
    projectId: 'yongeun-town',
    storageBucket: 'yongeun-town.firebasestorage.app',
    messagingSenderId: '454159602450',
    appId: '1:454159602450:web:3945db2ef8ba0415a299cb',
    measurementId: 'G-TF806CN16X'
  };
  const COL = 'town_state', DOCID = 'yongeun_main';
  const SDK = [
    'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js'
  ];
  const DEBOUNCE_MS = 400;              // 로컬 변경을 모아 400ms 뒤 한 번에 올림
  const DID_KEY = 'yongeun-device-id';

  const DEVICE_ID = (function () {
    try {
      let id = localStorage.getItem(DID_KEY);
      if (!id) { id = 'dv' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); localStorage.setItem(DID_KEY, id); }
      return id;
    } catch (e) { return 'dv' + Math.random().toString(36).slice(2, 10); }
  })();

  const badge = document.getElementById('syncBadge');
  const badgeTxt = document.getElementById('syncTxt');
  const LABEL = { boot: '☁️ 연결 중', synced: '☁️ 동기화됨', saving: '☁️ 저장 중…', offline: '☁️ 오프라인' };
  const CLS = { boot: '', synced: ' on', saving: ' busy', offline: ' off' };
  let mode = '';
  function paint(m) {
    if (m === mode) return;
    mode = m;
    if (badge) badge.className = 'sync-badge' + (CLS[m] || '');
    if (badgeTxt) badgeTxt.textContent = LABEL[m] || LABEL.boot;
    const pill = document.getElementById('syncPill');
    if (pill) pill.className = 'tpill sync-pill' + (CLS[m] || '');
    const pillTxt = document.getElementById('syncPillTxt');
    if (pillTxt) pillTxt.textContent = LABEL[m] || LABEL.boot;
  }

  const saveLocal = save;              // 원래의 기기 저장
  let db = null, docRef = null, booting = false;
  let applying = false, pending = false, inFlight = false, again = false;
  let debT = null;

  /* 기록의 "양" — 아직 시각 표시가 없는 첫 동기화에서 어느 쪽을 남길지 고를 때만 씁니다. */
  function weight(s) {
    if (!s || typeof s !== 'object') return 0;
    let w = Number(s.exp) || 0;
    w += (Array.isArray(s.money) ? s.money.length : 0) * 8;
    w += (Array.isArray(s.log) ? s.log.length : 0) * 2;
    w += (Array.isArray(s.exec) ? s.exec.length : 0) * 1;
    w += (Array.isArray(s.questArchive) ? s.questArchive.length : 0) * 3;
    w += (Array.isArray(s.skills) ? s.skills.length : 0) * 3;
    w += (Array.isArray(s.tracks) ? s.tracks.length : 0) * 3;
    w += (s.debt && Array.isArray(s.debt.log) ? s.debt.log.length : 0) * 10;
    w += (s.badges && typeof s.badges === 'object' ? Object.keys(s.badges).length : 0) * 4;
    w += (Array.isArray(s.analyticsLogs) ? s.analyticsLogs.length : 0) * 0.5;
    return w;
  }

  function queue() {
    if (applying) return;
    pending = true;
    if (!db) return;                   // SDK가 아직이면 첫 스냅샷에서 올립니다
    clearTimeout(debT);
    debT = setTimeout(flush, DEBOUNCE_MS);
    paint('saving');
  }

  function flush() {
    clearTimeout(debT); debT = null;
    if (!db || applying || !pending) return;
    if (inFlight) { again = true; return; }
    pending = false;
    let payload;
    try { payload = JSON.parse(JSON.stringify(S)); } catch (e) { return; }
    const stamp = Date.now();
    payload.updatedAt = stamp;
    payload.lastDeviceId = DEVICE_ID;
    S.updatedAt = stamp; S.lastDeviceId = DEVICE_ID;
    try { saveLocal(); } catch (e) { }      // 이 기기 사본에도 같은 시각을 남깁니다
    inFlight = true;
    paint('saving');
    docRef.set({
      state: payload,
      updatedAt: stamp,
      lastDeviceId: DEVICE_ID,
      updatedAtIso: new Date(stamp).toISOString()
    }, { merge: true }).then(function () {
      inFlight = false;
      if (again || pending) { again = false; queue(); } else paint('synced');
    }).catch(function (err) {
      inFlight = false;
      if (again) { again = false; queue(); }
      console.warn('[용은타운] 클라우드 저장 실패 — 이 기기에만 저장합니다.', (err && err.code) || err);
      paint('offline');
    });
  }

  /* 다른 기기 기록을 이 화면에 통째로 갈아끼웁니다. */
  function applyRemote(remote) {
    if (!remote || typeof remote !== 'object') return;
    applying = true;
    clearTimeout(debT); debT = null; pending = false; again = false;
    try {
      const runningHere = !!(typeof FOCUS !== 'undefined' && FOCUS && FOCUS.running);
      const remoteRunning = !!(remote.timer && remote.timer.running);
      try { localStorage.setItem(KEY, JSON.stringify(remote)); } catch (e) { }
      const next = loadState();
      next.updatedAt = Number(remote.updatedAt) || 0;
      next.lastDeviceId = remote.lastDeviceId || '';
      S = next;
      renderAll();
      if (!runningHere && !remoteRunning) { try { restoreFocus(); } catch (e) { } }
      try { saveLocal(); } catch (e) { }
      toast('☁️ 다른 기기의 기록을 불러왔어요');
    } catch (e) {
      console.warn('[용은타운] 다른 기기 기록을 적용하지 못했어요.', e);
    } finally {
      applying = false;
    }
  }

  function handleSnapshot(snap) {
    if (applying) return;
    if (!snap.exists) {                 // 아직 문서가 없음 → 이 기기 기록을 최초 1회 올립니다
      pending = true; flush();
      return;
    }
    const d = snap.data() || {};
    const remote = (d.state && typeof d.state === 'object') ? d.state : null;
    const remoteDev = d.lastDeviceId || (remote && remote.lastDeviceId) || '';
    const remoteStamp = Math.max(Number(d.updatedAt) || 0, remote ? (Number(remote.updatedAt) || 0) : 0);
    if (remoteDev === DEVICE_ID) { paint('synced'); return; }   // 방금 내가 올린 스냅샷
    if (!remote) { pending = true; flush(); return; }
    /* ── 기록 보호 장치 (V4) ──────────────────────────────────
       · 빈 기기(새 폰·시크릿 창)가 기록이 있는 클라우드를 덮어쓰지 않게,
       · 반대로 클라우드가 비어 있으면 이 기기의 기록을 다시 올립니다. */
    const localW = weight(S), remoteW = weight(remote);
    if (localW < 3 && remoteW > localW + 10) { applyRemote(remote); paint('synced'); return; }
    if (remoteW < 3 && localW > 20) { pending = true; flush(); return; }
    const localStamp = Number(S.updatedAt) || 0;
    if (!localStamp) {
      /* 이 기기에 시각이 없는 첫 동기화: 기록이 더 많은 쪽을 남깁니다(빈 기기로 덮어쓰지 않게). */
      if (weight(S) >= weight(remote)) { pending = true; flush(); } else { applyRemote(remote); paint('synced'); }
      return;
    }
    if (remoteStamp > localStamp) { applyRemote(remote); paint('synced'); return; }
    if (localStamp > remoteStamp) { pending = true; flush(); return; }
    paint('synced');
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      const s = document.createElement('script');
      s.src = src; s.async = true; s.crossOrigin = 'anonymous';
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('SDK load failed')); };
      document.head.appendChild(s);
    });
  }

  async function boot() {
    if (booting || db) return;
    booting = true;
    paint(navigator.onLine === false ? 'offline' : 'boot');
    if (navigator.onLine === false) { booting = false; return; }   // 다시 연결되면 online 이벤트에서 재시도
    try {
      if (!window.firebase) { for (let i = 0; i < SDK.length; i++) await loadScript(SDK[i]); }
      if (!window.firebase || !window.firebase.firestore) throw new Error('firebase sdk unavailable');
      if (!window.firebase.apps.length) window.firebase.initializeApp(CFG);
      db = window.firebase.firestore();
      docRef = db.collection(COL).doc(DOCID);
      docRef.onSnapshot(function (snap) { handleSnapshot(snap); }, function (err) {
        console.warn('[용은타운] 동기화 구독 오류 — 이 기기에만 저장합니다.', (err && err.code) || err);
        paint('offline');
      });
      if (pending) queue();
    } catch (e) {
      console.warn('[용은타운] 클라우드 동기화를 시작하지 못했어요. 기록은 이 기기에 저장됩니다.', e);
      paint('offline');
    } finally { booting = false; }
  }

  /* 이제부터 모든 저장은 기기 저장 + (디바운스 후) 클라우드 업로드 */
  save = function () {
    saveLocal();
    queue();
  };

  window.addEventListener('online', function () { if (!db) boot(); else if (pending) queue(); });
  window.addEventListener('offline', function () { paint('offline'); });
  window.addEventListener('pagehide', function () { if (pending) { try { flush(); } catch (e) { } } });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden' && pending) { try { flush(); } catch (e) { } }
  });
  setTimeout(function () { if (mode === 'boot') paint('offline'); }, 12000);  // 12초 안에 응답이 없으면 오프라인 표시

  boot();

  return {
    deviceId: DEVICE_ID,
    status: function () { return mode; },
    device: function () { return DEVICE_ID; },
    boot: boot,
    flush: flush,
    pending: function () { return pending; },
    applyRemote: applyRemote
  };
})();
window.YONG_SYNC = SYNC;
