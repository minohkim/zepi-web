// 바람소리 웹 · 놀이 · 텃밭 게임 — 주말농장 탭에서 열려요 (js/play.js)
// - 밭 6칸. 칸을 눌러 심기 · 물 주기 · 벌레 잡기 · 수확
// - 큰 버튼 하나만 눌러도 돼요: 지금 가장 필요한 일(수확 → 벌레 → 물 → 씨 뿌리기)을 알아서 해요
// - 이번 달이 제철인 작물은 점수가 더 많아요
(function () {
  "use strict";
  let K = null, t = (s) => s, esc = (s) => s;
  const KEY = "jepi.game.farm.v1";
  const CROPS = [
    { id: "lettuce", n: "상추", ico: "🥬", grow: 10, mon: [3, 4, 5, 9, 10] },
    { id: "garlic", n: "마늘", ico: "🧄", grow: 17, mon: [9, 10, 11] },
    { id: "cabbage", n: "배추", ico: "🥬", grow: 18, mon: [8, 9, 10, 11] },
    { id: "potato", n: "감자", ico: "🥔", grow: 12, mon: [3, 4, 5, 6] },
    { id: "tomato", n: "방울토마토", ico: "🍅", grow: 16, mon: [5, 6, 7, 8] },
    { id: "pepper", n: "고추", ico: "🌶️", grow: 14, mon: [5, 6, 7, 8, 9] },
    { id: "cucumber", n: "오이", ico: "🥒", grow: 11, mon: [5, 6, 7, 8] },
    { id: "carrot", n: "당근", ico: "🥕", grow: 13, mon: [7, 8, 9, 10, 11] },
  ];
  const month = () => new Date(Date.now() + 9 * 3600e3).getUTCMonth() + 1;
  const inSeason = (c) => c.mon.includes(month());
  function load() { try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && s.v === 1) return { v: 1, seed: typeof s.seed === "string" ? s.seed : null, basket: s.basket && typeof s.basket === "object" && !Array.isArray(s.basket) ? s.basket : {}, pts: Number.isFinite(+s.pts) ? +s.pts : 0 }; } catch (e) {} /* 깨진 저장값이면 수확이 계속 실패하던 것 (QA 11-25) */ return { v: 1, seed: null, basket: {}, pts: 0 }; }
  let save = load();
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} }
  const seed = () => CROPS.find((c) => c.id === save.seed) || CROPS.find(inSeason) || CROPS[0];
  const plots = Array.from({ length: 6 }, () => ({ c: null, g: 0, w: 0, bug: false }));
  let root, grid, btn, info, running = false, last = 0, msgT = 0, bugT = 5, cool = 0;

  const dryRate = () => (K.opt.easy ? 100 / 16 : 100 / 9);
  function stage(p) { const k = p.g / p.c.grow; return k >= 1 ? 3 : k >= 0.55 ? 2 : k >= 0.2 ? 1 : 0; }
  function plant(p) { const c = seed(); p.c = c; p.g = 0; p.w = 80; p.bug = false; K.beep(520, 0.08, "triangle"); }
  function water(p) { p.w = 100; K.click(2500, 0.2); }
  function harvest(p) {
    const c = p.c, bonus = inSeason(c) ? 1.5 : 1, pts = Math.round(10 * c.grow / 10 * bonus);
    save.basket[c.id] = (save.basket[c.id] || 0) + 1; save.pts += pts; store();
    p.c = null; p.g = 0; p.bug = false;
    K.beep(784, 0.1); setTimeout(() => K.beep(1047, 0.14), 110); K.buzz(30);
    say(t("{ico} {name} 수확! +{n}점", { ico: c.ico, name: t(c.n), n: pts }) + (bonus > 1 ? " " + t("(제철 보너스)") : ""));
    renderPanel();
  }
  function act(p) {
    if (!p.c) plant(p);
    else if (stage(p) === 3) harvest(p);
    else if (p.bug) { p.bug = false; K.beep(300, 0.08, "square", 0.08); say(t("🐛 벌레를 잡았어요")); }
    else if (p.w < 70) water(p);
    else say(t("잘 자라는 중이에요 🌱"));
    paint();
  }
  // 큰 버튼: 지금 가장 필요한 일 하나 (전부)
  function next() {
    const ripe = plots.filter((p) => p.c && stage(p) === 3), bugs = plots.filter((p) => p.c && p.bug), dry = plots.filter((p) => p.c && p.w < 45), empty = plots.filter((p) => !p.c);
    if (ripe.length) return { k: "harvest", l: t("✨ 수확하기 ({n})", { n: ripe.length }), list: ripe };
    if (bugs.length) return { k: "bug", l: t("🐛 벌레 잡기 ({n})", { n: bugs.length }), list: bugs };
    if (dry.length) return { k: "water", l: t("💧 물 주기 ({n})", { n: dry.length }), list: dry };
    if (empty.length) return { k: "plant", l: t("🌱 {name} 심기 ({n})", { name: t(seed().n), n: empty.length }), list: empty };
    return { k: "wait", l: t("⏳ 자라기를 기다려요"), list: [] };
  }
  function press() {
    if (cool > 0) return;
    const n = next();
    if (n.k === "harvest") n.list.forEach(harvest);
    else if (n.k === "bug") { n.list.forEach((p) => { p.bug = false; }); K.beep(300, 0.08, "square", 0.08); say(t("🐛 벌레를 잡았어요")); }
    else if (n.k === "water") { n.list.forEach(water); say(t("💧 물을 흠뻑 줬어요")); }
    else if (n.k === "plant") { n.list.forEach(plant); say(t("🌱 씨를 뿌렸어요")); }
    else say(t("잘 자라는 중이에요 🌱"));
    cool = 0.25; paint();
  }
  function say(m) { if (info) { info.textContent = m; msgT = 2.5; } }
  function update(dt) {
    if (cool > 0) cool -= dt;
    if (msgT > 0) { msgT -= dt; if (msgT <= 0 && info) info.textContent = hint(); }
    bugT -= dt;
    if (bugT <= 0) {
      bugT = K.opt.easy ? 9 + Math.random() * 6 : 5 + Math.random() * 4;
      const c = plots.filter((p) => p.c && !p.bug && stage(p) < 3);
      if (c.length) { c[Math.floor(Math.random() * c.length)].bug = true; K.beep(220, 0.06, "square", 0.05); }
    }
    for (const p of plots) {
      if (!p.c || stage(p) === 3) continue;
      p.w = Math.max(0, p.w - dryRate() * dt);
      let rate = 1;
      if (p.w <= 0) rate = K.opt.easy ? 0.4 : 0;
      if (p.bug) rate *= K.opt.easy ? 0.5 : 0.15;
      p.g += dt * rate;
      if (stage(p) === 3) K.beep(988, 0.08, "triangle", 0.08);
    }
  }
  function hint() { return t("칸을 누르거나, 아래 큰 버튼을 누르세요. 큰 버튼은 지금 필요한 일을 알아서 해요"); }
  const SPROUT = ["🌱", "🌿", "🪴"];
  function paint() {
    if (!grid) return;
    plots.forEach((p, i) => {
      const el = grid.children[i];
      let ico = "🟫", lab = t("빈 칸 — 눌러서 심기"), bar = 0, drop = false;
      if (p.c) {
        const s = stage(p);
        ico = s === 3 ? p.c.ico : SPROUT[s];
        lab = t(p.c.n) + (s === 3 ? " — " + t("수확해요!") : p.bug ? " — " + t("벌레!") : p.w < 45 ? " — " + t("목말라요") : "");
        bar = Math.min(1, p.g / p.c.grow); drop = p.w < 45 && s < 3;
      }
      const key = ico + lab + Math.round(bar * 20) + drop + p.bug;
      if (el.dataset.k === key) return; el.dataset.k = key;
      el.setAttribute("aria-label", lab);
      el.className = "fplot" + (p.c && stage(p) === 3 ? " ripe" : "") + (drop ? " dry" : "");
      el.innerHTML = '<span class="fi">' + ico + "</span>" + (p.bug ? '<span class="fb">🐛</span>' : "") + (drop ? '<span class="fd">💧</span>' : "") +
        '<span class="fn">' + esc(p.c ? t(p.c.n) : t("빈 칸")) + '</span><span class="fp"><i style="width:' + Math.round(bar * 100) + '%"></i></span>';
    });
    const n = next();
    if (btn.textContent !== n.l) btn.textContent = n.l;
    btn.className = "gbig" + (n.k === "harvest" ? " hot" : "");
  }
  function renderPanel() {
    const P = root && root.querySelector("#fPanel"); if (!P) return;
    const cur = seed();
    let h = '<article class="panel gcard"><h3>' + esc(t("심을 씨앗")) + "</h3><div class=\"chips\">" +
      CROPS.map((c) => '<button type="button" data-fseed="' + c.id + '" class="' + (c.id === cur.id ? "on" : "") + '">' + c.ico + " " + esc(t(c.n)) + (inSeason(c) ? " ⭐" : "") + "</button>").join("") +
      '</div><p class="tk-like" style="margin:8px 0 0">' + esc(t("⭐ 는 이번 달 제철 — 점수 1.5배")) + "</p></article>";
    const got = CROPS.filter((c) => save.basket[c.id]);
    h += '<article class="panel gcard"><h3>' + esc(t("내 바구니 · {n}점", { n: save.pts })) + '</h3><p class="gtoday">' +
      (got.length ? got.map((c) => c.ico + " " + esc(t(c.n)) + " ×" + save.basket[c.id]).join(" · ") : esc(t("아직 비었어요"))) + "</p></article>";
    h += K.optHtml();
    P.innerHTML = h;
  }
  function build(el, kit) {
    K = kit; t = kit.t; esc = kit.esc; root = el;
    if (!document.getElementById("farmGameCss")) {
      const s = document.createElement("style"); s.id = "farmGameCss";
      s.textContent = ".fgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:14px;border-radius:var(--radius,20px);background:linear-gradient(#cfe7c4,#a9cf98)}" +
        ".fplot{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:118px;border-radius:16px;border:3px solid #7a5a3a;background:#8a6a48;color:#fff;font:inherit;cursor:pointer;touch-action:manipulation}" +
        ".fplot.ripe{border-color:#F2B705;box-shadow:0 0 0 3px rgba(242,183,5,.5)}.fplot.dry{background:#a58a68}" +
        ".fplot .fi{font-size:44px;line-height:1}.fplot .fn{font-size:14px;font-weight:700}.fplot .fb{position:absolute;top:6px;right:8px;font-size:24px}.fplot .fd{position:absolute;top:6px;left:8px;font-size:22px}" +
        ".fplot .fp{width:80%;height:6px;border-radius:3px;background:rgba(0,0,0,.3);overflow:hidden}.fplot .fp i{display:block;height:100%;background:#F2B705}" +
        ".finfo{min-height:24px;font-size:16px;text-align:center;color:var(--ink)}";
      document.head.appendChild(s);
    }
    root.innerHTML = '<div class="fgrid" role="group" aria-label="' + esc(t("텃밭 6칸")) + '"></div><p class="finfo" aria-live="polite"></p><button type="button" class="gbig"></button><div id="fPanel" style="display:flex;flex-direction:column;gap:12px"></div>';
    grid = root.querySelector(".fgrid"); btn = root.querySelector(".gbig"); info = root.querySelector(".finfo");
    for (let i = 0; i < 6; i++) { const b = document.createElement("button"); b.type = "button"; b.dataset.i = i; grid.appendChild(b); }
    grid.addEventListener("click", (e) => { const b = e.target.closest("[data-i]"); if (b) act(plots[+b.dataset.i]); });
    btn.addEventListener("click", press);
    root.querySelector("#fPanel").addEventListener("click", (e) => { const b = e.target.closest("[data-fseed]"); if (b) { save.seed = b.dataset.fseed; store(); renderPanel(); paint(); } });
    K.onOpt(() => { if (K.visible(root)) renderPanel(); });
    info.textContent = hint();
  }
  function loop(ts) {
    if (!K.visible(root)) { running = false; return; }
    const dt = Math.min(0.1, Math.max(0, (ts - last) / 1000)); last = ts;
    update(dt); paint();
    requestAnimationFrame(loop);
  }
  function start() { renderPanel(); paint(); if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); } }
  if (window.ZPLAY) ZPLAY.reg("farm", { build, start, stop() {}, press, state: () => next().k });
})();
