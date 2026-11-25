// 바람소리 웹 · 놀이 (탭마다 그 활동을 게임으로)
// - 바다 → 낚시 · 정복 지도 → 다시 오르는 산 · 주말농장 → 텃밭 · 오늘 → 별자리 잇기
// - 게임은 화면 전체를 덮는 놀이 창에서 열려요 (✕ 닫기 / Esc)
// - 모든 게임이 같은 설정을 써요: 쉬운 모드(기본), 큰 글씨, 소리
// - 내 사진을 배경으로 쓸 수 있어요 (사진은 이 브라우저에만 저장, 서버로 안 올라가요)
(function () {
  "use strict";
  const Z = window.ZI18N || { lang: "ko", t: (s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m)) : s) };
  const t = Z.t;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const OKEY = "jepi.play.v1";
  const GAMES = {}; // kind → { title, ico, sub, tab, build(el, K), start(), stop() }
  const ORDER = ["fish", "mount", "farm", "star"];
  const META = {
    fish: { ico: "🎣", n: "낚시 게임", sub: "찌낚시 · 루어 · 원투 — 어르신도 쉽게", tab: "sea" },
    mount: { ico: "⛰️", n: "다시 오르는 산", sub: "가 본 산을 게임으로 한 번 더", tab: "conquest" },
    farm: { ico: "🥬", n: "텃밭 게임", sub: "심고 물 주고 수확하기", tab: "farm" },
    star: { ico: "✨", n: "별자리 잇기", sub: "오늘 밤 보이는 별자리를 손가락으로", tab: "today" },
  };

  // ---------- 함께 쓰는 설정 ----------
  let opt = { easy: true, big: true, sound: true };
  try { const s = JSON.parse(localStorage.getItem(OKEY) || "null"); if (s) opt = Object.assign(opt, s); } catch (e) {}
  function saveOpt() { try { localStorage.setItem(OKEY, JSON.stringify(opt)); } catch (e) {} }

  // ---------- 소리 ----------
  let ac = null, noiseBuf = null;
  function audio() {
    if (!opt.sound) return null;
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
      return ac;
    } catch (e) { return null; }
  }
  function beep(f, d, type, v) {
    const a = audio(); if (!a) return;
    try {
      const o = a.createOscillator(), g = a.createGain();
      o.type = type || "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(v || 0.18, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + (d || 0.12));
      o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + (d || 0.12));
    } catch (e) {}
  }
  // 릴 드랙 소리: 짧은 금속성 "딱" 을 아주 빠르게 이어 붙여 "지이이익"
  function click(freq, vol) {
    const a = audio(); if (!a) return;
    try {
      if (!noiseBuf) {
        noiseBuf = a.createBuffer(1, Math.round(a.sampleRate * 0.02), a.sampleRate);
        const ch = noiseBuf.getChannelData(0);
        for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 3);
      }
      const src = a.createBufferSource(), bp = a.createBiquadFilter(), g = a.createGain();
      src.buffer = noiseBuf; bp.type = "bandpass"; bp.frequency.value = freq; bp.Q.value = 6;
      g.gain.value = vol;
      src.connect(bp); bp.connect(g); g.connect(a.destination); src.start();
    } catch (e) {}
  }
  // 휙 · 쉬이익 (던질 때 바람 소리): 잡음을 대역 필터로 훑어요
  let longNoise = null;
  function noise(a) {
    if (!longNoise) {
      longNoise = a.createBuffer(1, Math.round(a.sampleRate * 1.6), a.sampleRate);
      const ch = longNoise.getChannelData(0);
      for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    }
    return longNoise;
  }
  function swoosh(f0, f1, dur, vol, q) {
    const a = audio(); if (!a) return;
    try {
      const t0 = a.currentTime, src = a.createBufferSource(), bp = a.createBiquadFilter(), g = a.createGain();
      src.buffer = noise(a); bp.type = "bandpass"; bp.Q.value = q || 1.4;
      bp.frequency.setValueAtTime(f0, t0); bp.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(bp); bp.connect(g); g.connect(a.destination); src.start(t0); src.stop(t0 + dur + 0.05);
    } catch (e) {}
  }
  // 첨벙 · 퐁 (물에 떨어지는 소리)
  function splash(vol, low) {
    const a = audio(); if (!a) return;
    try {
      const t0 = a.currentTime, src = a.createBufferSource(), lp = a.createBiquadFilter(), g = a.createGain();
      src.buffer = noise(a); lp.type = "lowpass"; lp.frequency.setValueAtTime(low ? 900 : 2200, t0); lp.frequency.exponentialRampToValueAtTime(200, t0 + 0.4);
      g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + (low ? 0.5 : 0.25));
      src.connect(lp); lp.connect(g); g.connect(a.destination); src.start(t0); src.stop(t0 + 0.55);
      if (!low) { const o = a.createOscillator(), og = a.createGain(); o.frequency.setValueAtTime(900, t0); o.frequency.exponentialRampToValueAtTime(300, t0 + 0.08); og.gain.setValueAtTime(vol * 0.5, t0); og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1); o.connect(og); og.connect(a.destination); o.start(t0); o.stop(t0 + 0.12); }
    } catch (e) {}
  }
  let dragAcc = 0, reelAcc = 0;
  // rate: 초당 딸깍 수 (0 이면 조용). 매 화면마다 불러요
  function drag(rate, dt) { if (rate <= 0) { dragAcc = 0; return; } dragAcc += rate * dt; let n = 0; while (dragAcc >= 1 && n < 6) { dragAcc -= 1; n++; click(3600 + Math.random() * 900, 0.5); } }
  function reel(rate, dt) { if (rate <= 0) { reelAcc = 0; return; } reelAcc += rate * dt; let n = 0; while (reelAcc >= 1 && n < 3) { reelAcc -= 1; n++; click(1500 + Math.random() * 300, 0.22); } }
  // 진동: 바람소리 앱 안이면 폰의 햅틱으로 (웹뷰는 진동이 잘 안 돼요), 아니면 브라우저 진동
  function buzz(ms) {
    if (window.ZNATIVE) { const total = Array.isArray(ms) ? ms.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0) : ms; window.ZNATIVE.send("buzz", { ms: total }); return; }
    try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {}
  }

  // ---------- 내 사진 배경 ----------
  const photos = {};
  function photoKey(kind) { return "jepi.play.photo." + kind; }
  function photo(kind) {
    if (photos[kind] !== undefined) return photos[kind];
    photos[kind] = null;
    try {
      const u = localStorage.getItem(photoKey(kind));
      if (u) { const im = new Image(); im.onload = () => { photos[kind] = im; }; im.src = u; }
    } catch (e) {}
    return null;
  }
  function photoHtml(kind) {
    const has = (() => { try { return !!localStorage.getItem(photoKey(kind)); } catch (e) { return false; } })();
    return '<div class="chips gopt"><label class="btn">' + esc(t(has ? "📷 배경 사진 바꾸기" : "📷 내 사진을 배경으로")) +
      '<input type="file" accept="image/*" data-pphoto="' + kind + '" hidden></label>' +
      (has ? '<button type="button" data-pphotox="' + kind + '">' + esc(t("기본 배경으로")) + "</button>" : "") +
      '<span class="muted pnote">' + esc(t("가 본 동네·산 사진을 넣어 보세요. 사진은 이 기기에만 저장돼요")) + "</span></div>";
  }
  function setPhoto(kind, file, done) {
    if (!file) return;
    const im = new Image(), url = URL.createObjectURL(file);
    im.onload = () => {
      const k = Math.min(1, 900 / Math.max(im.width, im.height));
      const c = document.createElement("canvas"); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      let data = "";
      try { data = c.toDataURL("image/jpeg", 0.8); } catch (e) {}
      const out = new Image(); out.onload = () => { photos[kind] = out; done && done(); }; out.src = data || "";
      try { localStorage.setItem(photoKey(kind), data); } catch (e) {}
    };
    im.onerror = () => URL.revokeObjectURL(url);
    im.src = url;
  }
  function clearPhoto(kind) { photos[kind] = null; try { localStorage.removeItem(photoKey(kind)); } catch (e) {} }
  // 사진을 칸에 꽉 차게 (잘라서) 그려요
  function drawCover(ctx, im, x, y, w, h) {
    const k = Math.max(w / im.width, h / im.height), sw = w / k, sh = h / k;
    ctx.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, x, y, w, h);
  }

  // ---------- 설정 줄 ----------
  // o.noEasy: 게임이 자기 난이도 단추를 따로 쓸 때 (낚시)
  function optHtml(o) {
    return '<div class="chips gopt">' +
      (o && o.noEasy ? "" : '<button type="button" data-popt="easy" class="' + (opt.easy ? "on" : "") + '">' + esc(t(opt.easy ? "쉬운 모드 켜짐" : "도전 모드 (어려움)")) + "</button>") +
      '<button type="button" data-popt="big" class="' + (opt.big ? "on" : "") + '">' + esc(t("큰 글씨")) + "</button>" +
      '<button type="button" data-popt="sound" class="' + (opt.sound ? "on" : "") + '">' + esc(t(opt.sound ? "소리 켜짐" : "소리 꺼짐")) + "</button></div>";
  }
  const listeners = [];
  function onOpt(fn) { listeners.push(fn); }

  // ---------- 놀이 창 ----------
  let layer = null, cur = null, lastFocus = null;
  function css() {
    if (document.getElementById("playCss")) return;
    const st = document.createElement("style"); st.id = "playCss";
    st.textContent =
      ".playLayer{position:fixed;inset:0;z-index:60;background:var(--bg,#F7F5EE);overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}.playLayer:focus{outline:none}" +
      ".playBar{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:10px;padding:10px 14px;padding-top:max(10px,env(safe-area-inset-top));background:var(--surface,#fff);border-bottom:1px solid var(--line)}" +
      ".playBar b{font-family:var(--font-display);font-size:20px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      ".playBar .btn{font-size:16px;min-height:48px}" +
      ".playBody{max-width:680px;margin:0 auto;padding:14px 14px 40px}" +
      ".playGame{display:flex;flex-direction:column;gap:12px}" +
      ".playGame .gwrap{border-radius:var(--radius,20px);overflow:hidden;background:#0b1d33;line-height:0}" +
      ".playGame canvas{display:block;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}" +
      ".playGame .gbig{min-height:76px;border-radius:999px;border:0;background:var(--sun,#F2B705);color:var(--on-sun,#1B1A12);font:inherit;font-size:24px;font-weight:800;touch-action:manipulation;-webkit-user-select:none;user-select:none;box-shadow:0 3px 0 rgba(0,0,0,.18);cursor:pointer}" +
      ".playGame .gbig:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.18)}" +
      ".playGame .gbig.hot{background:#ff8a3d;color:#fff;animation:gpulse .5s infinite alternate}" +
      ".playGame .gbig.warn{background:#c2452d;color:#fff}" +
      "@keyframes gpulse{to{transform:scale(1.03)}}" +
      "@media (prefers-reduced-motion:reduce){.playGame .gbig.hot{animation:none}}" +
      ".playGame .gsea{display:flex;flex-wrap:wrap;gap:4px 8px;align-items:baseline;color:var(--muted);font-size:15px}" +
      ".playGame .gsea b{color:var(--ink)}.playGame .gcoin{margin-left:auto;color:var(--ink);font-weight:700}" +
      ".playGame .gpick{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}" +
      ".playGame .gpick button{display:flex;flex-direction:column;align-items:center;gap:2px;min-height:96px;padding:10px 6px;border-radius:16px;border:2px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;cursor:pointer}" +
      ".playGame .gpick button[aria-pressed=true]{border-color:var(--leaf);background:var(--leaf-soft)}" +
      ".playGame .gpick .i{font-size:28px;line-height:1.1}.playGame .gpick b{font-size:18px}.playGame .gpick small{font-size:12px;color:var(--muted);text-align:center;line-height:1.3}" +
      ".playGame .gopt{align-items:center}.playGame .gopt button,.playGame .gopt label.btn{min-height:44px;font-size:15px;padding:6px 14px}" +
      ".playGame .pnote{font-size:12px;flex:1 1 200px}" +
      ".playGame .gcard{padding:14px 16px}.playGame .gcard h3{margin:0 0 8px;font-size:17px}.playGame .gcard summary{cursor:pointer;font-weight:700;font-size:17px;min-height:32px}" +
      ".playGame .gtoday{font-size:16px;margin:0 0 10px}" +
      ".playGame .gdex-h{margin:12px 0 6px;font-weight:700}" +
      ".playGame .gdex{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:6px}" +
      ".playGame .gdex div{display:flex;flex-direction:column;padding:8px 10px;border-radius:12px;background:var(--bg);border:1px solid var(--line);color:var(--muted)}" +
      ".playGame .gdex div.got{background:var(--sun-soft);color:var(--ink)}.playGame .gdex span{font-size:12px}" +
      ".playGame .gshop{display:flex;flex-direction:column;gap:8px;margin-top:10px}" +
      ".playGame .gshop div{display:grid;grid-template-columns:1fr auto;gap:2px 10px;align-items:center}" +
      ".playGame .gshop span{grid-column:1;font-size:13px;color:var(--muted)}.playGame .gshop .btn{grid-row:1/3;grid-column:2}" +
      ".playGame .tk{display:flex;flex-direction:column;gap:6px}.playGame .tk-h{font-weight:700;font-size:15px;margin-top:4px}" +
      ".playGame .tk .chips button{min-height:44px;font-size:15px;padding:6px 12px}" +
      ".playGame .tk-like{font-size:13px;color:var(--muted)}" +
      ".playcard{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;padding:14px 16px;margin-bottom:14px;background:linear-gradient(90deg,var(--sun-soft),var(--surface) 70%)}" +
      ".playcard .i{font-size:34px;line-height:1}.playcard .tx{flex:1 1 180px;min-width:0;display:flex;flex-direction:column}.playcard .tx b{font-size:17px}.playcard .tx small{color:var(--muted);font-size:13px}" +
      ".playcard .btn.primary{min-height:48px;font-size:16px;padding:0 22px}" +
      ".playcard .others{flex-basis:100%;display:flex;flex-wrap:wrap;gap:6px;font-size:13px}" +
      ".playcard .others button{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:6px 10px;min-height:36px;font:inherit;font-size:13px;cursor:pointer}";
    document.head.appendChild(st);
  }
  function ensureLayer() {
    if (layer) return;
    css();
    layer = document.createElement("div");
    layer.className = "playLayer"; layer.hidden = true; layer.tabIndex = -1;
    layer.setAttribute("role", "dialog"); layer.setAttribute("aria-modal", "true"); layer.setAttribute("aria-labelledby", "playTitle");
    layer.innerHTML = '<div class="playBar"><b id="playTitle"></b><button type="button" class="btn" id="playClose">' + esc(t("✕ 닫기")) + '</button></div><div class="playBody" id="playBody"></div>';
    document.body.appendChild(layer);
    layer.querySelector("#playClose").addEventListener("click", close);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && layer && !layer.hidden) close(); });
    // 설정 · 사진 (게임 패널 어디서든)
    layer.addEventListener("click", (e) => {
      const b = e.target.closest("[data-popt],[data-pphotox],[data-popen]");
      if (!b) return;
      if (b.dataset.popt) { opt[b.dataset.popt] = !opt[b.dataset.popt]; saveOpt(); listeners.forEach((f) => f(b.dataset.popt)); }
      else if (b.dataset.pphotox) { clearPhoto(b.dataset.pphotox); listeners.forEach((f) => f("photo")); }
      else if (b.dataset.popen) open(b.dataset.popen);
    });
    layer.addEventListener("change", (e) => {
      const i = e.target.closest("[data-pphoto]");
      if (i && i.files && i.files[0]) setPhoto(i.dataset.pphoto, i.files[0], () => listeners.forEach((f) => f("photo")));
    });
  }
  function open(kind) {
    const g = GAMES[kind]; if (!g) return;
    ensureLayer();
    if (cur && cur !== kind && GAMES[cur].stop) GAMES[cur].stop();
    if (layer.hidden) lastFocus = document.activeElement;
    layer.hidden = false;
    document.documentElement.style.overflow = "hidden";
    layer.querySelector("#playTitle").textContent = META[kind].ico + " " + t(META[kind].n);
    const body = layer.querySelector("#playBody");
    for (const k of Object.keys(GAMES)) { const el = body.querySelector('[data-pgame="' + k + '"]'); if (el) el.hidden = k !== kind; }
    let el = body.querySelector('[data-pgame="' + kind + '"]');
    if (!el) { el = document.createElement("div"); el.className = "playGame"; el.dataset.pgame = kind; body.appendChild(el); g.build(el, K); }
    // 다른 게임으로 바로 가기
    let ot = el.querySelector(".pothers");
    if (!ot) { ot = document.createElement("div"); ot.className = "chips gopt pothers"; el.appendChild(ot); }
    ot.innerHTML = ORDER.filter((k) => k !== kind && GAMES[k]).map((k) => '<button type="button" data-popen="' + k + '">' + META[k].ico + " " + esc(t(META[k].n)) + "</button>").join("");
    cur = kind;
    layer.scrollTop = 0;
    g.start();
    // 닫기 단추에 포커스를 두면 열자마자 Space·Enter로 닫혀요 (앱 웹뷰에선 앱으로 돌아감) → 창 자체에
    layer.focus({ preventScroll: true });
  }
  function close() {
    if (!layer || layer.hidden) return;
    if (cur && GAMES[cur].stop) GAMES[cur].stop();
    layer.hidden = true; cur = null;
    document.documentElement.style.overflow = "";
    try { lastFocus && lastFocus.focus({ preventScroll: true }); } catch (e) {}
    if (window.ZPLAY && typeof window.ZPLAY.onClose === "function") window.ZPLAY.onClose();
  }

  // ---------- 탭마다 '게임으로 해보기' 카드 ----------
  function cards() {
    css();
    for (const kind of ORDER) {
      const m = META[kind], sec = document.getElementById("view-" + m.tab);
      if (!sec || sec.querySelector('.playcard[data-pcard="' + kind + '"]')) continue;
      const c = document.createElement("article");
      c.className = "panel playcard"; c.dataset.pcard = kind;
      c.innerHTML = '<span class="i" aria-hidden="true">' + m.ico + '</span><div class="tx"><b>' + esc(t(m.n)) + "</b><small>" + esc(t(m.sub)) + '</small></div><button type="button" class="btn primary" data-popen="' + kind + '">' + esc(t("▶ 게임 하기")) + "</button>" +
        '<div class="others">' + ORDER.filter((k) => k !== kind).map((k) => '<button type="button" data-popen="' + k + '">' + META[k].ico + " " + esc(t(META[k].n)) + "</button>").join("") + "</div>";
      c.addEventListener("click", (e) => { const b = e.target.closest("[data-popen]"); if (b) open(b.dataset.popen); });
      sec.insertBefore(c, sec.firstChild);
    }
  }

  // 큰 버튼 + 캔버스 공용 입력 (누름/뗌)
  function bindPress(els, press, release) {
    for (const el of els) {
      el.addEventListener("pointerdown", (e) => { e.preventDefault(); audio(); press(); });
      el.addEventListener("contextmenu", (e) => e.preventDefault());
    }
    const btn = els.find((e) => e.tagName === "BUTTON");
    if (btn) {
      btn.addEventListener("keydown", (e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); press(); } });
      btn.addEventListener("keyup", (e) => { if (e.key === " " || e.key === "Enter") release(); });
    }
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
  }
  function canvasSize(cv, ctx, ratio, maxH) {
    const box = cv.parentElement.clientWidth || 360, W = Math.min(680, box);
    const H = Math.round(Math.max(300, Math.min(W * ratio, maxH || 560, (window.innerHeight || 700) * 0.62)));
    const d = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * d); cv.height = Math.round(H * d);
    cv.style.width = W + "px"; cv.style.height = H + "px";
    ctx.setTransform(d, 0, 0, d, 0, 0);
    return { W, H };
  }
  function font() { try { return getComputedStyle(document.documentElement).getPropertyValue("--font-body").trim() || "sans-serif"; } catch (e) { return "sans-serif"; } }
  // 지금 이 게임 창이 보이는지 (안 보이면 그리기를 멈춰요)
  function visible(el) { return !!(layer && !layer.hidden && el && !el.hidden); }

  const K = { t, esc, opt, beep, click, drag, reel, buzz, swoosh, splash, photo, photoHtml, drawCover, optHtml, onOpt, bindPress, canvasSize, font, visible };
  K.opt = opt;
  function reg(kind, g) { GAMES[kind] = g; }

  window.ZPLAY = { reg, open, close, kit: K, cards, kinds: () => Object.keys(GAMES), current: () => cur };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", cards); else cards();
})();
