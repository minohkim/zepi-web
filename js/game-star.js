// 제피 웹 · 놀이 · 별자리 잇기 — 오늘 탭(밤하늘)에서 열려요 (js/play.js)
// - 반짝이는 다음 별을 손가락으로 누르면 선이 이어져요. 다 이으면 별자리 그림과 이야기가 나와요
// - 쉬운 모드: 다음 별이 크게 깜빡이고, 아래 큰 버튼만 눌러도 하나씩 이어져요
// - 이번 달 밤하늘에 잘 보이는 별자리가 먼저 나와요. 별똥별을 누르면 소원 하나 ✨
(function () {
  "use strict";
  let K = null, t = (s) => s, esc = (s) => s;
  const KEY = "jepi.game.star.v1";
  // 좌표는 화면 비율(0~1). seq 의 null 은 선을 끊고 새로 시작
  const CONS = [
    { id: "cassio", n: "카시오페이아자리", season: "가을", mon: [9, 10, 11, 12, 1], stars: [[0.12, 0.4], [0.3, 0.62], [0.48, 0.46], [0.68, 0.64], [0.88, 0.38]], seq: [0, 1, 2, 3, 4], tip: "W 모양. 북극성을 사이에 두고 북두칠성과 마주 봐요" },
    { id: "orion", n: "오리온자리", season: "겨울", mon: [11, 12, 1, 2, 3], stars: [[0.3, 0.18], [0.7, 0.22], [0.42, 0.5], [0.5, 0.48], [0.58, 0.46], [0.34, 0.82], [0.72, 0.8]], seq: [1, 0, 2, 3, 4, 1, null, 2, 5, null, 4, 6], red: 0, tip: "가운데 나란한 세 별이 삼태성이에요" },
    { id: "dipper", n: "북두칠성", season: "봄", mon: [2, 3, 4, 5, 6], stars: [[0.8, 0.3], [0.82, 0.5], [0.63, 0.56], [0.58, 0.4], [0.44, 0.37], [0.3, 0.32], [0.14, 0.42]], seq: [6, 5, 4, 3, 0, 1, 2, 3], tip: "국자 끝 두 별을 따라가면 북극성이 있어요" },
    { id: "cygnus", n: "백조자리", season: "여름", mon: [6, 7, 8, 9, 10], stars: [[0.5, 0.12], [0.5, 0.42], [0.5, 0.62], [0.5, 0.88], [0.2, 0.36], [0.8, 0.5]], seq: [0, 1, 2, 3, null, 4, 1, 5], tip: "은하수 위를 나는 큰 십자가. 맨 위 밝은 별이 데네브" },
    { id: "scorpius", n: "전갈자리", season: "여름", mon: [6, 7, 8], stars: [[0.18, 0.14], [0.26, 0.24], [0.34, 0.36], [0.42, 0.5], [0.48, 0.64], [0.58, 0.76], [0.7, 0.82], [0.82, 0.76], [0.86, 0.64]], seq: [0, 1, 2, 3, 4, 5, 6, 7, 8], red: 2, tip: "붉은 심장별 안타레스가 빛나요" },
  ];
  const NOTES = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760, 2093, 2349];
  const month = () => new Date(Date.now() + 9 * 3600e3).getUTCMonth() + 1;
  function load() { try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && s.v === 1) return s; } catch (e) {} return { v: 1, done: {}, wish: 0, sel: null }; }
  let save = load();
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} }
  function ordered() { const m = month(); return CONS.slice().sort((a, b) => b.mon.includes(m) - a.mon.includes(m)); }
  const C = () => CONS.find((c) => c.id === save.sel) || ordered()[0];

  let root, cv, ctx, btn, W = 360, H = 360, F = 1, FONT = "sans-serif", running = false, last = 0, now = 0;
  let pos = 0, lines = [], doneT = -1, wrongT = 0, bg = [], shoot = null, shootT = 4, msg = "", msgT = 0;
  function reset() { pos = 0; skipNull(); lines = []; doneT = -1; setBtn(); }
  function skipNull() { const s = C().seq; while (pos < s.length && s[pos] === null) pos++; }
  function makeBg() { bg = []; for (let i = 0; i < 160; i++) bg.push([Math.random(), Math.random() * 0.85, Math.random() * 1.4 + 0.3, Math.random() * 6]); }
  const area = () => ({ x: W * 0.08, y: H * 0.1, w: W * 0.84, h: H * 0.7 });
  function sp(i) { const a = area(), s = C().stars[i]; return [a.x + s[0] * a.w, a.y + s[1] * a.h]; }
  function connect() {
    const c = C(), s = c.seq;
    if (pos >= s.length) return;
    const cur = s[pos], prev = pos > 0 ? s[pos - 1] : null;
    if (prev !== null && prev !== undefined) lines.push([prev, cur]);
    K.beep(NOTES[Math.min(NOTES.length - 1, lines.length)], 0.35, "sine", 0.16);
    pos++;
    if (pos < s.length && s[pos] === null) { pos++; }
    if (pos >= s.length) finish();
    setBtn();
  }
  function finish() {
    doneT = 0;
    const c = C(); save.done[c.id] = (save.done[c.id] || 0) + 1; store();
    [1047, 1319, 1568, 2093].forEach((f, i) => setTimeout(() => K.beep(f, 0.3, "sine", 0.14), i * 120));
    K.buzz([30, 30, 30]); renderPanel();
  }
  function tap(x, y) {
    if (shoot && Math.hypot(x - shoot.x, y - shoot.y) < 40) { shoot = null; save.wish++; store(); msg = t("🌠 별똥별! 소원 하나 빌었어요"); msgT = 2.4; K.beep(2093, 0.4, "sine", 0.12); renderPanel(); return; }
    if (doneT >= 0) return;
    const c = C(), want = c.seq[pos];
    let best = -1, bd = 1e9;
    c.stars.forEach((_, i) => { const [sx, sy] = sp(i); const d = Math.hypot(sx - x, sy - y); if (d < bd) { bd = d; best = i; } });
    const R = K.opt.easy ? 56 : 30;
    if (bd > R) return;
    // 별이 촘촘한 별자리(오리온 삼태성·전갈)에서 반경 안의 '다음 별'을 눌렀는데 옆 별이 조금 더 가까워 틀림 되던 것:
    // 다른 별 바로 위(8px 안)를 누른 게 아니면 다음 별로 받아 줘요
    const dw = want != null ? Math.hypot(sp(want)[0] - x, sp(want)[1] - y) : 1e9;
    if (best === want || (dw <= R && bd > 8)) connect();
    else { wrongT = 0.5; K.beep(200, 0.12, "triangle", 0.08); if (K.opt.easy) { msg = t("깜빡이는 별을 눌러 보세요"); msgT = 1.6; } }
  }
  function press() {
    if (doneT >= 0) { if (doneT > 0.8) { const o = ordered(), i = o.indexOf(C()); save.sel = o[(i + 1) % o.length].id; store(); reset(); renderPanel(); } return; }
    if (K.opt.easy) connect();
    else { msg = t("화면의 별을 직접 눌러 이어요"); msgT = 1.6; }
  }
  function update(dt) {
    if (doneT >= 0) doneT += dt;
    if (wrongT > 0) wrongT -= dt;
    if (msgT > 0) msgT -= dt;
    shootT -= dt;
    if (!shoot && shootT <= 0) { shoot = { x: W * (0.3 + Math.random() * 0.6), y: H * (0.05 + Math.random() * 0.2), vx: -W * 0.35, vy: H * 0.18, life: 1.6 }; shootT = 9 + Math.random() * 10; }
    if (shoot) { shoot.x += shoot.vx * dt; shoot.y += shoot.vy * dt; shoot.life -= dt; if (shoot.life <= 0) shoot = null; }
  }
  function txt(s, x, y, size, color, align, weight) { ctx.font = (weight || "700") + " " + Math.round(size * F) + "px " + FONT; ctx.textAlign = align || "center"; ctx.textBaseline = "middle"; ctx.fillStyle = color || "#fff"; ctx.fillText(s, x, y); }
  function fit(s, x, y, size, maxW, color, weight) { ctx.font = (weight || "700") + " " + Math.round(size * F) + "px " + FONT; const w = ctx.measureText(s).width; txt(s, x, y, w > maxW ? size * maxW / w : size, color, "center", weight); }
  function draw() {
    F = K.opt.big ? 1.25 : 1;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#050a1f"); g.addColorStop(0.7, "#10204a"); g.addColorStop(1, "#24345e");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 은하수
    ctx.save(); ctx.translate(W * 0.5, H * 0.45); ctx.rotate(-0.6);
    const mg = ctx.createLinearGradient(0, -H * 0.12, 0, H * 0.12); mg.addColorStop(0, "rgba(255,255,255,0)"); mg.addColorStop(0.5, "rgba(190,200,255,0.09)"); mg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = mg; ctx.fillRect(-W, -H * 0.12, W * 2, H * 0.24); ctx.restore();
    for (const [x, y, r, p] of bg) { ctx.globalAlpha = 0.4 + 0.4 * Math.sin(now * 1.5 + p); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x * W, y * H, r, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
    // 산 실루엣
    ctx.fillStyle = "#0a1226"; ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= 1.001; x += 0.05) ctx.lineTo(x * W, H * (0.88 + Math.sin(x * 7) * 0.04 + Math.sin(x * 17) * 0.015));
    ctx.lineTo(W, H); ctx.fill();
    // 별똥별
    if (shoot) { ctx.strokeStyle = "rgba(255,255,255," + Math.min(1, shoot.life) + ")"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(shoot.x, shoot.y); ctx.lineTo(shoot.x - shoot.vx * 0.15, shoot.y - shoot.vy * 0.15); ctx.stroke(); }
    const c = C();
    // 선
    ctx.strokeStyle = doneT >= 0 ? "rgba(242,183,5," + (0.7 + 0.3 * Math.sin(now * 3)) + ")" : "rgba(150,200,255,0.9)"; ctx.lineWidth = doneT >= 0 ? 3.5 : 2.5; ctx.lineCap = "round";
    for (const [a, b] of lines) { const [x1, y1] = sp(a), [x2, y2] = sp(b); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
    // 별
    const want = doneT < 0 ? c.seq[pos] : -1, prevI = pos > 0 ? c.seq[pos - 1] : null;
    c.stars.forEach((_, i) => {
      const [x, y] = sp(i), red = c.red === i;
      if (i === want && (K.opt.easy || lines.length === 0)) {
        const pr = 0.5 + 0.5 * Math.sin(now * 6);
        ctx.strokeStyle = "rgba(242,183,5," + (0.5 + 0.5 * pr) + ")"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, (14 + 8 * pr) * F, 0, 7); ctx.stroke();
        if (K.opt.easy && prevI !== null && prevI !== undefined && doneT < 0) { const [px, py] = sp(prevI); ctx.setLineDash([5, 6]); ctx.strokeStyle = "rgba(242,183,5,0.5)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]); }
      }
      const glow = ctx.createRadialGradient(x, y, 0, x, y, 12 * F);
      glow.addColorStop(0, red ? "rgba(255,150,120,1)" : "rgba(255,255,255,1)"); glow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, 12 * F, 0, 7); ctx.fill();
      ctx.fillStyle = red ? "#ffb39a" : "#fff"; ctx.beginPath(); ctx.arc(x, y, 3.5 * F, 0, 7); ctx.fill();
    });
    fit(t(c.n) + " · " + t(c.season), W / 2, 22, 17, W - 20, "#fff");
    if (doneT >= 0) {
      ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(0, H - 96 * F, W, 96 * F);
      fit(t("✨ {name} 완성!", { name: t(c.n) }), W / 2, H - 70 * F, 21, W - 24, "#ffe14a");
      fit(t(c.tip), W / 2, H - 42 * F, 14, W - 24, "#fff", "600");
      if (doneT > 0.8) fit(t("아래 버튼을 누르면 다음 별자리"), W / 2, H - 16 * F, 12, W - 24, "#cfd8ff", "500");
    } else {
      const total = c.seq.filter((x) => x !== null).length, d = c.seq.slice(0, pos).filter((x) => x !== null).length;
      fit(t("별 {d}/{n}", { d, n: total }), W / 2, H - 22, 15, W - 20, "#cfd8ff", "600");
    }
    if (msgT > 0) { ctx.globalAlpha = Math.min(1, msgT * 2); fit(msg, W / 2, H * 0.5, 17, W - 30, "#fff"); ctx.globalAlpha = 1; }
  }
  let btnKey = "";
  function setBtn() {
    if (!btn) return;
    const l = doneT >= 0 ? t("▶ 다음 별자리") : K.opt.easy ? t("✨ 다음 별 잇기") : t("👆 화면의 별을 누르세요");
    if (l === btnKey) return; btnKey = l; btn.textContent = l; btn.className = "gbig" + (doneT >= 0 ? " hot" : "");
  }
  function renderPanel() {
    const P = root && root.querySelector("#sPanel"); if (!P) return;
    const m = month();
    let h = '<article class="panel gcard"><h3>' + esc(t("별자리 고르기")) + '</h3><div class="chips">' + ordered().map((c) =>
      '<button type="button" data-ssel="' + c.id + '" class="' + (C().id === c.id ? "on" : "") + '">' + (c.mon.includes(m) ? "🌙 " : "") + esc(t(c.n)) + (save.done[c.id] ? " ✓" : "") + "</button>").join("") +
      '</div><p class="tk-like" style="margin:8px 0 0">' + esc(t("🌙 는 이번 달 밤하늘에 잘 보이는 별자리예요")) + "</p></article>";
    h += '<article class="panel gcard"><h3>' + esc(t("내 별자리 수첩")) + '</h3><p class="gtoday">' + esc(t("완성 {n}/{all} · 소원 {w}번", { n: Object.keys(save.done).length, all: CONS.length, w: save.wish })) + "</p></article>";
    h += K.optHtml();
    P.innerHTML = h;
  }
  function resize() { const r = K.canvasSize(cv, ctx, 0.95, 560); W = r.W; H = r.H; }
  function build(el, kit) {
    K = kit; t = kit.t; esc = kit.esc; root = el;
    root.innerHTML = '<div class="gwrap"><canvas aria-label="' + esc(t("별자리 게임 화면")) + '"></canvas></div><button type="button" class="gbig"></button><div id="sPanel" style="display:flex;flex-direction:column;gap:12px"></div>';
    cv = root.querySelector("canvas"); ctx = cv.getContext("2d"); btn = root.querySelector(".gbig");
    FONT = K.font(); makeBg(); skipNull();
    cv.addEventListener("pointerdown", (e) => { e.preventDefault(); const r = cv.getBoundingClientRect(); tap(e.clientX - r.left, e.clientY - r.top); });
    btn.addEventListener("click", press);
    root.querySelector("#sPanel").addEventListener("click", (e) => { const b = e.target.closest("[data-ssel]"); if (b) { save.sel = b.dataset.ssel; store(); reset(); renderPanel(); } });
    window.addEventListener("resize", () => { if (K.visible(root)) resize(); });
    K.onOpt(() => { if (K.visible(root)) { renderPanel(); btnKey = ""; setBtn(); } });
  }
  function loop(ts) {
    if (!K.visible(root)) { running = false; return; }
    const dt = Math.min(0.05, Math.max(0, (ts - last) / 1000)); last = ts; now += dt;
    update(dt); draw(); setBtn();
    requestAnimationFrame(loop);
  }
  function start() { resize(); renderPanel(); btnKey = ""; setBtn(); if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); } }
  if (window.ZPLAY) ZPLAY.reg("star", { build, start, stop() {}, press, tap, state: () => (doneT >= 0 ? "done" : "play") });
})();
