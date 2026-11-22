// 제피 웹 · 놀이 · 바다 낚시 게임 (찌낚시 · 루어 · 원투) — 바다 탭에서 열려요 (js/play.js)
// - 쉬운 모드: 큰 버튼 하나, 한 번씩 탭만. 고기가 도망가지 않아요 (어르신도 바로)
// - 도전 모드: 던지는 힘 게이지, 텐션 관리(줄 터짐·빠짐), 짧은 챔질 시간
// - 오늘 실제 물때(음력)와 시간대(아침·저녁 피딩)가 입질 속도에 들어가요
(function () {
  "use strict";
  const Z = window.ZI18N || { lang: "ko", t: (s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m)) : s) };
  const t = Z.t;
  let K = null; // 놀이 공용 도구 (play.js)
  const LU = window.ZLUNAR || null;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const KEY = "jepi.game.v1";

  // ---------- 낚시 방법 · 장소 · 어종 ----------
  const MODES = {
    float: { ico: "🎈", n: "찌낚시", d: "찌가 쏙 들어가면 탭", spot: "갯바위" },
    lure: { ico: "🎣", n: "루어", d: "톡톡 움직여서 유혹", spot: "방파제" },
    surf: { ico: "🏖️", n: "원투", d: "멀리 던지고 방울 소리 기다리기", spot: "백사장" },
  };
  const PLACES = { W: "서해", S: "남해", E: "동해" };
  const PI = { W: 0, S: 1, E: 2 };
  // m: f=찌, l=루어, s=원투 · r: [서해, 남해, 동해] 많이 나오는 정도 · rare: 귀한 고기
  const SP = [
    { id: "surfperch", n: "망상어", m: "f", r: [2, 3, 3], min: 12, max: 25, str: 0.6, p: 1.5, c: "#6f7f8f", tip: "봄에 새끼를 낳는 물고기예요" },
    { id: "rockfish", n: "볼락", m: "fl", r: [1, 3, 2], min: 12, max: 28, str: 0.7, p: 2.5, c: "#6a4e3a", tip: "밤에 잘 무는 눈 큰 물고기" },
    { id: "halfbeak", n: "학꽁치", m: "f", r: [1, 2, 3], min: 20, max: 35, str: 0.5, p: 1.5, c: "#9fb8c8", shape: "needle", tip: "아래턱이 바늘처럼 길어요" },
    { id: "blackfish", n: "벵에돔", m: "f", r: [0, 3, 1], min: 25, max: 45, str: 1.3, p: 4, c: "#2f3a40", tip: "남해 갯바위의 인기 손님" },
    { id: "seabream", n: "감성돔", m: "fs", r: [2, 3, 1], min: 30, max: 55, str: 1.4, p: 4, c: "#5a6470", tip: "바다의 왕자, 겨울이 제철" },
    { id: "mackerel", n: "고등어", m: "fl", r: [2, 2, 2], min: 25, max: 40, str: 1.1, p: 2, c: "#3f6f8f", tip: "떼로 몰려다녀요" },
    { id: "greenling", n: "노래미", m: "fl", r: [3, 1, 2], min: 20, max: 38, str: 0.8, p: 1.5, c: "#7a5a3a", tip: "바위 틈에 숨어 살아요" },
    { id: "korockfish", n: "우럭", m: "l", r: [3, 1, 1], min: 20, max: 45, str: 1, p: 2, c: "#3d3a35", tip: "서해 방파제의 단골" },
    { id: "flounder", n: "광어", m: "ls", r: [3, 2, 1], min: 35, max: 70, str: 1.3, p: 3, c: "#6b5a40", shape: "flat", tip: "눈이 왼쪽에 몰려 있어요" },
    { id: "seabass", n: "농어", m: "l", r: [3, 2, 2], min: 40, max: 85, str: 1.55, p: 3.5, c: "#9aa6ad", tip: "물 위로 뛰어오르며 바늘을 털어요" },
    { id: "spmackerel", n: "삼치", m: "l", r: [1, 2, 2], min: 40, max: 80, str: 1.6, p: 3, c: "#7f97a8", tip: "이빨이 날카로워요" },
    { id: "squid", n: "무늬오징어", m: "l", r: [0, 3, 1], min: 15, max: 35, str: 0.9, p: 5, c: "#c9a7d8", shape: "squid", tip: "가을 에깅의 주인공" },
    { id: "sillago", n: "보리멸", m: "s", r: [1, 2, 3], min: 15, max: 28, str: 0.5, p: 2, c: "#d8c9a0", tip: "모래밭의 은빛 미인" },
    { id: "marbled", n: "도다리", m: "s", r: [3, 2, 1], min: 20, max: 40, str: 0.8, p: 2.5, c: "#7a6a50", shape: "flat", tip: "봄 도다리쑥국이 유명해요" },
    { id: "righteye", n: "가자미", m: "s", r: [1, 1, 3], min: 15, max: 35, str: 0.7, p: 2, c: "#8a7a60", shape: "flat", tip: "동해 백사장 원투의 단골" },
    { id: "conger", n: "붕장어", m: "s", r: [2, 2, 2], min: 40, max: 90, str: 1.2, p: 1.5, c: "#5a4a3a", shape: "eel", tip: "밤에 잘 물어요 (아나고)" },
    { id: "croaker", n: "백조기", m: "s", r: [3, 1, 0], min: 20, max: 35, str: 0.7, p: 2, c: "#c8c8c0", tip: "서해 여름 원투의 손님" },
    { id: "redbream", n: "참돔", m: "fs", r: [1, 2, 1], min: 40, max: 80, str: 1.8, p: 6, c: "#d9666a", rare: 1, tip: "귀한 바다의 여왕" },
    { id: "boot", n: "장화", m: "fls", r: [1, 1, 1], min: 0, max: 0, str: 0.3, p: 0, c: "#2b2b2b", junk: 1, tip: "바다 청소도 낚시꾼의 몫" },
  ];
  const SHOP = [
    { id: "line", n: "튼튼한 원줄", d: "줄이 덜 터지고, 감기가 쉬워져요", cost: 150 },
    { id: "chum", n: "밑밥", d: "입질이 더 빨리 와요", cost: 200 },
    { id: "reel", n: "고급 릴", d: "더 빨리 감겨요", cost: 300 },
    { id: "shiny", n: "반짝이 채비", d: "귀한 고기·큰 고기가 더 잘 나와요", cost: 500 },
  ];

  // ---------- 채비 · 미끼 ----------
  // 고기마다 좋아하는 미끼 (없으면 0.6배). 원투는 미끼 · 봉돌 · 바늘 수까지 골라요
  const TK = {
    float: [
      { key: "bait", h: "미끼", items: [
        { id: "krill", n: "크릴", d: "찌낚시 기본 미끼, 거의 다 잘 먹어요" },
        { id: "worm", n: "청갯지렁이", d: "노래미·볼락이 좋아해요" },
        { id: "shrimp", n: "깐새우", d: "감성돔·참돔 노리기" },
      ] },
      { key: "depth", h: "수심 (찌 밑 길이)", items: [
        { id: "shallow", n: "얕게 (1~2m)", d: "학꽁치·고등어처럼 위에 노는 고기" },
        { id: "mid", n: "중간 (3~4m)", d: "무난해요" },
        { id: "deep", n: "깊게 (5m~ 바닥)", d: "감성돔·노래미처럼 바닥 고기" },
      ] },
    ],
    lure: [
      { key: "bait", h: "루어", items: [
        { id: "minnow", n: "미노우", d: "작은 물고기 모양 — 농어·삼치" },
        { id: "jig", n: "메탈지그", d: "멀리 날아가요 — 삼치·고등어" },
        { id: "softworm", n: "웜 (지그헤드)", d: "바닥을 톡톡 — 우럭·광어·볼락" },
        { id: "egi", n: "에기", d: "오징어 전용 새우 모양 루어" },
      ] },
    ],
    surf: [
      { key: "bait", h: "미끼", items: [
        { id: "worm", n: "청갯지렁이", d: "원투 기본 — 보리멸·가자미·백조기" },
        { id: "honmushi", n: "참갯지렁이 (혼무시)", d: "굵고 냄새가 진해요 — 도다리·감성돔" },
        { id: "krill", n: "크릴", d: "싸고 무난하지만 잘 떨어져요" },
        { id: "squidstrip", n: "오징어살", d: "질겨서 오래가요 — 붕장어·광어" },
        { id: "saury", n: "꽁치살", d: "기름 냄새로 밤 고기를 불러요 — 붕장어" },
        { id: "ghostshrimp", n: "쏙 (갯가재)", d: "대물 감성돔·참돔의 특효 미끼" },
      ] },
      { key: "sinker", h: "봉돌 (무게)", items: [
        { id: "s15", n: "15호 · 가까이", d: "가까운 곳, 던지기 쉬워요" },
        { id: "s25", n: "25호 · 중간", d: "가장 많이 써요" },
        { id: "s30", n: "30호 · 멀리", d: "멀리 갈수록 큰 고기, 대신 입질이 늦어요" },
      ] },
      { key: "hooks", h: "바늘", items: [
        { id: "h1", n: "외바늘", d: "큰 고기 한 마리 집중" },
        { id: "h2", n: "두바늘 (편대)", d: "가끔 두 마리가 한 번에!" },
      ] },
    ],
  };
  const BAIT = {
    surfperch: { krill: 2, worm: 2 }, rockfish: { worm: 2, krill: 1.5, softworm: 2.5, minnow: 1 },
    halfbeak: { krill: 3, shrimp: 0.5 }, blackfish: { krill: 3, shrimp: 1 }, seabream: { krill: 2, shrimp: 2.5, honmushi: 2.5, ghostshrimp: 3, squidstrip: 0.5 },
    mackerel: { krill: 2, jig: 2.5, minnow: 1 }, greenling: { worm: 3, krill: 1, softworm: 2.5 }, korockfish: { softworm: 3, minnow: 1, jig: 1 },
    flounder: { softworm: 3, jig: 1.5, squidstrip: 2, saury: 1.5, worm: 0.5 }, seabass: { minnow: 3, jig: 1 }, spmackerel: { jig: 3, minnow: 2 },
    squid: { egi: 4 }, sillago: { worm: 3, honmushi: 2, krill: 0.3, squidstrip: 0.2, saury: 0.2, ghostshrimp: 0.3 },
    marbled: { worm: 2, honmushi: 3, krill: 1, squidstrip: 0.5 }, righteye: { worm: 3, honmushi: 2, krill: 0.8 },
    conger: { saury: 3, squidstrip: 2.5, worm: 1, krill: 0.3 }, croaker: { worm: 2.5, honmushi: 2, krill: 1 },
    redbream: { honmushi: 2, ghostshrimp: 2, krill: 1.5, shrimp: 2, squidstrip: 1 },
  };
  // 찌 수심: 위에 노는 고기 / 바닥 고기
  const TOP = { halfbeak: 1, mackerel: 1, surfperch: 0.5 }, BOTTOM = { seabream: 1, greenling: 1, rockfish: 0.5, redbream: 0.5, blackfish: 0.3 };
  function tk(key) {
    const groups = TK[mode()] || [], g = groups.find((x) => x.key === key);
    if (!g) return null;
    const cur = (save.tk[mode()] || {})[key];
    return g.items.find((i) => i.id === cur) ? cur : g.items[{ depth: 1, sinker: 1 }[key] || 0].id;
  }
  function baitMul(s) {
    const b = tk("bait");
    if (b === "egi") return s.id === "squid" ? 4 : 0.04;
    if (s.id === "squid") return 0;
    const m = BAIT[s.id];
    return m && m[b] != null ? m[b] : 0.6;
  }
  function depthMul(s) {
    const d = tk("depth"); if (!d || d === "mid") return 1;
    if (d === "shallow") return TOP[s.id] ? 1 + 2 * TOP[s.id] : BOTTOM[s.id] ? 0.4 : 1;
    return BOTTOM[s.id] ? 1 + 2 * BOTTOM[s.id] : TOP[s.id] ? 0.3 : 1;
  }
  // 이 채비에 잘 무는 고기 (장소까지 따져서) — 화면에 알려 줘요
  function likes() {
    const ml = mode()[0], pi = PI[save.place];
    return SP.filter((s) => !s.junk && s.m.includes(ml) && s.r[pi] > 0).map((s) => [s, s.r[pi] * baitMul(s) * depthMul(s) * (s.rare ? 0.35 : 1)])
      .filter((x) => x[1] >= 1.5).sort((a, b) => b[1] - a[1]).slice(0, 4).map((x) => t(x[0].n));
  }

  // ---------- 저장 ----------
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && s.v === 1) return Object.assign(fresh(), s); } catch (e) {}
    return fresh();
  }
  function fresh() { return { v: 1, coins: 0, total: 0, dex: {}, gear: {}, mode: "float", place: "W", tk: {} }; }
  let save = load();
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} }

  // ---------- 오늘 물때 · 시간 ----------
  function seaToday() {
    const now = new Date();
    const h = (now.getUTCHours() + 9) % 24;
    const feed = (h >= 5 && h < 8) || (h >= 16 && h < 19);
    let mulText = "", sn = "중간";
    if (LU) {
      try {
        const l = LU.lunarDay(now), m = LU.mul(l);
        mulText = m.n ? t("{n}물", { n: m.n }) : t(m.name);
        sn = LU.springNeap(l);
      } catch (e) {}
    }
    const k = (sn === "사리" ? 0.8 : sn === "조금" ? 1.15 : 1) * (feed ? 0.8 : 1);
    return { mulText, sn, feed, k };
  }
  let SEA = seaToday();

  // ---------- 소리 (play.js 공용) ----------
  const beep = (f, d, ty, v) => K && K.beep(f, d, ty, v);
  function bell() { beep(1568, 0.18, "triangle", 0.2); setTimeout(() => beep(1760, 0.22, "triangle", 0.2), 140); }
  const buzz = (ms) => K && K.buzz(ms);

  // ---------- 게임 상태 ----------
  const G = { s: "ready", msg: "", msgT: 0 };
  let cast = 0.5, power = 0, aimT = 0, flyT = 0, waitT = 0, biteAt = 0, biteT = 0, nibbles = [], fakeT = 0;
  let lureK = 0, lureTaps = 0, lureNeed = 2, lureBite = -1, hopT = 0, retrT = 0;
  let fish = null, T = 0, P = 0, slackT = 0, holding = false, res = null, perfect = false, hookPt = null, warnT = 0, now = 0;
  const sess = [];

  const mode = () => save.mode;
  const easy = () => !K || K.opt.easy;
  function flash(m) { G.msg = m; G.msgT = 2.2; }

  function pickFish() {
    const ml = mode()[0], pi = PI[save.place];
    const list = SP.filter((s) => s.m.includes(ml));
    let tot = 0;
    const ws = list.map((s) => {
      let w = s.junk ? 0.35 : s.r[pi] * baitMul(s) * depthMul(s);
      if (!s.junk && s.str >= 1.2) w *= 0.6 + 0.8 * cast; // 멀리 던질수록 큰 고기
      if (s.rare) w *= 0.35 * (save.gear.shiny ? 1.8 : 1);
      if (!s.junk && save.gear.shiny && s.str >= 1.3) w *= 1.3;
      tot += w; return w;
    });
    let r = Math.random() * tot, i = 0;
    for (; i < list.length - 1; i++) { r -= ws[i]; if (r <= 0) break; }
    const s = list[i];
    const size = s.junk ? 0 : Math.round(clamp(rnd(s.min, s.max) * (0.92 + 0.2 * cast) * (save.gear.shiny ? 1.05 : 1), s.min, s.max * 1.12));
    const sf = s.junk ? 0 : clamp((size - s.min) / (s.max - s.min), 0, 1.2);
    return Object.assign({}, s, { size, st: s.str * (0.8 + 0.5 * sf), run: false, rt: 1 });
  }

  function toReady() { G.s = "ready"; holding = false; setBtn(); }
  function startCast() {
    if (!easy() && mode() !== "float") { G.s = "aim"; aimT = Math.random() * 2; setBtn(); return; }
    cast = mode() === "float" ? rnd(0.3, 0.55) : mode() === "lure" ? (tk("bait") === "jig" ? rnd(0.72, 0.9) : rnd(0.55, 0.75)) : surfDist();
    throwIt();
  }
  function surfDist() { const k = tk("sinker"); return k === "s15" ? rnd(0.5, 0.65) : k === "s30" ? rnd(0.9, 1) : rnd(0.72, 0.86); }
  function throwIt() { G.s = "fly"; flyT = 0; beep(500, 0.15, "triangle"); setBtn(); }
  function landed() {
    beep(240, 0.08, "sine", 0.12);
    if (mode() === "lure") {
      G.s = "retr"; lureK = 0; lureTaps = 0; lureBite = -1; retrT = 0;
      lureNeed = easy() ? Math.floor(rnd(1, 3.99)) : Math.floor(rnd(3, 5.99));
    } else {
      G.s = "wait"; waitT = 0; fakeT = 0;
      const base = mode() === "surf" ? rnd(3, 6.5) * (0.8 + 0.4 * cast) * (tk("bait") === "krill" ? 0.85 : 1) : rnd(2, 5);
      biteAt = base * SEA.k * (save.gear.chum ? 0.7 : 1);
      nibbles = [];
      const k = Math.floor(rnd(0, 3));
      for (let i = 0; i < k; i++) { const x = rnd(0.6, biteAt - 0.6); if (x > 0.5) nibbles.push(x); }
    }
    setBtn();
  }
  function startBite() { G.s = "bite"; biteT = 0; buzz([120, 60, 120]); if (mode() === "surf") bell(); else beep(880, 0.18, "square", 0.12); setBtn(); }
  function hook() {
    perfect = biteT < (easy() ? 0.5 : 0.25);
    hookPt = tackle();
    fish = pickFish(); T = 30; P = 15; slackT = 0; fish.rt = rnd(0.6, 1.2);
    G.s = "fight"; beep(300, 0.1, "sawtooth", 0.1); buzz(50);
    if (perfect) flash(t("⚡ 퍼펙트 챔질!"));
    setBtn();
  }
  function endFight(kind) {
    let pts = 0, isNew = false, second = null;
    if (kind === "catch") {
      pts = fish.junk ? 5 : Math.round(fish.size * fish.p * (perfect ? 1.2 : 1) * (easy() ? 1 : 1.5));
      const d = save.dex[fish.id];
      isNew = !d && !fish.junk;
      save.dex[fish.id] = { n: (d ? d.n : 0) + 1, max: Math.max(d ? d.max : 0, fish.size) };
      save.coins += pts; save.total += pts; store();
      sess.push({ n: fish.n, size: fish.size, junk: !!fish.junk });
      // 두바늘 원투: 가끔 한 마리 더
      if (mode() === "surf" && tk("hooks") === "h2" && !fish.junk && Math.random() < 0.3) {
        const keep = fish; let two = pickFish(); fish = keep;
        if (!two.junk) {
          if (two.size > keep.size) two = Object.assign(two, { size: Math.max(two.min, Math.round(keep.size * 0.8)) });
          const d2 = save.dex[two.id];
          save.dex[two.id] = { n: (d2 ? d2.n : 0) + 1, max: Math.max(d2 ? d2.max : 0, two.size) };
          const p2 = Math.round(two.size * two.p * (easy() ? 1 : 1.5));
          pts += p2; save.coins += p2; save.total += p2; store();
          sess.push({ n: two.n, size: two.size, junk: false });
          second = two;
        }
      }
      beep(660, 0.1); setTimeout(() => beep(880, 0.1), 110); setTimeout(() => beep(1175, 0.22), 220); buzz([40, 40, 40]);
    } else { beep(150, 0.35, "sawtooth", 0.08); buzz(200); }
    res = { kind, fish, pts, isNew, second, t: 0 };
    G.s = "result"; holding = false; setBtn(); renderPanel();
  }

  // ---------- 입력 ----------
  function press() {
    holding = true;
    switch (G.s) {
      case "ready": startCast(); holding = false; break;
      case "aim": cast = 0.3 + power * 0.7; if (mode() === "surf") { const k = tk("sinker"); cast = Math.min(cast, k === "s15" ? 0.68 : k === "s25" ? 0.88 : 1); } throwIt(); holding = false; break;
      case "wait":
        if (easy()) flash(t(mode() === "surf" ? "아직이에요. 방울이 울리면 탭!" : "아직이에요. 찌가 쏙 들어가면 탭!"));
        else { flash(t("너무 빨라요! 고기가 놀랐어요")); beep(180, 0.2, "square", 0.08); waitT = 0; }
        holding = false; break;
      case "retr":
        lureTaps++; hopT = 0.3; lureK = Math.min(0.97, lureK + 0.02); beep(700, 0.05, "triangle", 0.08);
        if (lureTaps >= lureNeed && lureBite < 0) lureBite = rnd(0.2, 0.7);
        holding = false; break;
      case "bite": hook(); break;
      case "fight":
        if (easy()) { const f = (save.gear.reel ? 1.25 : 1) * (save.gear.line ? 1.15 : 1) * (fish.run ? 0.45 : 1); P += 8 / (0.6 + 0.4 * fish.st) * f; beep(fish.run ? 260 : 420, 0.04, "triangle", 0.07); }
        break;
      case "result": if (res.t > 0.5) { toReady(); } break;
    }
  }
  function release() { holding = false; }

  // ---------- 업데이트 ----------
  function update(dt) {
    if (G.msgT > 0) G.msgT -= dt;
    const s = G.s;
    if (s === "aim") { aimT += dt * 1.2; power = (1 - Math.cos(aimT * Math.PI)) / 2; }
    else if (s === "fly") { flyT += dt / (mode() === "surf" ? 1.0 : 0.75); if (flyT >= 1) { flyT = 1; landed(); } }
    else if (s === "wait") {
      waitT += dt;
      if (mode() === "surf") { for (const n of nibbles) if (waitT >= n && waitT - dt < n) beep(1568, 0.06, "triangle", 0.06); }
      if (waitT >= biteAt) startBite();
    }
    else if (s === "retr") {
      retrT += dt; lureK += dt * 0.045; if (hopT > 0) hopT -= dt;
      if (easy() && retrT > 6 && lureBite < 0) lureBite = 0.3;
      if (lureBite >= 0) { lureBite -= dt; if (lureBite <= 0) { startBite(); return; } }
      if (lureK >= 0.97) { flash(t("입질이 없었어요. 다시 던져 보세요")); toReady(); }
    }
    else if (s === "bite") { biteT += dt; if (biteT > (easy() ? 3 : 1)) { flash(t("놓쳤어요. 다시 던져 보세요")); toReady(); } }
    else if (s === "fight") fight(dt);
    if (s !== "fight") { K.drag(0, dt); K.reel(0, dt); }
    else if (s === "result") res.t += dt;
  }
  function fight(dt) {
    fish.rt -= dt;
    if (fish.rt <= 0) { fish.run = !fish.run; fish.rt = fish.run ? rnd(0.5, 1.1) : rnd(0.8, 1.8); if (fish.run) { buzz(60); setBtn(); } else setBtn(); }
    const st = fish.st;
    // 릴 소리: 고기가 차고 나가면 드랙이 "지이이익", 감을 땐 "딸깍딸깍"
    const lim = save.gear.line ? 115 : 100;
    K.drag(fish.run ? 28 + 26 * st : (!easy() && T > lim * 0.75 ? 16 : 0), dt);
    K.reel(holding && !fish.run ? 10 : 0, dt);
    if (easy()) {
      if (holding) P += (13 / (0.6 + 0.4 * st)) * dt * (save.gear.reel ? 1.25 : 1) * (fish.run ? 0.45 : 1);
      T = fish.run ? 70 : 40;
      if (P >= 100) endFight("catch");
      return;
    }
    const pull = fish.run ? 75 * st : 12 * st, reel = save.gear.reel ? 1.25 : 1, snapAt = save.gear.line ? 115 : 100;
    if (holding) { T += (28 + pull) * dt; P += (24 / (0.5 + st * 0.6)) * dt * (fish.run ? 0.25 : 1) * reel; }
    else { T -= 65 * dt; T += pull * 0.2 * dt; P -= (fish.run ? 14 : 4) * st * dt; }
    T = clamp(T, 0, snapAt + 5);
    if (T < 6) slackT += dt; else slackT = 0;
    if (T > snapAt * 0.85) { warnT -= dt; if (warnT <= 0) { beep(1400, 0.04, "square", 0.05); warnT = 0.15; } }
    if (T >= snapAt) endFight("snap");
    else if (P <= 0 || slackT > 2.2) endFight("escape");
    else if (P >= 100) endFight("catch");
  }

  // ---------- 화면 ----------
  let root, cv, ctx, btn, W = 360, H = 360, S = 1, F = 1, running = false, last = 0, FONT = "sans-serif";
  function resize() {
    if (!cv) return;
    const r = K.canvasSize(cv, ctx, 0.92, 560); W = r.W; H = r.H;
    S = clamp(Math.min(W, H) / 380, 0.8, 1.5);
  }
  const hy = () => H * (K && K.photo("fish") ? 0.46 : 0.34);
  function feet() { return mode() === "surf" ? { x: W * 0.15, y: H * 0.86 } : { x: W * 0.14, y: H * 0.8 }; }
  function hand() { const f = feet(); return { x: f.x + 13 * S, y: f.y - 48 * S }; }
  function shore() { return mode() === "surf" ? { x: W * 0.3, y: H * 0.8 } : { x: W * 0.36, y: H * 0.85 }; }
  function tgt(d) { return { x: W * (0.42 + 0.48 * d), y: H * (0.74 - 0.32 * d) }; }
  function rodA() {
    if (G.s === "aim") return -1.2 - power * 0.55;
    if (G.s === "fight") return -1.05 + T / 100 * 0.6;
    if (G.s === "bite" && mode() === "surf") return -0.9;
    return -1.05;
  }
  function tip() {
    const h = hand(), L = Math.min(W, H) * (mode() === "surf" ? 0.34 : 0.27), a = rodA();
    let x = h.x + Math.cos(a) * L, y = h.y + Math.sin(a) * L;
    if (mode() === "surf") {
      const shake = G.s === "bite" ? 7 : G.s === "wait" && nibbles.some((n) => Math.abs(waitT - n) < 0.25) ? 2.5 : 0;
      x += Math.sin(now * 45) * shake * S;
    }
    return { x, y };
  }
  function tackle() {
    const tg = tgt(cast);
    if (G.s === "fly") { const tp = tip(), k = flyT; return { x: lerp(tp.x, tg.x, k), y: lerp(tp.y, tg.y, k) - Math.sin(Math.PI * k) * H * (mode() === "surf" ? 0.3 : 0.22) }; }
    if (G.s === "retr" || (G.s === "bite" && mode() === "lure")) { const sh = shore(); return { x: lerp(tg.x, sh.x, lureK), y: lerp(tg.y, sh.y, lureK) - (hopT > 0 ? Math.sin(hopT / 0.3 * Math.PI) * 8 * S : 0) }; }
    if (G.s === "fight") { const sh = shore(), k = clamp(P, 0, 100) / 100; return { x: lerp(hookPt.x, sh.x, k) + (fish.run ? Math.sin(now * 30) * 3 : 0), y: lerp(hookPt.y, sh.y, k) }; }
    return tg;
  }

  function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  function mix(a, b, k) { const x = hex(a), y = hex(b); return "rgb(" + x.map((v, i) => Math.round(lerp(v, y[i], k))).join(",") + ")"; }
  function rr(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function txt(s, x, y, size, color, align, weight) { ctx.font = (weight || "700") + " " + Math.round(size * F) + "px " + FONT; ctx.textAlign = align || "center"; ctx.textBaseline = "middle"; ctx.fillStyle = color || "#fff"; ctx.fillText(s, x, y); }
  function stxt(s, x, y, size, color, align, weight) { ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.65)"; ctx.shadowBlur = 6; ctx.shadowOffsetY = 1; txt(s, x, y, size, color, align, weight); ctx.restore(); }
  function fitTxt(s, x, y, size, maxW, color, weight) { ctx.font = (weight || "700") + " " + Math.round(size * F) + "px " + FONT; let k = 1; const w = ctx.measureText(s).width; if (w > maxW) k = maxW / w; txt(s, x, y, size * k, color, "center", weight); }

  // 장소마다 바다 색이 조금 달라요 (서해는 탁하게, 동해는 짙푸르게)
  const SEA_COL = { W: ["#7fb0b8", "#2f5d66"], S: ["#5aa7cf", "#0d4f7a"], E: ["#3f8fd0", "#08386a"] };
  function drawScene() {
    const h = hy();
    const hr = (new Date().getUTCHours() + 9) % 24;
    const dusk = hr >= 17 || hr < 6 ? 0.65 : hr >= 15 ? 0.3 : 0;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, mix("#4aa3df", "#4b4f8f", dusk)); g.addColorStop(1, mix("#d6eef8", "#f3a774", dusk));
    const ph = K.photo("fish");
    if (ph) { K.drawCover(ctx, ph, 0, 0, W, h + 1); }
    else {
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, h + 1);
      ctx.fillStyle = mix("#fff6c9", "#ff9a5a", dusk); ctx.beginPath(); ctx.arc(W * 0.8, lerp(H * 0.1, h - 6, dusk), Math.min(W, H) * 0.055, 0, 7); ctx.fill();
      ctx.fillStyle = mix("#6d8fa8", "#5c4a70", dusk);
      ctx.beginPath(); ctx.moveTo(W * 0.42, h); ctx.quadraticCurveTo(W * 0.53, h - H * 0.05, W * 0.66, h); ctx.fill();
      ctx.beginPath(); ctx.moveTo(W * 0.6, h); ctx.quadraticCurveTo(W * 0.67, h - H * 0.025, W * 0.76, h); ctx.fill();
    }
    const sc = SEA_COL[save.place] || SEA_COL.S;
    const s = ctx.createLinearGradient(0, h, 0, H);
    s.addColorStop(0, mix(sc[0], "#b07a78", dusk * 0.6)); s.addColorStop(1, mix(sc[1], "#142a50", dusk * 0.6));
    ctx.fillStyle = s; ctx.fillRect(0, h, W, H - h);
    ctx.strokeStyle = "rgba(255,255,255,0.16)"; ctx.lineWidth = 1.5;
    for (let i = 0; i < 34; i++) {
      const f = Math.pow(i / 34, 1.6), yy = h + 8 + f * (H - h), len = 8 + f * 40, span = W + 100;
      const o1 = ((i * 137.5 + now * (10 + i)) % span) - 50;
      ctx.beginPath(); ctx.moveTo(o1, yy); ctx.lineTo(o1 + len, yy); ctx.stroke();
    }
    if (mode() === "surf") {
      // 백사장 + 파도 거품
      ctx.fillStyle = "#e6d3a3";
      ctx.beginPath(); ctx.moveTo(0, H * 0.78); ctx.quadraticCurveTo(W * 0.5, H * 0.74 + Math.sin(now) * 3, W, H * 0.8); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, H * 0.78 - 2 + Math.sin(now * 1.3) * 2); ctx.quadraticCurveTo(W * 0.5, H * 0.74 - 3 + Math.sin(now) * 3, W, H * 0.8 - 2); ctx.stroke();
      // 받침대
      const f = feet();
      ctx.strokeStyle = "#555"; ctx.lineWidth = 3 * S;
      ctx.beginPath(); ctx.moveTo(f.x + 22 * S, f.y + 2); ctx.lineTo(f.x + 22 * S, f.y - 36 * S); ctx.stroke();
    } else if (mode() === "float") {
      // 갯바위
      ctx.fillStyle = "#5b5148";
      ctx.beginPath(); ctx.moveTo(0, H * 0.8); ctx.lineTo(W * 0.1, H * 0.79); ctx.lineTo(W * 0.24, H * 0.81); ctx.lineTo(W * 0.3, H * 0.88); ctx.lineTo(W * 0.27, H); ctx.lineTo(0, H); ctx.fill();
      ctx.fillStyle = "#6e6358"; ctx.beginPath(); ctx.moveTo(W * 0.24, H * 0.83); ctx.lineTo(W * 0.34, H * 0.9); ctx.lineTo(W * 0.38, H); ctx.lineTo(W * 0.26, H); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillRect(W * 0.3 + Math.sin(now * 2) * 4, H * 0.9, 18 * S, 2);
    } else {
      // 방파제 + 테트라포드
      ctx.fillStyle = "#9aa0a6";
      ctx.beginPath(); ctx.moveTo(0, H * 0.8); ctx.lineTo(W * 0.26, H * 0.8); ctx.lineTo(W * 0.3, H); ctx.lineTo(0, H); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fillRect(0, H * 0.8, W * 0.26, 3);
      const r = Math.min(W, H) * 0.05;
      [[0.27, 0.86], [0.31, 0.92], [0.25, 0.97], [0.34, 0.99]].forEach(([x, y]) => tetra(W * x, H * y, r));
    }
  }
  function tetra(x, y, r) {
    ctx.fillStyle = "#b8bcc0"; ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 1;
    for (let k = 0; k < 3; k++) {
      const a = -Math.PI / 2 + k * 2 * Math.PI / 3;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a - 0.4) * r * 0.4, y + Math.sin(a - 0.4) * r * 0.4);
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      ctx.lineTo(x + Math.cos(a + 0.4) * r * 0.4, y + Math.sin(a + 0.4) * r * 0.4);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(x, y, r * 0.3, 0, 7); ctx.fill();
  }
  function drawAngler() {
    const f = feet(), h = hand(), s = S;
    ctx.strokeStyle = "#1d2430"; ctx.lineCap = "round"; ctx.lineWidth = 5 * s;
    ctx.beginPath(); ctx.moveTo(f.x - 6 * s, f.y); ctx.lineTo(f.x - 1 * s, f.y - 28 * s); ctx.moveTo(f.x + 7 * s, f.y); ctx.lineTo(f.x + 2 * s, f.y - 28 * s); ctx.stroke();
    ctx.fillStyle = "#e8742c"; rr(f.x - 10 * s, f.y - 56 * s, 20 * s, 30 * s, 5 * s); ctx.fill(); // 구명조끼
    ctx.fillStyle = "#F2B705"; ctx.fillRect(f.x - 10 * s, f.y - 44 * s, 20 * s, 3 * s);
    ctx.fillStyle = "#e9c3a0"; ctx.beginPath(); ctx.arc(f.x + 1 * s, f.y - 64 * s, 8 * s, 0, 7); ctx.fill();
    ctx.fillStyle = "#1F6B3A"; ctx.beginPath(); ctx.arc(f.x + 1 * s, f.y - 66 * s, 8.5 * s, Math.PI, 0); ctx.fill(); ctx.fillRect(f.x + 1 * s, f.y - 67 * s, 13 * s, 3 * s);
    const tp = tip(), mx = (h.x + tp.x) / 2, my = (h.y + tp.y) / 2, bend = (G.s === "fight" ? T / 100 * 28 : G.s === "bite" && mode() === "surf" ? 18 : 4) * s;
    ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 3 * s;
    ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.quadraticCurveTo(mx + bend * 0.6, my + bend * 0.2, tp.x, tp.y); ctx.stroke();
    ctx.strokeStyle = "#e8742c"; ctx.lineWidth = 5 * s; ctx.beginPath(); ctx.moveTo(f.x + 4 * s, f.y - 50 * s); ctx.lineTo(h.x, h.y); ctx.stroke();
    ctx.fillStyle = "#c0c4c8"; ctx.beginPath(); ctx.arc(h.x + 2 * s, h.y + 5 * s, 4 * s, 0, 7); ctx.fill();
    if (mode() === "surf") { // 방울
      ctx.fillStyle = "#F2B705"; ctx.beginPath(); ctx.arc(tp.x, tp.y + 5 * s, 4.5 * s, 0, 7); ctx.fill();
      if (G.s === "bite") { ctx.strokeStyle = "rgba(255,225,74,0.9)"; ctx.lineWidth = 2; for (let i = 1; i <= 2; i++) { ctx.beginPath(); ctx.arc(tp.x, tp.y + 5 * s, (8 + i * 6 + Math.sin(now * 20) * 2) * s, -0.8, 0.8); ctx.stroke(); ctx.beginPath(); ctx.arc(tp.x, tp.y + 5 * s, (8 + i * 6 + Math.sin(now * 20) * 2) * s, Math.PI - 0.8, Math.PI + 0.8); ctx.stroke(); } }
    }
  }
  function drawTackle() {
    const tp = tip(), b = tackle(), m = mode();
    let bo = 0;
    if (G.s === "wait" && m === "float") { bo = Math.sin(now * 3) * 1.5; if (nibbles.some((n) => Math.abs(waitT - n) < 0.15)) bo += 5; }
    const sag = G.s === "fight" ? (1 - Math.min(T, 100) / 100) * 50 + 2 : G.s === "retr" ? 8 : 25;
    ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(tp.x, tp.y); ctx.quadraticCurveTo((tp.x + b.x) / 2, (tp.y + b.y) / 2 + sag, b.x, b.y + bo); ctx.stroke();
    const sc = (1 - 0.45 * cast) * S;
    if (G.s === "fight") {
      const len = (fish.junk ? 24 : fish.size * 0.7 + 8) * S * (1 - 0.3 * cast * (1 - P / 100));
      ctx.fillStyle = "rgba(5,20,35,0.55)"; ctx.beginPath(); ctx.ellipse(b.x + len * 0.3, b.y + 6, len * 0.55, len * 0.16, Math.sin(now * 6) * 0.15, 0, 7); ctx.fill();
      if (fish.run) { ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { const a = -Math.PI / 2 + (i - 1.5) * 0.5; ctx.beginPath(); ctx.moveTo(b.x + Math.cos(a) * 6, b.y + Math.sin(a) * 6); ctx.lineTo(b.x + Math.cos(a) * 18, b.y + Math.sin(a) * 18); ctx.stroke(); } }
      return;
    }
    if (G.s === "bite") {
      for (let i = 0; i < 3; i++) { const rp = ((biteT * 2) + i / 3) % 1; ctx.strokeStyle = "rgba(255,255,255," + (0.7 * (1 - rp)) + ")"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(b.x, b.y + 3 * sc, (4 + rp * 30) * sc, (1.5 + rp * 9) * sc, 0, 0, 7); ctx.stroke(); }
      const pulse = 1 + Math.sin(now * 20) * 0.12;
      const mk = m === "surf" ? tp : b;
      stxt("!", mk.x, mk.y - 36 * S, 50 * pulse * S / F, "#ffe14a");
      if (m === "float") return; // 찌는 물속으로
    }
    if (m === "float" || (G.s === "fly" && m === "float")) {
      if (G.s === "wait") { const rp = (now * 0.8) % 1; ctx.strokeStyle = "rgba(255,255,255," + (0.4 * (1 - rp)) + ")"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(b.x, b.y + 3 * sc, (6 + rp * 16) * sc, (2 + rp * 5) * sc, 0, 0, 7); ctx.stroke(); }
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(b.x, b.y + bo, 6 * sc, 0, 7); ctx.fill();
      ctx.fillStyle = "#ff3b3b"; ctx.beginPath(); ctx.arc(b.x, b.y + bo, 6 * sc, Math.PI, 0); ctx.fill();
      ctx.fillRect(b.x - 1.2 * sc, b.y + bo - 15 * sc, 2.4 * sc, 10 * sc);
    } else if (m === "lure") {
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(-0.3);
      ctx.fillStyle = "#dfe6ec"; ctx.beginPath(); ctx.ellipse(0, 0, 8 * sc, 3.5 * sc, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#F2B705"; ctx.beginPath(); ctx.ellipse(-3 * sc, 0, 3 * sc, 2 * sc, 0, 0, 7); ctx.fill();
      ctx.restore();
      if (G.s === "retr" && hopT > 0) { ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(b.x, b.y + 6, 12 * sc, 3 * sc, 0, 0, 7); ctx.stroke(); }
    } else if (G.s === "fly") {
      ctx.fillStyle = "#555"; ctx.beginPath(); ctx.arc(b.x, b.y, 4 * sc, 0, 7); ctx.fill();
    } else if (G.s === "wait") {
      const rp = (now * 0.5) % 1; ctx.strokeStyle = "rgba(255,255,255," + (0.25 * (1 - rp)) + ")"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(b.x, b.y, (4 + rp * 10) * sc, (1 + rp * 3) * sc, 0, 0, 7); ctx.stroke();
    }
  }
  function drawFish(x, y, len, f) {
    if (f.junk) { ctx.fillStyle = "#3a3a3a"; rr(x - len * 0.15, y - len * 0.4, len * 0.3, len * 0.6, 6); ctx.fill(); rr(x - len * 0.15, y + len * 0.05, len * 0.55, len * 0.2, 8); ctx.fill(); ctx.fillStyle = "#e8c34a"; ctx.fillRect(x - len * 0.15, y - len * 0.36, len * 0.3, 4); return; }
    ctx.fillStyle = f.c;
    if (f.shape === "squid") {
      ctx.beginPath(); ctx.ellipse(x + len * 0.12, y, len * 0.3, len * 0.15, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + len * 0.4, y); ctx.lineTo(x + len * 0.25, y - len * 0.2); ctx.lineTo(x + len * 0.25, y + len * 0.2); ctx.fill();
      ctx.strokeStyle = f.c; ctx.lineWidth = 3; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x - len * 0.15, y + i * 3); ctx.quadraticCurveTo(x - len * 0.32, y + i * 6, x - len * 0.45, y + i * 8); ctx.stroke(); }
      ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(x - len * 0.1, y - 2, 3, 0, 7); ctx.fill(); return;
    }
    if (f.shape === "eel") {
      ctx.strokeStyle = f.c; ctx.lineWidth = len * 0.1; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x - len * 0.45, y); ctx.bezierCurveTo(x - len * 0.15, y - len * 0.15, x + len * 0.15, y + len * 0.15, x + len * 0.45, y); ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x - len * 0.42, y - len * 0.02, 3, 0, 7); ctx.fill(); return;
    }
    const th = f.shape === "flat" ? 0.26 : f.shape === "needle" ? 0.09 : 0.17;
    ctx.beginPath(); ctx.moveTo(x + len * 0.38, y); ctx.lineTo(x + len * 0.58, y - len * 0.18); ctx.lineTo(x + len * 0.58, y + len * 0.18); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, y, len * 0.42, len * th, 0, 0, 7); ctx.fill();
    if (f.shape === "needle") { ctx.fillRect(x - len * 0.62, y + 1, len * 0.22, 2); }
    else { ctx.beginPath(); ctx.moveTo(x - len * 0.12, y - len * (th - 0.02)); ctx.lineTo(x + len * 0.12, y - len * (th + 0.1)); ctx.lineTo(x + len * 0.22, y - len * (th - 0.04)); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.beginPath(); ctx.ellipse(x - len * 0.02, y + len * th * 0.35, len * 0.32, len * th * 0.4, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x - len * 0.3, y - len * 0.04, len * 0.045, 0, 7); ctx.fill();
    ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(x - len * 0.31, y - len * 0.04, len * 0.022, 0, 7); ctx.fill();
  }
  function hint(a, col) { stxt(a, W / 2, H * 0.13, 21, col || "#fff"); }
  function drawHud() {
    const m = mode(), s = G.s;
    if (s === "ready") hint(t("{ico} {name} — 아래 버튼을 누르세요", { ico: MODES[m].ico, name: t(MODES[m].n) }));
    else if (s === "aim") {
      const tg = tgt(0.3 + power * 0.7);
      ctx.strokeStyle = "rgba(255,240,150,0.95)"; ctx.setLineDash([4, 4]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(tg.x, tg.y, 18 * S, 6 * S, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      const gx = W - 34, gy = H * 0.24, gh = H * 0.46;
      ctx.fillStyle = "rgba(0,0,0,0.35)"; rr(gx, gy, 20, gh, 10); ctx.fill();
      ctx.fillStyle = power > 0.75 ? "#ff8a5a" : power > 0.4 ? "#F2B705" : "#62BE84"; rr(gx + 3, gy + 3 + (gh - 6) * (1 - power), 14, (gh - 6) * power, 7); ctx.fill();
      hint(t("멀리 갈수록 큰 고기 · 타이밍에 탭"));
    }
    else if (s === "wait") hint(t(m === "surf" ? "방울 소리를 기다려요… 🔔" : "찌를 보세요… 쏙 들어가면 탭!"));
    else if (s === "retr") hint(t("톡! 톡! 탭해서 루어를 움직여요"));
    else if (s === "bite") hint(t("지금 탭!!"), "#ffe14a");
    else if (s === "fight") {
      const x = 16, w = W - 32, y = 16;
      if (!easy()) {
        const snapAt = save.gear.line ? 115 : 100;
        ctx.fillStyle = "rgba(0,0,0,0.4)"; rr(x, y, w, 18, 9); ctx.fill();
        ctx.fillStyle = "rgba(255,90,90,0.45)"; ctx.fillRect(x + w * 0.85, y + 2, w * 0.15 - 2, 14);
        ctx.fillStyle = T > snapAt * 0.85 ? "#ff5a5a" : T < 10 ? "#9fb3c8" : "#62BE84"; rr(x + 2, y + 2, Math.max(4, (w - 4) * Math.min(T / snapAt, 1)), 14, 7); ctx.fill();
        stxt(t("텐션"), x + 4, y + 32, 13, "#fff", "left", "600");
        if (T > snapAt * 0.85) { ctx.strokeStyle = "rgba(255,60,60," + (0.4 + 0.3 * Math.sin(now * 30)) + ")"; ctx.lineWidth = 10; ctx.strokeRect(0, 0, W, H); }
      }
      const py = easy() ? y : y + 46;
      ctx.fillStyle = "rgba(0,0,0,0.4)"; rr(x, py, w, 16, 8); ctx.fill();
      ctx.fillStyle = "#F2B705"; rr(x + 2, py + 2, Math.max(4, (w - 4) * clamp(P, 0, 100) / 100), 12, 6); ctx.fill();
      stxt(t("끌어올리기 {n}%", { n: Math.round(clamp(P, 0, 100)) }), x + 4, py + 30, 14, "#fff", "left", "700");
      if (fish.run) { stxt(t("고기가 힘써요! 🐟💨"), W / 2, H * 0.3, 20, "#ffb4a0"); stxt(t("지이이익~ (드랙)"), W / 2, H * 0.3 + 28 * F, 14, "#ffe0d6", "center", "600"); }
      else if (!easy() && slackT > 0.6) stxt(t("줄이 느슨해요! 감아요!"), W / 2, H * 0.3, 20, "#ffe14a");
    }
    if (G.msgT > 0) {
      ctx.globalAlpha = Math.min(1, G.msgT * 2);
      ctx.font = "700 " + Math.round(16 * F) + "px " + FONT;
      const w = Math.min(W - 20, ctx.measureText(G.msg).width + 36);
      const my = H * (G.s === "fight" ? 0.62 : 0.45);
      ctx.fillStyle = "rgba(0,0,0,0.65)"; rr(W / 2 - w / 2, my - 22, w, 44, 22); ctx.fill();
      fitTxt(G.msg, W / 2, my, 16, w - 20, "#fff");
      ctx.globalAlpha = 1;
    }
  }
  function drawResult() {
    ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(0, 0, W, H);
    const w = Math.min(360, W - 24), h = Math.min(H - 24, 300), x = W / 2 - w / 2, y = H / 2 - h / 2, cx = W / 2, f = res.fish;
    ctx.fillStyle = "rgba(14,30,26,0.95)"; rr(x, y, w, h, 20); ctx.fill();
    if (res.kind === "catch") {
      fitTxt(f.junk ? t("😅 …장화네요") : (res.isNew ? t("🎉 처음 낚았어요!") : t("🎉 낚았다!")), cx, y + 32, 22, w - 30, res.isNew ? "#ffe14a" : "#fff");
      drawFish(cx, y + h * 0.36, Math.min(170, w * 0.5), f);
      fitTxt(f.junk ? t("바다 청소 완료") : t(f.n) + "  " + f.size + "cm", cx, y + h * 0.58, 24, w - 30, "#fff");
      fitTxt("+" + res.pts + t("점") + (perfect && !f.junk ? "  ⚡" : ""), cx, y + h * 0.71, 22, w - 30, "#F2B705");
      fitTxt(res.second ? t("두바늘에 한 마리 더! {name} {n}cm", { name: t(res.second.n), n: res.second.size }) : t(f.tip), cx, y + h * 0.82, 14, w - 30, res.second ? "#ffe14a" : "#cfe0d6", res.second ? "700" : "500");
    } else {
      fitTxt(res.kind === "snap" ? t("💥 줄이 터졌어요") : t("🐟 빠져버렸어요"), cx, y + 40, 22, w - 30, "#ffb4a0");
      fitTxt(f.junk ? t("(사실 장화였어요…)") : t("놓친 고기: {name} {n}cm", { name: t(f.n), n: f.size }), cx, y + h * 0.38, 18, w - 30, "#fff", "600");
      fitTxt(t(res.kind === "snap" ? "고기가 힘쓸 땐 손을 떼세요" : "너무 오래 풀어줬어요. 짧게 여러 번 감아요"), cx, y + h * 0.56, 15, w - 30, "#cfe0d6", "500");
      fitTxt(t("어렵다면 '쉬운 모드'를 켜 보세요"), cx, y + h * 0.68, 14, "#cfe0d6", "500");
    }
    if (res.t > 0.5) fitTxt(t("아래 버튼을 누르면 계속해요"), cx, y + h - 22, 14, w - 30, "rgba(255,255,255," + (0.6 + 0.4 * Math.sin(now * 4)) + ")", "600");
  }
  function draw() {
    F = K.opt.big ? 1.25 : 1;
    drawScene();
    if (["fly", "wait", "retr", "bite", "fight"].includes(G.s)) drawTackle();
    drawAngler();
    if (G.s === "result") drawResult(); else drawHud();
  }

  // ---------- 큰 버튼 ----------
  let btnKey = "";
  function setBtn() {
    if (!btn) return;
    const s = G.s, m = mode();
    let label = "", cls = "";
    if (s === "ready") label = t("🎣 던지기");
    else if (s === "aim") { label = t("지금! 던지기"); cls = "hot"; }
    else if (s === "fly") label = "…";
    else if (s === "wait") label = t(m === "surf" ? "🔔 방울을 기다려요" : "👀 찌를 보는 중");
    else if (s === "retr") label = t("👆 톡! 움직이기");
    else if (s === "bite") { label = t("❗ 챔질!"); cls = "hot"; }
    else if (s === "fight") { label = easy() ? t("🌀 감기 (연타 또는 꾹)") : t("🌀 꾹 눌러 감기"); if (fish && fish.run) cls = "warn"; }
    else if (s === "result") label = t("▶ 계속하기");
    const key = label + cls;
    if (key === btnKey) return;
    btnKey = key; btn.textContent = label; btn.className = "gbig " + cls;
  }

  // ---------- 아래 패널 (방법 · 장소 · 설정 · 도감 · 상점 · 오늘 조과) ----------
  function dexHtml() {
    let h = "";
    let got = 0, all = 0;
    for (const k of Object.keys(MODES)) {
      const list = SP.filter((s) => !s.junk && s.m.includes(k[0]));
      h += '<div class="gdex-h">' + MODES[k].ico + " " + esc(t(MODES[k].n)) + "</div><div class=\"gdex\">";
      for (const s of list) {
        const d = save.dex[s.id];
        h += d ? '<div class="got"><b>' + esc(t(s.n)) + "</b><span>" + esc(t("최대 {n}cm · {c}마리", { n: d.max, c: d.n })) + "</span></div>" : '<div><b>???</b><span>' + esc(t("아직 못 낚았어요")) + "</span></div>";
      }
      h += "</div>";
    }
    for (const s of SP) if (!s.junk) { all++; if (save.dex[s.id]) got++; }
    return { h, got, all };
  }
  function renderPanel() {
    if (!root) return;
    const P2 = root.querySelector("#gPanel");
    if (!P2) return;
    const dx = dexHtml();
    let h = "";
    h += '<div class="gsea">' + esc(t("오늘 물때")) + " <b>" + esc(SEA.mulText || "-") + "</b> · " + esc(t(SEA.sn)) + (SEA.sn === "사리" ? " — " + esc(t("입질 활발")) : SEA.sn === "조금" ? " — " + esc(t("입질 느긋")) : "") + (SEA.feed ? " · " + esc(t("지금은 피딩 타임")) : "") + '<span class="gcoin">🪙 ' + save.coins + "</span></div>";
    h += '<div class="gpick" role="group" aria-label="' + esc(t("낚시 방법")) + '">';
    for (const k of Object.keys(MODES)) h += '<button type="button" data-gmode="' + k + '" aria-pressed="' + (mode() === k) + '"><span class="i">' + MODES[k].ico + "</span><b>" + esc(t(MODES[k].n)) + "</b><small>" + esc(t(MODES[k].d)) + "</small></button>";
    h += "</div>";
    h += '<div class="chips gopt" role="group" aria-label="' + esc(t("장소")) + '">';
    for (const k of Object.keys(PLACES)) h += '<button type="button" data-gplace="' + k + '" class="' + (save.place === k ? "on" : "") + '">' + esc(t(PLACES[k])) + " " + esc(t(MODES[mode()].spot)) + "</button>";
    h += "</div>";
    // 채비 고르기 (원투는 미끼 · 봉돌 · 바늘)
    h += '<article class="panel gcard tk"><h3>' + esc(t("채비 고르기")) + "</h3>";
    for (const g of TK[mode()]) {
      const cur = tk(g.key);
      h += '<div class="tk-h">' + esc(t(g.h)) + '</div><div class="chips">' + g.items.map((i) => '<button type="button" data-gtk="' + g.key + ":" + i.id + '" class="' + (cur === i.id ? "on" : "") + '" title="' + esc(t(i.d)) + '">' + esc(t(i.n)) + "</button>").join("") + "</div>";
      const it = g.items.find((i) => i.id === cur);
      if (it) h += '<div class="tk-like">' + esc(t(it.d)) + "</div>";
    }
    const lk = likes();
    h += '<div class="tk-like"><b>' + esc(t("지금 채비로 잘 무는 고기")) + ":</b> " + esc(lk.length ? lk.join(", ") : t("별로 없어요 — 미끼를 바꿔 보세요")) + "</div></article>";
    h += K.optHtml() + K.photoHtml("fish");
    // 오늘 조과
    h += '<article class="panel gcard"><h3>' + esc(t("오늘 조과")) + "</h3>";
    if (!sess.length) h += '<p class="muted">' + esc(t("아직 없어요. 한 마리 낚아 볼까요?")) + "</p>";
    else {
      const sum = {};
      for (const c of sess) { const k = c.junk ? t("장화") : t(c.n); const o = sum[k] || (sum[k] = { n: 0, max: 0 }); o.n++; o.max = Math.max(o.max, c.size); }
      h += '<p class="gtoday">' + Object.keys(sum).map((k) => esc(k) + " ×" + sum[k].n + (sum[k].max ? " (" + sum[k].max + "cm)" : "")).join(" · ") + "</p>";
      h += '<button type="button" class="btn" data-gshare>' + esc(t("조과 자랑 문구 복사")) + '</button> <span class="muted" id="gShareMsg" aria-live="polite"></span>';
    }
    h += "</article>";
    // 도감
    h += '<details class="panel gcard"><summary>' + esc(t("물고기 도감 {got}/{all}", { got: dx.got, all: dx.all })) + "</summary>" + dx.h + "</details>";
    // 상점
    h += '<details class="panel gcard"><summary>' + esc(t("낚시점 (포인트로 사기)")) + "</summary><div class=\"gshop\">";
    for (const it of SHOP) {
      const own = !!save.gear[it.id];
      h += "<div><b>" + esc(t(it.n)) + "</b><span>" + esc(t(it.d)) + '</span><button type="button" class="btn" data-gbuy="' + it.id + '"' + (own || save.coins < it.cost ? " disabled" : "") + ">" + (own ? esc(t("가지고 있어요")) : "🪙 " + it.cost) + "</button></div>";
    }
    h += "</div></details>";
    P2.innerHTML = h;
  }
  function onPanel(e) {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.gmode) { if (G.s === "fight") return; save.mode = b.dataset.gmode; store(); toReady(); renderPanel(); }
    else if (b.dataset.gplace) { if (G.s === "fight") return; save.place = b.dataset.gplace; store(); toReady(); renderPanel(); }
    else if (b.dataset.gtk) {
      if (G.s === "fight") return;
      const [k, v] = b.dataset.gtk.split(":");
      (save.tk[mode()] = save.tk[mode()] || {})[k] = v; store(); if (G.s !== "ready") toReady(); renderPanel();
    }
    else if (b.dataset.gbuy) {
      const it = SHOP.find((x) => x.id === b.dataset.gbuy);
      if (it && !save.gear[it.id] && save.coins >= it.cost) { save.coins -= it.cost; save.gear[it.id] = 1; store(); beep(990, 0.12); renderPanel(); }
    }
    else if (b.hasAttribute("data-gshare")) {
      const sum = sess.filter((c) => !c.junk).map((c) => t(c.n) + " " + c.size + "cm");
      const text = t("제피 낚시 게임 오늘 조과 🎣 {list}", { list: sum.join(", ") || t("장화") }) + " — " + location.origin + location.pathname + "#game";
      const msg = root.querySelector("#gShareMsg");
      const done = () => { if (msg) msg.textContent = t("복사했어요"); };
      try { navigator.clipboard.writeText(text).then(done, () => { if (msg) msg.textContent = text; }); } catch (err) { if (msg) msg.textContent = text; }
    }
  }

  // ---------- 시작 ----------
  function build(el, kit) {
    K = kit; root = el;
    root.innerHTML = '<div class="gwrap"><canvas aria-label="' + esc(t("낚시 게임 화면")) + '"></canvas></div><button type="button" class="gbig"></button><div id="gPanel" style="display:flex;flex-direction:column;gap:12px"></div>';
    cv = root.querySelector("canvas"); ctx = cv.getContext("2d"); btn = root.querySelector(".gbig");
    FONT = K.font();
    K.bindPress([cv, btn], press, release);
    root.querySelector("#gPanel").addEventListener("click", onPanel);
    window.addEventListener("resize", () => { if (K.visible(root)) resize(); });
    K.onOpt((k) => { if (!K.visible(root)) return; if (k === "easy" && G.s !== "fight") toReady(); renderPanel(); setBtn(); });
  }
  function loop(ts) {
    if (!K.visible(root)) { running = false; holding = false; K.drag(0, 0); return; }
    const dt = Math.min(0.05, Math.max(0, (ts - last) / 1000)); last = ts; now += dt;
    update(dt); draw(); setBtn();
    requestAnimationFrame(loop);
  }
  function start() {
    SEA = seaToday();
    resize(); renderPanel(); setBtn();
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
  }
  function stop() { holding = false; if (G.s === "fight") { G.s = "ready"; } }
  const api = { build, start, stop, state: () => G.s, press, release };
  if (window.ZPLAY) ZPLAY.reg("fish", api);
  window.ZGAME = api;
})();
