// 바람소리 웹 · 놀이 · 다시 오르는 산 — 정복 지도 탭에서 열려요 (js/play.js)
// - 산을 고르면 입구 → 쉼터 → 쉼터 → 정상. 큰 버튼을 "똑-딱" 박자에 맞춰 누르면 성큼, 아무 때나 눌러도 한 걸음
// - 쉬운 모드: 버튼을 꾹 누르고 있으면 천천히 걸어가요. 힘이 떨어지면 저절로 쉬었다 가요 (실패 없음)
// - 내 기록에서 가 본 시군구에 있는 산은 '가 본 산'으로 먼저 보여요
(function () {
  "use strict";
  let K = null, t = (s) => s, esc = (s) => s;
  const KEY = "jepi.game.mount.v1";
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  // sgg: 산이 걸친 시군구 이름 앞부분 (내 기록과 맞춰 보기용)
  const MOUNTS = [
    { id: "seorak", n: "설악산", peak: "대청봉", h: 1708, sgg: ["속초", "인제", "양양"], stops: ["오색 탐방지원센터", "설악폭포", "오색 갈림길", "대청봉"] },
    { id: "jiri", n: "지리산", peak: "천왕봉", h: 1915, sgg: ["산청", "함양", "구례", "남원", "하동"], stops: ["중산리 탐방안내소", "로타리대피소", "법계사", "천왕봉"] },
    { id: "halla", n: "한라산", peak: "백록담", h: 1950, sgg: ["제주", "서귀포"], stops: ["성판악", "속밭대피소", "진달래밭대피소", "백록담"] },
    { id: "bukhan", n: "북한산", peak: "백운대", h: 836, sgg: ["은평", "강북", "도봉", "고양"], stops: ["백운대 탐방지원센터", "하루재", "백운산장", "백운대"] },
    { id: "naejang", n: "내장산", peak: "신선봉", h: 763, sgg: ["정읍", "순창"], stops: ["내장사", "원적암", "까치봉", "신선봉"] },
    { id: "odae", n: "오대산", peak: "비로봉", h: 1563, sgg: ["평창", "강릉", "홍천"], stops: ["상원사", "중대사자암", "적멸보궁", "비로봉"] },
    { id: "taebaek", n: "태백산", peak: "장군봉", h: 1567, sgg: ["태백", "봉화", "영월"], stops: ["유일사 매표소", "유일사 쉼터", "주목 군락지", "장군봉"] },
    { id: "sobaek", n: "소백산", peak: "비로봉", h: 1439, sgg: ["영주", "단양"], stops: ["삼가 탐방지원센터", "비로사", "양반바위", "비로봉"] },
    { id: "chiak", n: "치악산", peak: "비로봉", h: 1288, sgg: ["원주", "횡성"], stops: ["구룡사", "세렴폭포", "사다리병창", "비로봉"] },
    { id: "deogyu", n: "덕유산", peak: "향적봉", h: 1614, sgg: ["무주", "거창", "장수", "함양"], stops: ["구천동 탐방지원센터", "백련사", "오수자굴", "향적봉"] },
    { id: "songni", n: "속리산", peak: "문장대", h: 1054, sgg: ["보은", "괴산", "상주"], stops: ["법주사", "세심정", "보현재", "문장대"] },
    { id: "gyeryong", n: "계룡산", peak: "관음봉", h: 766, sgg: ["공주", "계룡", "논산"], stops: ["동학사", "은선폭포", "관음봉 고개", "관음봉"] },
    { id: "mudeung", n: "무등산", peak: "서석대", h: 1100, sgg: ["광주", "화순", "담양"], stops: ["증심사", "중머리재", "장불재", "서석대"] },
    { id: "wolchul", n: "월출산", peak: "천황봉", h: 809, sgg: ["영암", "강진"], stops: ["천황사", "구름다리", "통천문", "천황봉"] },
    { id: "juwang", n: "주왕산", peak: "주봉", h: 721, sgg: ["청송", "영덕"], stops: ["대전사", "자하교", "주봉 삼거리", "주봉"] },
  ];
  function load() { try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && s.v === 1) return s; } catch (e) {} return { v: 1, sel: "bukhan", done: {} }; }
  let save = load();
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} }
  const M = () => MOUNTS.find((m) => m.id === save.sel) || MOUNTS[0];

  // 내 기록에서 가 본 시군구 → 가 본 산
  let summitSet = new Set(); // 바람소리 앱의 100대 명산에서 실제로 오른 산
  function visitedSet() {
    const out = new Set();
    summitSet = new Set(); // 로그아웃·예시 데이터로 바뀌면 지난 🏅가 남지 않게
    try {
      const R = window.ZAPP && ZAPP.recs && ZAPP.recs();
      if (!R || R.sample || !R.regions) return out;
      // 앱이 넘기는 모양이 배열이 아니어도(Set 등) 깨지지 않게, 문자열만
      const peaks = R.summits && typeof R.summits === "object" ? Array.from(R.summits).filter((x) => typeof x === "string").map((x) => x.trim()) : [];
      summitSet = new Set(peaks);
      const names = [];
      for (const r of R.regions) if ((R.conq && (R.conq.has(r.c) || R.conq.has(String(r.c)))) || (R.manual && R.manual.has && (R.manual.has(r.c) || R.manual.has(String(r.c))))) names.push(r.n);
      for (const m of MOUNTS) if (m.sgg.some((g) => names.some((n) => n.indexOf(g) === 0)) || summitSet.has(m.n)) out.add(m.id);
    } catch (e) {}
    return out;
  }

  // ---------- 상태 ----------
  let st = "ready", prog = 0, stam = 100, idle = 0, restT = 0, stopIdx = 0, pauseT = 0, elapsed = 0, holding = false, bob = 0, now = 0, msg = "", msgT = 0, good = 0, lastBeat = -1, topT = 0;
  const per = () => (K.opt.easy ? 1.05 : 0.8);
  function reset() { st = "ready"; prog = 0; stam = 100; idle = 0; stopIdx = 0; pauseT = 0; restT = 0; msgT = 0; elapsed = 0; good = 0; holding = false; setBtn(); }
  function flash(m) { msg = m; msgT = 2.2; }
  function step() {
    if (st === "ready") { st = "climb"; K.beep(523, 0.12); setBtn(); return; }
    if (st === "top") { if (topT > 0.8) { reset(); renderPanel(); } return; }
    if (st !== "climb" || pauseT > 0) return;
    if (st === "climb" && restT > 0) return;
    const ph = (now % per()) / per(), off = Math.min(ph, 1 - ph) * per();
    const onBeat = off < (K.opt.easy ? 0.2 : 0.12);
    const steep = prog > 0.7 ? 0.8 : 1;
    prog += (onBeat ? (K.opt.easy ? 1 / 34 : 1 / 46) : (K.opt.easy ? 1 / 60 : 1 / 110)) * steep;
    stam -= K.opt.easy ? 2.5 : 5;
    idle = 0; bob = 1; if (onBeat) { good++; K.beep(660, 0.06, "triangle", 0.12); } else K.beep(330, 0.05, "triangle", 0.08);
    check();
  }
  function check() {
    const marks = [1 / 3, 2 / 3];
    if (stopIdx < 2 && prog >= marks[stopIdx]) {
      stopIdx++; pauseT = 1.4;
      flash(t("{name} 도착! 물 한 모금 💧", { name: t(M().stops[stopIdx]) }));
      K.beep(784, 0.12); setTimeout(() => K.beep(988, 0.16), 130);
    }
    if (prog >= 1) {
      prog = 1; st = "top"; topT = 0;
      const d = save.done[M().id];
      save.done[M().id] = { n: (d ? d.n : 0) + 1, best: Math.min(d ? d.best : 1e9, Math.round(elapsed)) };
      store();
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => K.beep(f, 0.2), i * 140));
      K.buzz([60, 40, 60]);
      setBtn(); renderPanel();
    }
  }
  function press() { holding = true; step(); }
  function release() { holding = false; }
  function update(dt) {
    if (msgT > 0) msgT -= dt;
    if (bob > 0) bob = Math.max(0, bob - dt * 4);
    if (st === "top") { topT += dt; return; }
    if (st !== "climb") return;
    elapsed += dt;
    // 박자 소리 (쉬운 모드에서 박자를 귀로 들을 수 있게)
    const bi = Math.floor(now / per());
    if (bi !== lastBeat) { lastBeat = bi; if (K.opt.easy) K.click(900, 0.15); }
    if (pauseT > 0) { pauseT -= dt; stam = Math.min(100, stam + 20 * dt); return; }
    if (restT > 0) { restT -= dt; stam = Math.min(100, stam + 30 * dt); if (restT <= 0) { flash(t("다시 출발!")); setBtn(); } return; }
    idle += dt;
    if (holding && K.opt.easy) { prog += dt / 95 * (prog > 0.7 ? 0.8 : 1); stam -= 2 * dt; bob = Math.max(bob, 0.5 + 0.5 * Math.sin(now * 8)); check(); }
    else if (idle > 0.7) stam = Math.min(100, stam + 14 * dt);
    if (stam <= 0) { stam = 0; restT = K.opt.easy ? 2.2 : 3; flash(t("숨이 차요. 잠깐 쉬어 가요 😮‍💨")); setBtn(); }
  }

  // ---------- 그리기 ----------
  let root, cv, ctx, btn, W = 360, H = 360, F = 1, running = false, last = 0, FONT = "sans-serif", ridge = null, ridgeFor = "";
  function seedRand(seed) { let x = 0; for (const c of seed) x = (x * 31 + c.charCodeAt(0)) >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; }
  function makeRidge() {
    const m = M(), r = seedRand(m.id);
    const peakX = 0.62 + r() * 0.12, pts = [];
    for (let i = 0; i <= 24; i++) {
      const x = i / 24, d = Math.abs(x - peakX);
      let y = 0.18 + d * (1.1 + r() * 0.2) + (r() - 0.5) * 0.05;
      if (i === Math.round(peakX * 24)) y = 0.16;
      pts.push([x, clamp(y, 0.16, 0.95)]);
    }
    // 등산로: 왼쪽 아래 → 정상, 갈지자
    const trail = [];
    const sx = 0.06, sy = 0.9, ex = peakX, ey = 0.17;
    for (let i = 0; i <= 40; i++) {
      const k = i / 40, zig = Math.sin(k * Math.PI * 7) * 0.05 * (1 - k);
      trail.push([lerp(sx, ex, k) + zig, lerp(sy, ey, Math.pow(k, 0.9))]);
    }
    const trees = [];
    for (let i = 0; i < 40; i++) trees.push([r(), 0.4 + r() * 0.55, 0.6 + r() * 0.6]);
    ridge = { pts, trail, trees, peakX }; ridgeFor = m.id;
  }
  function trailAt(k) {
    const tr = ridge.trail, f = clamp(k, 0, 1) * (tr.length - 1), i = Math.min(tr.length - 2, Math.floor(f)), u = f - i;
    return [lerp(tr[i][0], tr[i + 1][0], u) * W, lerp(tr[i][1], tr[i + 1][1], u) * H];
  }
  function txt(s, x, y, size, color, align, weight) { ctx.font = (weight || "700") + " " + Math.round(size * F) + "px " + FONT; ctx.textAlign = align || "center"; ctx.textBaseline = "middle"; ctx.fillStyle = color || "#fff"; ctx.fillText(s, x, y); }
  function stxt(s, x, y, size, color, align, weight) { ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.65)"; ctx.shadowBlur = 6; txt(s, x, y, size, color, align, weight); ctx.restore(); }
  function fit(s, x, y, size, maxW, color, weight) { ctx.font = (weight || "700") + " " + Math.round(size * F) + "px " + FONT; const w = ctx.measureText(s).width; txt(s, x, y, w > maxW ? size * maxW / w : size, color, "center", weight); }
  function rr(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function draw() {
    F = K.opt.big ? 1.25 : 1;
    if (ridgeFor !== M().id) makeRidge();
    const ph = K.photo("mount");
    if (ph) { K.drawCover(ctx, ph, 0, 0, W, H); ctx.fillStyle = "rgba(10,20,15,0.18)"; ctx.fillRect(0, 0, W, H); }
    else {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#8ec5ea"); g.addColorStop(1, "#e8f3f0");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // 먼 능선 두 겹
      [["#b7cbc9", 0.45, 0.07], ["#93b0a6", 0.55, 0.05]].forEach(([c, base, amp], j) => {
        ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, H);
        for (let x = 0; x <= 1.001; x += 0.05) ctx.lineTo(x * W, (base + Math.sin(x * 9 + j * 2) * amp + Math.sin(x * 23) * amp * 0.3) * H);
        ctx.lineTo(W, H); ctx.fill();
      });
      // 주 산
      ctx.fillStyle = "#4f7a5a"; ctx.beginPath(); ctx.moveTo(0, H);
      for (const [x, y] of ridge.pts) ctx.lineTo(x * W, y * H);
      ctx.lineTo(W, H); ctx.fill();
      // 나무
      for (const [x, y, s] of ridge.trees) {
        const top = ridge.pts[Math.round(x * 24)][1];
        if (y < top + 0.05) continue;
        const tx = x * W, ty = y * H, ts = 9 * s * Math.min(W, H) / 380;
        ctx.fillStyle = "#2f5a3c"; ctx.beginPath(); ctx.moveTo(tx, ty - ts * 2); ctx.lineTo(tx - ts, ty); ctx.lineTo(tx + ts, ty); ctx.fill();
      }
    }
    // 등산로 (지나온 길은 노랑, 남은 길은 점선)
    ctx.lineCap = "round";
    ctx.setLineDash([6, 7]); ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 3;
    ctx.beginPath(); ridge.trail.forEach(([x, y], i) => (i ? ctx.lineTo(x * W, y * H) : ctx.moveTo(x * W, y * H))); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = "#F2B705"; ctx.lineWidth = 5; ctx.beginPath();
    const n = Math.max(1, Math.round(prog * 80));
    for (let i = 0; i <= n; i++) { const [x, y] = trailAt(i / 80 * (prog * 80 / n)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
    // 쉼터 표시
    [1 / 3, 2 / 3].forEach((k, i) => { const [x, y] = trailAt(k); ctx.fillStyle = stopIdx > i ? "#F2B705" : "#fff"; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill(); ctx.strokeStyle = "#0E8465"; ctx.lineWidth = 2; ctx.stroke(); });
    // 정상 깃발
    const [px, py] = trailAt(1);
    ctx.strokeStyle = "#333"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - 26); ctx.stroke();
    ctx.fillStyle = "#c2452d"; ctx.beginPath(); ctx.moveTo(px, py - 26); ctx.lineTo(px + 16, py - 21); ctx.lineTo(px, py - 16); ctx.fill();
    // 등산객
    const [cx, cy] = trailAt(prog), s = Math.min(W, H) / 380 * 1.1, b = -Math.abs(Math.sin(bob * Math.PI)) * 4;
    ctx.fillStyle = "#e8742c"; rr(cx - 7 * s, cy - 30 * s + b, 12 * s, 16 * s, 4 * s); ctx.fill();
    ctx.fillStyle = "#0E8465"; rr(cx - 11 * s, cy - 28 * s + b, 6 * s, 12 * s, 3 * s); ctx.fill(); // 배낭
    ctx.fillStyle = "#e9c3a0"; ctx.beginPath(); ctx.arc(cx, cy - 36 * s + b, 6 * s, 0, 7); ctx.fill();
    ctx.fillStyle = "#F2B705"; ctx.beginPath(); ctx.arc(cx, cy - 38 * s + b, 6.5 * s, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = "#1d2430"; ctx.lineWidth = 3 * s; ctx.beginPath();
    const sw = Math.sin(now * 10) * (bob > 0 || holding ? 4 : 0) * s;
    ctx.moveTo(cx - 2 * s, cy - 14 * s + b); ctx.lineTo(cx - 4 * s + sw, cy); ctx.moveTo(cx + 2 * s, cy - 14 * s + b); ctx.lineTo(cx + 4 * s - sw, cy); ctx.stroke();
    ctx.strokeStyle = "#7a5a3a"; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(cx + 6 * s, cy - 22 * s + b); ctx.lineTo(cx + 10 * s, cy); ctx.stroke(); // 지팡이

    // 위쪽 정보
    const m = M(), base = Math.round(m.h * 0.15), alt = Math.round(lerp(base, m.h, prog));
    stxt(t(m.n) + " · " + t(m.peak), 14, 22, 17, "#fff", "left");
    stxt(alt + " m / " + m.h + " m", W - 14, 22, 15, "#fff", "right", "600");
    // 힘 막대
    ctx.fillStyle = "rgba(0,0,0,0.35)"; rr(14, 40, W * 0.42, 14, 7); ctx.fill();
    ctx.fillStyle = stam > 40 ? "#4FC9A4" : stam > 15 ? "#F2B705" : "#ff6b5a"; rr(16, 42, Math.max(4, (W * 0.42 - 4) * stam / 100), 10, 5); ctx.fill();
    stxt(t("힘"), 14 + W * 0.42 + 8, 47, 13, "#fff", "left", "600");
    if (st === "climb" || st === "ready") stxt(Math.floor(elapsed / 60) + ":" + String(Math.floor(elapsed % 60)).padStart(2, "0"), W - 14, 47, 14, "#fff", "right", "600");
    // 박자 원
    if (st === "climb" && restT <= 0 && pauseT <= 0) {
      const phs = (now % per()) / per(), bx = W - 46 * F, by = H - 46 * F, R = 26 * F;
      ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(bx, by, R * 0.55, 0, 7); ctx.stroke();
      ctx.strokeStyle = "rgba(242,183,5," + (0.4 + 0.6 * phs) + ")"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(bx, by, R * (1.6 - phs * 1.05), 0, 7); ctx.stroke();
      stxt(t("박자"), bx, by, 11, "#fff", "center", "600");
    }
    // 안내
    if (st === "ready") stxt(t("{stop}에서 출발해요", { stop: t(m.stops[0]) }), W / 2, H * 0.62, 18);
    else if (restT > 0) stxt(t("쉬는 중… 😮‍💨"), W / 2, H * 0.62, 20, "#ffe14a");
    if (msgT > 0) {
      ctx.globalAlpha = Math.min(1, msgT * 2);
      ctx.font = "700 " + Math.round(16 * F) + "px " + FONT;
      const w = Math.min(W - 20, ctx.measureText(msg).width + 36);
      ctx.fillStyle = "rgba(0,0,0,0.6)"; rr(W / 2 - w / 2, H * 0.48 - 22, w, 44, 22); ctx.fill();
      fit(msg, W / 2, H * 0.48, 16, w - 20, "#fff");
      ctx.globalAlpha = 1;
    }
    if (st === "top") drawTop();
  }
  function drawTop() {
    const m = M();
    ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(0, 0, W, H);
    // 정상석
    const w = Math.min(230, W * 0.6), h = Math.min(H * 0.55, 220), x = W / 2 - w / 2, y = H * 0.12;
    ctx.fillStyle = "#d9d4c7"; rr(x, y, w, h, 26); ctx.fill();
    ctx.fillStyle = "#c5bfb0"; rr(x + 8, y + 8, w - 16, h - 16, 20); ctx.fill();
    fit(t(m.peak), W / 2, y + h * 0.36, 34, w - 30, "#2b2b2b", "800");
    fit(m.h + " m", W / 2, y + h * 0.6, 20, w - 30, "#2b2b2b", "700");
    fit(t(m.n), W / 2, y + h * 0.8, 15, w - 30, "#4a4a4a", "600");
    const sec = Math.round(elapsed), mm = Math.floor(sec / 60), ss = sec % 60; // 59.6초가 '0분 60초'로 안 보이게
    stxt(t("🎉 정상 도착!"), W / 2, y + h + 30, 22, "#ffe14a");
    stxt(t("{m}분 {s}초 · 박자 맞춘 걸음 {n}번", { m: mm, s: ss, n: good }), W / 2, y + h + 58, 15, "#fff", "center", "600");
    if (topT > 0.8) stxt(t("아래 버튼을 누르면 다시 내려가요"), W / 2, H - 22, 13, "#fff", "center", "500");
  }

  // ---------- 버튼 · 패널 ----------
  let btnKey = "";
  function setBtn() {
    if (!btn) return;
    let l = "", c = "";
    if (st === "ready") l = t("🥾 출발하기");
    else if (st === "top") l = t("▶ 다른 산 오르기");
    else if (restT > 0) { l = t("😮‍💨 쉬는 중"); c = "warn"; }
    else l = K.opt.easy ? t("🥾 한 걸음 (꾹 = 천천히 걷기)") : t("🥾 박자에 맞춰 한 걸음");
    if (l + c === btnKey) return; btnKey = l + c; btn.textContent = l; btn.className = "gbig " + c;
  }
  function renderPanel() {
    const P = root && root.querySelector("#mPanel"); if (!P) return;
    const vis = visitedSet();
    const list = MOUNTS.slice().sort((a, b) => (vis.has(b.id) - vis.has(a.id)));
    let h = '<article class="panel gcard"><h3>' + esc(t("어느 산에 오를까요?")) + "</h3>";
    if (vis.size) h += '<p class="muted" style="margin:0 0 8px">' + esc(t("✓ 표시는 내 기록에 있는 동네의 산이에요")) + (summitSet.size ? " · " + esc(t("🏅 는 바람소리 앱 기록으로 실제로 오른 산")) : "") + "</p>";
    h += '<div class="chips">' + list.map((m) => {
      const d = save.done[m.id];
      return '<button type="button" data-msel="' + m.id + '" class="' + (save.sel === m.id ? "on" : "") + '">' + (summitSet.has(m.n) ? "🏅 " : vis.has(m.id) ? "✓ " : "") + esc(t(m.n)) + (d ? " 🏁" : "") + "</button>";
    }).join("") + "</div>";
    const m = M(), d = save.done[m.id];
    h += '<p class="tk-like" style="margin:10px 0 0">' + esc(m.stops.map((s) => t(s)).join(" → ")) + " · " + m.h + "m" + (d ? " · " + esc(t("완등 {n}번 · 최고 {m}분 {s}초", { n: d.n, m: Math.floor(d.best / 60), s: d.best % 60 })) : "") + "</p></article>";
    const doneN = Object.keys(save.done).length;
    h += '<article class="panel gcard"><h3>' + esc(t("완등 도장 {n}/{all}", { n: doneN, all: MOUNTS.length })) + "</h3><p class=\"gtoday\">" + (doneN ? MOUNTS.filter((x) => save.done[x.id]).map((x) => "🏁 " + esc(t(x.n))).join(" · ") : esc(t("아직 없어요. 가까운 산부터 올라 볼까요?"))) + "</p>" +
      (st === "top" ? '<button type="button" class="btn" data-mshare>' + esc(t("완등 인증 문구 복사")) + '</button> <span class="muted" id="mShareMsg" aria-live="polite"></span>' : "") + "</article>";
    h += K.optHtml() + K.photoHtml("mount");
    P.innerHTML = h;
  }
  function onPanel(e) {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.msel) { save.sel = b.dataset.msel; store(); reset(); renderPanel(); }
    else if (b.hasAttribute("data-mshare")) {
      const m = M(), sec = Math.round(elapsed), text = t("바람소리 다시 오르는 산: {name} {peak} {h}m 완등! ({m}분 {s}초)", { name: t(m.n), peak: t(m.peak), h: m.h, m: Math.floor(sec / 60), s: sec % 60 });
      const out = root.querySelector("#mShareMsg");
      try { navigator.clipboard.writeText(text).then(() => { out.textContent = t("복사했어요"); }, () => { out.textContent = text; }); } catch (err) { out.textContent = text; }
    }
  }

  function build(el, kit) {
    K = kit; t = kit.t; esc = kit.esc; root = el;
    root.innerHTML = '<div class="gwrap"><canvas aria-label="' + esc(t("등산 게임 화면")) + '"></canvas></div><button type="button" class="gbig"></button><div id="mPanel" style="display:flex;flex-direction:column;gap:12px"></div>';
    cv = root.querySelector("canvas"); ctx = cv.getContext("2d"); btn = root.querySelector(".gbig");
    FONT = K.font();
    K.bindPress([cv, btn], press, release);
    root.querySelector("#mPanel").addEventListener("click", onPanel);
    window.addEventListener("resize", () => { if (K.visible(root)) resize(); });
    K.onOpt(() => { if (K.visible(root)) { renderPanel(); btnKey = ""; setBtn(); } });
  }
  function resize() { const r = K.canvasSize(cv, ctx, 0.95, 560); W = r.W; H = r.H; }
  function loop(ts) {
    if (!K.visible(root)) { running = false; holding = false; return; }
    const dt = Math.min(0.05, Math.max(0, (ts - last) / 1000)); last = ts; now += dt;
    update(dt); draw(); setBtn();
    requestAnimationFrame(loop);
  }
  function start() { resize(); renderPanel(); btnKey = ""; setBtn(); if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); } }
  function stop() { holding = false; }
  if (window.ZPLAY) ZPLAY.reg("mount", { build, start, stop, state: () => st, press, release });
})();
