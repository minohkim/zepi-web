// 제피 웹 · 놀이 · 바다 낚시 게임 (찌낚시 · 루어 · 원투) — 바다 탭에서 열려요 (js/play.js)
// - 낚시 방법마다 낚싯대 · 던지는 동작 · 소리가 달라요
//   · 찌낚시: 5.3m 긴 갯바위 낚싯대, 살짝 던지기, 밑밥 주걱질, 반유동/전유동, 조류 따라 흐르는 찌, 뜰채로 떠올리기
//   · 루어: 짧고 빳빳한 대, 짧게 후려치는 "휙!" + 베일 닫는 "칸!", 톡톡 액션
//   · 원투: 굵고 긴 대 + 큰 릴, 봉돌 진자를 흔들어 힘 모으기 → 포인트에 정확히 던지기(이 게임의 기술), 큰 바람 소리, 삼발이에 거치하고 방울 기다리기
// - 장소는 실제 낚시터(서해·남해·동해 × 갯바위·방파제·백사장). 그곳의 지금 날씨 · 바람 · 파도 · 물때(들물/날물) · 달 모양을 그림과 입질에 반영
//   (날씨·파도: Open-Meteo, 물높이: 로그인하면 국립해양조사원 가까운 관측소, 아니면 음력으로 추정)
// - 쉬운 모드: 큰 버튼 하나, 한 번씩 탭. 고기가 도망가지 않아요 (어르신도 바로)
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
  const ease = (k) => k * k * (3 - 2 * k);
  const KEY = "jepi.game.v1";

  // ---------- 낚시 방법 · 낚싯대 ----------
  const MODES = {
    float: { ico: "🎈", n: "찌낚시", d: "찌가 쏙 들어가면 탭", spot: "갯바위" },
    lure: { ico: "🎣", n: "루어", d: "톡톡 움직여서 유혹", spot: "방파제" },
    surf: { ico: "🏖️", n: "원투", d: "포인트에 정확히 던지기", spot: "백사장" },
  };
  // L: 화면 대비 길이, w: 굵기 — 찌낚시대는 길고 가늘고, 루어대는 짧고 빳빳, 원투대는 굵고 길어요
  const ROD = {
    float: { L: 0.47, w: 2.2, col: "#b89a5e", tip: "#f4f4f4", reel: 6.5, lb: true, name: "갯바위 찌낚시대 1호 5.3m" },
    lure: { L: 0.26, w: 3.4, col: "#1e1e1e", tip: "#c2452d", reel: 8, cork: true, name: "루어대 8.6ft" },
    surf: { L: 0.42, w: 4.4, col: "#e9eef2", tip: "#2b6cb0", reel: 12, band: "#2b6cb0", name: "원투대 4.2m + 대형 릴" },
  };
  const PLACES = { W: "서해", S: "남해", E: "동해" };
  const PI = { W: 0, S: 1, E: 2 };
  // 실제 낚시터 (좌표는 대략 · 지도에서 찾아 보기). sea: 서해 W · 남해 S · 동해 E, m: f=갯바위 찌 · l=방파제 루어 · s=백사장 원투
  // 내 위치(제피 '오늘'의 위치 · 내 기록의 마지막 위치 · GPS)에서 가까운 순으로 보여 줘요
  const SPOT_LIST = [
    { id: "sinjindo", n: "태안 신진도 갯바위", sea: "W", m: "f", lat: 36.676, lng: 126.131 },
    { id: "oeyeondo", n: "보령 외연도 갯바위", sea: "W", m: "f", lat: 36.224, lng: 126.08 },
    { id: "geumodo", n: "여수 금오도 갯바위", sea: "S", m: "f", lat: 34.52, lng: 127.75 },
    { id: "mijo", n: "남해 미조 갯바위", sea: "S", m: "f", lat: 34.713, lng: 128.04 },
    { id: "haegeumgang", n: "거제 해금강 갯바위", sea: "S", m: "f", lat: 34.733, lng: 128.69 },
    { id: "taejongdae", n: "부산 태종대 갯바위", sea: "S", m: "f", lat: 35.053, lng: 129.085 },
    { id: "chagwido", n: "제주 차귀도 갯바위", sea: "S", m: "f", lat: 33.31, lng: 126.155 },
    { id: "guryongpo", n: "포항 구룡포 갯바위", sea: "E", m: "f", lat: 35.99, lng: 129.56 },
    { id: "hakampo", n: "태안 학암포 방파제", sea: "W", m: "l", lat: 36.896, lng: 126.207 },
    { id: "jindu", n: "인천 영흥도 진두항", sea: "W", m: "l", lat: 37.252, lng: 126.47 },
    { id: "ocheon", n: "보령 오천항 방파제", sea: "W", m: "l", lat: 36.44, lng: 126.52 },
    { id: "bieung", n: "군산 비응항 방파제", sea: "W", m: "l", lat: 35.94, lng: 126.53 },
    { id: "gukdong", n: "여수 국동항 방파제", sea: "S", m: "l", lat: 34.73, lng: 127.72 },
    { id: "jisepo", n: "거제 지세포 방파제", sea: "S", m: "l", lat: 34.829, lng: 128.708 },
    { id: "daebyeon", n: "부산 기장 대변항 방파제", sea: "S", m: "l", lat: 35.225, lng: 129.228 },
    { id: "jumunjin", n: "강릉 주문진항 방파제", sea: "E", m: "l", lat: 37.89, lng: 128.83 },
    { id: "dongmyeong", n: "속초 동명항 방파제", sea: "E", m: "l", lat: 38.207, lng: 128.6 },
    { id: "mallipo", n: "태안 만리포 해수욕장", sea: "W", m: "s", lat: 36.787, lng: 126.141 },
    { id: "daecheon", n: "보령 대천 해수욕장", sea: "W", m: "s", lat: 36.31, lng: 126.51 },
    { id: "byeonsan", n: "부안 변산 해수욕장", sea: "W", m: "s", lat: 35.68, lng: 126.53 },
    { id: "sangju", n: "남해 상주은모래비치", sea: "S", m: "s", lat: 34.719, lng: 127.992 },
    { id: "dadaepo", n: "부산 다대포 해수욕장", sea: "S", m: "s", lat: 35.047, lng: 128.965 },
    { id: "hyeopjae", n: "제주 협재 해수욕장", sea: "S", m: "s", lat: 33.394, lng: 126.239 },
    { id: "sacheonjin", n: "강릉 사천진 해변", sea: "E", m: "s", lat: 37.843, lng: 128.874 },
    { id: "chilpo", n: "포항 칠포 해수욕장", sea: "E", m: "s", lat: 36.13, lng: 129.4 },
  ];
  let gpsLoc = null; // 제피 밖(미리보기)에서 GPS로 찾은 위치
  function distKm(a, b, c, d) { const r = Math.PI / 180, x = (d - b) * r * Math.cos(((a + c) / 2) * r), y = (c - a) * r; return Math.sqrt(x * x + y * y) * 6371; }
  function myLoc() {
    try { if (window.ZLOC) { const l = ZLOC.init(); if (l && isFinite(l.lat)) return { lat: l.lat, lng: l.lng, src: l.src, label: l.label || "" }; } } catch (e) {}
    return gpsLoc || { lat: 37.5665, lng: 126.978, src: "default", label: "" };
  }
  function nearSpots(m) {
    const L = myLoc(), ml = (m || "float")[0];
    return SPOT_LIST.filter((x) => x.m === ml).map((x) => Object.assign({}, x, { km: distKm(L.lat, L.lng, x.lat, x.lng) })).sort((a, b) => a.km - b.km);
  }
  // m: f=찌, l=루어, s=원투 · r: [서해, 남해, 동해] · night: 밤에 더 잘 무는 고기
  const SP = [
    { id: "surfperch", n: "망상어", m: "f", r: [2, 3, 3], min: 12, max: 25, str: 0.6, p: 1.5, c: "#6f7f8f", tip: "봄에 새끼를 낳는 물고기예요" },
    { id: "rockfish", n: "볼락", m: "fl", r: [1, 3, 2], min: 12, max: 28, str: 0.7, p: 2.5, c: "#6a4e3a", night: 1, tip: "밤에 잘 무는 눈 큰 물고기" },
    { id: "halfbeak", n: "학꽁치", m: "f", r: [1, 2, 3], min: 20, max: 35, str: 0.5, p: 1.5, c: "#9fb8c8", shape: "needle", tip: "아래턱이 바늘처럼 길어요" },
    { id: "blackfish", n: "벵에돔", m: "f", r: [0, 3, 1], min: 25, max: 45, str: 1.3, p: 4, c: "#2f3a40", tip: "남해 갯바위의 인기 손님" },
    { id: "seabream", n: "감성돔", m: "fs", r: [2, 3, 1], min: 30, max: 55, str: 1.4, p: 4, c: "#5a6470", tip: "바다의 왕자, 겨울이 제철" },
    { id: "mackerel", n: "고등어", m: "fl", r: [2, 2, 2], min: 25, max: 40, str: 1.1, p: 2, c: "#3f6f8f", tip: "떼로 몰려다녀요" },
    { id: "greenling", n: "노래미", m: "fl", r: [3, 1, 2], min: 20, max: 38, str: 0.8, p: 1.5, c: "#7a5a3a", tip: "바위 틈에 숨어 살아요" },
    { id: "korockfish", n: "우럭", m: "l", r: [3, 1, 1], min: 20, max: 45, str: 1, p: 2, c: "#3d3a35", night: 1, tip: "서해 방파제의 단골" },
    { id: "flounder", n: "광어", m: "ls", r: [3, 2, 1], min: 35, max: 70, str: 1.3, p: 3, c: "#6b5a40", shape: "flat", tip: "눈이 왼쪽에 몰려 있어요" },
    { id: "seabass", n: "농어", m: "l", r: [3, 2, 2], min: 40, max: 85, str: 1.55, p: 3.5, c: "#9aa6ad", night: 1, tip: "물 위로 뛰어오르며 바늘을 털어요" },
    { id: "spmackerel", n: "삼치", m: "l", r: [1, 2, 2], min: 40, max: 80, str: 1.6, p: 3, c: "#7f97a8", tip: "이빨이 날카로워요" },
    { id: "squid", n: "무늬오징어", m: "l", r: [0, 3, 1], min: 15, max: 35, str: 0.9, p: 5, c: "#c9a7d8", shape: "squid", night: 1, tip: "가을 에깅의 주인공" },
    { id: "sillago", n: "보리멸", m: "s", r: [1, 2, 3], min: 15, max: 28, str: 0.5, p: 2, c: "#d8c9a0", tip: "모래밭의 은빛 미인" },
    { id: "marbled", n: "도다리", m: "s", r: [3, 2, 1], min: 20, max: 40, str: 0.8, p: 2.5, c: "#7a6a50", shape: "flat", tip: "봄 도다리쑥국이 유명해요" },
    { id: "righteye", n: "가자미", m: "s", r: [1, 1, 3], min: 15, max: 35, str: 0.7, p: 2, c: "#8a7a60", shape: "flat", tip: "동해 백사장 원투의 단골" },
    { id: "conger", n: "붕장어", m: "s", r: [2, 2, 2], min: 40, max: 90, str: 1.2, p: 1.5, c: "#5a4a3a", shape: "eel", night: 1, tip: "밤에 잘 물어요 (아나고)" },
    { id: "croaker", n: "백조기", m: "s", r: [3, 1, 0], min: 20, max: 35, str: 0.7, p: 2, c: "#c8c8c0", tip: "서해 여름 원투의 손님" },
    { id: "redbream", n: "참돔", m: "fs", r: [1, 2, 1], min: 40, max: 80, str: 1.8, p: 6, c: "#d9666a", rare: 1, tip: "귀한 바다의 여왕" },
    { id: "boot", n: "장화", m: "fls", r: [1, 1, 1], min: 0, max: 0, str: 0.3, p: 0, c: "#2b2b2b", junk: 1, tip: "바다 청소도 낚시꾼의 몫" },
  ];
  const SHOP = [
    { id: "line", n: "튼튼한 원줄", d: "줄이 덜 터지고, 감기가 쉬워져요", cost: 150 },
    { id: "chum", n: "집어제 (밑밥 가루)", d: "밑밥에 고기가 더 빨리 모여요", cost: 200 },
    { id: "reel", n: "고급 릴", d: "더 빨리 감겨요", cost: 300 },
    { id: "shiny", n: "반짝이 채비", d: "귀한 고기·큰 고기가 더 잘 나와요", cost: 500 },
  ];

  // ---------- 채비 · 미끼 ----------
  const TK = {
    float: [
      { key: "rig", h: "채비 방식", items: [
        { id: "half", n: "반유동", d: "찌멈춤봉으로 정한 수심에 미끼를 멈춰요. 찌가 쏙 들어가요" },
        { id: "full", n: "전유동", d: "미끼가 천천히 끝까지 내려가며 모든 층을 훑어요. 찌가 스르르 잠겨요" },
      ] },
      { key: "depth", h: "수심 (반유동 찌 밑 길이)", items: [
        { id: "shallow", n: "얕게 (2m)", d: "학꽁치·고등어처럼 위에 노는 고기" },
        { id: "mid", n: "중간 (4m)", d: "무난해요" },
        { id: "deep", n: "깊게 (6m)", d: "감성돔·노래미처럼 바닥 고기" },
      ] },
      { key: "bait", h: "미끼", items: [
        { id: "krill", n: "크릴", d: "찌낚시 기본 미끼, 거의 다 잘 먹어요" },
        { id: "worm", n: "청갯지렁이", d: "노래미·볼락이 좋아해요" },
        { id: "shrimp", n: "깐새우", d: "감성돔·참돔 노리기" },
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
  const TOP = { halfbeak: 1, mackerel: 1, surfperch: 0.5 }, BOTTOM = { seabream: 1, greenling: 1, rockfish: 0.5, redbream: 0.5, blackfish: 0.3 };
  const DEPTH_M = { shallow: 2, mid: 4, deep: 6 }, BOTTOM_M = 9;

  // ---------- 저장 ----------
  function fresh() { return { v: 1, coins: 0, total: 0, dex: {}, gear: {}, mode: "float", place: "W", tk: {}, shots: 0, hits: 0 }; }
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && s.v === 1) return Object.assign(fresh(), s); } catch (e) {}
    return fresh();
  }
  let save = load();
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} }
  const mode = () => save.mode;
  // 난이도: 1 쉬움(어르신 · 실패 없음) · 2 손맛(기본) · 3 고수
  const diff = () => save.diff || 2;
  const easy = () => diff() === 1;
  const hard = () => diff() === 3;
  function spot() { const list = nearSpots(mode()), id = (save.spots || {})[mode()]; return list.find((x) => x.id === id) || list[0]; }
  const place = () => spot().sea;

  function tk(key) {
    const g = (TK[mode()] || []).find((x) => x.key === key);
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
  // 미끼가 있는 수심(m)에 따라: 얕으면 위에 노는 고기, 깊으면 바닥 고기
  function depthMulAt(s, z) {
    if (mode() !== "float") return 1;
    if (z < 2.8) return TOP[s.id] ? 1 + 2 * TOP[s.id] : BOTTOM[s.id] ? 0.4 : 1;
    if (z > 5) return BOTTOM[s.id] ? 1 + 2 * BOTTOM[s.id] : TOP[s.id] ? 0.3 : 1;
    return 1;
  }
  function planDepth() { return tk("rig") === "full" ? 6 : DEPTH_M[tk("depth")] || 4; }
  function likes() {
    const ml = mode()[0], pi = PI[place()], z = planDepth();
    return SP.filter((s) => !s.junk && s.m.includes(ml) && s.r[pi] > 0).map((s) => [s, s.r[pi] * baitMul(s) * depthMulAt(s, z) * (s.rare ? 0.35 : 1) * (s.night && COND.night ? 2 : 1)])
      .filter((x) => x[1] >= 1.5).sort((a, b) => b[1] - a[1]).slice(0, 4).map((x) => t(x[0].n));
  }

  // ---------- 현장 상황: 날씨 · 바다 · 물때 ----------
  const DIRS = ["북", "북동", "동", "남동", "남", "남서", "서", "북서"];
  let COND = defaultCond();
  const condCache = {};
  function kstHour() { const d = new Date(Date.now() + 9 * 3600e3); return d.getUTCHours() + d.getUTCMinutes() / 60; }
  function defaultCond() {
    const h = kstHour();
    return { live: false, temp: null, code: 1, cloud: 30, rain: 0, wind: 3, windDir: 300, gust: 5, wave: 0.6, sst: null, night: h < 6 || h >= 18.5, tide: tideEst(), spotKey: "" };
  }
  function lunarInfo() {
    let l = 15, mulText = "", sn = "중간";
    if (LU) { try { l = LU.lunarDay(new Date()); const m = LU.mul(l); mulText = m.n ? t("{n}물", { n: m.n }) : t(m.name); sn = LU.springNeap(l); } catch (e) {} }
    return { l, mulText, sn };
  }
  // 음력으로 셈한 대략의 물높이 (로그인 전 · 관측소 실패 시). 달이 남중한 뒤 몇 시간 지나 만조가 와요
  function tideEst() {
    const { l, sn } = lunarInfo();
    let pl = "W"; try { pl = place(); } catch (e) {}
    const lag = { W: 5, S: 8.5, E: 3 }[pl] || 5;
    const hw = (12 + (l - 1) * 0.8 + lag) % 12.42;
    const ph = (((kstHour() - hw) % 12.42) + 12.42) % 12.42 / 12.42;
    const k = (Math.cos(2 * Math.PI * ph) + 1) / 2;
    return { k, rising: Math.sin(2 * Math.PI * ph) > 0, est: true, station: "", sn };
  }
  async function fetchJson(u) {
    const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const tm = setTimeout(() => ctl && ctl.abort(), 7000);
    try { const r = await fetch(u, ctl ? { signal: ctl.signal } : undefined); if (!r.ok) throw new Error("HTTP " + r.status); return await r.json(); }
    finally { clearTimeout(tm); }
  }
  let condBusy = false;
  async function loadCond() {
    const sp = spot(), key = spot().id;
    const hit = condCache[key];
    if (hit && Date.now() - hit.at < 15 * 60e3) { COND = hit.v; return; }
    if (condBusy) return;
    condBusy = true;
    const c = defaultCond(); c.spotKey = key;
    try {
      const q = "latitude=" + sp.lat.toFixed(3) + "&longitude=" + sp.lng.toFixed(3) + "&timezone=Asia%2FSeoul";
      const [w, m] = await Promise.all([
        fetchJson("https://api.open-meteo.com/v1/forecast?" + q + "&current=temperature_2m,weather_code,cloud_cover,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day&wind_speed_unit=ms").catch(() => null),
        fetchJson("https://marine-api.open-meteo.com/v1/marine?" + q + "&current=wave_height,sea_surface_temperature").catch(() => null),
      ]);
      if (w && w.current) {
        const x = w.current;
        Object.assign(c, { live: true, temp: x.temperature_2m, code: x.weather_code, cloud: x.cloud_cover, rain: x.precipitation || 0, wind: x.wind_speed_10m, windDir: x.wind_direction_10m, gust: x.wind_gusts_10m, night: x.is_day === 0 });
      }
      if (m && m.current) { if (m.current.wave_height != null) c.wave = m.current.wave_height; c.sst = m.current.sea_surface_temperature; }
    } catch (e) {}
    try {
      if (window.ZSEA && ZSEA.tideNow && window.ZAPP && ZAPP.signedIn && ZAPP.signedIn()) {
        const td = await ZSEA.tideNow(sp.lat, sp.lng);
        c.tide = { k: clamp(td.k, 0, 1), rising: td.rising !== false, est: false, station: td.station, sn: lunarInfo().sn, next: td.next };
      }
    } catch (e) {}
    condCache[key] = { at: Date.now(), v: c };
    if (spot().id === key) COND = c;
    condBusy = false;
    renderPanel();
  }
  // 물 흐름 세기: 만조·간조(물돌이)엔 약하고 중간 물높이에서 세요. 사리엔 더 세고 조금엔 약해요
  function current() {
    const td = COND.tide, sf = td.sn === "사리" ? 1.3 : td.sn === "조금" ? 0.6 : 1;
    const strength = clamp((1 - Math.abs(2 * td.k - 1)) * sf + 0.12, 0.1, 1.3);
    return { dir: td.rising ? 1 : -1, s: strength };
  }
  function condMul() {
    let m = 0.6 + 0.6 * current().s;
    const lu = lunarInfo(); if (lu.sn === "사리") m *= 1.15; else if (lu.sn === "조금") m *= 0.9;
    const h = kstHour(); if ((h >= 5 && h < 8) || (h >= 16 && h < 19.5)) m *= 1.2; // 아침·저녁 피딩
    if (COND.wave > 2.5) m *= 0.6;
    if (COND.wave >= 0.4 && COND.wave <= 1.5) m *= 1.1; // 적당한 파도(포말)는 경계심을 풀어요
    return m;
  }
  const isRain = () => [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(COND.code) || COND.rain > 0.1;
  const isSnow = () => [71, 73, 75, 77, 85, 86].includes(COND.code);
  const isFog = () => [45, 48].includes(COND.code);
  function wxIcon() { if (COND.code >= 95) return "⛈️"; if (isSnow()) return "🌨️"; if (isRain()) return "🌧️"; if (isFog()) return "🌫️"; if (COND.night) return "🌙"; return COND.cloud > 70 ? "☁️" : COND.cloud > 30 ? "⛅" : "☀️"; }
  const dirName = (deg) => t(DIRS[Math.round(deg / 45) % 8]);
  // 옆바람: 화면에서 왼→오른쪽으로 부는 정도 (+면 오른쪽으로 밀어요). 바다가 화면 위쪽이라고 보고 서풍이면 오른쪽으로
  function crossWind() { return Math.sin(((COND.windDir + 180) % 360) * Math.PI / 180) * COND.wind; }
  function advice() {
    const out = [];
    if (COND.wave > 2.5) out.push(t("⚠️ 파도가 높아요. 실제라면 갯바위·방파제 끝은 위험해요. 안전 먼저!"));
    else if (COND.wind > 9) out.push(t("💨 바람이 세요. 원투는 옆바람만큼 줄이 밀려요"));
    const c = current();
    if (c.s < 0.3) out.push(t("물돌이(물 멈춤) 무렵 — 입질이 뜸할 수 있어요"));
    else if (c.s > 0.8) out.push(t("물이 힘차게 흘러요 — 입질 좋을 때, 찌가 빨리 흘러요"));
    if (COND.night) out.push(t("밤엔 볼락·우럭·붕장어·농어가 잘 물어요"));
    if (isRain()) out.push(t("비 오는 날은 경계심이 줄어 입질이 좋아지기도 해요"));
    return out;
  }

  // ---------- 소리 ----------
  const beep = (f, d, ty, v) => K && K.beep(f, d, ty, v);
  const buzz = (ms) => K && K.buzz(ms);
  function bell() { beep(1568, 0.18, "triangle", 0.2); setTimeout(() => beep(1760, 0.22, "triangle", 0.2), 140); }
  function kan() { beep(2350, 0.08, "triangle", 0.25); beep(3520, 0.05, "sine", 0.12); K.click(6000, 0.7); } // 베일 닫히는 "칸!"

  // ---------- 상태 ----------
  const G = { s: "ready", msg: "", msgT: 0 };
  let now = 0, holding = false;
  let castT = 0, castDur = 0.5, released = false, cast = 0.5, lat = 0, flyT = 0, flyDur = 0.8, from = null, to = null, arcH = 0.2;
  let settleT = 0, setT = 0, windT = 0, power = 0, phi = 0, target = null, acc = null, spoolAcc = 0;
  let drift = 0, bz = 0, chum = [], chumFly = [], gather = 0, lastTap = null, sinkT = 0;
  let waitT = 0, biteAt = 0, biteT = 0, nibbles = [];
  let lureK = 0, lureTaps = 0, lureNeed = 2, lureBite = -1, hopT = 0, retrT = 0;
  let fish = null, T = 0, P = 0, slackT = 0, hookPt = null, warnT = 0, res = null, perfect = false;
  // 손맛 파이팅: 세로 게이지에서 초록 칸(zy)으로 고기(fy)를 붙잡아요
  let zy = 0.3, zv = 0, fy = 0.5, fv = 0, fTo = 0.5, fTimer = 0, inT = 0, outT = 0, jump = null, jumpsOk = 0, fightT = 0;
  // 도파민: 연속 낚기 · 피딩 러시 · 화면 흔들림 · 꽃가루
  let streak = 0, bestStreak = 0, rushT = 0, shake = 0, parts = [], flashT = 0, flashCol = "#fff";
  let netT = 0, netMiss = 0, scoopT = 0, liftT = 0;
  const sess = [];
  function flash(m) { G.msg = m; G.msgT = 2.4; }

  // ---------- 고기 고르기 ----------
  // 레벨: 낚은 점수(경험치)로 올라가요. 높을수록 귀한 고기 · 주인(보스)이 잘 나와요
  const lvOf = (xp) => Math.floor(Math.sqrt((xp || 0) / 150)) + 1;
  const xpAt = (lv) => (lv - 1) * (lv - 1) * 150;
  // 고기 성격: 파이팅 때 움직이는 모양
  const STYLE = { mackerel: "dart", spmackerel: "dart", halfbeak: "dart", sillago: "dart", seabream: "dive", redbream: "dive", blackfish: "dive", korockfish: "dive", rockfish: "dive", greenling: "dive", flounder: "heavy", marbled: "heavy", righteye: "heavy", conger: "heavy", seabass: "jumper", squid: "jet" };
  function bossFish() {
    const ml = mode()[0], pi = PI[place()];
    const list = SP.filter((x) => !x.junk && x.m.includes(ml) && x.r[pi] > 0 && x.id !== "squid").sort((a, b) => b.max * b.str - a.max * a.str);
    const s0 = list[Math.floor(Math.random() * Math.min(2, list.length))] || list[0];
    const size = Math.round(s0.max * rnd(1.15, 1.35));
    const short = t(spot().n).split(" ").slice(0, 2).join(" ");
    return Object.assign({}, s0, { size, sf: 1.3, st: s0.str * 1.6, boss: true, title: t("👑 {spot}의 주인", { spot: short }), run: false, rt: 1 });
  }
  function pickFish() {
    const ml = mode()[0], pi = PI[place()];
    const list = SP.filter((s) => s.m.includes(ml));
    const accBonus = acc ? acc.big : 1;
    let tot = 0;
    const ws = list.map((s) => {
      let w = s.junk ? 0.35 : s.r[pi] * baitMul(s) * depthMulAt(s, bz);
      if (!s.junk && s.str >= 1.2) w *= (0.6 + 0.8 * cast) * accBonus;
      if (s.night && COND.night) w *= 2;
      if (s.rare) w *= 0.35 * (save.gear.shiny ? 1.8 : 1) * (1 + 0.04 * (lvOf(save.xp) - 1)) * (rushT > 0 ? 1.5 : 1);
      if (!s.junk && save.gear.shiny && s.str >= 1.3) w *= 1.3;
      tot += w; return w;
    });
    let r = Math.random() * tot, i = 0;
    for (; i < list.length - 1; i++) { r -= ws[i]; if (r <= 0) break; }
    const s = list[i];
    const size = s.junk ? 0 : Math.round(clamp(rnd(s.min, s.max) * (0.92 + 0.2 * cast) * (save.gear.shiny ? 1.05 : 1) * (acc && acc.grade === "hit" ? 1.06 : 1), s.min, s.max * 1.12));
    let sz = size;
    if (!s.junk && rushT > 0) sz = Math.round(Math.min(s.max * 1.12, sz * 1.06));
    const sf = s.junk ? 0 : clamp((sz - s.min) / (s.max - s.min), 0, 1.2);
    return Object.assign({}, s, { size: sz, sf, st: s.str * (0.8 + 0.5 * sf), run: false, rt: 1 });
  }

  // ---------- 던지기 ----------
  function sinkerRange() { const k = tk("sinker"); return k === "s15" ? [0.38, 0.7] : k === "s30" ? [0.55, 1.05] : [0.45, 0.9]; }
  const POINTS = ["골창 (모래 고랑)", "수중여 옆", "물골", "모래톱 끝"];
  function newTarget() {
    const [a, b] = sinkerRange();
    target = { d: rnd(a + (b - a) * 0.35, b - 0.02), lat: rnd(-0.12, 0.12), n: POINTS[Math.floor(Math.random() * POINTS.length)] };
  }
  function toReady() {
    G.s = "ready"; holding = false; drift = 0; chum = []; chumFly = []; gather = 0;
    if (mode() === "surf" && !target) newTarget();
    setBtn();
  }
  function startCast() {
    const m = mode();
    if (m === "surf") { G.s = "windup"; windT = 0; power = 0; phi = 0; beep(300, 0.06, "triangle", 0.08); setBtn(); return; }
    cast = m === "float" ? rnd(0.3, 0.5) : (tk("bait") === "jig" ? rnd(0.72, 0.9) : rnd(0.55, 0.75));
    lat = rnd(-0.05, 0.05);
    G.s = "cast"; castT = 0; castDur = m === "lure" ? 0.45 : 0.9; released = false;
    setBtn();
  }
  // 원투: 힘(거리)은 게이지, 좌우는 봉돌 진자의 박자, 옆바람은 줄을 밀어요
  function releaseSurf() {
    const [a, b] = sinkerRange();
    let d = a + power * (b - a), l = Math.sin(phi) * (easy() ? 0.035 : 0.09) + crossWind() * 0.007 + target.lat * 0;
    l += target.lat;
    if (easy()) { d = lerp(d, target.d, 0.55); l = lerp(l, target.lat, 0.55); }
    cast = clamp(d, 0.3, 1.05); lat = clamp(l, -0.2, 0.2);
    const e = Math.hypot(cast - target.d, (lat - target.lat) * 1.6);
    const grade = e < 0.05 ? "hit" : e < 0.12 ? "good" : "miss";
    acc = { e, grade, mul: grade === "hit" ? 0.55 : grade === "good" ? 0.85 : 1.35, big: grade === "hit" ? 1.5 : grade === "good" ? 1.15 : 0.8 };
    save.shots++; if (grade === "hit") save.hits++; store();
    G.s = "cast"; castT = 0; castDur = 0.6; released = false;
    setBtn();
  }
  function releaseTackle() {
    released = true;
    const m = mode();
    from = tip(); to = tgt(cast, lat);
    flyT = 0; flyDur = m === "surf" ? 1.5 : m === "lure" ? 0.6 : 0.85;
    arcH = m === "surf" ? 0.36 : m === "lure" ? 0.2 : 0.1;
    if (m === "lure") K.swoosh(1600, 4800, 0.2, 0.55, 2.2); // 휙!
    else if (m === "surf") K.swoosh(500, 1800, 0.8, 0.75, 1.1); // 쉬이이익
    else K.swoosh(700, 1400, 0.45, 0.22, 1.5); // 살짝
  }
  function landed() {
    const m = mode();
    if (m === "lure") { kan(); K.splash(0.25, false); G.s = "retr"; lureK = 0; lureTaps = 0; lureBite = -1; retrT = 0; lureNeed = easy() ? Math.floor(rnd(1, 3.99)) : Math.floor(rnd(3, 5.99)); }
    else if (m === "surf") {
      K.splash(0.5, true); G.s = "set"; setT = 0;
      flash(acc.grade === "hit" ? t("🎯 명중! {n}에 정확히 들어갔어요", { n: t(target.n) }) : acc.grade === "good" ? t("👍 좋아요! 포인트 근처예요") : t("😅 포인트에서 벗어났어요. 입질이 늦을 수 있어요"));
      if (acc.grade === "hit") { beep(1047, 0.12); setTimeout(() => beep(1319, 0.16), 120); }
    }
    else { K.splash(0.3, false); G.s = "settle"; settleT = 0; bz = 0; drift = 0; sinkT = 0; }
    setBtn();
  }
  function startWait() {
    G.s = "wait"; waitT = 0;
    const m = mode();
    if (m === "surf") {
      biteAt = rnd(3, 6) * (0.8 + 0.4 * cast) * acc.mul * (tk("bait") === "krill" ? 0.85 : 1) / condMul();
      nibbles = [];
      const k = Math.floor(rnd(0, 3));
      for (let i = 0; i < k; i++) { const x = rnd(0.6, biteAt - 0.6); if (x > 0.5) nibbles.push(x); }
    } else if (m === "float") {
      if (!chum.length) flash(t("🥄 밑밥을 뿌려 고기를 모으세요 (아래 버튼)"));
    }
    setBtn();
  }
  function startBite() {
    G.s = "bite"; biteT = 0; sinkT = 0;
    buzz([120, 60, 120]);
    if (mode() === "surf") bell(); else beep(880, 0.18, "square", 0.12);
    setBtn();
  }
  function hook() {
    perfect = biteT < (easy() ? 0.6 : 0.3);
    hookPt = tackle();
    const bossChance = easy() ? 0.012 : 0.02 + 0.004 * (lvOf(save.xp) - 1) + (rushT > 0 ? 0.03 : 0) + (perfect ? 0.01 : 0);
    fish = Math.random() < bossChance ? bossFish() : pickFish();
    T = 30; P = fish.boss ? 22 : 30; slackT = 0; fish.rt = rnd(0.6, 1.2);
    zy = 0.35; zv = 0; fy = 0.4; fv = 0; fTo = 0.5; fTimer = 0.5; inT = 0; outT = 0; jump = null; jumpsOk = 0; fightT = 0;
    G.s = "fight"; beep(300, 0.1, "sawtooth", 0.1); buzz(50); K.swoosh(900, 2500, 0.15, 0.3, 2);
    if (fish.boss) { flash(fish.title + " — " + t("엄청난 힘이에요!")); shake = 0.8; buzz([200, 80, 200]); flashT = 0.5; flashCol = "#ffd34d"; [196, 185, 175].forEach((f, i) => setTimeout(() => beep(f, 0.4, "sawtooth", 0.1), i * 180)); }
    else if (perfect) flash(t("⚡ 퍼펙트 챔질!"));
    if (perfect) mission("perfect", 1);
    setBtn();
  }
  // 다 끌어오면: 찌낚시와 큰 고기(45cm 넘음)는 뜰채로, 작은 고기는 들어뽑기
  function landing() {
    if (fish.junk || (mode() !== "float" && fish.size < 45)) { G.s = "lift"; liftT = 0; K.swoosh(800, 2000, 0.3, 0.3); }
    else { G.s = "net"; netT = rnd(0, 3); netMiss = 0; flash(t("🥅 뜰채를 내렸어요. 고기가 뜰채 위로 올 때 탭!")); }
    setBtn();
  }
  function endFight(kind) {
    let pts = 0, isNew = false, second = null, grade = -1, record = false, lvUp = 0, perfFight = false;
    if (kind === "catch") {
      grade = gradeOf(fish);
      perfFight = !easy() && !fish.junk && outT < 0.35 && fightT > 1.5;
      streak = fish.junk ? streak : streak + 1; bestStreak = Math.max(bestStreak, streak);
      const comboMul = 1 + Math.min(streak - 1, 10) * 0.1;
      pts = fish.junk ? 5 : Math.round(fish.size * fish.p * GRADE[grade].mul * comboMul * (perfect ? 1.2 : 1) * (perfFight ? 1.3 : 1) * (easy() ? 1 : hard() ? 2 : 1.5) * (acc && mode() === "surf" && acc.grade === "hit" ? 1.2 : 1));
      const d = save.dex[fish.id];
      record = !!d && !fish.junk && fish.size > d.max;
      isNew = !d && !fish.junk;
      save.dex[fish.id] = { n: (d ? d.n : 0) + 1, max: Math.max(d ? d.max : 0, fish.size) };
      save.coins += pts; save.total += pts; store();
      sess.push({ n: fish.n, size: fish.size, junk: !!fish.junk });
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
      const lv0 = lvOf(save.xp);
      save.xp = (save.xp || 0) + pts; save.fish = (save.fish || 0) + 1;
      if (fish.boss) save.bosses = (save.bosses || 0) + 1;
      if (lvOf(save.xp) > lv0) lvUp = lvOf(save.xp);
      if (!fish.junk) { mission("any", 1); mission("species", 1, fish.id); if (fish.size >= 40) mission("big", 1); if (grade >= 2) mission("grade", 1); mission("streak", streak, null, true); }
      // 연속이 쌓이면 피딩 러시
      if (!fish.junk && rushT <= 0 && (streak === 3 || streak === 6 || streak === 10 || Math.random() < 0.07)) { rushT = 30; flash(t("🐟 피딩 러시! 30초 동안 입질 폭발")); }
      store();
      // 소리 · 진동은 등급 연출(drawResult)에서
    } else { breakStreak(); beep(150, 0.35, "sawtooth", 0.08); buzz(200); }
    res = { kind, fish, pts, isNew, second, t: 0, grade, record, lvUp, perfFight, streak, rolled: 0, stamped: false };
    target = null;
    G.s = "result"; holding = false; setBtn(); renderPanel();
  }

  // ---------- 등급 · 연속 · 미션 ----------
  const GRADE = [
    { n: "일반", c: "#d7dee3", mul: 1 }, { n: "준수", c: "#62BE84", mul: 1.2 }, { n: "대물", c: "#5aa9ff", mul: 1.5 },
    { n: "초대물", c: "#c27cff", mul: 2.2 }, { n: "전설", c: "#ffcf3a", mul: 4 },
  ];
  function gradeOf(f) {
    if (f.junk) return -1;
    if (f.boss) return 4;
    if (f.sf >= 0.92 || (f.rare && f.sf >= 0.6)) return 3;
    if (f.sf >= 0.7) return 2;
    if (f.sf >= 0.4) return 1;
    return 0;
  }
  function breakStreak() {
    if (streak >= 3) flash(t("💔 {n}연속이 끊겼어요", { n: streak }));
    streak = 0;
  }
  // 오늘의 미션 3개 (날짜마다 바뀌어요)
  const MIS = [
    { k: "any", n: 5, d: "고기 {n}마리 낚기" },
    { k: "big", n: 2, d: "40cm 넘는 고기 {n}마리" },
    { k: "perfect", n: 3, d: "퍼펙트 챔질 {n}번" },
    { k: "streak", n: 3, d: "{n}연속 낚기" },
    { k: "grade", n: 1, d: "대물 등급 이상 {n}마리" },
    { k: "species", n: 1, d: "{fish} 낚기" },
  ];
  function today() { const d = new Date(Date.now() + 9 * 3600e3); return d.toISOString().slice(0, 10); }
  function missions() {
    const day = today();
    if (!save.mis || save.mis.day !== day) {
      let x = 0; for (const c of day) x = (x * 31 + c.charCodeAt(0)) >>> 0;
      const r = () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; };
      const pool = MIS.slice(), list = [];
      while (list.length < 3) {
        const m = pool.splice(Math.floor(r() * pool.length), 1)[0];
        const o = { k: m.k, n: m.n, p: 0, done: false };
        if (m.k === "species") { const c = SP.filter((s2) => !s2.junk && !s2.rare); o.id = c[Math.floor(r() * c.length)].id; }
        list.push(o);
      }
      save.mis = { day, list, all: false };
    }
    return save.mis;
  }
  function misText(o) {
    const m = MIS.find((q) => q.k === o.k);
    const sp = o.id ? SP.find((q) => q.id === o.id) : null;
    return t(m.d, { n: o.n, fish: sp ? t(sp.n) + " (" + SP_MODES(sp) + ")" : "" });
  }
  function SP_MODES(sp) { return [..."fls"].filter((c) => sp.m.includes(c)).map((c) => t(MODES[{ f: "float", l: "lure", s: "surf" }[c]].n)).join("·"); }
  function mission(k, v, id, isMax) {
    const M = missions();
    for (const o of M.list) {
      if (o.done || o.k !== k || (o.id && o.id !== id)) continue;
      o.p = isMax ? Math.max(o.p, v) : o.p + v;
      if (o.p >= o.n) {
        o.done = true; save.coins += 100; save.xp = (save.xp || 0) + 80;
        setTimeout(() => { flash(t("🎯 미션 완료! {m} (+100🪙)", { m: misText(o) })); [784, 988, 1175, 1568].forEach((f, i) => setTimeout(() => beep(f, 0.15, "triangle", 0.14), i * 90)); }, 1400);
      }
    }
    if (!M.all && M.list.every((o) => o.done)) { M.all = true; save.coins += 300; setTimeout(() => flash(t("🏆 오늘의 미션 전부 완료! +300🪙")), 3200); }
    store();
  }
  function confetti(n, cols) {
    for (let i = 0; i < n; i++) parts.push({ x: W / 2 + rnd(-40, 40), y: H * 0.42, vx: rnd(-220, 220), vy: rnd(-420, -160), r: rnd(0, 6), vr: rnd(-8, 8), life: rnd(1.2, 2.2), c: cols[i % cols.length], s: rnd(3, 6) });
  }

  // ---------- 밑밥 ----------
  function throwChum() {
    const f = tackle(), c = current();
    let x = f.x + c.dir * W * 0.01, y = f.y;
    if (!easy()) {
      if (lastTap && performance.now() - lastTap.at < 80 && lastTap.y > hy() + 4) { x = lastTap.x; y = lastTap.y; }
      else { x = f.x + rnd(-0.06, 0.06) * W; y = f.y + rnd(-0.02, 0.02) * H; }
    }
    const h = hand();
    chumFly.push({ fx: h.x, fy: h.y - 10, x, y, t: 0 });
    K.swoosh(900, 1500, 0.22, 0.18, 2);
  }

  // ---------- 입력 ----------
  function press() {
    holding = true;
    const m = mode();
    switch (G.s) {
      case "ready": startCast(); if (m !== "surf" || easy()) holding = false; break;
      case "windup": if (easy()) { releaseSurf(); holding = false; } break;
      case "wait":
      case "settle":
        if (m === "float") throwChum();
        else if (easy()) flash(t("아직이에요. 방울이 울리면 탭!"));
        else { flash(t("너무 빨라요! 고기가 놀랐어요")); beep(180, 0.2, "square", 0.08); waitT = 0; }
        holding = false; break;
      case "retr":
        lureTaps++; hopT = 0.3; lureK = Math.min(0.97, lureK + 0.02); beep(700, 0.05, "triangle", 0.08); K.click(2200, 0.25);
        if (lureTaps >= lureNeed && lureBite < 0) lureBite = rnd(0.2, 0.7);
        holding = false; break;
      case "bite":
        if (m === "float" && tk("rig") === "full" && !easy() && sinkT < 1) { flash(t("너무 빨라요! 찌가 끝까지 잠길 때 챔질")); toReady(); break; }
        hook(); break;
      case "fight":
        if (easy()) { const f = (save.gear.reel ? 1.25 : 1) * (save.gear.line ? 1.15 : 1) * (fish.run ? 0.45 : 1); P += 8 / (0.6 + 0.4 * fish.st) * f; K.click(1600, 0.25); }
        break;
      case "net": {
        const fp = netFish(), nx = netPos();
        const ok = Math.abs(fp.x - nx.x) < W * (easy() ? 0.06 : 0.03);
        if (ok) { G.s = "scoop"; scoopT = 0; K.splash(0.5, true); buzz(60); }
        else {
          K.splash(0.35, false); netMiss++;
          if (!easy() && netMiss >= 3) { flash(t("바늘털이! 뜰채질이 늦었어요")); endFight("escape"); }
          else flash(t("아직! 고기가 뜰채 위에 올 때 탭"));
        }
        holding = false; break;
      }
      case "result": if (res.t > 1.2) toReady(); holding = false; break;
    }
  }
  function release() {
    if (G.s === "windup" && !easy() && holding) { holding = false; releaseSurf(); return; }
    holding = false;
  }

  // ---------- 업데이트 ----------
  function update(dt) {
    if (G.msgT > 0) G.msgT -= dt;
    if (rushT > 0 && G.s !== "fight" && G.s !== "result") { rushT -= dt; if (rushT <= 0) flash(t("피딩 러시가 끝났어요")); }
    if (shake > 0) shake = Math.max(0, shake - dt * 2.2);
    if (flashT > 0) flashT -= dt;
    for (const q of parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 260 * dt; q.r += q.vr * dt; q.life -= dt; }
    parts = parts.filter((q) => q.life > 0);
    const s = G.s, m = mode(), cur = current();
    if (s === "windup") {
      windT += dt;
      const u = windT / (easy() ? 1.9 : 1.25);
      power = (1 - Math.cos(u * Math.PI)) / 2;
      phi = windT * Math.PI * 2 / 1.1;
      if (Math.floor((windT - dt) / 0.55) !== Math.floor(windT / 0.55)) K.swoosh(300, 600, 0.35, 0.08, 1);
    } else if (s === "cast") {
      castT += dt / castDur;
      const rel = m === "lure" ? 0.55 : m === "surf" ? 0.42 : 0.66;
      if (!released && castT >= rel) releaseTackle();
      if (castT >= 1) { G.s = "fly"; setBtn(); }
    }
    if ((s === "cast" && released) || s === "fly") {
      flyT += dt / flyDur;
      if (m === "surf") { spoolAcc += dt * 45 * (1 - flyT); while (spoolAcc > 1) { spoolAcc--; K.click(5200, 0.12); } } // 스풀에서 줄 풀리는 소리
      if (flyT >= 1) { flyT = 1; landed(); }
    }
    else if (s === "settle") { settleT += dt; bz = Math.min(planDepth(), bz + dt * 1.0); drift += cur.dir * cur.s * W * 0.022 * dt; if (settleT > 0.8) startWait(); }
    else if (s === "set") { setT += dt; if (setT > 0.9) startWait(); }
    else if (s === "wait") {
      waitT += dt * (rushT > 0 && m === "surf" ? 2.5 : 1);
      if (m === "surf") {
        for (const n of nibbles) if (waitT >= n && waitT - dt < n) beep(1568, 0.06, "triangle", 0.06);
        if (waitT >= biteAt) startBite();
      } else if (m === "float") floatTick(dt, cur);
    }
    else if (s === "retr") {
      retrT += dt; lureK += dt * 0.045; if (hopT > 0) hopT -= dt;
      if (easy() && retrT > 6 && lureBite < 0) lureBite = 0.3;
      if (lureBite < 0 && Math.random() < dt * 0.03 * condMul() * (rushT > 0 ? 6 : 1) && lureTaps > 0) lureBite = 0.2;
      if (lureBite >= 0) { lureBite -= dt; if (lureBite <= 0) { startBite(); return; } }
      if (lureK >= 0.97) { flash(t("입질이 없었어요. 다시 던져 보세요")); toReady(); }
    }
    else if (s === "bite") {
      biteT += dt;
      if (m === "float") { drift += cur.dir * cur.s * W * 0.022 * dt; if (tk("rig") === "full") sinkT = Math.min(1, sinkT + dt / 1.2); }
      const win = (easy() ? 3 : 1) + (m === "float" && tk("rig") === "full" ? 1.2 : 0);
      if (biteT > win) { flash(t("놓쳤어요. 다시 던져 보세요")); breakStreak(); toReady(); }
    }
    else if (s === "fight") fight(dt);
    else if (s === "net") netT += dt * (easy() ? 1 : 1.5);
    else if (s === "scoop") { scoopT += dt; if (scoopT > 0.8) endFight("catch"); }
    else if (s === "lift") { liftT += dt; if (liftT > 0.7) endFight("catch"); }
    else if (s === "result") res.t += dt;
    if (s !== "fight") { K.drag(0, dt); K.reel(0, dt); }
    // 밑밥 날아가기 · 퍼지기 · 가라앉기 · 흐르기
    for (const c of chumFly) c.t += dt / 0.45;
    for (const c of chumFly.filter((c) => c.t >= 1)) { chum.push({ x: c.x, y: c.y, z: 0, age: 0, r: 4 }); K.splash(0.15, false); }
    chumFly = chumFly.filter((c) => c.t < 1);
    for (const c of chum) { c.age += dt; c.z += 0.75 * dt; c.r += 5 * dt; c.x += cur.dir * cur.s * W * 0.02 * dt; }
    chum = chum.filter((c) => c.age < 16);
  }
  function floatTick(dt, cur) {
    // 찌는 조류 따라 흘러요. 반유동은 정한 수심에서 멈추고, 전유동은 끝까지 천천히 내려가요
    drift += cur.dir * cur.s * W * 0.022 * dt;
    const full = tk("rig") === "full";
    bz = full ? Math.min(BOTTOM_M, bz + dt * 0.35) : Math.min(planDepth(), bz + dt * 1.0);
    const f = tackle();
    let ov = 0;
    for (const c of chum) {
      const dx = (c.x - f.x) / (W * 0.05 + c.r), dzz = (c.z - bz) / (1 + c.age * 0.12);
      ov += Math.exp(-dx * dx - dzz * dzz) * (1 - c.age / 16);
    }
    gather += (clamp(ov, 0, 1) - gather) * dt * (save.gear.chum ? 0.7 : 0.45);
    const lam = (0.03 + 0.5 * gather) * condMul() * (easy() ? 1.6 : 1) * (rushT > 0 ? 3 : 1);
    if (Math.random() < lam * dt || (easy() && waitT > 22)) { startBite(); return; }
    if (gather > 0.25 && Math.random() < dt * 0.5) nibbles = [waitT]; // 잡어 깔짝
    if (f.x < W * 0.3 || f.x > W * 0.98) { flash(t("찌가 너무 멀리 흘렀어요. 걷어서 다시 던져요")); toReady(); }
  }
  function fight(dt) {
    fish.rt -= dt;
    if (fish.rt <= 0) { fish.run = !fish.run; fish.rt = fish.run ? rnd(0.5, 1.1) : rnd(0.8, 1.8); if (fish.run) buzz(60); setBtn(); }
    const st = fish.st, lim = save.gear.line ? 115 : 100;
    K.drag(fish.run ? 28 + 26 * st : (!easy() && T > lim * 0.75 ? 16 : 0), dt);
    K.reel(holding && !fish.run ? 10 : 0, dt);
    if (easy()) {
      if (holding) P += (13 / (0.6 + 0.4 * st)) * dt * (save.gear.reel ? 1.25 : 1) * (fish.run ? 0.45 : 1);
      T = fish.run ? 70 : 40;
      if (P >= 100) landing();
      return;
    }
    skillFight(dt);
  }
  // 세로 게이지 파이팅: 누르면 초록 칸이 올라가고, 떼면 내려와요. 고기가 칸 안에 있으면 끌려와요
  function zoneSize() { return (hard() ? 0.2 : 0.3) * (save.gear.line ? 1.12 : 1) * (fish.boss ? 0.85 : 1) * (1.08 - 0.12 * Math.min(fish.st, 1.8) / 1.8); }
  function skillFight(dt) {
    fightT += dt;
    const st = fish.st, style = fish.boss ? "jumper" : STYLE[fish.id] || "dive", zs = zoneSize();
    // 바늘털이: 고기가 물 위로 뛰어올라요 — 그때는 손을 떼야 해요
    if (jump) {
      jump.t += dt;
      if (holding && jump.t > 0.25) jump.bad = true;
      if (jump.t >= jump.dur) {
        if (jump.bad && Math.random() < (hard() ? 0.85 : 0.5)) { flash(t("바늘털이에 당했어요! 뛸 때는 손을 떼요")); endFight("escape"); return; }
        if (jump.bad) flash(t("휴… 겨우 버텼어요"));
        else { jumpsOk++; P = Math.min(99, P + 8); flash(t("버텼다! 🔥 바늘털이 성공 방어")); beep(988, 0.1); setTimeout(() => beep(1319, 0.14), 100); }
        jump = null;
      }
      return;
    }
    const canJump = style === "jumper" || fish.sf > 0.75 || fish.boss;
    if (canJump && fightT > 2 && P > 25 && P < 90 && Math.random() < dt * (fish.boss ? 0.35 : 0.18)) {
      jump = { t: 0, dur: 0.95, bad: false }; K.splash(0.9, true); buzz([80, 40, 80]); shake = 0.5;
      K.swoosh(600, 2400, 0.3, 0.3, 2); return;
    }
    // 고기 움직임
    fTimer -= dt;
    if (fTimer <= 0) {
      const aggr = (0.6 + 0.35 * st) * (hard() ? 1.25 : 1);
      if (style === "dart") { fTo = Math.random(); fTimer = rnd(0.35, 0.8) / aggr; }
      else if (style === "dive") { fTo = Math.random() < 0.6 ? rnd(0, 0.35) : rnd(0.35, 1); fTimer = rnd(0.6, 1.3) / aggr; }
      else if (style === "heavy") { fTo = rnd(0.05, 0.95); fTimer = rnd(1.0, 2.0) / aggr; }
      else if (style === "jet") { fTo = Math.random() < 0.5 ? rnd(0, 0.2) : rnd(0.8, 1); fTimer = rnd(0.7, 1.4) / aggr; }
      else { fTo = Math.random(); fTimer = rnd(0.5, 1.1) / aggr; }
    }
    const spd = (style === "dart" || style === "jet" ? 5 : style === "heavy" ? 2 : 3.2) * (0.7 + 0.3 * st) * (hard() ? 1.2 : 0.9);
    fv += ((fTo - fy) * spd * 2.2 - fv * 2.6) * dt * 3;
    fy = clamp(fy + fv * dt, 0, 1);
    fish.run = Math.abs(fv) > 0.55;
    // 초록 칸 (누르면 위로, 떼면 아래로)
    zv += (holding ? 2.9 : -2.4) * dt;
    zv *= Math.pow(0.35, dt);
    zy += zv * dt;
    if (zy < zs / 2) { zy = zs / 2; zv = Math.abs(zv) * 0.25; }
    if (zy > 1 - zs / 2) { zy = 1 - zs / 2; zv = -Math.abs(zv) * 0.25; }
    const inside = Math.abs(fy - zy) < zs / 2;
    const reel = save.gear.reel ? 1.25 : 1;
    if (inside) {
      inT += dt;
      const hot = inT > 1.5 ? 1.6 : 1; // 계속 붙잡고 있으면 손맛 x1.6
      P += (17 / (0.55 + 0.35 * st)) * dt * reel * hot * (fish.boss ? 0.55 : 1);
      T = 45 + 25 * Math.abs(fv);
      K.reel(hot > 1 ? 16 : 10, dt); K.drag(0, dt);
    } else {
      inT = 0; outT += dt;
      P -= (hard() ? 12 : 7) * dt * (0.7 + 0.3 * st);
      T = 85;
      K.drag(22 + 20 * st, dt); K.reel(0, dt);
    }
    if (P <= 0) endFight(Math.random() < 0.5 ? "snap" : "escape");
    else if (P >= 100) landing();
  }

  // ---------- 화면 · 좌표 ----------
  let root, cv, ctx, btn, W = 360, H = 360, S = 1, F = 1, running = false, last = 0, FONT = "sans-serif";
  let wx = { clouds: [], drops: [] };
  function resize() {
    if (!cv) return;
    const r = K.canvasSize(cv, ctx, 0.95, 580); W = r.W; H = r.H;
    S = clamp(Math.min(W, H) / 380, 0.8, 1.5);
    wx.clouds = Array.from({ length: 6 }, () => ({ x: Math.random(), y: rnd(0.04, 0.22), s: rnd(0.6, 1.3) }));
    wx.drops = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), v: rnd(0.8, 1.2) }));
  }
  const hy = () => H * (K && K.photo("fish") ? 0.44 : 0.34);
  function feet() { return mode() === "surf" ? { x: W * 0.12, y: H * 0.86 } : { x: W * 0.13, y: H * 0.8 }; }
  function hand() { const f = feet(); return { x: f.x + 13 * S, y: f.y - 48 * S }; }
  function holder() { const f = feet(); return { x: f.x + 46 * S, y: f.y - 30 * S }; }
  function shore() { return mode() === "surf" ? { x: W * 0.3, y: H * 0.8 } : { x: W * 0.36, y: H * 0.85 }; }
  function tgt(d, l) { return { x: W * (0.42 + 0.48 * Math.min(d, 1)) + (l || 0) * W, y: H * (0.76 - 0.32 * Math.min(d, 1.05)) }; }
  function castAngle(k) {
    const m = mode();
    if (m === "lure") return k < 0.4 ? lerp(-1.05, -2.55, ease(k / 0.4)) : k < 0.62 ? lerp(-2.55, -0.5, (k - 0.4) / 0.22) : lerp(-0.5, -0.9, ease((k - 0.62) / 0.38));
    if (m === "surf") return k < 0.55 ? lerp(-2.45, -0.4, Math.pow(k / 0.55, 1.6)) : lerp(-0.4, -0.75, ease((k - 0.55) / 0.45));
    return k < 0.45 ? lerp(-1.05, -1.5, ease(k / 0.45)) : k < 0.75 ? lerp(-1.5, -0.75, ease((k - 0.45) / 0.3)) : lerp(-0.75, -0.95, ease((k - 0.75) / 0.25));
  }
  function rodState() {
    const m = mode(), s = G.s, h = hand();
    let bx = h.x, by = h.y, a = -1.05, bend = 0.05;
    if (m === "surf" && (s === "wait" || s === "bite" || (s === "set" && setT > 0.45))) {
      const hd = holder(); bx = hd.x; by = hd.y; a = -0.95;
      bend = s === "bite" ? 0.3 + 0.12 * Math.sin(now * 32) : 0.07 + nibbleShake() * 0.05;
    }
    else if (s === "cast") { const k = clamp(castT, 0, 1); a = castAngle(k); const d = (castAngle(Math.min(1, k + 0.03)) - a) / 0.03; bend = clamp(-d * 0.06, -0.5, 0.4); }
    else if (s === "windup") { a = -2.4 - 0.08 * Math.sin(phi); bend = 0.12 + 0.08 * Math.sin(phi); }
    else if (s === "fight") { a = -1.35; bend = 0.15 + T / 100 * 0.75; }
    else if (s === "net" || s === "scoop") { a = -1.55; bend = 0.5; }
    else if (s === "lift") { a = -1.55 - liftT * 0.4; bend = 0.55 - liftT * 0.3; }
    else if (s === "bite" && m !== "surf") bend = 0.14;
    else if (s === "retr" && hopT > 0) a = -1.05 - Math.sin(hopT / 0.3 * Math.PI) * 0.25;
    return { bx, by, a, bend };
  }
  function nibbleShake() { return G.s === "wait" && nibbles.some((n) => Math.abs(waitT - n) < 0.25) ? 1 : 0; }
  function rodPts() {
    const r = rodState(), L = Math.min(W, H) * ROD[mode()].L, n = 14, pts = [[r.bx, r.by]];
    let x = r.bx, y = r.by;
    for (let i = 1; i <= n; i++) { const k = i / n, ang = r.a + r.bend * k * k * 1.6; x += Math.cos(ang) * L / n; y += Math.sin(ang) * L / n; pts.push([x, y]); }
    return pts;
  }
  function tip() { const p = rodPts(), q = p[p.length - 1]; return { x: q[0], y: q[1] }; }
  function tackle() {
    const s = G.s, m = mode();
    if ((s === "cast" && released) || s === "fly") { const k = clamp(flyT, 0, 1); return { x: lerp(from.x, to.x, k), y: lerp(from.y, to.y, k) - Math.sin(Math.PI * k) * H * arcH }; }
    if (s === "retr" || (s === "bite" && m === "lure")) { const sh = shore(); return { x: lerp(to.x, sh.x, lureK), y: lerp(to.y, sh.y, lureK) - (hopT > 0 ? Math.sin(hopT / 0.3 * Math.PI) * 8 * S : 0) }; }
    if (s === "fight") { const sh = shore(), k = clamp(P, 0, 100) / 100; return { x: lerp(hookPt.x, sh.x, k) + (fish.run ? Math.sin(now * 30) * 3 : 0), y: lerp(hookPt.y, sh.y, k) }; }
    if (s === "net" || s === "scoop" || s === "lift") return netFish();
    if (to) return { x: to.x + drift, y: to.y };
    return tgt(cast, lat);
  }
  function netPos() { const sh = shore(); return { x: sh.x + W * 0.07, y: sh.y - H * 0.01 }; }
  function netFish() {
    const n = netPos();
    if (G.s === "scoop") { const k = Math.min(1, scoopT / 0.8); return { x: lerp(n.x, hand().x + 20 * S, k), y: lerp(n.y, hand().y - 10 * S, ease(k)) }; }
    if (G.s === "lift") { const k = Math.min(1, liftT / 0.7), sh = shore(); return { x: lerp(sh.x, hand().x + 30 * S, k), y: lerp(sh.y, hand().y - 60 * S, ease(k)) - Math.sin(Math.PI * k) * 30 * S }; }
    return { x: n.x + Math.sin(netT * 1.6) * W * 0.09, y: n.y + Math.sin(netT * 3.1) * 3 };
  }

  // ---------- 그리기 도구 ----------
  function hex(c) { if (c[0] !== "#") { const m = c.match(/\d+(\.\d+)?/g) || [0, 0, 0]; return [+m[0], +m[1], +m[2]]; } return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  function mix(a, b, k) { const x = hex(a), y = hex(b); return "rgb(" + x.map((v, i) => Math.round(lerp(v, y[i], k))).join(",") + ")"; }
  function rr(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function txt(s, x, y, size, color, align, weight) { ctx.font = (weight || "700") + " " + Math.round(size * F) + "px " + FONT; ctx.textAlign = align || "center"; ctx.textBaseline = "middle"; ctx.fillStyle = color || "#fff"; ctx.fillText(s, x, y); }
  function stxt(s, x, y, size, color, align, weight) { ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowBlur = 6; ctx.shadowOffsetY = 1; txt(s, x, y, size, color, align, weight); ctx.restore(); }
  function fitTxt(s, x, y, size, maxW, color, weight, shadow) {
    ctx.font = (weight || "700") + " " + Math.round(size * F) + "px " + FONT;
    const w = ctx.measureText(s).width, k = w > maxW ? maxW / w : 1;
    (shadow ? stxt : txt)(s, x, y, size * k, color, "center", weight);
  }

  // ---------- 장면: 하늘 · 날씨 · 바다 · 물때 ----------
  const SEA_COL = { W: ["#7fb0b8", "#2f5d66"], S: ["#5aa7cf", "#0d4f7a"], E: ["#3f8fd0", "#08386a"] };
  function drawScene() {
    const h = hy(), night = COND.night, hr = kstHour();
    const dusk = night ? 1 : hr >= 16.5 ? 0.5 : hr < 7 ? 0.4 : 0;
    const gray = isRain() || isSnow() || isFog() || COND.cloud > 80 ? 0.55 : COND.cloud / 200;
    const ph = K.photo("fish");
    if (ph) K.drawCover(ctx, ph, 0, 0, W, h + 1);
    else {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      const top = night ? "#0b1430" : mix(mix("#4aa3df", "#4b4f8f", dusk), "#8a96a3", gray);
      const bot = night ? "#26345e" : mix(mix("#d6eef8", "#f3a774", dusk), "#c3c9cf", gray);
      g.addColorStop(0, top); g.addColorStop(1, bot);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, h + 1);
      if (night) {
        ctx.fillStyle = "#fff";
        for (let i = 0; i < 40; i++) { ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(i * 7.3 + now)); ctx.fillRect((i * 97.3) % W, ((i * 53.1) % (h * 0.9)), 1.5, 1.5); }
        ctx.globalAlpha = 1;
        drawMoon(W * 0.8, h * 0.3, Math.min(W, H) * 0.05);
      } else if (gray < 0.5) {
        ctx.fillStyle = mix("#fff6c9", "#ff9a5a", dusk); ctx.beginPath(); ctx.arc(W * 0.8, lerp(H * 0.1, h - 6, dusk), Math.min(W, H) * 0.055, 0, 7); ctx.fill();
      }
      // 구름: 구름 양만큼, 바람 따라 흘러요
      const nC = Math.round(COND.cloud / 18);
      for (let i = 0; i < Math.min(nC, wx.clouds.length); i++) {
        const c = wx.clouds[i], x = ((c.x + now * 0.004 * (1 + COND.wind * 0.3) * Math.sign(crossWind() || 1)) % 1.2 + 1.2) % 1.2 - 0.1;
        ctx.fillStyle = night ? "rgba(120,130,160,0.35)" : gray > 0.4 ? "rgba(150,158,168,0.85)" : "rgba(255,255,255,0.85)";
        const cx = x * W, cy = c.y * H, r = 16 * c.s * S;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.arc(cx + r, cy - r * 0.4, r * 1.1, 0, 7); ctx.arc(cx + r * 2, cy, r * 0.9, 0, 7); ctx.fill();
      }
      // 먼 섬
      ctx.fillStyle = night ? "#1a2240" : mix("#6d8fa8", "#5c4a70", dusk);
      ctx.beginPath(); ctx.moveTo(W * 0.42, h); ctx.quadraticCurveTo(W * 0.53, h - H * 0.05, W * 0.66, h); ctx.fill();
      ctx.beginPath(); ctx.moveTo(W * 0.6, h); ctx.quadraticCurveTo(W * 0.67, h - H * 0.025, W * 0.76, h); ctx.fill();
    }
    // 바다
    const sc = SEA_COL[place()] || SEA_COL.S;
    const s = ctx.createLinearGradient(0, h, 0, H);
    s.addColorStop(0, night ? "#1d2c55" : mix(mix(sc[0], "#b07a78", dusk * 0.5), "#8d9aa3", gray * 0.6));
    s.addColorStop(1, night ? "#060d24" : mix(sc[1], "#142a50", dusk * 0.5));
    ctx.fillStyle = s; ctx.fillRect(0, h, W, H - h);
    if (night) { // 달빛 길
      ctx.fillStyle = "rgba(255,240,200,0.25)";
      for (let i = 0; i < 12; i++) ctx.fillRect(W * 0.8 - (14 - i) + Math.sin(now * 2 + i) * 4, h + 4 + i * i * 1.6, (14 - i) * 2, 1.5);
    }
    // 물결: 파도 높이만큼 크고 빠르게, 하얀 포말
    const wv = clamp(COND.wave, 0.1, 4), spd = 8 + COND.wind * 2.5;
    ctx.strokeStyle = "rgba(255,255,255," + (0.12 + Math.min(0.2, wv * 0.06)) + ")"; ctx.lineWidth = 1.2 + Math.min(2, wv * 0.5);
    for (let i = 0; i < 34; i++) {
      const f = Math.pow(i / 34, 1.6), yy = h + 8 + f * (H - h) + Math.sin(now * 1.5 + i) * wv * 1.5, len = 8 + f * 40 * (0.7 + wv * 0.3), span = W + 100;
      const o1 = ((i * 137.5 + now * (spd + i)) % span) - 50;
      ctx.beginPath(); ctx.moveTo(o1, yy); ctx.lineTo(o1 + len, yy); ctx.stroke();
    }
    if (wv > 0.9) {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      for (let i = 0; i < Math.round(wv * 6); i++) { const x = ((i * 211 + now * spd * 1.3) % (W + 40)) - 20, y = h + 10 + ((i * 47) % (H - h - 30)); ctx.beginPath(); ctx.ellipse(x, y, 6 + wv * 2, 1.5, 0, 0, 7); ctx.fill(); }
    }
    drawShore();
    // 비 · 눈 · 안개 · 번개
    if (isRain() || isSnow()) {
      const slant = crossWind() * 0.6;
      ctx.strokeStyle = isSnow() ? "rgba(255,255,255,0.9)" : "rgba(220,230,255,0.55)"; ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 1;
      const n = Math.round(clamp(30 + COND.rain * 25, 30, 90));
      for (let i = 0; i < n; i++) {
        const d = wx.drops[i], y = ((d.y + now * (isSnow() ? 0.08 : 0.9) * d.v) % 1) * H, x = (((d.x + now * slant * 0.01) % 1) + 1) % 1 * W;
        if (isSnow()) { ctx.beginPath(); ctx.arc(x + Math.sin(now + i) * 6, y, 1.8, 0, 7); ctx.fill(); }
        else { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + slant * 2, y + 10); ctx.stroke(); }
      }
    }
    if (isFog()) { ctx.fillStyle = "rgba(215,222,228,0.45)"; ctx.fillRect(0, 0, W, H * 0.7); }
    if (COND.code >= 95 && Math.sin(now * 0.7) > 0.995) { ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.fillRect(0, 0, W, H); }
  }
  function drawMoon(x, y, r) {
    const l = lunarInfo().l, ph = ((l - 1) / 29.53) * 2 * Math.PI; // 0 = 삭, π = 보름
    ctx.fillStyle = "#2b3350"; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff4c8"; ctx.beginPath();
    const waxing = l <= 15, k = Math.cos(ph); // 1 → 0 → -1
    ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2, !waxing);
    ctx.ellipse(x, y, Math.abs(k) * r, r, 0, Math.PI / 2, -Math.PI / 2, (waxing ? k > 0 : k < 0));
    ctx.fill();
  }
  // 물때: 물이 많으면 바위·테트라포드·모래가 더 잠기고, 서해 간조엔 갯벌이 드러나요
  function drawShore() {
    const k = COND.tide.k, m = mode();
    if (m === "surf") {
      const top = H * (0.79 - 0.035 * (1 - k));
      if (place() === "W" && k < 0.5) { // 갯벌
        ctx.fillStyle = "#8a7a5e"; ctx.beginPath(); ctx.moveTo(0, top - (0.5 - k) * H * 0.08); ctx.quadraticCurveTo(W * 0.5, top - (0.5 - k) * H * 0.12, W, top - (0.5 - k) * H * 0.06); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
      }
      ctx.fillStyle = "#e6d3a3";
      ctx.beginPath(); ctx.moveTo(0, top); ctx.quadraticCurveTo(W * 0.5, top - H * 0.04 + Math.sin(now) * 2, W, top + H * 0.01); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 2 + COND.wave;
      ctx.beginPath(); ctx.moveTo(0, top - 2 + Math.sin(now * 1.3) * 2); ctx.quadraticCurveTo(W * 0.5, top - H * 0.04 - 3 + Math.sin(now) * 3, W, top + H * 0.01 - 2); ctx.stroke();
      // 삼발이 (원투대 받침)
      const hd = holder(), f = feet();
      ctx.strokeStyle = "#5b5f66"; ctx.lineWidth = 2.5 * S;
      ctx.beginPath(); ctx.moveTo(hd.x, hd.y); ctx.lineTo(hd.x - 9 * S, f.y + 2); ctx.moveTo(hd.x, hd.y); ctx.lineTo(hd.x + 9 * S, f.y + 2); ctx.moveTo(hd.x, hd.y); ctx.lineTo(hd.x + 2 * S, f.y + 5); ctx.stroke();
      ctx.fillStyle = "#c2452d"; ctx.fillRect(hd.x - 4 * S, hd.y - 3 * S, 8 * S, 4 * S);
      return;
    }
    if (m === "float") {
      ctx.fillStyle = "#5b5148";
      ctx.beginPath(); ctx.moveTo(0, H * 0.8); ctx.lineTo(W * 0.1, H * 0.79); ctx.lineTo(W * 0.24, H * 0.81); ctx.lineTo(W * 0.31, H * 0.88); ctx.lineTo(W * 0.29, H); ctx.lineTo(0, H); ctx.fill();
      ctx.fillStyle = "#6e6358"; ctx.beginPath(); ctx.moveTo(W * 0.24, H * 0.83); ctx.lineTo(W * 0.35, H * 0.9); ctx.lineTo(W * 0.4, H); ctx.lineTo(W * 0.26, H); ctx.fill();
      // 젖은 자국 (만조 때 높이) · 따개비
      ctx.fillStyle = "rgba(30,25,20,0.35)"; ctx.fillRect(W * 0.24, H * (0.9 - 0.05 * k), W * 0.16, H * 0.1);
    } else {
      ctx.fillStyle = "#9aa0a6";
      ctx.beginPath(); ctx.moveTo(0, H * 0.8); ctx.lineTo(W * 0.26, H * 0.8); ctx.lineTo(W * 0.3, H); ctx.lineTo(0, H); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fillRect(0, H * 0.8, W * 0.26, 3);
      const r = Math.min(W, H) * 0.05;
      [[0.27, 0.86], [0.31, 0.92], [0.25, 0.97], [0.34, 0.99]].forEach(([x, y]) => tetra(W * x, H * y, r));
    }
    // 물높이: 만조일수록 물이 높이 차올라요
    const wl = H * (0.97 - 0.09 * k);
    ctx.fillStyle = "rgba(40,90,120,0.55)"; ctx.fillRect(W * 0.22, wl, W * 0.2, H - wl);
    ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = W * 0.22; x <= W * 0.42; x += 6) ctx.lineTo(x, wl + Math.sin(x * 0.2 + now * 3) * 1.5);
    ctx.stroke();
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

  // ---------- 사람 · 낚싯대 · 릴 ----------
  function drawAngler() {
    const f = feet(), s = S, m = mode(), restRod = m === "surf" && (G.s === "wait" || G.s === "bite" || (G.s === "set" && setT > 0.45));
    const h = restRod ? { x: f.x + 12 * s, y: f.y - 30 * s } : hand();
    ctx.strokeStyle = "#1d2430"; ctx.lineCap = "round"; ctx.lineWidth = 5 * s;
    ctx.beginPath(); ctx.moveTo(f.x - 6 * s, f.y); ctx.lineTo(f.x - 1 * s, f.y - 28 * s); ctx.moveTo(f.x + 7 * s, f.y); ctx.lineTo(f.x + 2 * s, f.y - 28 * s); ctx.stroke();
    ctx.fillStyle = "#e8742c"; rr(f.x - 10 * s, f.y - 56 * s, 20 * s, 30 * s, 5 * s); ctx.fill(); // 구명조끼
    ctx.fillStyle = "#F2B705"; ctx.fillRect(f.x - 10 * s, f.y - 44 * s, 20 * s, 3 * s);
    ctx.fillStyle = "#e9c3a0"; ctx.beginPath(); ctx.arc(f.x + 1 * s, f.y - 64 * s, 8 * s, 0, 7); ctx.fill();
    ctx.fillStyle = "#1F6B3A"; ctx.beginPath(); ctx.arc(f.x + 1 * s, f.y - 66 * s, 8.5 * s, Math.PI, 0); ctx.fill(); ctx.fillRect(f.x + 1 * s, f.y - 67 * s, 13 * s, 3 * s);
    if (m === "float") { ctx.fillStyle = "#3a6ea5"; rr(f.x - 26 * s, f.y - 14 * s, 14 * s, 14 * s, 3 * s); ctx.fill(); ctx.fillStyle = "#e88a3a"; ctx.fillRect(f.x - 25 * s, f.y - 13 * s, 12 * s, 4 * s); } // 밑밥통
    drawRod();
    ctx.strokeStyle = "#e8742c"; ctx.lineWidth = 5 * s; ctx.beginPath(); ctx.moveTo(f.x + 4 * s, f.y - 50 * s); ctx.lineTo(h.x, h.y); ctx.stroke();
    // 뜰채
    if (G.s === "net" || G.s === "scoop") {
      const np = netPos(), sc = G.s === "scoop" ? ease(Math.min(1, scoopT / 0.8)) : 0;
      const ring = { x: lerp(np.x, hand().x + 20 * S, sc), y: lerp(np.y, hand().y - 10 * S, sc) };
      ctx.strokeStyle = "#c9ccd0"; ctx.lineWidth = 2.5 * s; ctx.beginPath(); ctx.moveTo(f.x - 2 * s, f.y - 40 * s); ctx.lineTo(ring.x - 14 * s, ring.y); ctx.stroke();
      const over = Math.abs(netFish().x - np.x) < W * (easy() ? 0.06 : 0.03);
      ctx.strokeStyle = G.s === "net" && over ? "#62BE84" : "#F2B705"; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.ellipse(ring.x, ring.y, 16 * s, 6 * s, 0, 0, 7); ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ring.x - 14 * s, ring.y); ctx.lineTo(ring.x, ring.y + 14 * s); ctx.lineTo(ring.x + 14 * s, ring.y); ctx.stroke();
    }
  }
  function drawRod() {
    const R = ROD[mode()], pts = rodPts(), s = S;
    ctx.lineCap = "round";
    for (let i = 1; i < pts.length; i++) {
      const k = i / pts.length;
      ctx.strokeStyle = i >= pts.length - 2 ? R.tip : R.band && i < 3 ? R.band : R.col;
      ctx.lineWidth = Math.max(1, R.w * (1 - 0.7 * k)) * s;
      ctx.beginPath(); ctx.moveTo(pts[i - 1][0], pts[i - 1][1]); ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke();
    }
    // 가이드
    ctx.fillStyle = "#d0d4d8";
    for (let i = 3; i < pts.length; i += 2) { ctx.beginPath(); ctx.arc(pts[i][0], pts[i][1], Math.max(1, R.w * 0.45 * (1 - i / pts.length)) * s, 0, 7); ctx.fill(); }
    // 손잡이 · 릴
    const [bx, by] = pts[0], [nx, ny] = pts[1], ang = Math.atan2(ny - by, nx - bx);
    if (R.cork) { ctx.strokeStyle = "#c8a46a"; ctx.lineWidth = R.w * 1.6 * s; ctx.beginPath(); ctx.moveTo(bx - Math.cos(ang) * 6 * s, by - Math.sin(ang) * 6 * s); ctx.lineTo(bx + Math.cos(ang) * 4 * s, by + Math.sin(ang) * 4 * s); ctx.stroke(); }
    const rx = bx + Math.cos(ang) * 6 * s + Math.cos(ang + Math.PI / 2) * R.reel * 0.9 * s, ry = by + Math.sin(ang) * 6 * s + Math.sin(ang + Math.PI / 2) * R.reel * 0.9 * s;
    ctx.fillStyle = "#3b3f45"; ctx.beginPath(); ctx.arc(rx, ry, R.reel * s, 0, 7); ctx.fill();
    ctx.fillStyle = mode() === "surf" ? "#c9d3dc" : "#8f969e"; ctx.beginPath(); ctx.arc(rx, ry, R.reel * 0.55 * s, 0, 7); ctx.fill();
    const spin = G.s === "fight" && holding ? now * 14 : 0;
    ctx.strokeStyle = "#222"; ctx.lineWidth = 1.5 * s; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.cos(spin) * R.reel * 1.3 * s, ry + Math.sin(spin) * R.reel * 1.3 * s); ctx.stroke();
    if (R.lb) { ctx.strokeStyle = "#c2452d"; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(rx - R.reel * s, ry); ctx.lineTo(rx - R.reel * 1.8 * s, ry + R.reel * 0.8 * s); ctx.stroke(); } // 레버 브레이크
  }

  // ---------- 채비 · 줄 · 밑밥 · 고기 ----------
  function drawTackle() {
    const tp = tip(), b = tackle(), m = mode(), s = G.s;
    // 원투 힘 모으기: 봉돌 진자
    if (s === "windup") {
      const len = 26 * S, sx = tp.x + Math.sin(phi) * len, sy = tp.y + Math.cos(phi) * len * 0.8 + len * 0.3;
      ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tp.x, tp.y); ctx.lineTo(sx, sy); ctx.stroke();
      ctx.fillStyle = "#555"; ctx.beginPath(); ctx.arc(sx, sy, 4.5 * S, 0, 7); ctx.fill();
      return;
    }
    if (s === "ready" || s === "result" || (s === "cast" && !released)) {
      if (s === "result") return;
      const hang = { x: tp.x + Math.sin(now * 2) * 2, y: tp.y + 18 * S };
      ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tp.x, tp.y); ctx.lineTo(hang.x, hang.y); ctx.stroke();
      if (m === "float") { ctx.fillStyle = "#ff5a2a"; ctx.beginPath(); ctx.arc(hang.x, hang.y - 6 * S, 3.5 * S, 0, 7); ctx.fill(); }
      ctx.fillStyle = m === "lure" ? "#dfe6ec" : "#555"; ctx.beginPath(); ctx.arc(hang.x, hang.y, 3 * S, 0, 7); ctx.fill();
      return;
    }
    let bo = 0;
    if (m === "float" && (s === "wait" || s === "settle")) { bo = Math.sin(now * 3) * 1.2 * (0.6 + COND.wave * 0.4); if (nibbleShake()) bo += 3; }
    const sag = s === "fight" ? (1 - Math.min(T, 100) / 100) * 50 + 2 : s === "retr" ? 8 : (s === "fly" || s === "cast") ? 4 : m === "surf" ? 4 + (s === "bite" ? 0 : 6) : 25;
    ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(tp.x, tp.y); ctx.quadraticCurveTo((tp.x + b.x) / 2, (tp.y + b.y) / 2 + sag, b.x, b.y + bo); ctx.stroke();
    const sc = (1 - 0.45 * Math.min(cast, 1)) * S;
    if (s === "fight" && jump) {
      const k = jump.t / jump.dur, jx = b.x + (k - 0.5) * 30 * S, jy = b.y - Math.sin(k * Math.PI) * H * 0.18;
      ctx.save(); ctx.translate(jx, jy); ctx.rotate((k - 0.5) * 2.2);
      drawFish(0, 0, (fish.junk ? 24 : Math.min(120, fish.size * 0.9 + 10)) * S, fish); ctx.restore();
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + now; ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.beginPath(); ctx.arc(b.x + Math.cos(a) * 18 * k, b.y + Math.sin(a) * 6 * k, 2, 0, 7); ctx.fill(); }
      return;
    }
    if (s === "fight" || s === "net" || s === "scoop" || s === "lift") { drawHooked(b); return; }
    if (s === "bite") {
      for (let i = 0; i < 3; i++) { const rp = ((biteT * 2) + i / 3) % 1; ctx.strokeStyle = "rgba(255,255,255," + (0.7 * (1 - rp)) + ")"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(b.x, b.y + 3 * sc, (4 + rp * 30) * sc, (1.5 + rp * 9) * sc, 0, 0, 7); ctx.stroke(); }
      const pulse = 1 + Math.sin(now * 20) * 0.12, mk = m === "surf" ? tp : b;
      stxt("!", mk.x, mk.y - 36 * S, 50 * pulse * S / F, "#ffe14a");
      if (m === "float" && tk("rig") === "full" && sinkT < 1) drawFloat(b.x, b.y, sc, sinkT, 1); // 전유동: 스르르 잠기는 중
      if (m === "float") return;
    }
    if (m === "float") {
      if (s === "wait" || s === "settle") { const rp = (now * 0.8) % 1; ctx.strokeStyle = "rgba(255,255,255," + (0.4 * (1 - rp)) + ")"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(b.x, b.y + 3 * sc, (6 + rp * 16) * sc, (2 + rp * 5) * sc, 0, 0, 7); ctx.stroke(); }
      const stand = s === "settle" ? Math.min(1, settleT / 0.6) : s === "fly" || s === "cast" ? 0.3 : 1;
      drawFloat(b.x, b.y + bo, sc, 0, stand);
    } else if (m === "lure") {
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(-0.3);
      ctx.fillStyle = "#dfe6ec"; ctx.beginPath(); ctx.ellipse(0, 0, 8 * sc, 3.5 * sc, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#F2B705"; ctx.beginPath(); ctx.ellipse(-3 * sc, 0, 3 * sc, 2 * sc, 0, 0, 7); ctx.fill();
      ctx.restore();
      if (s === "retr" && hopT > 0) { ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(b.x, b.y + 6, 12 * sc, 3 * sc, 0, 0, 7); ctx.stroke(); }
    } else if (s === "fly" || s === "cast") {
      ctx.fillStyle = "#555"; ctx.beginPath(); ctx.arc(b.x, b.y, 4 * sc, 0, 7); ctx.fill();
    } else {
      const rp = (now * 0.5) % 1; ctx.strokeStyle = "rgba(255,255,255," + (0.25 * (1 - rp)) + ")"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(b.x, b.y, (4 + rp * 10) * sc, (1 + rp * 3) * sc, 0, 0, 7); ctx.stroke();
    }
  }
  // 구멍찌: stand 0 = 누워 있음 → 1 = 섰음, sink 0~1 = 잠김
  function drawFloat(x, y, sc, sink, stand) {
    ctx.save(); ctx.translate(x, y + sink * 10 * sc); ctx.rotate((1 - stand) * 1.3);
    ctx.globalAlpha = 1 - sink * 0.8;
    ctx.fillStyle = "#ff5a2a"; ctx.beginPath(); ctx.ellipse(0, -4 * sc, 5.5 * sc, 7 * sc, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(0, -4 * sc, 5.5 * sc, 4 * sc, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = "#ffe14a"; ctx.fillRect(-1 * sc, -14 * sc, 2 * sc, 4 * sc);
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function drawHooked(b) {
    const s = G.s;
    if (s === "fight") {
      const len = (fish.junk ? 24 : fish.size * 0.7 + 8) * S * (1 - 0.3 * cast * (1 - P / 100));
      ctx.fillStyle = "rgba(5,20,35,0.55)"; ctx.beginPath(); ctx.ellipse(b.x + len * 0.3, b.y + 6, len * 0.55, len * 0.16, Math.sin(now * 6) * 0.15, 0, 7); ctx.fill();
      if (fish.run || P > 75) { ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { const a = -Math.PI / 2 + (i - 1.5) * 0.5; ctx.beginPath(); ctx.moveTo(b.x + Math.cos(a) * 6, b.y + Math.sin(a) * 6); ctx.lineTo(b.x + Math.cos(a) * 18, b.y + Math.sin(a) * 18); ctx.stroke(); } }
      return;
    }
    // 물 위로 떠오른 고기
    const len = Math.min(90, (fish.junk ? 26 : fish.size * 0.9 + 10)) * S;
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(s === "net" ? Math.sin(now * 9) * 0.25 : -0.6);
    drawFish(0, 0, len, fish); ctx.restore();
    if (s === "net") { ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(b.x, b.y + 5, len * 0.5 + Math.sin(now * 12) * 3, 4, 0, 0, 7); ctx.stroke(); }
  }
  function drawChum() {
    for (const c of chumFly) {
      const k = c.t, x = lerp(c.fx, c.x, k), y = lerp(c.fy, c.y, k) - Math.sin(Math.PI * k) * H * 0.12;
      ctx.fillStyle = "#e88a3a"; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(x + Math.sin(i * 2.1) * 4 * k, y + Math.cos(i * 1.7) * 3 * k, 2.2, 0, 7); ctx.fill(); }
    }
    for (const c of chum) {
      if (c.z > 2.2) continue;
      ctx.globalAlpha = (1 - c.z / 2.2) * 0.8; ctx.fillStyle = "#e88a3a";
      for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.arc(c.x + Math.sin(i * 2.4 + c.age) * c.r, c.y + Math.cos(i * 1.9) * c.r * 0.3, 1.8, 0, 7); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }
  // 수중 단면: 찌 · 미끼 수심 · 밑밥이 가라앉는 모습 · 모인 고기
  function drawUnder() {
    if (mode() !== "float" || !["settle", "wait", "bite"].includes(G.s)) return;
    const x0 = W * 0.63, y0 = H * 0.17, w = W * 0.34, h = H * 0.3, f = tackle(), cur = current();
    const g = ctx.createLinearGradient(0, y0, 0, y0 + h); g.addColorStop(0, "rgba(40,110,150,0.88)"); g.addColorStop(1, "rgba(5,25,50,0.92)");
    ctx.fillStyle = g; rr(x0, y0, w, h, 12); ctx.fill();
    const Y = (z) => y0 + 14 + (z / BOTTOM_M) * (h - 24), cx = x0 + w * 0.55;
    ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.font = "600 " + Math.round(10 * F) + "px " + FONT; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    for (const z of [0, 3, 6, 9]) { ctx.fillText(z + "m", x0 + 5, Y(z)); ctx.fillRect(x0 + 26, Y(z), w - 32, 0.5); }
    ctx.fillStyle = "#6b5a40"; ctx.fillRect(x0 + 1, Y(BOTTOM_M) + 2, w - 2, y0 + h - Y(BOTTOM_M) - 3);
    // 밑밥 구름
    for (const c of chum) {
      const rx = cx + (c.x - f.x) / (W * 0.25) * (w * 0.4);
      if (rx < x0 + 28 || rx > x0 + w - 4) continue;
      ctx.globalAlpha = 0.85 * (1 - c.age / 16); ctx.fillStyle = "#e88a3a";
      const rad = 3 + c.age * 0.6;
      for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(rx + Math.sin(i * 2.3) * rad, Y(Math.min(c.z, BOTTOM_M)) + Math.cos(i * 1.7) * rad * 0.6, 1.6, 0, 7); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    // 찌 · 원줄 · 미끼
    const bzY = Y(bz), sink = G.s === "bite" ? (tk("rig") === "full" ? sinkT : 1) : 0;
    ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, Y(0)); ctx.lineTo(cx, bzY); ctx.stroke();
    ctx.fillStyle = "#ff5a2a"; ctx.beginPath(); ctx.arc(cx, Y(0) + sink * 8, 4, 0, 7); ctx.fill();
    if (tk("rig") === "half") { ctx.fillStyle = "#ffe14a"; ctx.fillRect(cx - 4, Y(planDepth()) - 1, 8, 2); } // 찌멈춤봉 표시
    ctx.fillStyle = "#ffd0b0"; ctx.beginPath(); ctx.arc(cx, bzY, 3, 0, 7); ctx.fill();
    // 모인 고기
    const nF = Math.round(gather * 6);
    for (let i = 0; i < nF; i++) {
      const fx = cx + Math.sin(now * 0.8 + i * 1.9) * w * 0.25, fy = bzY + Math.cos(now * 0.6 + i) * 10;
      ctx.fillStyle = "rgba(220,235,245,0.85)"; ctx.beginPath(); ctx.ellipse(fx, fy, 6, 2.5, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(fx + 5, fy); ctx.lineTo(fx + 9, fy - 3); ctx.lineTo(fx + 9, fy + 3); ctx.fill();
    }
    ctx.textAlign = "center";
    txt((tk("rig") === "full" ? t("전유동") : t("반유동")) + " " + bz.toFixed(1) + "m" + (tk("rig") === "full" && bz < BOTTOM_M ? "↓" : ""), x0 + w / 2, y0 + h + 10 * F, 11, "#fff", "center", "700");
    // 조류 · 집어
    txt(t("조류") + " " + (cur.dir > 0 ? "→" : "←"), x0 + w - 26, y0 + 9, 10, "#bfe6ff", "center", "700");
    ctx.fillStyle = "rgba(0,0,0,0.4)"; rr(x0 + 6, y0 + h + 20 * F, w - 12, 6, 3); ctx.fill();
    ctx.fillStyle = "#e88a3a"; rr(x0 + 6, y0 + h + 20 * F, Math.max(3, (w - 12) * gather), 6, 3); ctx.fill();
    txt(t("집어 {n}%", { n: Math.round(gather * 100) }), x0 + w / 2, y0 + h + 34 * F, 10, "#fff", "center", "600");
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
    if (f.shape === "needle") ctx.fillRect(x - len * 0.62, y + 1, len * 0.22, 2);
    else { ctx.beginPath(); ctx.moveTo(x - len * 0.12, y - len * (th - 0.02)); ctx.lineTo(x + len * 0.12, y - len * (th + 0.1)); ctx.lineTo(x + len * 0.22, y - len * (th - 0.04)); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.beginPath(); ctx.ellipse(x - len * 0.02, y + len * th * 0.35, len * 0.32, len * th * 0.4, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x - len * 0.3, y - len * 0.04, len * 0.045, 0, 7); ctx.fill();
    ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(x - len * 0.31, y - len * 0.04, len * 0.022, 0, 7); ctx.fill();
  }

  // ---------- 안내 글 · 게이지 ----------
  function condLine() {
    const c = COND, td = c.tide, lu = lunarInfo();
    return "📍" + t(spot().n) + "  " + wxIcon() + (c.temp != null ? Math.round(c.temp) + "°" : "") + "  💨" + dirName(c.windDir) + " " + Math.round(c.wind) + "m/s  🌊" + c.wave.toFixed(1) + "m  " + t(td.rising ? "들물↑" : "날물↓") + " " + (lu.mulText || "");
  }
  function hint(a, col) { stxt(a, W / 2, H * 0.135, 19, col || "#fff"); }
  function drawHud() {
    const m = mode(), s = G.s;
    if (s !== "fight") fitTxt(condLine(), W / 2, 13, 11, W - 12, "#fff", "600", true);
    if (s === "ready") {
      hint(t("{ico} {name} — 아래 버튼을 누르세요", { ico: MODES[m].ico, name: t(MODES[m].n) }));
      if (m === "surf" && target) drawTarget();
    }
    else if (s === "windup") {
      drawTarget();
      const gx = W - 34, gy = H * 0.22, gh = H * 0.48, [a, b] = sinkerRange();
      ctx.fillStyle = "rgba(0,0,0,0.4)"; rr(gx, gy, 22, gh, 11); ctx.fill();
      const zc = (target.d - a) / (b - a), zw = easy() ? 0.16 : 0.08;
      ctx.fillStyle = "rgba(98,190,132,0.55)"; ctx.fillRect(gx + 2, gy + 3 + (gh - 6) * (1 - clamp(zc + zw, 0, 1)), 18, (gh - 6) * (Math.min(1, zc + zw) - Math.max(0, zc - zw)));
      ctx.fillStyle = "#F2B705"; rr(gx + 4, gy + 3 + (gh - 6) * (1 - power), 14, (gh - 6) * power, 7); ctx.fill();
      stxt(t("힘"), gx + 11, gy - 12, 12, "#fff", "center", "600");
      hint(easy() ? t("초록 칸에 닿으면 한 번 더 탭!") : t("손을 떼는 순간 날아가요 · 봉돌이 가운데 올 때"));
      const crossTxt = Math.abs(crossWind()) > 3 ? (crossWind() > 0 ? t("옆바람 → 줄이 오른쪽으로 밀려요") : t("옆바람 ← 줄이 왼쪽으로 밀려요")) : "";
      if (crossTxt) stxt(crossTxt, W / 2, H * 0.1 + 24 * F, 12, "#ffe0b0", "center", "600");
    }
    else if (s === "wait" || s === "settle") {
      if (m === "surf") hint(t("방울 소리를 기다려요… 🔔"));
      else if (m === "float") hint(t("찌를 보세요 · 밑밥은 찌 주변에"));
      if (m === "surf" && target) drawTarget(true);
    }
    else if (s === "retr") hint(t("톡! 톡! 탭해서 루어를 움직여요"));
    else if (s === "bite") hint(m === "float" && tk("rig") === "full" && sinkT < 1 ? t("찌가 스르르 잠겨요… 끝까지 들어가면 탭!") : t("지금 탭!!"), "#ffe14a");
    else if (s === "net") hint(t("뜰채 위로 고기가 올 때 탭!"), "#bff3c9");
    else if (s === "fight") {
      const x = 16, w = W - 32, y = 16;
      if (fish.boss) stxt(fish.title, W / 2, H * 0.2, 17, "#ffd34d");
      ctx.fillStyle = "rgba(0,0,0,0.4)"; rr(x, y, w - (easy() ? 0 : 56), 16, 8); ctx.fill();
      ctx.fillStyle = "#F2B705"; rr(x + 2, y + 2, Math.max(4, (w - (easy() ? 4 : 60)) * clamp(P, 0, 100) / 100), 12, 6); ctx.fill();
      stxt(t("끌어올리기 {n}%", { n: Math.round(clamp(P, 0, 100)) }), x + 4, y + 30, 14, "#fff", "left", "700");
      if (easy()) {
        if (fish.run) { stxt(t("고기가 힘써요! 🐟💨"), W / 2, H * 0.3, 20, "#ffb4a0"); stxt(t("지이이익~ (드랙)"), W / 2, H * 0.3 + 28 * F, 14, "#ffe0d6", "center", "600"); }
      } else drawGauge();
    }
    if (G.msgT > 0) {
      ctx.globalAlpha = Math.min(1, G.msgT * 2);
      ctx.font = "700 " + Math.round(15 * F) + "px " + FONT;
      const w = Math.min(W - 20, ctx.measureText(G.msg).width + 36), my = H * (s === "fight" || s === "net" ? 0.62 : 0.5);
      ctx.fillStyle = "rgba(0,0,0,0.68)"; rr(W / 2 - w / 2, my - 22, w, 44, 22); ctx.fill();
      fitTxt(G.msg, W / 2, my, 15, w - 20, "#fff");
      ctx.globalAlpha = 1;
    }
  }
  // 손맛 게이지: 오른쪽 세로 막대. 초록 칸 = 내 릴, 물고기 = 도망가는 고기
  function drawGauge() {
    const gx = W - 52, gy = H * 0.1, gh = H * 0.62, gw = 36, zs = zoneSize();
    const inside = Math.abs(fy - zy) < zs / 2;
    ctx.fillStyle = "rgba(4,24,40,0.72)"; rr(gx, gy, gw, gh, 12); ctx.fill();
    ctx.strokeStyle = inside ? "rgba(98,190,132,0.9)" : "rgba(255,90,90," + (0.5 + 0.4 * Math.sin(now * 20)) + ")"; ctx.lineWidth = 2; rr(gx, gy, gw, gh, 12); ctx.stroke();
    const Y = (v) => gy + 4 + (gh - 8) * (1 - v);
    const zt = Y(zy + zs / 2), zb = Y(zy - zs / 2);
    const hot = inside && inT > 1.5;
    ctx.fillStyle = hot ? "rgba(242,183,5,0.75)" : inside ? "rgba(98,190,132,0.7)" : "rgba(98,190,132,0.4)";
    rr(gx + 4, zt, gw - 8, zb - zt, 8); ctx.fill();
    // 물고기
    const fyy = Y(fy), wob = Math.sin(now * 18) * (fish.run ? 3 : 1);
    ctx.save(); ctx.translate(gx + gw / 2 + wob, fyy); ctx.scale(fv > 0 ? 1 : -1, 1);
    ctx.fillStyle = fish.boss ? "#ffcf3a" : "#fff";
    ctx.beginPath(); ctx.ellipse(0, 0, 11, 5.5, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(15, -5); ctx.lineTo(15, 5); ctx.fill();
    ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(-6, -1, 1.6, 0, 7); ctx.fill();
    ctx.restore();
    if (hot) stxt(t("손맛 x1.6!"), gx + gw / 2, zt - 12, 12, "#ffe14a", "center", "800");
    // 안내
    if (jump) {
      const k = jump.t / jump.dur;
      ctx.fillStyle = "rgba(255,255,255," + (0.25 * (1 - k)) + ")"; ctx.fillRect(0, 0, W, H);
      stxt(t("✋ 바늘털이! 손 떼요!!"), W / 2, H * 0.36, 26, holding ? "#ff6b5a" : "#ffe14a");
    } else if (!inside) fitTxt(t("초록 칸으로 고기를 잡아요! (누르면 ↑ 떼면 ↓)"), (W - 64) / 2, H * 0.36, 14, W - 84, "#ffd0c0", "700", true);
    else if (fightT < 3) fitTxt(t("좋아요! 칸 안에 붙잡아 두세요"), (W - 64) / 2, H * 0.36, 14, W - 84, "#c9f5d6", "700", true);
  }
  // 원투 포인트 (과녁)
  function drawTarget(faint) {
    const p = tgt(target.d, target.lat), sc = 1 - 0.45 * Math.min(target.d, 1);
    ctx.globalAlpha = faint ? 0.45 : 0.9;
    ctx.strokeStyle = "#ffe14a"; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
    for (const r of [1, 2]) { ctx.beginPath(); ctx.ellipse(p.x, p.y, 14 * r * sc * S, 5 * r * sc * S, 0, 0, 7); ctx.stroke(); }
    ctx.setLineDash([]); ctx.fillStyle = "#ffe14a"; ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, 7); ctx.fill();
    if (!faint) stxt("🎯 " + t(target.n), p.x, p.y - 20 * S, 12, "#ffe14a", "center", "700");
    ctx.globalAlpha = 1;
  }
  function drawResult() {
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(0, 0, W, H);
    const w = Math.min(360, W - 24), h = Math.min(H - 24, 330), x = W / 2 - w / 2, y = H / 2 - h / 2, cx = W / 2, f = res.fish;
    const G2 = res.grade >= 0 ? GRADE[res.grade] : null;
    // 등급 빛
    if (G2 && res.t > 0.9) {
      const gl = ctx.createRadialGradient(cx, y + h * 0.36, 10, cx, y + h * 0.36, w * 0.8);
      gl.addColorStop(0, G2.c + "88"); gl.addColorStop(1, G2.c + "00");
      ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
    }
    ctx.fillStyle = "rgba(14,30,26,0.95)"; rr(x, y, w, h, 20); ctx.fill();
    if (G2 && res.t > 0.9) { ctx.strokeStyle = G2.c; ctx.lineWidth = res.grade >= 3 ? 4 : 2; rr(x, y, w, h, 20); ctx.stroke(); }
    if (res.kind === "catch") {
      const title = f.junk ? t("😅 …장화네요") : f.boss ? f.title : res.isNew ? t("🎉 처음 낚았어요!") : t("🎉 낚았다!");
      fitTxt(title, cx, y + 30, 21, w - 30, f.boss ? "#ffcf3a" : res.isNew ? "#ffe14a" : "#fff");
      // 물고기: 등급이 높을수록 크게 튀어나와요
      const pop = res.t < 0.25 ? res.t / 0.25 : 1, bob = Math.sin(now * 3) * 3;
      ctx.save(); ctx.translate(cx, y + h * 0.32 + bob); ctx.scale(pop, pop); drawFish(0, 0, Math.min(180, w * 0.52), f); ctx.restore();
      if (!f.junk) {
        // cm 숫자가 촤라락 올라가요
        const k = clamp(res.t / 0.85, 0, 1), cm = Math.round(f.size * (1 - Math.pow(1 - k, 3)));
        if (cm > res.rolled) { const step = Math.max(1, Math.round(f.size / 30)); if (cm - res.rolled >= step || k >= 1) { K.click(900 + cm * 18, 0.25); res.rolled = cm; } }
        fitTxt(t(f.n) + "  " + cm + "cm", cx, y + h * 0.53, 26, w - 30, "#fff", "800");
        if (res.t > 0.9) {
          if (!res.stamped) {
            res.stamped = true; const g = res.grade;
            const chords = [[523, 659], [523, 659, 784], [523, 659, 784, 1047], [659, 831, 988, 1319, 1568], [392, 523, 659, 784, 1047, 1319, 1568]];
            chords[g].forEach((fq, i) => setTimeout(() => beep(fq, 0.25 + g * 0.06, i % 2 ? "triangle" : "sine", 0.13), i * (g >= 3 ? 110 : 80)));
            if (g >= 2) { confetti(g >= 3 ? 70 : 35, [G2.c, "#ffe14a", "#ffffff", "#ff8a5a"]); buzz(g >= 3 ? [80, 50, 80, 50, 160] : [60, 40, 60]); }
            if (g >= 3) { shake = 0.9; flashT = 0.35; flashCol = G2.c; }
            if (res.record) setTimeout(() => { [1047, 1319, 1568, 2093].forEach((fq, i) => setTimeout(() => beep(fq, 0.18, "triangle", 0.12), i * 70)); }, 600);
            if (res.lvUp) setTimeout(() => { [523, 784, 1047, 1568].forEach((fq, i) => setTimeout(() => beep(fq, 0.2, "square", 0.08), i * 100)); confetti(40, ["#ffe14a", "#62BE84", "#ffffff"]); }, 1100);
          }
          const sc = res.t < 1.05 ? 1.8 - (res.t - 0.9) / 0.15 * 0.8 : 1;
          ctx.save(); ctx.translate(cx, y + h * 0.66); ctx.scale(sc, sc); ctx.rotate(-0.06);
          ctx.strokeStyle = G2.c; ctx.lineWidth = 3; rr(-62, -16, 124, 32, 8); ctx.stroke();
          txt(t(G2.n), 0, 0, 18, G2.c, "center", "900"); ctx.restore();
        }
      } else fitTxt(t("바다 청소 완료"), cx, y + h * 0.53, 22, w - 30, "#fff");
      if (res.t > 1.15) {
        const tags = [];
        if (res.record) tags.push(t("📈 내 신기록!"));
        if (res.streak >= 2 && !f.junk) tags.push(t("🔥 {n}연속", { n: res.streak }));
        if (perfect && !f.junk) tags.push("⚡");
        if (res.perfFight) tags.push(t("💎 퍼펙트 파이팅"));
        if (mode() === "surf" && acc && acc.grade === "hit") tags.push("🎯");
        fitTxt("+" + res.pts + t("점") + (tags.length ? "  " + tags.join(" ") : ""), cx, y + h * 0.78, 19, w - 30, "#F2B705", "800");
        fitTxt(res.lvUp ? t("⬆️ 레벨 업! Lv.{n} — 귀한 고기가 더 잘 나와요", { n: res.lvUp }) : res.second ? t("두바늘에 한 마리 더! {name} {n}cm", { name: t(res.second.n), n: res.second.size }) : t(f.tip), cx, y + h * 0.87, 13, w - 30, res.lvUp || res.second ? "#ffe14a" : "#cfe0d6", res.lvUp || res.second ? "800" : "500");
      }
    } else {
      fitTxt(res.kind === "snap" ? t("💥 줄이 터졌어요") : t("🐟 빠져버렸어요"), cx, y + 40, 22, w - 30, "#ffb4a0");
      fitTxt(f.junk ? t("(사실 장화였어요…)") : (f.boss ? f.title + " " : "") + t("놓친 고기: {name} {n}cm", { name: t(f.n), n: f.size }), cx, y + h * 0.36, 17, w - 30, "#fff", "600");
      fitTxt(t(diff() >= 2 ? "초록 칸 안에 고기를 붙잡아 두세요. 뛰어오르면 손을 떼요" : "고기가 힘쓸 땐 손을 떼세요"), cx, y + h * 0.54, 14, w - 30, "#cfe0d6", "500");
      fitTxt(t("어렵다면 아래에서 '쉬움'을 골라 보세요"), cx, y + h * 0.66, 13, w - 30, "#cfe0d6", "500");
    }
    if (res.t > 1.2) fitTxt(t("아래 버튼을 누르면 계속해요"), cx, y + h - 18, 13, w - 30, "rgba(255,255,255," + (0.6 + 0.4 * Math.sin(now * 4)) + ")", "600");
  }
  // 위쪽 작은 정보: 레벨 · 연속 · 피딩 러시
  function drawTopBadges() {
    const lv = lvOf(save.xp), a = xpAt(lv), b = xpAt(lv + 1), k = clamp(((save.xp || 0) - a) / (b - a), 0, 1);
    const y = 30;
    ctx.fillStyle = "rgba(0,0,0,0.35)"; rr(8, y - 9, 92, 18, 9); ctx.fill();
    ctx.fillStyle = "#62BE84"; rr(10, y - 7, Math.max(4, 88 * k), 14, 7); ctx.fill();
    txt("Lv." + lv, 54, y, 11, "#fff", "center", "800");
    if (streak >= 2) stxt("🔥 " + t("{n}연속", { n: streak }) + " x" + (1 + Math.min(streak - 1, 10) * 0.1).toFixed(1), 108, y, 12, "#ffb46a", "left", "800");
    if (rushT > 0) stxt(t("🐟 피딩 러시 {n}초", { n: Math.ceil(rushT) }), W - 10, y, 12, "#ffe14a", "right", "800");
  }
  function draw() {
    F = K.opt.big ? 1.2 : 1;
    ctx.save();
    if (shake > 0) ctx.translate(rnd(-1, 1) * shake * 9, rnd(-1, 1) * shake * 9);
    drawScene();
    if (rushT > 0) { ctx.fillStyle = "rgba(255,200,60," + (0.08 + 0.05 * Math.sin(now * 4)) + ")"; ctx.fillRect(0, hy(), W, H - hy()); }
    drawChum();
    if (!["ready", "result"].includes(G.s) || true) drawTackle();
    drawAngler();
    drawUnder();
    if (G.s === "result") drawResult(); else { drawHud(); if (G.s !== "fight") drawTopBadges(); }
    ctx.restore();
    for (const q of parts) { ctx.save(); ctx.globalAlpha = Math.min(1, q.life * 1.5); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.fillStyle = q.c; ctx.fillRect(-q.s / 2, -q.s / 4, q.s, q.s / 2); ctx.restore(); }
    if (flashT > 0) { ctx.globalAlpha = clamp(flashT * 1.6, 0, 0.6); ctx.fillStyle = flashCol; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  }

  // ---------- 큰 버튼 ----------
  let btnKey = "";
  function setBtn() {
    if (!btn) return;
    const s = G.s, m = mode();
    let label = "", cls = "";
    if (s === "ready") label = m === "surf" ? (easy() ? t("🏖️ 힘 모으기 시작") : t("🏖️ 꾹 눌러 힘 모으기")) : m === "lure" ? t("🎣 휙! 던지기") : t("🎈 살짝 던지기");
    else if (s === "windup") { label = easy() ? t("🎯 지금 던지기!") : t("🎯 손을 떼면 던져요"); cls = "hot"; }
    else if (s === "cast" || s === "fly") label = m === "surf" ? t("쉬이이익~") : m === "lure" ? t("휙!") : "…";
    else if (s === "settle" || s === "wait") label = m === "float" ? t("🥄 밑밥 뿌리기") : m === "surf" ? t("🔔 방울을 기다려요") : "…";
    else if (s === "set") label = t("삼발이에 거치하는 중");
    else if (s === "retr") label = t("👆 톡! 움직이기");
    else if (s === "bite") { label = t("❗ 챔질!"); cls = "hot"; }
    else if (s === "fight") {
      if (easy()) { label = t("🌀 감기 (연타 또는 꾹)"); if (fish && fish.run) cls = "warn"; }
      else if (jump) { label = t("✋ 손 떼요!"); cls = "warn"; }
      else label = t("🌀 누르면 ↑ · 떼면 ↓");
    }
    else if (s === "net") { label = t("🥅 뜰채로 뜨기!"); cls = "hot"; }
    else if (s === "scoop" || s === "lift") label = t("영차!");
    else if (s === "result") label = res && res.t > 1.2 ? t("▶ 계속하기") : "…";
    const key = label + cls;
    if (key === btnKey) return;
    btnKey = key; btn.textContent = label; btn.className = "gbig " + cls;
  }

  // ---------- 아래 패널 ----------
  function dexHtml() {
    let h = "", got = 0, all = 0;
    for (const k of Object.keys(MODES)) {
      const list = SP.filter((s) => !s.junk && s.m.includes(k[0]));
      h += '<div class="gdex-h">' + MODES[k].ico + " " + esc(t(MODES[k].n)) + '</div><div class="gdex">';
      for (const s of list) {
        const d = save.dex[s.id];
        h += d ? '<div class="got"><b>' + esc(t(s.n)) + "</b><span>" + esc(t("최대 {n}cm · {c}마리", { n: d.max, c: d.n })) + "</span></div>" : "<div><b>???</b><span>" + esc(t("아직 못 낚았어요")) + "</span></div>";
      }
      h += "</div>";
    }
    for (const s of SP) if (!s.junk) { all++; if (save.dex[s.id]) got++; }
    return { h, got, all };
  }
  function condHtml() {
    const c = COND, td = c.tide, lu = lunarInfo(), cur = current(), sp = spot();
    const rows = [
      [t("날씨"), wxIcon() + " " + (c.temp != null ? Math.round(c.temp) + "°C" : "-") + (c.sst != null ? " · " + t("수온 {n}°C", { n: c.sst.toFixed(1) }) : "")],
      [t("바람 · 파도"), dirName(c.windDir) + " " + c.wind.toFixed(1) + "m/s · " + t("파고 {n}m", { n: c.wave.toFixed(1) })],
      [t("물때"), (lu.mulText || "-") + " · " + t(lu.sn) + " · " + t(td.rising ? "들물 (물 들어오는 중)" : "날물 (물 빠지는 중)") + " · " + t("물흐름 {n}", { n: t(cur.s > 0.8 ? "셈" : cur.s > 0.4 ? "보통" : "약함") })],
    ];
    const src = (c.live ? t("날씨·파도: Open-Meteo 실시간") : t("날씨: 연결이 안 돼 예시 날씨로 그렸어요")) + " · " + (td.est ? t("물높이: 음력으로 추정 (로그인하면 가까운 관측소 실측 예보)") : t("물높이: {st} 관측소 예보", { st: td.station }));
    let h = '<article class="panel gcard"><h3>📍 ' + esc(t(sp.n)) + ' <span class="muted" style="font-size:13px;font-weight:500">' + esc(t("내 위치에서 약 {n}km", { n: Math.round(sp.km) })) + '</span> <a class="muted" style="font-size:13px;font-weight:500" href="https://map.naver.com/p/search/' + encodeURIComponent(sp.n.replace(/ (갯바위|방파제)$/, "")) + '" target="_blank" rel="noopener">' + esc(t("지도에서 보기")) + "</a></h3>";
    h += '<dl class="gcond">' + rows.map((r) => "<dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd>").join("") + "</dl>";
    const adv = advice();
    if (adv.length) h += '<ul class="gadv">' + adv.map((a) => "<li>" + esc(a) + "</li>").join("") + "</ul>";
    h += '<p class="tk-like" style="margin:6px 0 0">' + esc(src) + " · " + esc(t(ROD[mode()].name)) + (mode() === "surf" && save.shots ? " · " + esc(t("명중률 {n}%", { n: Math.round(save.hits / save.shots * 100) })) : "") + "</p></article>";
    return h;
  }
  function renderPanel() {
    if (!root) return;
    const P2 = root.querySelector("#gPanel");
    if (!P2) return;
    const dx = dexHtml(), lu = lunarInfo();
    let h = "";
    h += '<div class="gsea">' + esc(t("오늘 물때")) + " <b>" + esc(lu.mulText || "-") + "</b> · " + esc(t(lu.sn)) + (lu.sn === "사리" ? " — " + esc(t("입질 활발")) : lu.sn === "조금" ? " — " + esc(t("입질 느긋")) : "") + '<span class="gcoin">🪙 ' + save.coins + "</span></div>";
    // 난이도
    h += '<div class="chips gopt" role="group" aria-label="' + esc(t("난이도")) + '">' + [[1, "🙂 쉬움 (어르신)"], [2, "🎣 손맛 (보통)"], [3, "🔥 고수"]].map(([v, l]) => '<button type="button" data-gdiff="' + v + '" class="' + (diff() === v ? "on" : "") + '">' + esc(t(l)) + "</button>").join("") + "</div>";
    // 레벨 · 오늘의 미션
    const lv = lvOf(save.xp), M = missions();
    h += '<article class="panel gcard"><h3>' + esc(t("Lv.{lv} 낚시꾼 · 오늘의 미션", { lv })) + '</h3><div class="tk">' + M.list.map((o) => '<div class="tk-like" style="font-size:14px;color:var(--ink)">' + (o.done ? "✅ " : "⬜ ") + esc(misText(o)) + ' <span class="muted">' + Math.min(o.p, o.n) + "/" + o.n + "</span></div>").join("") +
      '<div class="tk-like">' + esc(t("미션 하나 +100🪙 · 전부 +300🪙 · 대물·초대물·전설 등급일수록 점수가 커져요")) + (save.bosses ? " · " + esc(t("잡은 주인 {n}마리", { n: save.bosses })) : "") + "</div></div></article>";
    h += '<div class="gpick" role="group" aria-label="' + esc(t("낚시 방법")) + '">';
    for (const k of Object.keys(MODES)) h += '<button type="button" data-gmode="' + k + '" aria-pressed="' + (mode() === k) + '"><span class="i">' + MODES[k].ico + "</span><b>" + esc(t(MODES[k].n)) + "</b><small>" + esc(t(MODES[k].d)) + "</small></button>";
    h += "</div>";
    const L = myLoc(), near = nearSpots(mode()), curSp = spot();
    const from = L.src === "gps" ? t("내 위치(GPS)") : L.src === "record" ? t("내 기록의 마지막 위치") : L.src === "default" ? t("서울 (기본)") : (L.label ? t(L.label) : t("선택한 위치"));
    h += '<article class="panel gcard"><h3>' + esc(t("📍 가까운 {spot} 낚시터", { spot: t(MODES[mode()].spot) })) + '</h3><p class="tk-like" style="margin:0 0 8px">' + esc(t("기준: {from}", { from })) + "</p>";
    h += '<div class="chips gopt" role="group" aria-label="' + esc(t("장소")) + '">' + near.slice(0, 6).map((x) => '<button type="button" data-gspot="' + x.id + '" class="' + (curSp.id === x.id ? "on" : "") + '">' + esc(t(x.n)) + " · " + Math.round(x.km) + "km</button>").join("") + "</div>";
    h += '<div class="chips gopt" style="margin-top:8px"><button type="button" data-ggps>' + esc(t("📡 지금 내 위치로 다시 찾기")) + '</button><span class="muted" id="gGpsMsg" aria-live="polite" style="font-size:13px"></span></div></article>';

    h += condHtml();
    h += '<article class="panel gcard tk"><h3>' + esc(t("채비 고르기")) + "</h3>";
    for (const g of TK[mode()]) {
      if (g.key === "depth" && tk("rig") === "full") continue;
      const cur = tk(g.key);
      h += '<div class="tk-h">' + esc(t(g.h)) + '</div><div class="chips">' + g.items.map((i) => '<button type="button" data-gtk="' + g.key + ":" + i.id + '" class="' + (cur === i.id ? "on" : "") + '">' + esc(t(i.n)) + "</button>").join("") + "</div>";
      const it = g.items.find((i) => i.id === cur);
      if (it) h += '<div class="tk-like">' + esc(t(it.d)) + "</div>";
    }
    const lk = likes();
    h += '<div class="tk-like"><b>' + esc(t("지금 채비로 잘 무는 고기")) + ":</b> " + esc(lk.length ? lk.join(", ") : t("별로 없어요 — 미끼를 바꿔 보세요")) + "</div></article>";
    h += K.optHtml({ noEasy: true }) + K.photoHtml("fish");
    h += '<article class="panel gcard"><h3>' + esc(t("오늘 조과")) + "</h3>";
    if (!sess.length) h += '<p class="muted">' + esc(t("아직 없어요. 한 마리 낚아 볼까요?")) + "</p>";
    else {
      const sum = {};
      for (const c of sess) { const k = c.junk ? t("장화") : t(c.n); const o = sum[k] || (sum[k] = { n: 0, max: 0 }); o.n++; o.max = Math.max(o.max, c.size); }
      h += '<p class="gtoday">' + Object.keys(sum).map((k) => esc(k) + " ×" + sum[k].n + (sum[k].max ? " (" + sum[k].max + "cm)" : "")).join(" · ") + "</p>";
      h += '<button type="button" class="btn" data-gshare>' + esc(t("조과 자랑 문구 복사")) + '</button> <span class="muted" id="gShareMsg" aria-live="polite"></span>';
    }
    h += "</article>";
    h += '<details class="panel gcard"><summary>' + esc(t("물고기 도감 {got}/{all}", { got: dx.got, all: dx.all })) + "</summary>" + dx.h + "</details>";
    h += '<details class="panel gcard"><summary>' + esc(t("낚시점 (포인트로 사기)")) + '</summary><div class="gshop">';
    for (const it of SHOP) {
      const own = !!save.gear[it.id];
      h += "<div><b>" + esc(t(it.n)) + "</b><span>" + esc(t(it.d)) + '</span><button type="button" class="btn" data-gbuy="' + it.id + '"' + (own || save.coins < it.cost ? " disabled" : "") + ">" + (own ? esc(t("가지고 있어요")) : "🪙 " + it.cost) + "</button></div>";
    }
    h += "</div></details>";
    P2.innerHTML = h;
  }
  function busy() { return !["ready", "result"].includes(G.s); }
  function onPanel(e) {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.gmode) { if (G.s === "fight" || G.s === "net") return; save.mode = b.dataset.gmode; store(); target = null; refreshCond(); toReady(); renderPanel(); }
    else if (b.dataset.gdiff) { if (G.s === "fight" || G.s === "net") return; save.diff = +b.dataset.gdiff; store(); target = null; toReady(); renderPanel(); }
    else if (b.dataset.gspot) { if (G.s === "fight" || G.s === "net") return; (save.spots = save.spots || {})[mode()] = b.dataset.gspot; store(); target = null; refreshCond(); toReady(); renderPanel(); }
    else if (b.hasAttribute("data-ggps")) {
      const msg = root.querySelector("#gGpsMsg"); if (msg) msg.textContent = t("찾는 중…");
      const done = () => { save.spots = {}; store(); target = null; refreshCond(); toReady(); renderPanel(); };
      const fail = () => { const m2 = root.querySelector("#gGpsMsg"); if (m2) m2.textContent = t("위치를 찾지 못했어요. 지금 기준으로 보여 줘요"); };
      if (window.ZLOC && ZLOC.gps) ZLOC.gps().then((l) => { ZLOC.set(l, true); done(); }, fail);
      else if (navigator.geolocation) navigator.geolocation.getCurrentPosition((p) => { gpsLoc = { lat: p.coords.latitude, lng: p.coords.longitude, src: "gps", label: "" }; done(); }, fail, { timeout: 10000, maximumAge: 600000 });
      else fail();
    }

    else if (b.dataset.gtk) {
      if (G.s === "fight" || G.s === "net") return;
      const [k, v] = b.dataset.gtk.split(":");
      (save.tk[mode()] = save.tk[mode()] || {})[k] = v; store(); if (k === "sinker") target = null; if (busy()) toReady(); else if (mode() === "surf" && !target) newTarget(); renderPanel();
    }
    else if (b.dataset.gbuy) {
      const it = SHOP.find((x) => x.id === b.dataset.gbuy);
      if (it && !save.gear[it.id] && save.coins >= it.cost) { save.coins -= it.cost; save.gear[it.id] = 1; store(); beep(990, 0.12); renderPanel(); }
    }
    else if (b.hasAttribute("data-gshare")) {
      const sum = sess.filter((c) => !c.junk).map((c) => t(c.n) + " " + c.size + "cm");
      const text = t("제피 낚시 게임 오늘 조과 🎣 {list}", { list: sum.join(", ") || t("장화") }) + " — " + t(spot().n);
      const msg = root.querySelector("#gShareMsg");
      try { navigator.clipboard.writeText(text).then(() => { if (msg) msg.textContent = t("복사했어요"); }, () => { if (msg) msg.textContent = text; }); } catch (err) { if (msg) msg.textContent = text; }
    }
  }
  function refreshCond() {
    const key = spot().id, hit = condCache[key];
    COND = hit ? hit.v : Object.assign(defaultCond(), { spotKey: key });
    loadCond();
  }

  // ---------- 시작 ----------
  function build(el, kit) {
    K = kit; root = el;
    if (!document.getElementById("fishCss")) {
      const st = document.createElement("style"); st.id = "fishCss";
      st.textContent = ".gcond{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin:0;font-size:15px}.gcond dt{color:var(--muted)}.gcond dd{margin:0}" +
        ".gadv{margin:8px 0 0;padding-left:18px;font-size:14px}.gadv li{margin:2px 0}";
      document.head.appendChild(st);
    }
    root.innerHTML = '<div class="gwrap"><canvas aria-label="' + esc(t("낚시 게임 화면")) + '"></canvas></div><button type="button" class="gbig"></button><div id="gPanel" style="display:flex;flex-direction:column;gap:12px"></div>';
    cv = root.querySelector("canvas"); ctx = cv.getContext("2d"); btn = root.querySelector(".gbig");
    FONT = K.font();
    // 도전 모드 밑밥: 물을 직접 눌러 뿌릴 자리를 정해요 (press 보다 먼저 기록)
    cv.addEventListener("pointerdown", (e) => { const r = cv.getBoundingClientRect(); lastTap = { x: e.clientX - r.left, y: e.clientY - r.top, at: performance.now() }; });
    K.bindPress([cv, btn], press, release);
    root.querySelector("#gPanel").addEventListener("click", onPanel);
    window.addEventListener("resize", () => { if (K.visible(root)) resize(); });
    K.onOpt((k) => { if (!K.visible(root)) return; if (k === "easy" && !["fight", "net"].includes(G.s)) toReady(); renderPanel(); btnKey = ""; setBtn(); });
  }
  function loop(ts) {
    if (!K.visible(root)) { running = false; holding = false; K.drag(0, 0); return; }
    const dt = Math.min(0.05, Math.max(0, (ts - last) / 1000)); last = ts; now += dt;
    update(dt); draw(); setBtn();
    requestAnimationFrame(loop);
  }
  function start() {
    resize(); refreshCond();
    if (mode() === "surf" && !target) newTarget();
    renderPanel(); btnKey = ""; setBtn();
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
  }
  function stop() { holding = false; if (["fight", "net", "windup"].includes(G.s)) toReady(); }
  const api = { build, start, stop, state: () => G.s, press, release, _dbg: () => ({ fy, zy, jump: !!jump, P, diff: diff(), grade: res && res.grade, streak, rushT, lv: lvOf(save.xp) }), _diff: (v) => { save.diff = v; store(); toReady(); renderPanel(); }, cond: () => COND };
  if (window.ZPLAY) ZPLAY.reg("fish", api);
  window.ZGAME = api;
})();
