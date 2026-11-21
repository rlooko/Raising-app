/* ═══════════════════════════════════════════════════════════════════
   용은타운 3D — 캔디·토이 파스텔 마을 (릴스 스타일)
   · 저장/기능은 그대로 두고 "마을 보기"만 3D로 그립니다.
   · 건물·타일·독을 누르면 카메라가 스르륵 이동하고 캐릭터가 걸어갑니다.
   · CDN·WebGL을 못 쓰면 조용히 2D SVG 마을로 돌아갑니다.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  const run = async () => {
    let THREE, OrbitControls, RoundedBoxGeometry;
    try {
      THREE = await import('three');
      ({ OrbitControls } = await import('three/addons/controls/OrbitControls.js'));
      ({ RoundedBoxGeometry } = await import('three/addons/geometries/RoundedBoxGeometry.js'));
    } catch (e) {
      console.warn('[용은타운] 3D 라이브러리를 불러오지 못해 2D 마을로 표시합니다.', e);
      return;
    }
    try {
      build(THREE, OrbitControls, RoundedBoxGeometry);
    } catch (e) {
      console.warn('[용은타운] 3D 마을 초기화에 실패해 2D 마을로 표시합니다.', e);
    }
  };

  function build(THREE, OrbitControls, RoundedBoxGeometry) {
    const townEl = document.getElementById('town');
    const canvas = document.getElementById('town3d');
    if (!townEl || !canvas) return;

    /* ── 좌표: 2D 마을 좌표(360×430)를 3D 평면으로 ─────────────── */
    const CX = 192, CY = 298, SC = 0.08;
    const toW = (x, y) => ({ x: (x - CX) * SC, z: (y - CY) * SC });

    /* ── 렌더러 ───────────────────────────────────────────────── */
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) { return; }
    if (!renderer || !renderer.getContext()) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearAlpha(0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 400);
    const homePos = new THREE.Vector3(26, 43, 40);
    const homeTarget = new THREE.Vector3(0, 1.0, 0.3);
    camera.position.copy(homePos);

    const controls = new OrbitControls(camera, canvas);
    controls.target.copy(homeTarget);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 0.7;
    controls.minDistance = 13;
    controls.maxDistance = 110;
    controls.minPolarAngle = 0.4;
    controls.maxPolarAngle = 1.22;
    controls.update();

    /* ── 캔디 팔레트 ─────────────────────────────────────────── */
    const C = {
      grass: '#B7E7A1', grass2: '#A4DD90', grass3: '#C9F0B7', grass4: '#91D37D',
      soil: '#FFE0EC', soil2: '#F7CBDD', sand: '#FFF1E4',
      cream: '#FFF6EA', cream2: '#FFEBD8', white: '#FFFDF8',
      pink: '#FFAFCB', pink2: '#F98FB4', pinkSoft: '#FFD9E6',
      mint: '#8EE0C0', mint2: '#6FCFAC',
      lav: '#D9C9FA', lav2: '#BCA6F0',
      sky: '#BFE6FF', gold: '#FFC96B', gold2: '#EBA63C',
      wood: '#F0CFAE', wood2: '#DDB18C', rose: '#FF7FA8',
      choco: '#C98A55',
      tile: ['#FFC2D8', '#B9DCFF', '#FFE8A8', '#D9C6FA', '#B4F0D4', '#FFD7B8']
    };

    const matCache = new Map();
    function mat(color, opts) {
      if (!opts && matCache.has(color)) return matCache.get(color);
      const m = new THREE.MeshStandardMaterial(Object.assign({ color: new THREE.Color(color), roughness: 0.66, metalness: 0.0 }, opts || {}));
      if (!opts) matCache.set(color, m);
      return m;
    }
    const jelly = (color) => new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.38, metalness: 0.02, emissive: new THREE.Color(color), emissiveIntensity: 0.045 });
    const gBox = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r === undefined ? 0.1 : r, Math.min(w, h, d) / 2.05));
    const gCyl = (rt, rb, h, seg) => new THREE.CylinderGeometry(rt, rb, h, seg || 20, 1);
    const gSph = (r, seg) => new THREE.SphereGeometry(r, seg || 20, Math.max(12, Math.round((seg || 20) * 0.72)));
    const gCone = (r, h, seg) => new THREE.ConeGeometry(r, h, seg || 20, 1);
    const gCap = (r, len, seg) => new THREE.CapsuleGeometry(r, len, 6, seg || 14);
    function add(parent, geo, material, x, y, z) {
      const m = new THREE.Mesh(geo, material);
      m.position.set(x || 0, y || 0, z || 0);
      parent.add(m);
      return m;
    }
    function solid(m) { m.castShadow = true; m.receiveShadow = true; return m; }

    /* ── 조명 ────────────────────────────────────────────────── */
    const hemi = new THREE.HemisphereLight(0xEAF7FF, 0xDFF3D2, 1.05);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xFFFAEE, 2.5);
    key.position.set(24, 36, 22);
    key.castShadow = true;
    key.shadow.mapSize.set(1536, 1536);
    key.shadow.camera.left = -26; key.shadow.camera.right = 26;
    key.shadow.camera.top = 26; key.shadow.camera.bottom = -26;
    key.shadow.camera.near = 1; key.shadow.camera.far = 130;
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.05;
    key.shadow.radius = 3.4;
    scene.add(key);
    scene.add(key.target);

    const fill = new THREE.DirectionalLight(0xDCEBFF, 0.62);
    fill.position.set(-24, 17, 16);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xFFE2CF, 0.45);
    rim.position.set(6, 12, 32);
    scene.add(rim);

    /* ── 시간대 ──────────────────────────────────────────────── */
    const PHASE = {
      day: { hemiSky: 0xEAF7FF, hemiGround: 0xDFF3D2, hemiI: 0.86, keyC: 0xFFFAEE, keyI: 1.62, keyPos: [22, 32, 18], fillC: 0xDCEBFF, fillI: 0.34, rimC: 0xFFF1E2, rimI: 0.4, win: 0, lamp: 0, star: 0, cloud: 1 },
      sunset: { hemiSky: 0xFFE6D6, hemiGround: 0xF9E2CE, hemiI: 0.66, keyC: 0xFFD2AE, keyI: 1.12, keyPos: [28, 14, 20], fillC: 0xC4CDF6, fillI: 0.48, rimC: 0xFFBB90, rimI: 0.32, win: 0.95, lamp: 0.75, star: 0.12, cloud: 0.9 },
      night: { hemiSky: 0xC2C6F6, hemiGround: 0x55557A, hemiI: 0.72, keyC: 0xD8E0FF, keyI: 1.05, keyPos: [17, 25, -14], fillC: 0xA8A8EC, fillI: 0.44, rimC: 0xCBD6FF, rimI: 0.3, win: 3.6, lamp: 3.3, star: 1, cloud: 0.12 }
    };
    let phT = PHASE.day, phC = Object.assign({}, PHASE.day);
    const winMats = [], lampMats = [], glowSprites = [], cloudMats = [];

    /* ── 섬 ──────────────────────────────────────────────────── */
    const island = new THREE.Group();
    scene.add(island);
    const R = 19;
    const SQ = 0.74;

    const topM = solid(add(island, gCyl(R, R, 1.0, 96), mat(C.grass), 0, -0.5, 0));
    topM.castShadow = false; topM.scale.z = SQ;
    add(island, gCyl(R, R * 0.97, 1.5, 96), mat(C.soil), 0, -1.65, 0).scale.z = SQ;
    add(island, gCyl(R * 0.97, R * 0.74, 2.1, 64), mat(C.soil2), 0, -3.4, 0).scale.z = SQ;
    add(island, gCyl(R * 0.74, R * 0.34, 1.5, 48), mat(C.soil2), 0, -5.1, 0).scale.z = SQ;

    const rimGeo = new THREE.TorusGeometry(R - 0.06, 0.4, 10, 96);
    rimGeo.rotateX(Math.PI / 2);
    const rimT = new THREE.Mesh(rimGeo, mat(C.grass3));
    rimT.position.y = -0.05; rimT.scale.z = SQ; island.add(rimT);

    // 잔디 언덕 — 동글동글
    [[-8.5, -3.2, 4.6, 0.55, C.grass2], [7.5, -2.0, 4.2, 0.5, C.grass2], [-2.4, 7.2, 5.2, 0.45, C.grass3],
     [10.4, -8.0, 3.6, 0.45, C.grass2], [-12.6, 6.4, 3.2, 0.4, C.grass3]].forEach(function (h) {
      const m = add(island, gSph(h[2], 22), mat(h[4]), h[0], -h[2] * 0.72 + h[3], h[1]);
      m.scale.set(1, 0.34, 1);
      m.position.z *= 0.78;
      m.receiveShadow = true;
    });

    /* ── 길 (파스텔 보도블록) ────────────────────────────────── */
    const ringPts = TOWN_PATH.map(function (p) { return toW(p[0], p[1]); });
    const ringSegs = [];
    let ringLen = 0;
    for (let i = 0; i < ringPts.length; i++) {
      const a = ringPts[i], b = ringPts[(i + 1) % ringPts.length];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      ringSegs.push({ a: a, b: b, len: len, start: ringLen });
      ringLen += len;
    }
    function ringAt(d) {
      d = ((d % ringLen) + ringLen) % ringLen;
      for (let i = 0; i < ringSegs.length; i++) {
        const s = ringSegs[i];
        if (d <= s.start + s.len) {
          const k = s.len ? (d - s.start) / s.len : 0;
          return { x: s.a.x + (s.b.x - s.a.x) * k, z: s.a.z + (s.b.z - s.a.z) * k };
        }
      }
      return { x: ringPts[0].x, z: ringPts[0].z };
    }
    function ringDir(d) {
      const p1 = ringAt(d + 0.45), p0 = ringAt(d - 0.45);
      let dx = p1.x - p0.x, dz = p1.z - p0.z;
      const l = Math.hypot(dx, dz) || 1;
      return { x: dx / l, z: dz / l };
    }
    function distToPath(x, z) {
      let best = 1e9;
      for (let i = 0; i < ringSegs.length; i++) {
        const s = ringSegs[i];
        const vx = s.b.x - s.a.x, vz = s.b.z - s.a.z;
        const t = Math.max(0, Math.min(1, ((x - s.a.x) * vx + (z - s.a.z) * vz) / (vx * vx + vz * vz || 1)));
        const px = s.a.x + vx * t, pz = s.a.z + vz * t;
        const d = Math.hypot(x - px, z - pz);
        if (d < best) best = d;
      }
      return best;
    }
    function nearestRingT(x, z) {
      let best = 0, bd = 1e9;
      for (let i = 0; i < 300; i++) {
        const t = i / 300, p = ringAt(t * ringLen);
        const d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
        if (d < bd) { bd = d; best = t; }
      }
      return best;
    }

    // 보도블록 2줄 — 알록달록 파스텔
    (function tiles() {
      const step = 1.16, size = 1.1, rows = [-0.6, 0.6];
      const n = Math.ceil(ringLen / step) * rows.length + rows.length;
      const geo = gBox(size, 0.28, size, 0.1);
      const m = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.0 });
      const inst = new THREE.InstancedMesh(geo, m, n);
      inst.receiveShadow = true;
      const d3 = new THREE.Object3D();
      const col = new THREE.Color();
      let i = 0;
      for (let d = 0; d < ringLen && i < n; d += step) {
        const p = ringAt(d);
        const dir = ringDir(d);
        const nx = dir.z, nz = -dir.x;
        const ang = Math.atan2(dir.x, dir.z);
        for (let r = 0; r < rows.length; r++) {
          d3.position.set(p.x + nx * rows[r], 0.14, p.z + nz * rows[r]);
          d3.rotation.set(0, ang + (r ? 0.02 : -0.02), 0);
          d3.updateMatrix();
          inst.setMatrixAt(i, d3.matrix);
          col.set(C.tile[(i * 3 + r * 5) % C.tile.length]);
          inst.setColorAt(i, col);
          i++;
        }
      }
      inst.count = i;
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      island.add(inst);
    })();

    /* ── 건물 자리 ───────────────────────────────────────────── */
    const POS = {
      castle: toW(84, 198),
      house: toW(296, 208),
      tower: toW(214, 298),
      bank: toW(40, 344),
      shop: toW(344, 350)
    };
    const faceIn = (p, extra) => Math.atan2(-p.x, -p.z) + (extra || 0);

    function makeWindow(w, h, d, tint) {
      const m = new THREE.MeshStandardMaterial({
        color: new THREE.Color(tint || '#FFF4DC'), emissive: new THREE.Color('#FFC46B'),
        emissiveIntensity: 0, roughness: 0.42, metalness: 0.0
      });
      winMats.push(m);
      return new RoundedBoxGeometry(w, h, d, 3, Math.min(w, h, d) / 2.2);
    }
    function prism(w, h, d, material, bevel) {
      const s = new THREE.Shape();
      s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.lineTo(-w / 2, 0);
      const geo = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelSize: bevel || 0.05, bevelThickness: bevel || 0.05, bevelSegments: 2, steps: 1 });
      geo.translate(0, 0, -d / 2);
      return new THREE.Mesh(geo, material);
    }
    function heartGeo(k) {
      const s = new THREE.Shape();
      s.moveTo(0, -k * 0.85);
      s.bezierCurveTo(k * 1.35, k * 0.15, k * 0.85, k * 1.25, 0, k * 0.55);
      s.bezierCurveTo(-k * 0.85, k * 1.25, -k * 1.35, k * 0.15, 0, -k * 0.85);
      const g = new THREE.ExtrudeGeometry(s, { depth: k * 0.32, bevelEnabled: true, bevelSize: k * 0.08, bevelThickness: k * 0.08, bevelSegments: 2, steps: 1 });
      g.translate(0, 0, -k * 0.16);
      return g;
    }
    function glowTex() {
      if (glowTex._t) return glowTex._t;
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const x = c.getContext('2d');
      const grd = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, 'rgba(255,255,255,1)');
      grd.addColorStop(0.4, 'rgba(255,226,160,0.55)');
      grd.addColorStop(1, 'rgba(255,210,120,0)');
      x.fillStyle = grd; x.fillRect(0, 0, 64, 64);
      glowTex._t = new THREE.CanvasTexture(c);
      return glowTex._t;
    }

    /* ── 1. 데이터 성 — 와플 캐슬 ────────────────────────────── */
    function buildCastle() {
      const g = new THREE.Group();
      g.position.set(POS.castle.x, 0, POS.castle.z);
      g.rotation.y = faceIn(POS.castle, 0.16);

      const wall = mat('#FFF0E6'), wall2 = mat('#FFE2EC'), roof = mat(C.pink), roof2 = mat(C.pink2);
      const choco = mat(C.choco);

      // 분홍 원형 광장
      solid(add(g, gCyl(5.5, 5.7, 0.22, 56), mat('#FFC9DE'), 0, 0.11, 0));
      add(g, gCyl(4.9, 4.9, 0.1, 56), mat('#FFDCEB'), 0, 0.24, 0);
      const plazaRing = new THREE.Mesh(new THREE.TorusGeometry(5.26, 0.11, 8, 64), mat('#FFB4D0'));
      plazaRing.rotation.x = Math.PI / 2; plazaRing.position.y = 0.24; g.add(plazaRing);
      // 광장 위 사탕 스프링클
      for (let i = 0; i < 30; i++) {
        const a = Math.random() * Math.PI * 2, rr = 2.5 + Math.random() * 2.5;
        const sp = add(g, gCap(0.042, 0.09, 6), mat(C.tile[i % C.tile.length]), Math.cos(a) * rr, 0.26, Math.sin(a) * rr);
        sp.rotation.set(Math.PI / 2, Math.random() * 3, Math.random() * 3);
      }
      // 광장을 지키는 미니 사탕지팡이
      [[-4.4, 1.6, 0.34], [4.4, 1.6, -0.34], [-3.6, -3.3, 0.3], [3.6, -3.3, -0.3]].forEach(function (p) {
        const c = candyCane(p[0], p[1], p[2], p[2]);
        c.position.y = 0.22;
        g.add(c);
      });

      // 성 본체
      solid(add(g, gCyl(2.25, 2.45, 1.0, 40), wall2, 0, 0.75, 0));
      solid(add(g, gCyl(2.05, 2.3, 3.0, 40), wall, 0, 2.6, 0));
      const topRim = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.15, 10, 40), wall2);
      topRim.rotation.x = Math.PI / 2; topRim.position.y = 4.16; g.add(topRim);

      // 벽 스프링클 장식
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + 0.2;
        const yy = i % 2 ? 1.7 : 3.3;
        const sp = add(g, gBox(0.2, 0.34, 0.09, 0.05), mat(C.tile[(i * 3) % C.tile.length]), Math.sin(a) * 2.16, yy, Math.cos(a) * 2.16);
        sp.rotation.y = a;
      }

      // 탑 3개 + 솜사탕 지붕
      [[-1.85, 1.7, 0.85], [1.85, 1.7, 0.85], [0, -2.2, 1.0]].forEach(function (t, idx) {
        const tr = t[2];
        solid(add(g, gCyl(tr * 0.78, tr * 0.86, 5.4, 28), wall, t[0], 3.0, t[1]));
        add(g, gCyl(tr * 1.12, tr * 0.94, 0.28, 28), wall2, t[0], 5.72, t[1]);
        solid(add(g, gCone(tr * 1.36, 2.4, 28), idx === 2 ? roof2 : roof, t[0], 7.05, t[1]));
        add(g, gSph(tr * 0.16, 12), mat(idx === 2 ? C.gold : C.white), t[0], 8.34, t[1]);
        // 지붕 스프링클
        for (let s = 0; s < 7; s++) {
          const a = (s / 7) * Math.PI * 2 + idx;
          const rr = tr * 0.72;
          const yy = 6.3 + (s % 3) * 0.28;
          add(g, gBox(0.085, 0.085, 0.085, 0.03), mat(C.tile[(s + idx) % C.tile.length]), t[0] + Math.cos(a) * rr * 0.9, yy, t[1] + Math.sin(a) * rr * 0.9);
        }
      });

      // 정면 와플 원형 장식
      const waffle = new THREE.Group();
      waffle.position.set(0, 3.35, 2.22);
      const disc = add(waffle, gCyl(1.02, 1.02, 0.16, 40), mat('#E8B06B'), 0, 0, 0);
      disc.rotation.x = Math.PI / 2;
      for (let i = -2; i <= 2; i++) {
        add(waffle, gBox(1.86, 0.07, 0.09, 0.03), choco, 0, i * 0.33, 0.08);
        const vb = add(waffle, gBox(0.07, 1.86, 0.09, 0.03), choco, i * 0.33, 0, 0.08);
        vb.scale.y = Math.sqrt(Math.max(0.12, 1 - Math.pow(i / 2.15, 2)));
      }
      const wrim = new THREE.Mesh(new THREE.TorusGeometry(1.03, 0.1, 10, 40), mat('#D89A52'));
      wrim.position.z = 0.08; waffle.add(wrim);
      g.add(waffle);

      // 사탕지팡이 아치 문
      const door = new THREE.Group();
      door.position.set(0, 1.2, 2.4);
      solid(add(door, gBox(1.7, 2.4, 0.28, 0.3), mat('#FF9FC0'), 0, 0, 0));
      add(door, gBox(1.3, 2.1, 0.3, 0.24), mat('#EF6F97'), 0, -0.06, 0.06);
      g.add(door);

      const cane = new THREE.Group();
      cane.position.set(0, 1.1, 2.56);
      const segs = 22;
      for (let i = 0; i < segs; i++) {
        const a = Math.PI * (i / (segs - 1));
        const rr = 1.22;
        const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
        const col = i % 2 ? '#FFFFFF' : '#F4607C';
        const s = add(cane, gSph(0.135, 10), mat(col), px, py + 0.25, 0);
        s.scale.set(1, 1, 0.85);
      }
      // 아치 양쪽 기둥 — 줄무늬
      [-1.22, 1.22].forEach(function (px) {
        for (let i = 0; i < 4; i++) {
          add(cane, gCyl(0.14, 0.14, 0.34, 10), mat(i % 2 ? '#FFFFFF' : '#F4607C'), px, 0.09 + i * 0.34, 0);
        }
      });
      g.add(cane);

      // 창문
      const wg = makeWindow(0.42, 0.62, 0.14);
      [[-1.85, 3.6, 2.44], [1.85, 3.6, 2.44], [-1.85, 1.9, 2.5], [1.85, 1.9, 2.5]].forEach(function (w) {
        add(g, wg, winMats[winMats.length - 1], w[0], w[1], w[2]);
      });
      const wg2 = makeWindow(0.44, 0.5, 0.14);
      add(g, wg2, winMats[winMats.length - 1], 0, 4.9, 1.72);

      // 깃발
      add(g, gCyl(0.045, 0.045, 1.6, 8), mat('#FFFFFF'), 0, 9.1, 0);
      const flagGeo = new THREE.PlaneGeometry(1.3, 0.78, 12, 6);
      const flagMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(C.rose), side: THREE.DoubleSide, roughness: 0.8 });
      const flag = new THREE.Mesh(flagGeo, flagMat);
      flag.position.set(0.68, 9.55, 0);
      g.add(flag);
      const flagBase = flag.geometry.attributes.position.array.slice();

      return { group: g, labelY: 10.4, flag: flag, flagBase: flagBase };
    }

    /* ── 2. 청산 은행 ────────────────────────────────────────── */
    function buildBank() {
      const g = new THREE.Group();
      g.position.set(POS.bank.x, 0, POS.bank.z);
      g.rotation.y = faceIn(POS.bank, -0.28);
      const ivory = mat('#FFF8EC'), ivory2 = mat('#FFEBD6');
      const goldM = new THREE.MeshStandardMaterial({ color: new THREE.Color(C.gold), metalness: 0.5, roughness: 0.28, emissive: new THREE.Color('#7A4E10'), emissiveIntensity: 0.16 });

      solid(add(g, gBox(6.6, 0.3, 4.2, 0.14), ivory2, 0, 0.15, 0));
      solid(add(g, gBox(6.1, 0.28, 3.8, 0.13), ivory, 0, 0.42, 0));
      solid(add(g, gBox(5.6, 2.4, 3.3, 0.16), ivory, 0, 1.76, 0));
      add(g, gBox(6.0, 0.26, 3.5, 0.12), ivory2, 0, 2.98, 0);

      // 기둥 4개 (동글동글)
      [-2.1, -0.7, 0.7, 2.1].forEach(function (x) {
        solid(add(g, gCyl(0.24, 0.27, 2.2, 18), mat(C.white), x, 1.72, 1.62));
        add(g, gBox(0.58, 0.18, 0.58, 0.08), ivory2, x, 0.62, 1.62);
        add(g, gSph(0.3, 12), ivory2, x, 2.86, 1.62).scale.set(1, 0.4, 1);
      });
      const ped = prism(6.2, 1.2, 3.7, ivory2, 0.07);
      ped.position.set(0, 3.1, 0);
      g.add(ped); solid(ped);

      add(g, gBox(4.4, 0.18, 0.4, 0.07), ivory2, 0, 0.09, 2.24);
      add(g, gBox(3.9, 0.18, 0.32, 0.07), ivory2, 0, 0.27, 2.06);

      add(g, gBox(1.5, 1.9, 0.24, 0.22), ivory2, 0, 1.32, 1.68);
      add(g, gBox(1.15, 1.6, 0.3, 0.18), mat('#FFC7A0'), 0, 1.22, 1.74);
      add(g, makeWindow(0.95, 0.6, 0.12), winMats[winMats.length - 1], 0, 2.4, 1.7);

      // 금화
      const coin = new THREE.Group();
      const disc = add(coin, gCyl(0.92, 0.92, 0.16, 40), goldM, 0, 0, 0);
      disc.rotation.x = Math.PI / 2;
      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.08, 10, 40), goldM);
      coin.add(ring1);
      const inner = add(coin, gCyl(0.55, 0.55, 0.2, 32), goldM, 0, 0, 0);
      inner.rotation.x = Math.PI / 2;
      coin.position.set(0, 5.7, 0);
      g.add(coin);

      // 차용증 상환 게이지
      add(g, gBox(5.0, 0.2, 0.2, 0.09), mat('#F0DCC4'), 0, 0.33, 2.02);
      const gaugePivot = new THREE.Group();
      gaugePivot.position.set(-2.5, 0.33, 1.94);
      g.add(gaugePivot);
      const barGeo = gBox(5.0, 0.2, 0.24, 0.09);
      barGeo.translate(2.5, 0, 0);
      const gaugeBar = add(gaugePivot, barGeo, goldM, 0, 0, 0);
      gaugeBar.scale.x = 0.001;

      [-2.7, 2.7].forEach(function (x) {
        add(g, gCyl(0.28, 0.2, 0.46, 14), goldM, x, 3.34, 1.4);
        add(g, gSph(0.19, 12), goldM, x, 3.68, 1.4);
      });

      return { group: g, labelY: 8.2, coin: coin, gaugeBar: gaugeBar };
    }

    /* ── 3. 아렐로 작업실 ────────────────────────────────────── */
    function buildWorkshop() {
      const g = new THREE.Group();
      g.position.set(POS.shop.x, 0, POS.shop.z);
      g.rotation.y = faceIn(POS.shop, 0.22);
      const cream = mat('#FFF4E2'), creamB = mat('#FFE8CE'), roofM = mat(C.mint);

      solid(add(g, gBox(4.4, 0.26, 3.6, 0.1), mat(C.sand), 0, 0.13, 0));
      solid(add(g, gBox(4.1, 2.0, 3.2, 0.16), cream, 0, 1.1, 0));
      const roof = prism(4.5, 1.28, 3.5, roofM, 0.07);
      roof.position.set(0, 2.1, 0);
      g.add(roof); solid(roof);
      add(g, gBox(4.3, 0.13, 0.2, 0.07), mat(C.mint2), 0, 3.34, 0);

      // 굴뚝
      solid(add(g, gBox(0.56, 1.2, 0.56, 0.12), creamB, -1.05, 2.85, -0.75));
      add(g, gBox(0.7, 0.18, 0.7, 0.08), mat(C.pink2), -1.05, 3.52, -0.75);

      // 문 · 창
      add(g, gBox(1.0, 1.55, 0.2, 0.18), mat(C.white), 1.05, 0.85, 1.62);
      add(g, gBox(0.78, 1.36, 0.24, 0.14), mat('#FFB49C'), 1.05, 0.78, 1.66);
      const wg = makeWindow(1.5, 1.0, 0.14);
      add(g, wg, winMats[winMats.length - 1], -0.55, 1.15, 1.62);
      add(g, gBox(1.74, 1.22, 0.1, 0.07), mat(C.white), -0.55, 1.15, 1.56);
      add(g, gBox(0.07, 1.02, 0.12, 0.03), mat(C.white), -0.55, 1.15, 1.63);
      add(g, gBox(1.52, 0.07, 0.12, 0.03), mat(C.white), -0.55, 1.15, 1.63);

      // 차양 (줄무늬)
      for (let i = 0; i < 6; i++) {
        const awn = add(g, gBox(0.5, 0.08, 0.74, 0.04), mat(i % 2 ? C.white : C.pinkSoft), -1.6 + i * 0.52, 1.98, 1.86);
        awn.rotation.x = -0.42;
      }

      // 간판 (커피잔)
      add(g, gBox(0.95, 0.66, 0.12, 0.08), mat(C.white), -1.35, 2.36, 1.55);
      add(g, gCyl(0.16, 0.12, 0.2, 14), mat('#FFA98C'), -1.35, 2.32, 1.63);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.032, 6, 12), mat('#FFA98C'));
      handle.position.set(-1.18, 2.32, 1.63); g.add(handle);

      // 야외 작업 테이블 · 노트북 · 의자
      const desk = new THREE.Group();
      desk.position.set(1.35, 0, 2.35);
      solid(add(desk, gBox(1.5, 0.09, 0.72, 0.05), mat(C.wood), 0, 0.62, 0));
      [[-0.62, 0.28], [0.62, 0.28], [-0.62, -0.28], [0.62, -0.28]].forEach(function (l) {
        add(desk, gCyl(0.04, 0.045, 0.6, 8), mat(C.wood2), l[0], 0.3, l[1]);
      });
      // 노트북
      const lap = new THREE.Group();
      add(lap, gBox(0.62, 0.05, 0.42, 0.03), mat('#E7E2F4'), 0, 0, 0);
      const lid = add(lap, gBox(0.62, 0.4, 0.04, 0.03), mat('#E7E2F4'), 0, 0.2, -0.19);
      lid.rotation.x = 0.22;
      const scr = add(lap, gBox(0.54, 0.32, 0.02, 0.02), mat('#8FD8FF', { emissive: new THREE.Color('#63C4F0'), emissiveIntensity: 0.55 }), 0, 0.2, -0.16);
      scr.rotation.x = 0.22;
      lap.position.set(-0.12, 0.68, 0);
      desk.add(lap);
      // 커피잔
      add(desk, gCyl(0.09, 0.075, 0.16, 12), mat(C.white), 0.46, 0.75, 0.16);
      add(desk, gCyl(0.075, 0.065, 0.03, 12), mat('#B57C4C'), 0.46, 0.82, 0.16);
      // 의자 2
      [[0, 0.62, 0], [-0.02, -0.66, Math.PI]].forEach(function (ch) {
        const cg = new THREE.Group();
        add(cg, gCyl(0.26, 0.23, 0.08, 14), mat('#FFD0A8'), 0, 0.44, 0);
        add(cg, gBox(0.4, 0.4, 0.08, 0.06), mat('#FFD0A8'), 0, 0.64, -0.2);
        [[-0.16, 0.13], [0.16, 0.13], [-0.16, -0.13], [0.16, -0.13]].forEach(function (l) {
          add(cg, gCyl(0.025, 0.025, 0.4, 6), mat(C.wood2), l[0], 0.2, l[1]);
        });
        cg.position.set(ch[0], 0, ch[1]);
        cg.rotation.y = ch[2];
        desk.add(cg);
      });
      g.add(desk);

      // 화분
      [[-2.0, 2.15], [-2.0, 1.5]].forEach(function (p) {
        add(g, gCyl(0.2, 0.15, 0.34, 12), mat('#FFB9A4'), p[0], 0.17, p[1]);
        add(g, gSph(0.24, 12), mat(C.grass4), p[0], 0.43, p[1]).scale.set(1, 1.15, 1);
      });

      // 굴뚝 솜사탕 연기
      const smoke = [];
      for (let i = 0; i < 5; i++) {
        const sm = new THREE.Mesh(gSph(0.24, 12), new THREE.MeshStandardMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.55, roughness: 0.95 }));
        sm.position.set(-1.05, 3.6, -0.75);
        g.add(sm);
        smoke.push(sm);
      }
      return { group: g, labelY: 7.2, smoke: smoke };
    }

    /* ── 4. 타임어택 시계탑 ──────────────────────────────────── */
    function buildTower() {
      const g = new THREE.Group();
      g.position.set(POS.tower.x, 0, POS.tower.z);
      g.rotation.y = 0.16;
      const stone = mat('#FFF6EC'), stone2 = mat('#FFE9DA');

      solid(add(g, gCyl(3.3, 3.6, 0.42, 44), mat(C.lav), 0, 0.21, 0));
      add(g, gCyl(2.6, 2.6, 0.12, 44), mat('#FDF8FF'), 0, 0.46, 0);
      const ringD = new THREE.Mesh(new THREE.TorusGeometry(2.68, 0.09, 8, 54), mat('#EADDFB'));
      ringD.rotation.x = Math.PI / 2; ringD.position.y = 0.5; g.add(ringD);

      // 기둥 몸통
      solid(add(g, gCyl(1.05, 1.35, 4.5, 28), stone, 0, 2.75, 0));
      [0.9, 2.9, 4.6].forEach(function (y, i) {
        const t = new THREE.Mesh(new THREE.TorusGeometry(i === 2 ? 1.1 : 1.3 - i * 0.07, 0.09, 8, 32), stone2);
        t.rotation.x = Math.PI / 2; t.position.y = y; g.add(t);
      });
      // 시계 몸통
      solid(add(g, gCyl(1.72, 1.72, 1.85, 36), stone2, 0, 5.65, 0));
      add(g, gCyl(1.84, 1.84, 0.15, 36), stone, 0, 6.56, 0);
      add(g, gCyl(1.84, 1.84, 0.15, 36), stone, 0, 4.74, 0);
      // 지붕
      solid(add(g, gCone(2.05, 1.8, 30), mat(C.lav2), 0, 7.55, 0));
      add(g, gSph(0.19, 14), mat(C.gold), 0, 8.56, 0);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        add(g, gSph(0.08, 8), mat(C.tile[i % C.tile.length]), Math.cos(a) * 1.1, 7.4 + (i % 3) * 0.2, Math.sin(a) * 1.1);
      }

      // 시계판 4면
      const hands = [];
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2;
        const face = new THREE.Group();
        face.position.set(Math.sin(ang) * 1.68, 5.65, Math.cos(ang) * 1.68);
        face.rotation.y = ang;
        const dial = new THREE.Mesh(new THREE.CircleGeometry(0.82, 32), mat('#FFFDF6'));
        dial.position.z = 0.055; face.add(dial);
        const rimD = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.075, 8, 32), mat(C.gold));
        rimD.position.z = 0.055; face.add(rimD);
        for (let k = 0; k < 12; k++) {
          const aa = (k / 12) * Math.PI * 2;
          const tick = new THREE.Mesh(gBox(0.045, 0.12, 0.03, 0.012), mat(C.gold2));
          tick.position.set(Math.sin(aa) * 0.68, Math.cos(aa) * 0.68, 0.08); tick.rotation.z = -aa; face.add(tick);
        }
        const hour = new THREE.Group();
        const hourBar = new THREE.Mesh(gBox(0.08, 0.38, 0.05, 0.02), mat('#7A6890'));
        hourBar.position.y = 0.19; hour.add(hourBar); hour.position.z = 0.09;
        const min = new THREE.Group();
        const minBar = new THREE.Mesh(gBox(0.06, 0.56, 0.05, 0.02), mat('#9A87AC'));
        minBar.position.y = 0.28; min.add(minBar); min.position.z = 0.1;
        face.add(hour); face.add(min);
        const dot = new THREE.Mesh(gSph(0.07, 10), mat(C.pink2));
        dot.position.z = 0.11; face.add(dot);
        g.add(face);
        hands.push({ hour: hour, min: min });
      }

      // 등불 (타임어택 중 반짝)
      const lampMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#FFF3D2'), emissive: new THREE.Color('#FFC96B'), emissiveIntensity: 0, transparent: true, opacity: 0.95, roughness: 0.4 });
      lampMats.push(lampMat);
      const lamp = add(g, gSph(0.33, 16), lampMat, 0, 8.66, 0);
      const beacon = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.1, 8, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFE6A8'), transparent: true, opacity: 0 }));
      beacon.rotation.x = Math.PI / 2; beacon.position.y = 8.66; g.add(beacon);

      // 창 · 문
      const wg = makeWindow(0.3, 0.46, 0.12);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.2;
        const yy = i % 2 ? 2.0 : 3.7;
        const w = add(g, wg, winMats[winMats.length - 1], Math.sin(a) * 1.2, yy, Math.cos(a) * 1.2);
        w.rotation.y = a;
        add(g, gBox(0.42, 0.58, 0.08, 0.05), mat(C.white), Math.sin(a) * 1.14, yy, Math.cos(a) * 1.14).rotation.y = a;
      }
      add(g, gBox(1.1, 1.7, 0.26, 0.2), mat(C.white), 0, 1.0, 1.26);
      add(g, gBox(0.84, 1.42, 0.28, 0.16), mat('#FFC9A8'), 0, 0.94, 1.29);
      add(g, gBox(1.45, 0.16, 0.48, 0.08), mat(C.sand), 0, 0.1, 1.42);

      return { group: g, labelY: 9.8, hands: hands, beacon: beacon, lamp: lamp };
    }

    /* ── 5. 수은집 ───────────────────────────────────────────── */
    function buildHouse() {
      const g = new THREE.Group();
      g.position.set(POS.house.x, 0, POS.house.z);
      g.rotation.y = faceIn(POS.house, -0.18);
      const body = mat('#FFE9F1'), body2 = mat('#FFD6E3'), roofM = mat('#F79CC0');

      solid(add(g, gCyl(3.6, 3.9, 0.32, 40), mat(C.grass3), 0, 0.11, 0));
      solid(add(g, gBox(3.4, 1.9, 2.9, 0.18), body, 0, 1.24, 0));
      const roof = prism(4.1, 1.4, 3.3, roofM, 0.07);
      roof.position.set(0, 2.2, 0); g.add(roof); solid(roof);
      add(g, gBox(4.0, 0.13, 0.18, 0.06), mat(C.pink2), 0, 3.56, 0);

      solid(add(g, gBox(0.46, 1.0, 0.46, 0.1), mat('#FFE1E9'), 0.95, 2.72, -0.55));
      add(g, gBox(0.58, 0.16, 0.58, 0.07), roofM, 0.95, 3.26, -0.55);

      add(g, gBox(0.95, 1.36, 0.2, 0.18), mat(C.white), -0.55, 0.85, 1.42);
      add(g, gBox(0.72, 1.18, 0.24, 0.14), mat('#FF9EB6'), -0.55, 0.78, 1.45);
      const wg = makeWindow(0.85, 0.7, 0.12);
      add(g, wg, winMats[winMats.length - 1], 0.95, 1.35, 1.42);
      add(g, gBox(1.0, 0.86, 0.08, 0.06), mat(C.white), 0.95, 1.35, 1.38);
      add(g, wg, winMats[winMats.length - 1], 2.0, 1.35, 0.2).rotation.y = Math.PI / 2;

      add(g, gBox(2.0, 0.16, 0.9, 0.08), mat(C.wood), -0.4, 0.36, 1.78);
      add(g, gBox(0.12, 1.2, 0.12, 0.05), mat(C.white), -1.25, 1.0, 2.1);
      add(g, gBox(0.12, 1.2, 0.12, 0.05), mat(C.white), 0.45, 1.0, 2.1);
      const pr = prism(2.3, 0.52, 1.0, roofM, 0.05);
      pr.position.set(-0.4, 1.6, 1.72); g.add(pr);

      const heart = new THREE.Mesh(heartGeo(0.26), mat('#FF7FA8'));
      heart.position.set(-0.55, 1.9, 1.44); g.add(heart);

      for (let i = 0; i < 11; i++) {
        const a = -1.15 + (i / 10) * 2.3;
        const r = 3.2;
        add(g, gBox(0.1, 0.54, 0.1, 0.05), mat(C.white), Math.sin(a) * r, 0.32, Math.cos(a) * r + 0.3);
      }
      [-1.0, -0.35, 0.35, 1.0].forEach(function (a) {
        const r = 3.2;
        const rail = add(g, gBox(0.62, 0.06, 0.06, 0.03), mat(C.white), Math.sin(a) * r, 0.36, Math.cos(a) * r + 0.3);
        rail.rotation.y = a;
      });

      const decor = [];
      const flowerBed = new THREE.Group();
      [[-1.9, 2.1, C.pinkSoft], [-1.5, 2.4, '#FFF3B8'], [-2.3, 2.5, C.lav], [-2.0, 2.85, C.sky], [-2.5, 2.15, C.pinkSoft]].forEach(function (f) {
        add(flowerBed, gCyl(0.03, 0.03, 0.3, 5), mat(C.grass4), f[0], 0.15, f[1]);
        add(flowerBed, gSph(0.11, 10), mat(f[2]), f[0], 0.34, f[1]);
      });
      g.add(flowerBed); decor.push({ need: 3, obj: flowerBed });

      const lamps = new THREE.Group();
      [[-2.6, 1.4], [1.9, 1.3]].forEach(function (p) {
        add(lamps, gCyl(0.05, 0.05, 0.9, 8), mat(C.white), p[0], 0.45, p[1]);
        const lm = new THREE.MeshStandardMaterial({ color: new THREE.Color('#FFF3D2'), emissive: new THREE.Color('#FFC96B'), emissiveIntensity: 0, roughness: 0.4 });
        lampMats.push(lm);
        add(lamps, gSph(0.16, 12), lm, p[0], 0.95, p[1]);
      });
      g.add(lamps); decor.push({ need: 6, obj: lamps });

      const gardenTrees = new THREE.Group();
      [[2.7, 2.2, 0.42], [-2.9, 0.4, 0.34]].forEach(function (t) {
        add(gardenTrees, gCyl(0.07, 0.09, 0.6, 8), mat(C.wood2), t[0], 0.3, t[1]);
        add(gardenTrees, gSph(t[2], 12), mat(C.grass2), t[0], 0.8, t[1]);
      });
      g.add(gardenTrees); decor.push({ need: 9, obj: gardenTrees });

      const arch = new THREE.Group();
      add(arch, gCyl(0.07, 0.07, 1.5, 10), mat(C.white), -1.1, 0.75, 2.55);
      add(arch, gCyl(0.07, 0.07, 1.5, 10), mat(C.white), 1.1, 0.75, 2.55);
      const arc = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.07, 8, 24, Math.PI), mat(C.white));
      arc.position.set(0, 1.5, 2.55); arch.add(arc);
      add(arch, gSph(0.12, 10), mat('#FF7FA8'), 0, 2.55, 2.55);
      g.add(arch); decor.push({ need: 12, obj: arch });

      decor.forEach(function (d) { d.obj.visible = false; });
      return { group: g, labelY: 7.2, decor: decor };
    }

    /* ── 토이 소품 ──────────────────────────────────────────── */
    // 솜사탕 나무
    function candyTree(x, z, s, color) {
      const g = new THREE.Group();
      const trunk = add(g, gCyl(0.1 * s, 0.14 * s, 1.0 * s, 10), mat('#F6D9BE'), 0, 0.5 * s, 0);
      trunk.castShadow = true;
      const c1 = add(g, gSph(0.66 * s, 20), jelly(color), 0, 1.28 * s, 0); c1.castShadow = true;
      const c2 = add(g, gSph(0.44 * s, 16), jelly(color), -0.36 * s, 1.66 * s, 0.1 * s); c2.castShadow = true;
      const c3 = add(g, gSph(0.4 * s, 16), jelly(color), 0.34 * s, 1.62 * s, -0.08 * s); c3.castShadow = true;
      g.position.set(x, 0, z);
      return g;
    }
    function bush(x, z, s, color) {
      const g = new THREE.Group();
      [[0, 0.26, 0, 0.36], [0.32, 0.19, 0.1, 0.28], [-0.28, 0.18, 0.06, 0.26]].forEach(function (b) {
        const m = add(g, gSph(b[3] * s, 14), jelly(color), b[0] * s, b[1] * s, b[2] * s);
        m.castShadow = true;
      });
      g.position.set(x, 0, z);
      return g;
    }
    // 땡땡이 버섯
    function mushroom(x, z, s, capColor) {
      const g = new THREE.Group();
      add(g, gCyl(0.17 * s, 0.24 * s, 0.56 * s, 14), mat('#FFF4E6'), 0, 0.28 * s, 0);
      const cap = add(g, gSph(0.44 * s, 20), mat(capColor), 0, 0.6 * s, 0);
      cap.scale.set(1, 0.74, 1); cap.castShadow = true;
      add(g, gCyl(0.44 * s, 0.3 * s, 0.16 * s, 18), mat(capColor), 0, 0.48 * s, 0);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + x;
        const rr = 0.26 * s;
        add(g, gSph(0.075 * s, 10), mat('#FFFFFF'), Math.cos(a) * rr, (0.66 + (i % 2) * 0.12) * s, Math.sin(a) * rr);
      }
      g.position.set(x, 0, z);
      g.rotation.y = Math.random() * 3;
      return g;
    }
    // 리본 선물상자
    function giftBox(x, z, s, color, ribbon) {
      const g = new THREE.Group();
      const b = add(g, gBox(0.8 * s, 0.7 * s, 0.8 * s, 0.09 * s), mat(color), 0, 0.35 * s, 0);
      b.castShadow = true;
      add(g, gBox(0.84 * s, 0.12 * s, 0.16 * s, 0.04 * s), mat(ribbon), 0, 0.72 * s, 0);
      add(g, gBox(0.16 * s, 0.14 * s, 0.84 * s, 0.04 * s), mat(ribbon), 0, 0.72 * s, 0);
      add(g, gBox(0.16 * s, 0.7 * s, 0.84 * s, 0.04 * s), mat(ribbon), 0, 0.36 * s, 0);
      add(g, gBox(0.84 * s, 0.7 * s, 0.16 * s, 0.04 * s), mat(ribbon), 0, 0.36 * s, 0);
      // 리본 나비
      [[-1, 0.2], [1, -0.2]].forEach(function (r) {
        const loop = add(g, gSph(0.13 * s, 12), mat(ribbon), r[0] * 0.14 * s, 0.84 * s, 0);
        loop.scale.set(1.5, 0.8, 0.7);
      });
      g.position.set(x, 0, z);
      g.rotation.y = Math.random() * 3;
      return g;
    }
    // 사탕지팡이 가로등
    function candyLamp(x, z, h, topColor) {
      const g = new THREE.Group();
      add(g, gCyl(0.09, 0.13, h, 10), mat('#FFFFFF'), 0, h / 2, 0);
      for (let i = 0; i < 5; i++) {
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.032, 6, 16), mat('#F4607C'));
        band.rotation.x = Math.PI / 2; band.position.y = 0.22 + i * (h - 0.5) / 4; g.add(band);
      }
      add(g, gCyl(0.2, 0.2, 0.09, 12), mat('#F6E8DA'), 0, 0.05, 0);
      const bulb = new THREE.Mesh(gSph(0.22, 16), new THREE.MeshStandardMaterial({
        color: new THREE.Color('#FFF6DA'), emissive: new THREE.Color('#FFC96B'), emissiveIntensity: 0, roughness: 0.35
      }));
      lampMats.push(bulb.material);
      bulb.position.y = h + 0.16;
      g.add(bulb);
      add(g, gCyl(0.26, 0.14, 0.14, 14), mat(topColor || C.pink), 0, h + 0.36, 0);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xFFD79A, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      glow.scale.set(1.5, 1.5, 1); glow.position.set(0, h + 0.16, 0);
      g.add(glow); glowSprites.push(glow);
      g.position.set(x, 0, z);
      return g;
    }
    // 사탕지팡이 (꼬부라진 막대)
    function candyCane(x, z, s, rot) {
      const g = new THREE.Group();
      const segs = 10;
      for (let i = 0; i < segs; i++) {
        add(g, gCyl(0.1 * s, 0.1 * s, 0.42 * s, 10), mat(i % 2 ? '#FFFFFF' : '#F4607C'), 0, 0.21 * s + i * 0.42 * s, 0);
      }
      const top = 4.2 * s;
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (i / 6);
        add(g, gSph(0.105 * s, 10), mat(i % 2 ? '#FFFFFF' : '#F4607C'), Math.cos(a) * 0.32 * s, top + Math.sin(a) * 0.32 * s, 0);
      }
      g.position.set(x, 0, z);
      g.rotation.y = rot || 0;
      return g;
    }
    function bench(x, z, rot) {
      const g = new THREE.Group();
      add(g, gBox(1.1, 0.1, 0.36, 0.06), mat(C.wood), 0, 0.42, 0);
      add(g, gBox(1.1, 0.3, 0.08, 0.04), mat(C.wood), 0, 0.6, -0.15);
      [-0.4, 0.4].forEach(function (lx) {
        add(g, gBox(0.08, 0.4, 0.32, 0.04), mat(C.wood2), lx, 0.2, 0);
      });
      g.position.set(x, 0, z); g.rotation.y = rot || 0;
      return g;
    }

    /* ── 배치 ────────────────────────────────────────────────── */
    const castle = buildCastle();
    const bank = buildBank();
    const shop = buildWorkshop();
    const tower = buildTower();
    const house = buildHouse();
    [castle, bank, shop, tower, house].forEach(function (b) { island.add(b.group); });
    castle.group.scale.setScalar(1.12); castle.labelY *= 1.12;
    bank.group.scale.setScalar(1.12); bank.labelY *= 1.12;
    shop.group.scale.setScalar(1.18); shop.labelY *= 1.18;
    tower.group.scale.setScalar(0.94); tower.labelY *= 0.94;
    house.group.scale.setScalar(1.4); house.labelY *= 1.4;
    castle.group.userData.act = 'openCastle'; castle.group.userData.key = 'castle';
    bank.group.userData.act = 'openBank'; bank.group.userData.key = 'bank';
    shop.group.userData.act = 'openWorkshop'; shop.group.userData.key = 'shop';
    tower.group.userData.act = 'openTower'; tower.group.userData.key = 'tower';
    house.group.userData.act = 'openHouse'; house.group.userData.key = 'house';

    // 연못
    let pondWater = null;
    (function pond() {
      const px = 1.2, pz = -8.6;
      const water = add(island, gCyl(2.5, 2.5, 0.18, 40), new THREE.MeshStandardMaterial({ color: new THREE.Color('#BFEAF9'), roughness: 0.22, metalness: 0.06 }), px, 0.07, pz);
      water.receiveShadow = true;
      pondWater = water;
      const edge = new THREE.Mesh(new THREE.TorusGeometry(2.52, 0.17, 10, 44), mat('#FFF5EA'));
      edge.rotation.x = Math.PI / 2; edge.position.set(px, 0.13, pz); island.add(edge);
      [[0.9, 0.7, 0.34], [-0.8, -0.4, 0.28], [1.3, -1.0, 0.24]].forEach(function (l) {
        add(island, gCyl(l[2], l[2], 0.05, 12), mat('#A9E3B8'), px + l[0], 0.16, pz + l[1]);
      });
      add(island, gSph(0.15, 8), mat(C.pinkSoft), px + 1.4, 0.21, pz + 1.2);
    })();

    // 분수대 (앞쪽 광장)
    (function fountain() {
      const fx = 0.6, fz = 9.4;
      solid(add(island, gCyl(1.75, 1.9, 0.36, 36), mat('#F3E7FB'), fx, 0.18, fz));
      add(island, gCyl(1.5, 1.5, 0.12, 36), new THREE.MeshStandardMaterial({ color: new THREE.Color('#C9EEFB'), roughness: 0.2, metalness: 0.06 }), fx, 0.32, fz);
      add(island, gCyl(0.24, 0.34, 0.9, 16), mat('#FFF6EE'), fx, 0.63, fz);
      add(island, gCyl(0.62, 0.5, 0.15, 20), mat('#F3E7FB'), fx, 1.1, fz);
      add(island, gSph(0.2, 12), mat('#DDF1FB'), fx, 1.25, fz);
      const ringF = new THREE.Mesh(new THREE.TorusGeometry(1.84, 0.1, 8, 40), mat('#FDF8FF'));
      ringF.rotation.x = Math.PI / 2; ringF.position.set(fx, 0.35, fz); island.add(ringF);
      [[-1.9, 0.4], [1.9, 0.35], [0.2, 1.95]].forEach(function (q) {
        add(island, gSph(0.26, 10), mat(C.pinkSoft), fx + q[0], 0.19, fz + q[1]);
        add(island, gSph(0.2, 10), mat('#FFF3B8'), fx + q[0] * 0.82, 0.17, fz + q[1] * 0.9);
      });
    })();

    // 솜사탕 나무
    const TREE_SPOTS = [
      [-14.6, -2.2, 1.05, C.grass2], [-11.6, -9.4, 0.95, C.grass2], [-3.2, -9.8, 1.0, C.grass2],
      [5.2, -10.4, 0.9, C.sky], [12.2, -9.0, 0.95, C.grass2], [15.4, 0.6, 1.0, C.grass2],
      [13.6, 8.0, 0.95, C.pink], [4.4, 10.2, 0.9, C.grass2], [-3.4, 10.6, 1.0, C.grass2],
      [-10.2, 9.0, 0.9, C.grass2], [-15.6, 4.6, 1.05, C.sky], [9.4, 8.6, 0.82, C.pink]
    ];
    TREE_SPOTS.forEach(function (t) { island.add(candyTree(t[0], t[1], t[2], t[3])); });
    [[-1.0, 11.4, 1.05, C.grass2], [-6.0, 10.2, 0.9, C.grass2], [6.4, 10.6, 0.95, C.sky],
     [-13.8, -7.4, 0.85, C.grass2], [13.2, -6.4, 0.85, C.grass2]].forEach(function (t) {
      island.add(candyTree(t[0], t[1], t[2], t[3]));
    });
    [[-6.6, 8.2, 1.2], [7.2, 7.4, 1.1], [-13.0, 0.6, 1.0], [11.0, -2.2, 1.0], [2.0, 8.4, 1.0],
     [-3.2, 12.4, 1.1], [8.2, 9.4, 0.95], [-9.6, 7.6, 1.0], [-12.2, -5.2, 0.95]].forEach(function (b) {
      island.add(bush(b[0], b[1], b[2], C.grass2));
    });

    // 땡땡이 버섯
    [[-9.9, 2.2, 1.15, '#FF7D8E'], [8.9, 3.0, 0.95, '#7FB2F5'], [-5.6, -3.4, 1.0, '#FF7D8E'],
     [5.4, 1.2, 0.85, '#7FB2F5'], [-1.9, -5.6, 0.9, '#FFB3C8'], [12.0, -3.2, 1.0, '#FF7D8E'],
     [-12.6, 7.6, 0.95, '#7FB2F5'], [2.6, 5.4, 0.85, '#FF7D8E']].forEach(function (m) {
      island.add(mushroom(m[0], m[1], m[2], m[3]));
    });

    // 선물 상자
    [[-7.2, 4.6, 1.05, '#FFD2E2', '#FFFFFF'], [9.6, 6.6, 0.95, '#C9E7FF', '#FFFFFF'],
     [3.4, -6.2, 0.85, '#FFE9AE', '#FF9FBB'], [-13.2, -2.4, 0.9, '#DCCBFA', '#FFFFFF'],
     [11.4, -6.8, 0.8, '#C9F4DE', '#FF9FBB']].forEach(function (b) {
      island.add(giftBox(b[0], b[1], b[2], b[3], b[4]));
    });

    // 사탕지팡이 조형물 + 가로등
    island.add(candyCane(-12.6, -5.6, 0.95, 0.4));
    island.add(candyCane(11.2, 2.0, 0.95, -0.6));
    island.add(candyCane(6.6, -2.6, 0.8, 1.2));
    [[-5.9, 1.5, 1.55, C.pink], [3.7, 1.7, 1.55, C.lav], [11.0, -3.9, 1.5, C.sky],
     [-11.6, 4.0, 1.5, C.mint], [-2.4, 6.0, 1.45, C.pink], [7.4, -5.0, 1.45, C.lav]].forEach(function (p) {
      island.add(candyLamp(p[0], p[1], p[2], p[3]));
    });
    // 설탕 물웅덩이 — 동글납작 파스텔
    [[-8.2, 8.6, 1.5, '#FFD9E8'], [7.8, 9.4, 1.2, '#D8F0FF'], [-13.0, 3.2, 1.0, '#FFF0C0']].forEach(function (p) {
      const pud = add(island, gCyl(p[2], p[2] * 0.96, 0.06, 26), mat(p[3]), p[0], 0.03, p[1]);
      pud.scale.z = 0.72;
      pud.receiveShadow = true;
      add(island, gSph(0.16, 10), mat('#FFFFFF'), p[0] + p[2] * 0.5, 0.06, p[1] + p[2] * 0.2).scale.set(1, 0.5, 1);
    });

    // 길가 미니 사탕 아치
    (function candyArch() {
      const p = ringAt(0.30 * ringLen);
      const dir = ringDir(0.30 * ringLen);
      const nx = dir.z, nz = -dir.x;
      const g = new THREE.Group();
      g.position.set(p.x, 0, p.z);
      g.rotation.y = Math.atan2(dir.x, dir.z);
      const segs = 16;
      for (let i = 0; i < segs; i++) {
        const a = Math.PI * (i / (segs - 1));
        add(g, gSph(0.1, 10), mat(i % 2 ? '#FFFFFF' : '#F4607C'), Math.cos(a) * 1.55, Math.sin(a) * 1.55 + 0.12, 0);
      }
      [-1.55, 1.55].forEach(function (px) {
        for (let i = 0; i < 2; i++) add(g, gCyl(0.1, 0.1, 0.24, 8), mat(i % 2 ? '#FFFFFF' : '#F4607C'), px, 0.12 + i * 0.24, 0);
      });
      island.add(g);
    })();

    island.add(bench(-6.2, 0.6, 1.3));
    island.add(bench(6.4, 0.3, -1.3));
    island.add(bench(-2.4, 2.4, Math.PI));

    // 잔디 결 · 꽃가루
    (function speckles() {
      const rnd = function () { return Math.random(); };
      const geo = gSph(0.08, 8);
      const inst = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.72 }), 170);
      const d = new THREE.Object3D(); const col = new THREE.Color();
      const palette = ['#9FE6A6', '#C9F5C2', '#8CD99A', '#FFF6C8', '#FFD6E2', '#E7D9FF', '#CDEBFF'];
      let n = 0, tries = 0;
      while (n < 170 && tries < 1200) {
        tries++;
        const a = rnd() * Math.PI * 2, r = 2.2 + rnd() * 15.2;
        const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.8;
        if (distToPath(x, z) < 1.15) continue;
        if (Math.hypot(x - POS.tower.x, z - POS.tower.z) < 4.0) continue;
        const s2 = 0.55 + rnd() * 0.9;
        d.position.set(x, 0.02, z); d.scale.set(s2, s2 * 0.55, s2);
        d.rotation.set(0, rnd() * 3, 0); d.updateMatrix();
        inst.setMatrixAt(n, d.matrix);
        col.set(palette[Math.floor(rnd() * palette.length)]);
        inst.setColorAt(n, col);
        n++;
      }
      inst.count = n;
      island.add(inst);
    })();

    // 흩어진 사탕볼
    (function balls() {
      const rnd = function () { return Math.random(); };
      const geo = gSph(0.22, 12);
      const inst = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.36 }), 30);
      const d = new THREE.Object3D(); const col = new THREE.Color();
      let n = 0, tries = 0;
      while (n < 30 && tries < 500) {
        tries++;
        const a = rnd() * Math.PI * 2, r = 4.5 + rnd() * 11.5;
        const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.82;
        if (distToPath(x, z) < 1.6) continue;
        if (Math.hypot(x - POS.tower.x, z - POS.tower.z) < 4.4) continue;
        const s = 0.6 + rnd() * 0.7;
        d.position.set(x, 0.14 * s, z); d.scale.setScalar(s); d.rotation.set(0, rnd() * 3, 0);
        d.updateMatrix(); inst.setMatrixAt(n, d.matrix);
        col.set(C.tile[Math.floor(rnd() * C.tile.length)]); inst.setColorAt(n, col);
        n++;
      }
      inst.count = n; inst.castShadow = true;
      island.add(inst);
    })();

    // 구름
    const clouds = [];
    for (let i = 0; i < 5; i++) {
      const g = new THREE.Group();
      const cm = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.95, roughness: 1, emissive: new THREE.Color('#FFFFFF'), emissiveIntensity: 0.3 });
      cloudMats.push(cm);
      [[0, 0, 0, 1.5], [1.6, -0.2, 0.15, 1.1], [-1.6, -0.15, -0.1, 1.0], [0.5, 0.6, 0, 1.0], [-0.7, 0.45, 0.2, 0.85]].forEach(function (s) {
        const m = new THREE.Mesh(gSph(s[3], 14), cm); m.position.set(s[0], s[1], s[2]); m.scale.y = 0.66; g.add(m);
      });
      const CP = [[-18, 13, -20], [3, 17, -24], [20, 12, -18], [-28, 15, -4], [28, 14, -3]];
      const cp = CP[i % CP.length];
      g.position.set(cp[0], cp[1], cp[2]);
      g.scale.setScalar(1.25 + (i % 3) * 0.2);
      scene.add(g); clouds.push({ g: g, x: g.position.x, y: g.position.y, sp: 0.25 + i * 0.09 });
    }

    /* ── 캐릭터: 젤리 피규어 2등신 ──────────────────────────── */
    const CY2 = { feet: 0.07, body: 0.42, head: 1.12 };
    const EYE = '#3A3145';

    function faceOn(head, eyeY, mouthY) {
      const eyeM = mat(EYE), white = mat('#FFFFFF');
      [[-1, 1], [1, -1]].forEach(function (s) {
        const eye = add(head, gSph(0.098, 14), eyeM, s[0] * 0.205, eyeY, 0.47);
        eye.scale.set(0.95, 1.18, 0.5);
        const gl = add(head, gSph(0.032, 10), white, s[0] * 0.205 + 0.038, eyeY + 0.052, 0.53);
        gl.scale.set(1, 1, 0.6);
      });
      const smile = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.02, 6, 16, Math.PI), eyeM);
      smile.position.set(0, mouthY, 0.5);
      smile.rotation.z = Math.PI;
      head.add(smile);
    }

    function makeYongeun() {
      const g = new THREE.Group();
      const skin = mat('#FFF3E2'), skin2 = mat('#FFE7D0'), mint = mat('#8FE0C2'), mint2 = mat('#6ED3B0');
      const blush = mat('#FFB6C9');

      // 발
      const footL = add(g, gSph(0.16, 14), skin, -0.2, CY2.feet, 0.06);
      footL.scale.set(1, 0.72, 1.3); footL.castShadow = true;
      const footR = add(g, gSph(0.16, 14), skin, 0.2, CY2.feet, 0.06);
      footR.scale.set(1, 0.72, 1.3); footR.castShadow = true;

      // 팔
      const armL = add(g, gCap(0.085, 0.16, 10), skin, -0.42, 0.44, 0.04);
      armL.rotation.z = 0.5; armL.castShadow = true;
      const armR = add(g, gCap(0.085, 0.16, 10), skin, 0.42, 0.44, 0.04);
      armR.rotation.z = -0.5; armR.castShadow = true;

      // 몸통
      const body = add(g, gSph(0.43, 24), skin, 0, CY2.body - 0.02, 0);
      body.scale.set(1.04, 0.95, 0.94); body.castShadow = true;
      const belly = add(g, gSph(0.27, 16), skin2, 0, CY2.body - 0.01, 0.16);
      belly.scale.set(1, 0.9, 0.45);
      // 민트 스카프
      const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.085, 8, 22), mint);
      scarf.rotation.x = Math.PI / 2; scarf.position.y = 0.72; g.add(scarf);
      const tailK = add(g, gSph(0.1, 10), mint2, -0.2, 0.66, 0.28); tailK.scale.set(1, 1.4, 0.7);

      // 머리
      const head = new THREE.Group();
      head.position.set(0, CY2.head, 0);
      g.add(head);
      const skull = add(head, gSph(0.54, 30), skin, 0, 0, 0);
      skull.scale.set(1.05, 0.99, 0.98); skull.castShadow = true;
      faceOn(head, -0.02, -0.2);
      [[-1, 1], [1, -1]].forEach(function (s) {
        const bl = add(head, gSph(0.085, 12), blush, s[0] * 0.375, -0.19, 0.42);
        bl.scale.set(1, 0.52, 0.18);
      });

      // 둥근 귀
      const ears = new THREE.Group();
      head.add(ears);
      [[-1, 1], [1, -1]].forEach(function (s) {
        const e = add(ears, gSph(0.19, 16), skin, s[0] * 0.36, 0.4, -0.02);
        e.scale.set(1, 0.96, 0.7); e.castShadow = true;
        const ei = add(ears, gSph(0.1, 12), mint, s[0] * 0.365, 0.405, 0.1);
        ei.scale.set(0.85, 0.85, 0.4);
      });

      // 민트 베레모
      const beret = new THREE.Group();
      const capB = add(beret, gSph(0.3, 20), mint, 0, 0.44, -0.02);
      capB.scale.set(1.24, 0.46, 1.18);
      add(beret, gSph(0.055, 10), mint2, 0.15, 0.6, 0);
      beret.rotation.z = -0.18;
      beret.visible = true;
      head.add(beret);

      // 새끼손에 든 토트백
      const bag = new THREE.Group();
      add(bag, gBox(0.34, 0.3, 0.16, 0.06), mat('#FFF0C9'), 0, 0, 0);
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.022, 5, 16, Math.PI), mat('#E9D6B4'));
      strap.rotation.x = Math.PI / 2; strap.position.y = 0.16; bag.add(strap);
      bag.position.set(0.52, 0.36, 0.02);
      bag.rotation.z = 0.2;
      g.add(bag);

      // 단계 장식 (새싹 → 스카프 리본 → 왕관) — 기존 키 그대로
      const sprout = new THREE.Group();
      add(sprout, gCyl(0.03, 0.035, 0.18, 6), mat('#4FC79E'), 0.28, 0.6, 0);
      const lf = add(sprout, gSph(0.1, 10), mat('#7FE6C5'), 0.21, 0.71, 0); lf.scale.set(1, 0.45, 0.68);
      add(sprout, gSph(0.1, 10), mat('#7FE6C5'), 0.35, 0.7, 0).scale.set(1, 0.45, 0.68);
      sprout.visible = false; head.add(sprout);

      const crown = new THREE.Group();
      add(crown, gCyl(0.24, 0.24, 0.08, 14), mat('#FFE08A'), 0, 0.62, 0);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        add(crown, gCone(0.055, 0.16, 6), mat('#FFE08A'), Math.cos(a) * 0.2, 0.72, Math.sin(a) * 0.2);
      }
      add(crown, gSph(0.045, 10), mat('#FF9FBB'), 0, 0.68, 0.22);
      crown.visible = false; head.add(crown);

      g.scale.setScalar(2.2);
      g.userData = {
        body: body, head: head, ears: ears, armL: armL, armR: armR, footL: footL, footR: footR,
        bag: bag, beret: beret, acc: { sprout: sprout, scarf: scarf, crown: crown }
      };
      return g;
    }

    function makeChunbae() {
      const g = new THREE.Group();
      const pink = mat('#FFC3D6'), pink2 = mat('#FFB0C8'), inner = mat('#F1729A'), milk = mat('#FFF0F5');
      const blush = mat('#FF8FB0');

      const footL = add(g, gSph(0.15, 14), pink, -0.19, CY2.feet, 0.05);
      footL.scale.set(1, 0.7, 1.28); footL.castShadow = true;
      const footR = add(g, gSph(0.15, 14), pink, 0.19, CY2.feet, 0.05);
      footR.scale.set(1, 0.7, 1.28); footR.castShadow = true;

      const armL = add(g, gCap(0.08, 0.14, 10), pink, -0.4, 0.43, 0.03);
      armL.rotation.z = 0.55;
      const armR = add(g, gCap(0.08, 0.14, 10), pink, 0.4, 0.43, 0.03);
      armR.rotation.z = -0.55;

      const body = add(g, gSph(0.41, 24), pink, 0, CY2.body - 0.01, 0);
      body.scale.set(1.05, 0.95, 0.93); body.castShadow = true;
      const belly = add(g, gSph(0.28, 16), milk, 0, CY2.body, 0.14);
      belly.scale.set(1, 0.92, 0.5);

      // 배 ㅊ
      const cMat = mat('#F1729A');
      add(g, gBox(0.075, 0.036, 0.028, 0.012), cMat, 0, 0.55, 0.3);
      add(g, gBox(0.22, 0.036, 0.028, 0.012), cMat, 0, 0.49, 0.31);
      add(g, gBox(0.036, 0.15, 0.028, 0.012), cMat, -0.055, 0.4, 0.33).rotation.z = 0.34;
      add(g, gBox(0.036, 0.15, 0.028, 0.012), cMat, 0.055, 0.4, 0.33).rotation.z = -0.34;

      // 머리
      const head = new THREE.Group();
      head.position.set(0, CY2.head, 0);
      g.add(head);
      const skull = add(head, gSph(0.53, 30), pink, 0, 0, 0);
      skull.scale.set(1.04, 0.99, 0.98); skull.castShadow = true;
      faceOn(head, -0.01, -0.19);
      [[-1, 1], [1, -1]].forEach(function (s) {
        const bl = add(head, gSph(0.08, 12), blush, s[0] * 0.365, -0.18, 0.42);
        bl.scale.set(1, 0.5, 0.18);
      });

      // 고양이 귀 — 뾰족
      const ears = new THREE.Group();
      head.add(ears);
      [[-1, 1], [1, -1]].forEach(function (s) {
        const ear = new THREE.Group();
        const e = add(ear, gCone(0.2, 0.4, 16), pink, 0, 0.16, 0);
        e.scale.set(1, 1, 0.72); e.castShadow = true;
        const ei = add(ear, gCone(0.12, 0.26, 14), inner, 0, 0.12, 0.075);
        ei.scale.set(1, 1, 0.5);
        ear.position.set(s[0] * 0.31, 0.4, -0.02);
        ear.rotation.z = s[0] * 0.22;
        ears.add(ear);
      });

      // 코 · 수염
      const nose = add(head, gCone(0.05, 0.06, 8), inner, 0, -0.16, 0.53);
      nose.rotation.x = Math.PI / 2; nose.scale.set(1.3, 1, 0.7);
      [[-1, 1], [1, -1]].forEach(function (s) {
        const w = add(head, gCyl(0.011, 0.011, 0.26, 5), mat('#FF9FBA'), s[0] * 0.42, -0.19, 0.4);
        w.rotation.z = Math.PI / 2; w.rotation.y = s[0] * 0.35;
        const w2 = add(head, gCyl(0.011, 0.011, 0.22, 5), mat('#FF9FBA'), s[0] * 0.4, -0.26, 0.4);
        w2.rotation.z = Math.PI / 2 + s[0] * 0.28; w2.rotation.y = s[0] * 0.3;
      });

      // 고양이 꼬리 — 살랑살랑
      const tail = new THREE.Group();
      const t1 = add(tail, gCap(0.085, 0.26, 10), pink, 0, 0.05, 0);
      t1.rotation.x = -0.5;
      const t2 = add(tail, gCap(0.075, 0.2, 10), pink2, 0, 0.42, -0.24);
      t2.rotation.x = -1.0;
      add(tail, gSph(0.085, 10), milk, 0, 0.56, -0.42);
      tail.position.set(-0.32, 0.36, -0.28);
      g.add(tail);

      // 리본 (한쪽 귀)
      const bow = new THREE.Group();
      [[-1, 0.24], [1, -0.24]].forEach(function (r) {
        const loop = add(bow, gSph(0.09, 12), mat('#FF6F98'), r[0] * 0.1, 0, 0);
        loop.scale.set(1.5, 0.8, 0.7);
      });
      add(bow, gSph(0.045, 10), mat('#FFD1DC'), 0, 0, 0);
      bow.position.set(-0.38, 0.72, 0.06);
      head.add(bow);

      g.scale.setScalar(2.12);
      g.userData = {
        body: body, head: head, ears: ears, tail: tail, armL: armL, armR: armR,
        footL: footL, footR: footR, acc: {}
      };
      return g;
    }

    const ygMesh = makeYongeun();
    const cbMesh = makeChunbae();
    ygMesh.userData.act = 'tapChar';
    cbMesh.userData.act = 'tapChar';
    scene.add(ygMesh);
    scene.add(cbMesh);

    /* ── 이름표 ──────────────────────────────────────────────── */
    const LABELS = [];
    [
      ['openCastle', 'tagCastle', castle.labelY],
      ['openHouse', 'tagHouse', house.labelY],
      ['openTower', 'tagTower', tower.labelY],
      ['openBank', 'tagBank', bank.labelY],
      ['openWorkshop', 'tagWorkshop', shop.labelY]
    ].forEach(function (l) {
      const el = document.getElementById(l[1]);
      if (!el) return;
      const b = { 'openCastle': castle, 'openHouse': house, 'openTower': tower, 'openBank': bank, 'openWorkshop': shop }[l[0]];
      LABELS.push({ el: el, pos: new THREE.Vector3(b.group.position.x, l[2], b.group.position.z) });
    });

    /* ── 상태 반영 ───────────────────────────────────────────── */
    let stageNow = -1, houseNow = -1, towerLit = false, debtPct = 0;
    function setStage(n) {
      if (n === stageNow) return;
      stageNow = n;
      const a = ygMesh.userData.acc;
      a.sprout.visible = n >= 1;
      a.scarf.visible = n >= 1;
      a.crown.visible = n >= 5;
    }
    function setHouseDecor(done) {
      if (done === houseNow) return;
      houseNow = done;
      house.decor.forEach(function (d) { d.obj.visible = done >= d.need; });
    }
    function setDebt(pct) {
      debtPct = Math.max(0, Math.min(100, pct || 0));
      bank.gaugeBar.scale.x = Math.max(0.001, debtPct / 100);
    }
    function applyPhaseTo(p) { phT = PHASE[p] || PHASE.day; }
    function setTowerLit(on) { towerLit = !!on; }

    /* ── 카메라 이동 ─────────────────────────────────────────── */
    // 화면에 맞춰 시점 잡기
    const FIT_PTS = [];
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      FIT_PTS.push(new THREE.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R * SQ));
    }
    [castle, bank, shop, tower, house].forEach(function (b) {
      const bb = new THREE.Box3().setFromObject(b.group);
      FIT_PTS.push(new THREE.Vector3(bb.min.x, bb.max.y, bb.min.z));
      FIT_PTS.push(new THREE.Vector3(bb.max.x, bb.max.y, bb.max.z));
    });
    const fitV = new THREE.Vector3();
    const VIEW_DIR = new THREE.Vector3(0.40, 0.88, 0.55).normalize();
    const fitTarget = new THREE.Vector3(0, 1.0, 0.3);
    let fitDist = 70;
    function fitView() {
      const box = new THREE.Box3();
      for (let i = 0; i < FIT_PTS.length; i++) box.expandByPoint(FIT_PTS[i]);
      const center = box.getCenter(new THREE.Vector3());
      fitTarget.copy(center);
      let dist = 70;
      for (let iter = 0; iter < 3; iter++) {
        camera.position.copy(fitTarget).addScaledVector(VIEW_DIR, dist);
        camera.lookAt(fitTarget);
        camera.updateMatrixWorld();
        let minX = 9, maxX = -9, minY = 9, maxY = -9;
        for (let i = 0; i < FIT_PTS.length; i++) {
          fitV.copy(FIT_PTS[i]).project(camera);
          if (fitV.x < minX) minX = fitV.x; if (fitV.x > maxX) maxX = fitV.x;
          if (fitV.y < minY) minY = fitV.y; if (fitV.y > maxY) maxY = fitV.y;
        }
        const w = (maxX - minX) / 2 || 0.2, h = (maxY - minY) / 2 || 0.2;
        // 가로를 살짝 넘겨 채우는 릴스식 프레이밍 (세로 여백은 하늘로)
        dist *= Math.max(0.6, Math.min(1.6, Math.max(w / 1.0, h / 0.96) * 0.98));
      }
      fitDist = Math.max(32, dist * 0.94);
      homeTarget.copy(fitTarget);
      homeTarget.y -= 1.2;
      homeTarget.x -= 0.6;
      homePos.copy(fitTarget).addScaledVector(VIEW_DIR, fitDist);
      camera.position.copy(homePos);
      controls.target.copy(homeTarget);
      camera.lookAt(homeTarget);
      controls.update();
    }

    let camAnim = null;
    function tweenCamera(targetPos, targetLook, speed) {
      camAnim = {
        p0: camera.position.clone(), t0: controls.target.clone(),
        p1: targetPos.clone(), t1: targetLook.clone(),
        t: 0, sp: speed || 2.2
      };
    }
    function focusPoint(target, dist) {
      const d = dist || 30;
      tweenCamera(target.clone().addScaledVector(VIEW_DIR, d), target, 2.4);
    }
    const BUILDING = { castle: castle, bank: bank, shop: shop, tower: tower, house: house };

    /* ── 마을 장식 (진행도로 하나씩 열립니다) ───────────────── */
    const propsGroup = new THREE.Group();
    island.add(propsGroup);
    const PROPS = [];
    function outPoint(t, off) {
      const p = ringAt((((t % 1) + 1) % 1) * ringLen);
      const l = Math.hypot(p.x, p.z) || 1;
      return { x: p.x + p.x / l * off, z: p.z + p.z / l * off };
    }
    function makeProp(t, off, build, scale) {
      const p = outPoint(t, off);
      const g = new THREE.Group();
      g.position.set(p.x, 0, p.z);
      g.rotation.y = Math.atan2(-p.x, -p.z);
      g.visible = false;
      const base = scale || 2.5;
      g.scale.setScalar(base);
      propsGroup.add(g);
      const anim = build(g) || null;
      const item = { g: g, anim: anim, shown: false, pop: null, base: base };
      PROPS.push(item);
      return item;
    }
    function flower(g, color, s, px, pz) {
      const ox = px || 0, oz = pz || 0;
      const st = add(g, gCyl(0.035, 0.035, 0.42 * s, 5), mat('#8FD8A8'), ox, 0.21 * s, oz);
      st.castShadow = false;
      const petals = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        const pet = add(petals, gSph(0.16 * s, 10), mat(color), Math.cos(a) * 0.19 * s, 0, Math.sin(a) * 0.19 * s);
        pet.scale.set(1, 0.45, 1);
      }
      add(petals, gSph(0.1 * s, 8), mat('#FFF3C4'), 0, 0.03, 0);
      petals.position.set(ox, 0.44 * s, oz);
      g.add(petals);
    }
    function lamp(g) {
      add(g, gCyl(0.035, 0.045, 1.5, 8), mat('#C9BEDF'), 0, 0.75, 0);
      const head = add(g, gSph(0.14, 12), jelly('#FFF0BE'), 0, 1.55, 0);
      head.material.emissiveIntensity = 1.4;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, opacity: 0.5, depthWrite: false }));
      sp.scale.setScalar(1.5); sp.position.set(0, 1.55, 0); g.add(sp);
      return function (t) { sp.material.opacity = 0.34 + Math.sin(t * 2 + 1) * 0.12; };
    }
    function flag(g) {
      add(g, gCyl(0.028, 0.028, 1.7, 6), mat('#DCCBF8'), 0, 0.85, 0);
      const f = add(g, gBox(0.62, 0.34, 0.03, 0.02), mat('#FFB1C8'), 0.33, 1.5, 0);
      return function (t) { f.rotation.z = Math.sin(t * 2.4) * 0.16; };
    }
    function butterfly(g, color) {
      const w1 = add(g, gSph(0.13, 10), mat(color), -0.1, 1.05, 0); w1.scale.set(1.2, 0.35, 1);
      const w2 = add(g, gSph(0.13, 10), mat(color), 0.1, 1.05, 0); w2.scale.set(1.2, 0.35, 1);
      return function (t) {
        const k = Math.sin(t * 6) * 0.6;
        w1.rotation.z = k; w2.rotation.z = -k;
        g.position.y = Math.abs(Math.sin(t * 1.4)) * 0.24;
      };
    }
    function fountain(g) {
      add(g, gCyl(0.8, 0.9, 0.18, 26), mat('#CBE4FF'), 0, 0.09, 0);
      add(g, gCyl(0.66, 0.66, 0.05, 26), mat('#BFE6FF'), 0, 0.19, 0);
      add(g, gCyl(0.14, 0.18, 0.7, 12), mat('#E6F3AE'), 0, 0.45, 0);
      add(g, gCyl(0.42, 0.34, 0.07, 20), mat('#CBE4FF'), 0, 0.82, 0);
      const jet = add(g, gCyl(0.03, 0.06, 0.5, 8), jelly('#DFF3FF'), 0, 1.05, 0);
      const drop = add(g, gSph(0.13, 10), jelly('#EAF9FF'), 0, 1.32, 0);
      return function (t) {
        drop.position.y = 1.3 + Math.sin(t * 2.2) * 0.18;
        drop.scale.setScalar(0.9 + Math.sin(t * 2.2) * 0.14);
        jet.scale.y = 1 + Math.sin(t * 2.2) * 0.12;
      };
    }
    function balloons(g) {
      const cols = ['#FFAFCB', '#B9DCFF', '#FFE8A8', '#B4F0D4'];
      const grp = new THREE.Group();
      cols.forEach(function (c, i) {
        const a = i / cols.length * Math.PI * 2;
        const x = Math.cos(a) * 0.3, z = Math.sin(a) * 0.3;
        add(grp, gSph(0.22, 12), jelly(c), x, 2.2 + i * 0.16, z).scale.set(1, 1.2, 1);
        add(grp, gCyl(0.008, 0.008, 1.3, 3), mat('#FFF6EA'), x, 1.5 + i * 0.16, z);
      });
      g.add(grp);
      return function (t) { grp.rotation.y = Math.sin(t * 0.6) * 0.28; grp.position.y = Math.sin(t * 1.1) * 0.08; };
    }
    function benchProp(g) {
      add(g, gBox(0.86, 0.06, 0.3, 0.03), mat('#E0B98F'), 0, 0.42, 0);
      add(g, gBox(0.86, 0.3, 0.06, 0.03), mat('#E0B98F'), 0, 0.58, -0.13);
      add(g, gBox(0.05, 0.42, 0.28, 0.02), mat('#B58E76'), -0.37, 0.21, 0);
      add(g, gBox(0.05, 0.42, 0.28, 0.02), mat('#B58E76'), 0.37, 0.21, 0);
    }
    function sparkleProp(g) {
      const list = [];
      for (let i = 0; i < 8; i++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, opacity: 0.8, depthWrite: false }));
        s.scale.setScalar(0.4);
        s.position.set((Math.random() - 0.5) * 1.1, 0.5 + Math.random() * 1.6, (Math.random() - 0.5) * 1.1);
        g.add(s); list.push(s);
      }
      return function (t) { list.forEach(function (s, i) { s.material.opacity = 0.35 + Math.abs(Math.sin(t * 1.8 + i)) * 0.6; }); };
    }
    function heartLamp(g) {
      add(g, gCyl(0.03, 0.03, 1.1, 6), mat('#C9BEDF'), 0, 0.55, 0);
      const h = new THREE.Mesh(heartGeo(0.2), jelly('#FFB1C8'));
      h.position.y = 1.2; h.rotation.z = Math.PI; g.add(h);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, opacity: 0.55, depthWrite: false }));
      sp.scale.setScalar(1.3); sp.position.set(0, 1.2, 0); g.add(sp);
      return function (t) { h.scale.setScalar(1 + Math.sin(t * 3) * 0.06); };
    }
    function rainbowProp(g) {
      const cols = ['#FFB1C8', '#FFE08A', '#B4F0D4', '#B9DCFF', '#D9C6FA'];
      cols.forEach(function (c, i) {
        const geo = new THREE.TorusGeometry(1.5 - i * 0.13, 0.055, 8, 40, Math.PI);
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(c), transparent: true, opacity: 0.72 }));
        m.position.y = 0.1; g.add(m);
      });
      return function (t) { g.children.forEach(function (m) { m.material.opacity = 0.5 + Math.sin(t * 1.2) * 0.16; }); };
    }
    function bunting(g) {
      add(g, gCyl(0.04, 0.04, 2.4, 6), mat('#DCCBF8'), -0.9, 1.2, 0);
      add(g, gCyl(0.04, 0.04, 2.4, 6), mat('#DCCBF8'), 0.9, 1.2, 0);
      const cols = ['#FFB1C8', '#FFE8A8', '#B4F0D4', '#B9DCFF'];
      const flags = [];
      for (let i = 0; i < 7; i++) {
        const f = add(g, gBox(0.26, 0.3, 0.02, 0.01), mat(cols[i % 4]), -0.75 + i * 0.25, 2.2 - Math.abs(i - 3) * 0.04, 0);
        flags.push(f);
      }
      return function (t) { flags.forEach(function (f, i) { f.rotation.x = Math.sin(t * 2 + i) * 0.1; }); };
    }

    makeProp(0.03, 2.1, function (g) { flower(g, '#FFB1C8', 1.1); flower(g, '#FFE08A', 0.85); });
    makeProp(0.10, 2.3, function (g) { flower(g, '#C9B8FF', 1); flower(g, '#FFB1C8', 0.9); flower(g, '#B4F0D4', 0.8); });
    makeProp(0.17, 1.9, lamp);
    makeProp(0.26, 2.2, flag);
    makeProp(0.34, 2.0, function (g) { return butterfly(g, '#FFB1C8'); });
    makeProp(0.43, 2.6, fountain);
    makeProp(0.52, 2.2, balloons);
    makeProp(0.60, 2.1, benchProp);
    makeProp(0.68, 2.0, sparkleProp);
    makeProp(0.76, 2.2, heartLamp);
    makeProp(0.85, 2.8, rainbowProp);
    makeProp(0.93, 2.0, bunting);

    /* ── 날씨/기분 ─────────────────────────────────────────── */
    const rainN = 240;
    const rainGeo = new THREE.BufferGeometry();
    const rainArr = new Float32Array(rainN * 6);
    for (let i = 0; i < rainN; i++) {
      const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * R * 0.92;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr * SQ;
      const y = Math.random() * 16;
      rainArr[i * 6] = x; rainArr[i * 6 + 1] = y; rainArr[i * 6 + 2] = z;
      rainArr[i * 6 + 3] = x; rainArr[i * 6 + 4] = y - 0.75; rainArr[i * 6 + 5] = z;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainArr, 3));
    const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xBBD8FF, transparent: true, opacity: 0.5 }));
    rain.visible = false;
    island.add(rain);

    const moodClouds = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Group();
      for (let k = 0; k < 3; k++) {
        const m = add(c, gSph(1.5 + Math.random(), 12), new THREE.MeshStandardMaterial({ color: new THREE.Color('#D3D8EC'), roughness: 0.9, transparent: true, opacity: 0.8 }), k * 1.1 - 1.1, Math.random() * 0.2, 0);
        m.scale.set(1, 0.5, 0.9);
      }
      c.position.set((Math.random() - 0.5) * 22, 14 + Math.random() * 3, (Math.random() - 0.5) * 14);
      moodClouds.add(c);
    }
    moodClouds.visible = false;
    island.add(moodClouds);

    const sparkleN = 46;
    const spGeo = new THREE.BufferGeometry();
    const spArr = new Float32Array(sparkleN * 3);
    for (let i = 0; i < sparkleN; i++) {
      const a = Math.random() * Math.PI * 2, rr = Math.random() * R * 0.85;
      spArr[i * 3] = Math.cos(a) * rr;
      spArr[i * 3 + 1] = 0.6 + Math.random() * 4.2;
      spArr[i * 3 + 2] = Math.sin(a) * rr * SQ;
    }
    spGeo.setAttribute('position', new THREE.BufferAttribute(spArr, 3));
    const sparkles = new THREE.Points(spGeo, new THREE.PointsMaterial({ color: 0xFFF3C4, size: 0.16, transparent: true, opacity: 0.9, depthWrite: false }));
    sparkles.visible = false;
    island.add(sparkles);

    let moodNow = 'sunny';
    function setMood(m) {
      moodNow = m || 'sunny';
      const idle = moodNow === 'idle';
      rain.visible = idle;
      moodClouds.visible = idle;
      sparkles.visible = moodNow === 'sparkle';
      if (sparkles.visible) sparkles.material.opacity = 0.85;
    }
    function setProgress(n) {
      n = Math.max(0, Math.min(PROPS.length, Math.round(Number(n) || 0)));
      for (let i = 0; i < PROPS.length; i++) {
        const p = PROPS[i], on = i < n;
        if (on && !p.shown) { p.g.visible = true; p.pop = 0; p.g.scale.setScalar(p.base * 0.04); }
        if (!on) { p.g.visible = false; p.pop = null; p.shown = false; }
        if (on) p.shown = true;
      }
      return n;
    }
    function focusBuilding(key) {
      const b = BUILDING[key];
      if (!b) return false;
      const box = new THREE.Box3().setFromObject(b.group);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const dist = Math.max(23, Math.min(38, Math.max(size.x, size.z) * 3.2 + 10));
      // 건물 정면(문 쪽)에서 살짝 위로 내려다보게
      const rot = b.group.rotation.y;
      const fx = Math.sin(rot), fz = Math.cos(rot);
      const dir = new THREE.Vector3(fx * 0.94, 0.62, fz * 0.94).normalize();
      const look = new THREE.Vector3(center.x, Math.min(center.y, b.labelY * 0.5), center.z);
      tweenCamera(look.clone().addScaledVector(dir, dist), look, 2.3);
      return true;
    }

    // 시점 고정
    let frozen = false;
    function setFrozen(on) {
      frozen = !!on;
      controls.enableRotate = !frozen;
      controls.enableZoom = !frozen;
      controls.enablePan = false;
      townEl.classList.toggle('view-frozen', frozen);
      if (frozen) { camAnim = null; }
      return frozen;
    }
    controls.addEventListener('start', function () { camAnim = null; });

    // 이름표 · 말풍선 토글
    let namesOn = true, bubblesOn = true;
    function setNames(on) { namesOn = !!on; townEl.classList.toggle('hide-tags', !namesOn); return namesOn; }
    function setBubbles(on) { bubblesOn = !!on; townEl.classList.toggle('hide-bub', !bubblesOn); return bubblesOn; }
    function toggleNames() { return setNames(!namesOn); }
    function toggleBubbles() { return setBubbles(!bubblesOn); }

    /* ── 렌더 루프 ───────────────────────────────────────────── */
    let lastTs = 0, tNow = 0, walkY = 0, walkC = 0, ygHeading = 0, cbHeading = 0;

    function resize() {
      const w = townEl.clientWidth || 360;
      const h = townEl.clientHeight || 430;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    if (window.ResizeObserver) new ResizeObserver(resize).observe(townEl);
    window.addEventListener('orientationchange', function () { setTimeout(resize, 200); });
    resize();

    function placeChars(dt) {
      const yg = TOWN.yg, cb = TOWN.cb;
      const dY = ((yg.t % 1) + 1) % 1 * ringLen;
      const pY = ringAt(dY), dirY = ringDir(dY);
      const nxY = dirY.z, nzY = -dirY.x;
      ygMesh.position.set(pY.x + nxY * 0.3, 0.02, pY.z + nzY * 0.3);
      const hY = Math.atan2(dirY.x * (yg.face >= 0 ? 1 : -1), dirY.z * (yg.face >= 0 ? 1 : -1));
      let dAng = ((hY - ygHeading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      ygHeading += dAng * Math.min(1, dt * 9);
      ygMesh.rotation.y = ygHeading;

      const dC = ((cb.t % 1) + 1) % 1 * ringLen;
      const pC = ringAt(dC), dirC = ringDir(dC);
      const nxC = dirC.z, nzC = -dirC.x;
      cbMesh.position.set(pC.x - nxC * 0.3, 0.02, pC.z - nzC * 0.3);
      const hC = Math.atan2(dirC.x * (cb.face >= 0 ? 1 : -1), dirC.z * (cb.face >= 0 ? 1 : -1));
      dAng = ((hC - cbHeading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      cbHeading += dAng * Math.min(1, dt * 9);
      cbMesh.rotation.y = cbHeading;
    }

    function animateChars(dt) {
      const yg = TOWN.yg, cb = TOWN.cb;
      const movingY = !!yg.moving, working = yg.mode === 'work';
      const ud = ygMesh.userData;

      walkY += dt * (movingY ? 10 : 2.4);
      const hopY = movingY ? Math.abs(Math.sin(walkY)) * 0.11 : Math.sin(walkY) * 0.014;
      ygMesh.position.y = 0.02 + hopY;
      ud.head.position.y = CY2.head + Math.sin(walkY * 2) * (movingY ? 0.02 : 0.01);
      ud.head.rotation.z = Math.sin(walkY * 0.5) * (movingY ? 0.05 : 0.02);
      ud.head.rotation.y = working ? Math.sin(tNow * 1.1) * 0.14 : Math.sin(walkY * 0.4) * 0.06;
      ud.head.rotation.x = movingY ? 0.05 : 0;
      ud.ears.rotation.z = Math.sin(walkY * 0.8 + 0.4) * (movingY ? 0.13 : 0.05);
      ud.beret.rotation.z = -0.18 + Math.sin(walkY * 0.7) * (movingY ? 0.1 : 0.03);

      const sq = movingY ? Math.abs(Math.sin(walkY)) : 0;
      ud.body.scale.set(1.05 + sq * 0.03, 0.96 - sq * 0.04, 0.95 + sq * 0.02);
      const swing = working ? Math.sin(tNow * 9) * 0.5 : (movingY ? Math.sin(-walkY) * 0.5 : Math.sin(walkY * 0.7) * 0.06);
      ud.armL.rotation.z = 0.5 + swing;
      ud.armR.rotation.z = -0.5 - (working ? Math.sin(tNow * 9 + 1.2) * 0.5 : (movingY ? Math.sin(walkY) * 0.5 : Math.sin(walkY * 0.7 + 0.6) * 0.06));
      ud.footL.position.y = CY2.feet + (movingY ? Math.max(0, Math.sin(walkY)) * 0.1 : 0);
      ud.footR.position.y = CY2.feet + (movingY ? Math.max(0, Math.sin(walkY + Math.PI)) * 0.1 : 0);
      ud.bag.rotation.z = 0.2 + Math.sin(walkY * 0.9) * (movingY ? 0.14 : 0.04);

      const cd = cbMesh.userData;
      walkC += dt * (cb.moving ? 11.5 : 2.6);
      const hopC = cb.moving ? Math.abs(Math.sin(walkC)) * 0.13 : Math.sin(walkC) * 0.02;
      cbMesh.position.y = 0.02 + hopC;
      cd.head.position.y = CY2.head + (cb.moving ? Math.sin(walkC * 2) * 0.022 : Math.sin(walkC) * 0.01);
      cd.head.rotation.z = Math.sin(walkC * 0.55) * (cb.moving ? 0.06 : 0.025);
      cd.head.rotation.y = Math.sin(walkC * 0.4) * 0.05;
      cd.ears.rotation.z = Math.sin(walkC * 0.9) * (cb.moving ? 0.14 : 0.04);
      cd.tail.rotation.z = Math.sin(tNow * 2.1) * 0.28 + Math.sin(walkC * 0.8) * 0.18;
      cd.tail.rotation.x = Math.sin(tNow * 1.4) * 0.16;
      const sqc = cb.moving ? Math.abs(Math.sin(walkC)) : 0;
      cd.body.scale.set(1.06 + sqc * 0.04, 0.96 - sqc * 0.05, 0.94 + sqc * 0.02);
      const swingC = cb.moving ? Math.sin(walkC) * 0.5 : Math.sin(walkC * 0.8) * 0.08;
      cd.armL.rotation.z = 0.55 + swingC;
      cd.armR.rotation.z = -0.55 + swingC;
      cd.footL.position.y = CY2.feet + (cb.moving ? Math.max(0, Math.sin(walkC)) * 0.11 : 0);
      cd.footR.position.y = CY2.feet + (cb.moving ? Math.max(0, Math.sin(walkC + Math.PI)) * 0.11 : 0);
    }

    function animateScene(dt) {
      const k = 1 - Math.exp(-dt * 6);
      phC.hemiI = phC.hemiI + (phT.hemiI - phC.hemiI) * k;
      phC.keyI = phC.keyI + (phT.keyI - phC.keyI) * k;
      phC.fillI = phC.fillI + (phT.fillI - phC.fillI) * k;
      phC.rimI = phC.rimI + (phT.rimI - phC.rimI) * k;
      phC.win = phC.win + (phT.win - phC.win) * k;
      phC.lamp = phC.lamp + (phT.lamp - phC.lamp) * k;
      phC.star = phC.star + (phT.star - phC.star) * k;
      phC.cloud = phC.cloud + (phT.cloud - phC.cloud) * k;

      hemi.intensity = phC.hemiI;
      hemi.color.setHex(phT.hemiSky);
      hemi.groundColor.setHex(phT.hemiGround);
      key.intensity = phC.keyI;
      key.color.setHex(phT.keyC);
      key.position.x = key.position.x + (phT.keyPos[0] - key.position.x) * k;
      key.position.y = key.position.y + (phT.keyPos[1] - key.position.y) * k;
      key.position.z = key.position.z + (phT.keyPos[2] - key.position.z) * k;
      fill.intensity = phC.fillI; fill.color.setHex(phT.fillC);
      rim.intensity = phC.rimI; rim.color.setHex(phT.rimC);

      for (let i = 0; i < winMats.length; i++) winMats[i].emissiveIntensity = phC.win;
      for (let i = 0; i < lampMats.length; i++) lampMats[i].emissiveIntensity = phC.lamp;
      for (let i = 0; i < glowSprites.length; i++) glowSprites[i].material.opacity = phC.lamp * 0.36;
      for (let i = 0; i < cloudMats.length; i++) {
        cloudMats[i].opacity = 0.06 + phC.cloud * 0.72;
        cloudMats[i].emissiveIntensity = 0.02 + phC.cloud * 0.3;
      }

      for (let i = 0; i < clouds.length; i++) {
        const c = clouds[i];
        c.g.position.x = c.x + Math.sin(tNow * 0.12 * c.sp + i) * 3.2;
        c.g.position.y = c.y + Math.sin(tNow * 0.4 + i) * 0.18;
      }

      // 깃발
      const fa = castle.flag.geometry.attributes.position;
      for (let i = 0; i < fa.count; i++) {
        const x = castle.flagBase[i * 3], y = castle.flagBase[i * 3 + 1];
        fa.setZ(i, Math.sin(x * 4.2 + tNow * 4.4) * 0.11 * ((x + 0.65) / 1.3));
        fa.setY(i, y + Math.sin(x * 3 + tNow * 3) * 0.02);
      }
      fa.needsUpdate = true;

      // 금화
      bank.coin.rotation.y += dt * 0.6;
      bank.coin.position.y = 5.7 + Math.sin(tNow * 0.9) * 0.09;

      // 굴뚝 연기
      for (let i = 0; i < shop.smoke.length; i++) {
        const s = shop.smoke[i];
        const ph = ((tNow * 0.32 + i * 0.2) % 1);
        s.position.y = 3.6 + ph * 2.1;
        s.position.x = -1.05 + Math.sin(ph * 6 + i) * 0.2;
        s.position.z = -0.75 + Math.cos(ph * 5 + i) * 0.15;
        s.scale.setScalar(0.5 + ph * 1.05);
        s.material.opacity = 0.45 * (1 - ph);
      }

      // 시계
      const now = new Date();
      let hh = now.getHours() % 12, mm = now.getMinutes(), ss = now.getSeconds();
      if (towerLit && typeof FOCUS !== 'undefined' && FOCUS && typeof FOCUS.remaining === 'number') {
        const rem = Math.max(0, FOCUS.remaining);
        hh = Math.floor(rem / 3600) % 12; mm = Math.floor(rem / 60) % 60; ss = rem % 60;
      }
      const minAng = -((mm + ss / 60) / 60) * Math.PI * 2;
      const hourAng = -(((hh + mm / 60) / 12) * Math.PI * 2);
      for (let i = 0; i < tower.hands.length; i++) {
        tower.hands[i].min.rotation.z = minAng;
        tower.hands[i].hour.rotation.z = hourAng;
      }
      tower.lamp.material.emissiveIntensity = towerLit ? 2.4 + Math.sin(tNow * 3) * 0.6 : phC.lamp * 0.7;
      tower.beacon.material.opacity = towerLit ? 0.35 + Math.sin(tNow * 2.4) * 0.2 : 0;
      tower.beacon.scale.setScalar(towerLit ? 1 + Math.sin(tNow * 2.4) * 0.06 : 1);

      /* 장식 팝 · 날씨 */
      for (let i = 0; i < PROPS.length; i++) {
        const p = PROPS[i];
        if (p.anim && p.g.visible) p.anim(tNow);
        if (p.pop != null) {
          p.pop = Math.min(1, p.pop + dt * 2.6);
          const e = 1 - Math.pow(1 - p.pop, 3);
          p.g.scale.setScalar(p.base * (0.04 + e * 0.96 + (p.pop < 1 ? Math.sin(p.pop * Math.PI) * 0.12 : 0)));
          if (p.pop >= 1) { p.pop = null; p.g.scale.setScalar(p.base); }
        }
      }
      if (rain.visible) {
        const arr = rain.geometry.attributes.position.array;
        for (let i = 0; i < rainN; i++) {
          const dy = dt * 9;
          arr[i * 6 + 1] -= dy; arr[i * 6 + 4] -= dy;
          if (arr[i * 6 + 4] < 0.15) {
            const add2 = 15;
            arr[i * 6 + 1] += add2; arr[i * 6 + 4] += add2;
          }
        }
        rain.geometry.attributes.position.needsUpdate = true;
      }
      if (moodClouds.visible) {
        for (let i = 0; i < moodClouds.children.length; i++) {
          const c = moodClouds.children[i];
          c.position.x += dt * (0.35 + i * 0.1);
          if (c.position.x > 14) c.position.x = -14;
        }
      }
      if (sparkles.visible) sparkles.material.opacity = 0.5 + Math.abs(Math.sin(tNow * 1.6)) * 0.5;
      if (pondWater) pondWater.rotation.y += dt * 0.05;
    }

    function updateLabels() {
      const w = townEl.clientWidth || 360, h = townEl.clientHeight || 430;
      for (let i = 0; i < LABELS.length; i++) {
        const L = LABELS[i];
        tmpV.copy(L.pos).project(camera);
        const onScreen = tmpV.z < 1 && Math.abs(tmpV.x) < 1.2 && Math.abs(tmpV.y) < 1.2;
        if (!onScreen) { L.el.style.display = 'none'; continue; }
        L.el.style.display = '';
        const halfW = (L.el.offsetWidth || 80) / 2 / w * 100;
        const px = Math.max(halfW + 1.5, Math.min(100 - halfW - 1.5, (tmpV.x * 0.5 + 0.5) * 100));
        const py = Math.max(9, Math.min(92, (-tmpV.y * 0.5 + 0.5) * 100));
        L.el.style.left = px.toFixed(2) + '%';
        L.el.style.top = py.toFixed(2) + '%';
      }
    }
    const tmpV = new THREE.Vector3();

    function paintBubble(el) {
      if (!el) return;
      tmpV.set(ygMesh.position.x, ygMesh.position.y + 3.7, ygMesh.position.z).project(camera);
      const left = Math.max(9, Math.min(91, (tmpV.x * 0.5 + 0.5) * 100));
      const top = Math.max(7, Math.min(94, (-tmpV.y * 0.5 + 0.5) * 100));
      el.style.left = left.toFixed(2) + '%';
      el.style.top = top.toFixed(2) + '%';
      const on = bubblesOn && !!(TOWN.bub && Date.now() < TOWN.bubUntil);
      if (el.classList.contains('on') !== on) el.classList.toggle('on', on);
    }

    /* ── 손가락으로 누르기 (건물 · 캐릭터 · 바닥 이동) ───────── */
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hitV = new THREE.Vector3();
    let downInfo = null;

    function goKey(key) {
      if (!key) return;
      const names = { castle: '데이터 성', house: '수은집', tower: '시계탑', bank: '청산 은행', shop: '아렐로 작업실' };
      if (typeof window.townJump === 'function') window.townJump(key);
      else if (typeof window.handleAction === 'function') {
        const el2 = document.createElement('button');
        el2.dataset.act = { castle: 'openCastle', house: 'openHouse', tower: 'openTower', bank: 'openBank', shop: 'openWorkshop' }[key];
        window.handleAction(el2.dataset.act, el2);
      }
      focusBuilding(key);
      if (bubblesOn) bubbleSay((names[key] || '여기') + '로 갈게! 🐾');
    }

    canvas.addEventListener('pointerdown', function (e) {
      downInfo = { x: e.clientX, y: e.clientY, t: Date.now() };
    });
    canvas.addEventListener('pointerup', function (e) {
      if (!downInfo) return;
      const dx = e.clientX - downInfo.x, dy = e.clientY - downInfo.y;
      const dt = Date.now() - downInfo.t;
      downInfo = null;
      if (Math.hypot(dx, dy) > 10 || dt > 700) return;
      const rect = canvas.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects([castle.group, bank.group, shop.group, tower.group, house.group, ygMesh, cbMesh], true);
      for (let i = 0; i < hits.length; i++) {
        let o = hits[i].object;
        while (o && !o.userData.act) o = o.parent;
        if (o && o.userData.act) {
          if (o.userData.key) { goKey(o.userData.key); return; }
          if (typeof window.handleAction === 'function') {
            const tapEl = document.createElement('button');
            tapEl.dataset.act = o.userData.act;
            window.handleAction(o.userData.act, tapEl);
            return;
          }
        }
      }
      // 바닥 누르기 → 그 자리로 아장아장 걸어갑니다
      if (raycaster.ray.intersectPlane(floorPlane, hitV)) {
        if (Math.hypot(hitV.x, hitV.z) > R * 1.02) return;
        const t = nearestRingT(hitV.x, hitV.z);
        if (typeof window.townWalkTo === 'function') window.townWalkTo(t);
        else { TOWN.yg.target = t; TOWN.yg.mode = 'goto'; TOWN.yg.after = null; TOWN.yg.pause = 0; }
        if (bubblesOn) bubbleSay('여기 앉을래 🍬');
        sfxTap();
      }
    });
    function sfxTap() { try { if (typeof window.sfx === 'function') window.sfx('tap'); } catch (e) { } }

    /* ── 프레임 ──────────────────────────────────────────────── */
    let resetT = 0, resetFrom = null;
    function resetView() {
      const damp = controls.enableDamping;
      controls.enableDamping = false;
      controls.update();
      controls.enableDamping = damp;
      resetFrom = { pos: camera.position.clone(), target: controls.target.clone() };
      resetT = 0;
      camAnim = null;
    }

    function frame(ts) {
      requestAnimationFrame(frame);
      const dt = lastTs ? Math.min(0.08, (ts - lastTs) / 1000) : 0.016;
      lastTs = ts;
      tNow += dt;

      const home = document.getElementById('screen-town');
      if (!home || !home.classList.contains('active') || document.hidden) return;

      placeChars(dt);
      animateChars(dt);
      animateScene(dt);

      if (camAnim) {
        camAnim.t = Math.min(1, camAnim.t + dt * camAnim.sp);
        const e = 1 - Math.pow(1 - camAnim.t, 3);
        camera.position.lerpVectors(camAnim.p0, camAnim.p1, e);
        controls.target.lerpVectors(camAnim.t0, camAnim.t1, e);
        camera.lookAt(controls.target);
        if (camAnim.t >= 1) {
          camera.position.copy(camAnim.p1);
          controls.target.copy(camAnim.t1);
          camera.lookAt(controls.target);
          camAnim = null;
          controls.update();
        }
      } else if (resetFrom) {
        resetT = Math.min(1, resetT + dt * 2.4);
        const e = 1 - Math.pow(1 - resetT, 3);
        camera.position.lerpVectors(resetFrom.pos, homePos, e);
        controls.target.lerpVectors(resetFrom.target, homeTarget, e);
        camera.lookAt(controls.target);
        if (resetT >= 1) {
          resetFrom = null;
          camera.position.copy(homePos);
          controls.target.copy(homeTarget);
          camera.lookAt(homeTarget);
          controls.update();
        }
      } else {
        controls.update();
      }
      updateLabels();
      paintBubble(document.getElementById('townBub'));
      renderer.render(scene, camera);
    }

    /* ── 앱과 연결 ───────────────────────────────────────────── */
    try { TOWN_SPEED = 88; } catch (e) { }   // 3D 마을에선 아장아장이 더 빠릿하게

    window.TOWN3D = {
      ok: true,
      setPhase: applyPhaseTo,
      setState: function (o) {
        if (!o) return;
        setStage(o.stage || 0);
        setTowerLit(!!o.towerLit);
        setDebt(o.debtPct || 0);
        setHouseDecor(o.houseDone || 0);
        if (o.phase) applyPhaseTo(o.phase);
      },
      resetView: resetView,
      setMood: setMood,
      setProgress: setProgress,
      _progress: function () { return PROPS.filter(function (p) { return p.g.visible; }).length; },
      _mood: function () { return { mood: moodNow, rain: rain.visible, clouds: moodClouds.visible, sparkles: sparkles.visible }; },
      focus: focusBuilding,
      setFrozen: setFrozen,
      isFrozen: function () { return frozen; },
      setNames: setNames,
      setBubbles: setBubbles,
      toggleNames: toggleNames,
      toggleBubbles: toggleBubbles,
      _dbg2: function () {
        var v = new THREE.Vector3(); var out = {};
        [['yg', ygMesh], ['cb', cbMesh]].forEach(function (a) {
          v.copy(a[1].position); v.y += 1.4; v.project(camera);
          out[a[0]] = [Math.round((v.x * 0.5 + 0.5) * 100), Math.round((-v.y * 0.5 + 0.5) * 100)];
        });
        return out;
      },
      _dbg: function () {
        return {
          pos: camera.position.toArray().map(function (v) { return Math.round(v * 100) / 100; }),
          tgt: controls.target.toArray().map(function (v) { return Math.round(v * 100) / 100; }),
          dist: Math.round(camera.position.distanceTo(controls.target) * 10) / 10,
          home: homePos.toArray().map(function (v) { return Math.round(v * 100) / 100; }),
          chars: [ygMesh.position.toArray().map(function (v) { return Math.round(v * 100) / 100; }), cbMesh.position.toArray().map(function (v) { return Math.round(v * 100) / 100; })],
          charT: [Math.round(TOWN.yg.t * 1000) / 1000, Math.round(TOWN.cb.t * 1000) / 1000],
          charMode: TOWN.yg.mode, ready: TOWN.ready, target: Math.round(TOWN.yg.target * 1000) / 1000, pause: Math.round(TOWN.yg.pause * 100) / 100, moving: !!TOWN.yg.moving, hasSp: !!TOWN.yg.sp,
          frozen: frozen, names: namesOn, bubbles: bubblesOn,
          camAnim: !!camAnim,
          towerLit: towerLit,
          beacon: Math.round(tower.beacon.material.opacity * 100) / 100,
          gauge: Math.round(bank.gaugeBar.scale.x * 100) / 100,
          house: houseNow,
          decor: house.decor.map(function (d) { return d.obj.visible; }),
          winI: Math.round(winMats[0].emissiveIntensity * 100) / 100
        };
      },
      paintBubble: paintBubble,
      // 테스트/디버그: 건물 중심의 화면 좌표(%)
      // 캐릭터 정면 클로즈업 (스크린샷 · 연출용)
      closeupChars: function (dist) {
        const p = ygMesh.position.clone();
        const ry = ygMesh.rotation.y;
        const f = new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry));
        const look = new THREE.Vector3(p.x, 1.5, p.z);
        const dir = f.multiplyScalar(0.92).add(new THREE.Vector3(0, 0.5, 0)).normalize();
        tweenCamera(look.clone().addScaledVector(dir, dist || 13), look, 1.5);
        return true;
      },
      // 테스트/카메라 연출: 특정 지점을 클로즈업
      closeup: function (x, y, z, dist) {
        tweenCamera(new THREE.Vector3(x, y, z).addScaledVector(VIEW_DIR, dist || 14), new THREE.Vector3(x, y, z), 1.6);
        return true;
      },
      _proj: function (key) {
        const b = BUILDING[key]; if (!b) return null;
        const box = new THREE.Box3().setFromObject(b.group);
        const c = box.getCenter(new THREE.Vector3());
        const v = c.clone().project(camera);
        return [Math.round((v.x * 0.5 + 0.5) * 1000) / 10, Math.round((-v.y * 0.5 + 0.5) * 1000) / 10];
      }
    };
    townEl.classList.add('town3d-on');

    fitView();
    applyPhaseTo(TOWN.phase || 'day');
    phC = Object.assign({}, phT);
    try { if (typeof window.applyPhase === 'function') window.applyPhase(); } catch (e) { }
    try { if (typeof window.renderTown === 'function') window.renderTown(); } catch (e) { }
    requestAnimationFrame(frame);
  }

  run();
})();
