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
  // 낚시터마다 실제로 나오는 고기 (그 낚시터 채비로) — 장화는 어디서나 가끔
  const SPOT_FISH = {
    sinjindo: ["seabream", "greenling", "surfperch", "rockfish", "halfbeak", "korockfish"],
    oeyeondo: ["seabream", "redbream", "greenling", "rockfish", "korockfish", "surfperch"],
    geumodo: ["seabream", "blackfish", "redbream", "rockfish", "surfperch", "halfbeak"],
    mijo: ["seabream", "blackfish", "rockfish", "surfperch", "halfbeak", "mackerel"],
    haegeumgang: ["blackfish", "seabream", "redbream", "rockfish", "surfperch"],
    taejongdae: ["blackfish", "seabream", "mackerel", "surfperch", "halfbeak"],
    chagwido: ["blackfish", "redbream", "seabream", "mackerel", "halfbeak"],
    guryongpo: ["seabream", "blackfish", "rockfish", "halfbeak", "surfperch", "greenling"],
    hakampo: ["korockfish", "flounder", "greenling", "seabass", "mackerel"],
    jindu: ["korockfish", "flounder", "seabass", "greenling"],
    ocheon: ["korockfish", "flounder", "seabass", "greenling", "mackerel"],
    bieung: ["korockfish", "flounder", "seabass", "greenling"],
    gukdong: ["seabass", "squid", "rockfish", "korockfish", "spmackerel"],
    jisepo: ["squid", "rockfish", "seabass", "spmackerel", "mackerel"],
    daebyeon: ["mackerel", "spmackerel", "seabass", "squid", "rockfish"],
    jumunjin: ["mackerel", "spmackerel", "seabass", "greenling", "rockfish"],
    dongmyeong: ["greenling", "mackerel", "spmackerel", "seabass", "rockfish"],
    mallipo: ["croaker", "marbled", "flounder", "conger", "sillago"],
    daecheon: ["croaker", "marbled", "sillago", "conger", "flounder"],
    byeonsan: ["croaker", "marbled", "conger", "seabream", "flounder"],
    sangju: ["sillago", "seabream", "marbled", "conger", "redbream"],
    dadaepo: ["sillago", "marbled", "seabream", "conger"],
    hyeopjae: ["sillago", "redbream", "conger", "seabream"],
    sacheonjin: ["righteye", "sillago", "conger", "marbled"],
    chilpo: ["righteye", "sillago", "conger", "marbled"],
  };
  // 낚시터 풍경: 사진·관광 안내를 찾아 보고 특징만 비슷하게 그렸어요 (실제 위치·모양과 똑같지는 않아요)
  // [종류, x(0~1), …] isl 섬 · rock 바위섬 · mtn 산 · lh 등대 · chim 굴뚝 · bridge 다리 · wind 풍력 · city 도시 · dike 방조제 · pav 정자 · ship 큰 배 · boats 고깃배 · squid 오징어배 불빛 · pine 솔숲 · wheel 대관람차 · cliff 절벽
  const SCENES = {
    sinjindo: { el: [["mtn", 0.02, 0.28, 0.07], ["isl", 0.52, 0.2, 0.05], ["isl", 0.8, 0.1, 0.03], ["lh", 0.36, "red"], ["boats", 0.25, 3]] },
    oeyeondo: { el: [["mtn", 0.04, 0.34, 0.1], ["isl", 0.6, 0.15, 0.06], ["isl", 0.86, 0.08, 0.03], ["boats", 0.38, 2]] },
    geumodo: { el: [["cliff", 1, 0.24], ["isl", 0.45, 0.22, 0.07], ["isl", 0.72, 0.1, 0.035]] },
    mijo: { el: [["mtn", 0.0, 0.36, 0.13, 1], ["isl", 0.46, 0.12, 0.06], ["isl", 0.63, 0.1, 0.05], ["lh", 0.33, "white"], ["boats", 0.22, 3]] },
    haegeumgang: { el: [["rock", 0.6, 0.12, 0.13], ["rock", 0.74, 0.05, 0.07], ["cliff", 0, 0.16], ["ship", 0.42, "cruise"]] },
    taejongdae: { el: [["cliff", 1, 0.26], ["lh", 0.83, "white", 0.2], ["ship", 0.42, "cargo"], ["ship", 0.6, "cargo"]] },
    chagwido: { el: [["rock", 0.56, 0.24, 0.08, 1], ["rock", 0.76, 0.04, 0.06], ["wind", 0.12, 3]], rock: "#2e2d30" },
    guryongpo: { el: [["city", 0.02, 0.22, 0.04], ["lh", 0.42, "red"], ["lh", 0.52, "white"], ["boats", 0.3, 4]] },
    hakampo: { el: [["isl", 0.5, 0.08, 0.035], ["chim", 0.8, 4], ["mtn", 0.05, 0.25, 0.05]] },
    jindu: { el: [["bridge", 0.32, 0.76], ["chim", 0.88, 2], ["boats", 0.2, 3]] },
    ocheon: { el: [["mtn", 0.02, 0.35, 0.07], ["isl", 0.68, 0.16, 0.04], ["boats", 0.36, 5]] },
    bieung: { el: [["dike", 0.3, 1.0], ["wind", 0.08, 4], ["lh", 0.44, "white"], ["lh", 0.55, "red"]] },
    gukdong: { el: [["bridge", 0.18, 0.58, "lit"], ["city", 0.58, 0.42, 0.06], ["lh", 0.72, "red"]] },
    jisepo: { el: [["mtn", 0.0, 0.42, 0.13], ["isl", 0.74, 0.1, 0.04], ["boats", 0.48, 4]] },
    daebyeon: { el: [["isl", 0.32, 0.07, 0.04], ["lh", 0.6, "ball"], ["lh", 0.72, "red"], ["boats", 0.18, 4]] },
    jumunjin: { el: [["mtn", 0.0, 0.3, 0.07], ["lh", 0.12, "white", 0.06], ["boats", 0.4, 4], ["squid", 0, 8]] },
    dongmyeong: { el: [["mtn", 0.0, 0.46, 0.2, 1], ["pav", 0.33], ["lh", 0.6, "red"], ["wheel", 0.86]] },
    mallipo: { el: [["pine", 0.0, 0.5], ["isl", 0.62, 0.1, 0.03]] },
    daecheon: { el: [["city", 0.5, 0.46, 0.08], ["isl", 0.86, 0.1, 0.03], ["pine", 0.0, 0.3]] },
    byeonsan: { el: [["pine", 0.0, 0.58], ["mtn", 0.64, 0.36, 0.08]] },
    sangju: { el: [["mtn", 0.2, 0.42, 0.17, 1], ["pine", 0.0, 0.7], ["isl", 0.76, 0.07, 0.04]], sand: "#efece4" },
    dadaepo: { el: [["city", 0.0, 0.42, 0.06], ["mtn", 0.74, 0.22, 0.05]] },
    hyeopjae: { el: [["isl", 0.6, 0.14, 0.055, "peak"]], water: ["#58d3c9", "#1d7f9a"], rock: "#2e2d30" },
    sacheonjin: { el: [["mtn", 0.0, 0.62, 0.1], ["boats", 0.5, 2]] },
    chilpo: { el: [["mtn", 0.06, 0.5, 0.07], ["lh", 0.8, "red"], ["pine", 0.0, 0.3]] },
  };
  // 무게(kg) ≈ a × 길이(cm)³ — 고기 모양마다 a 가 달라요
  function weightOf(f) {
    if (f.junk) return 0.6;
    const a = { needle: 0.0045, eel: 0.0026, squid: 0.055, flat: 0.0135 }[f.shape] || (f.id === "seabream" || f.id === "redbream" || f.id === "blackfish" ? 0.02 : 0.0145);
    return Math.round(a * Math.pow(f.size, 3) / 10) / 100;
  }
  const kgTxt = (kg) => (kg < 1 ? Math.round(kg * 1000) + "g" : kg.toFixed(kg < 10 ? 2 : 1) + "kg");
  // 도감: 잡는 법 · 설명 · 사진(위키백과, 학명으로 찾아요)
  const GUIDE = {
    surfperch: { sci: "Ditrema temminckii", how: "갯바위·방파제 가까운 곳. 크릴·갯지렁이 찌낚시, 얕은 수심. 봄이 제철", d: "몸이 넓적하고 은빛. 알이 아닌 새끼를 낳는 드문 바닷물고기예요" },
    rockfish: { sci: "Sebastes inermis", how: "해 질 녘~밤, 바위 근처. 청갯지렁이 찌낚시나 작은 웜. 겨울~봄", d: "눈이 크고 무리 지어 떠 있어요. 남해·동해 방파제의 밤 손님" },
    halfbeak: { sci: "Hyporhamphus sajori", how: "얕은 수심(1m 안팎) 찌낚시, 크릴 조각. 늦가을~겨울 떼로 들어와요", d: "아래턱이 바늘처럼 길어요. 몸이 가늘어 가볍지만 떼로 잡혀요" },
    blackfish: { sci: "Girella punctata", how: "남해·제주 갯바위 찌낚시. 크릴 밑밥을 꾸준히 뿌려 띄워 올려 잡아요", d: "검푸른 몸, 손맛이 아주 세요. 갯바위 찌낚시의 꽃" },
    seabream: { sci: "Acanthopagrus schlegelii", how: "바닥 가까이(깊은 수심) 찌낚시나 원투. 크릴·깐새우·참갯지렁이·쏙. 가을~겨울", d: "'바다의 왕자'. 경계심이 많아 밑밥과 수심 맞추기가 중요해요" },
    mackerel: { sci: "Scomber japonicus", how: "메탈지그나 찌낚시. 떼가 들어오면 연달아 물어요. 여름~가을", d: "등에 물결무늬. 힘이 좋고 빨라요" },
    greenling: { sci: "Hexagrammos otakii", how: "테트라포드·바위 틈 바닥. 청갯지렁이, 웜. 늦가을~봄", d: "서해 방파제의 단골. 바위에 숨어 있다 덥석 물어요" },
    korockfish: { sci: "Sebastes schlegelii", how: "방파제·석축 바닥을 웜(지그헤드)으로 톡톡. 저녁·밤에 좋아요", d: "'우럭'. 바위 틈에 살고 입이 커요" },
    flounder: { sci: "Paralichthys olivaceus", how: "모래 바닥. 웜을 바닥에 끌거나 원투에 오징어살. 봄·가을", d: "'광어'. 눈이 왼쪽에 몰려 있고 바닥에 붙어 숨어요. 묵직해요" },
    seabass: { sci: "Lateolabrax japonicus", how: "물살이 센 곳·파도 치는 날. 미노우를 빠르게. 물 위로 뛰며 바늘을 털어요", d: "'농어'. 바늘털이가 유명한 루어 대상어" },
    spmackerel: { sci: "Scomberomorus niphonius", how: "메탈지그를 멀리 던져 빠르게 감기. 가을 아침·저녁", d: "이빨이 날카롭고 빠른 사냥꾼" },
    squid: { sci: "Sepioteuthis lessoniana", how: "에기(새우 모양 루어)를 바닥까지 내렸다가 툭툭 올려 줘요. 가을 남해", d: "'무늬오징어'. 몸에 무늬가 있고 먹물을 쏘아요" },
    sillago: { sci: "Sillago japonica", how: "백사장 원투, 청갯지렁이. 여름. 바늘 여러 개에 한꺼번에", d: "모래밭의 은빛 미인. 작지만 입질이 빨라요" },
    marbled: { sci: "Pseudopleuronectes yokohamae", how: "모래·펄 바닥 원투, 참갯지렁이. 봄", d: "'도다리'. 눈이 오른쪽. 봄 도다리쑥국이 유명해요" },
    righteye: { sci: "Pleuronectidae", how: "동해 백사장 원투, 청갯지렁이 여러 바늘. 겨울~봄", d: "'가자미'. 바닥에 붙어 살고 묵직하게 끌려와요" },
    conger: { sci: "Conger myriaster", how: "밤 원투, 꽁치살·오징어살. 바닥에서 잘 물어요", d: "'붕장어'(아나고). 몸을 꼬아 줄을 감아요" },
    croaker: { sci: "Pennahia argentata", how: "서해 여름 원투, 청갯지렁이. 물때 좋을 때 떼로", d: "'백조기'(보구치). 끌어올리면 '꾸욱' 소리를 내요" },
    redbream: { sci: "Pagrus major", how: "깊은 곳, 쏙·새우·참갯지렁이. 물살 있을 때. 귀해요", d: "'참돔'. 바다의 여왕, 분홍빛에 파란 점" },
  };
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
    { id: "boot", n: "장화", m: "fls", r: [1, 1, 1], min: 0, max: 0, str: 0.3, p: 0, c: "#2b2b2b", junk: 1, jw: 0.3, tip: "바다 청소도 낚시꾼의 몫" },
    { id: "bottle", n: "병편지", m: "fls", r: [1, 1, 1], min: 0, max: 0, str: 0.25, p: 0, c: "#6fbf9a", junk: 1, jw: 0.16, tip: "누가 띄운 편지일까요?" },
    { id: "chest", n: "보물상자", m: "fls", r: [1, 1, 1], min: 0, max: 0, str: 0.9, p: 0, c: "#a8742c", junk: 1, jw: 0.045, tip: "바닷속에 가라앉아 있던 보물!" },
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
  function store() { cloudT = 4; try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} }
  const mode = () => save.mode;
  // 난이도: 1 쉬움(어르신 · 실패 없음) · 2 손맛(기본) · 3 고수
  const diff = () => save.diff || 2;
  const easy = () => diff() === 1;
  const hard = () => diff() === 3;
  // ---------- 내 계정에 저장 (제피 로그인: 웹은 ZAPP, 앱 안에서는 앱이 열어 준 길) ----------
  const CLOUD_DOC = "game_fish";
  let cloudT = 0, cloudState = "", cloudPulled = false;
  function cloudApi() { try { return window.ZAPP && ZAPP.docGet && ZAPP.signedIn && ZAPP.signedIn() ? ZAPP : null; } catch (e) { return null; } }
  function mergeSave(a, b) {
    if (!b || b.v !== 1) return a;
    const o = Object.assign({}, a);
    for (const k of ["xp", "total", "coins", "fish", "bosses", "shots", "hits"]) o[k] = Math.max(a[k] || 0, b[k] || 0);
    o.dex = Object.assign({}, b.dex || {}, a.dex || {});
    for (const id of Object.keys(b.dex || {})) { const x = (a.dex || {})[id], y = b.dex[id]; if (x && y) o.dex[id] = { n: Math.max(x.n, y.n), max: Math.max(x.max, y.max) }; }
    o.gear = Object.assign({}, b.gear || {}, a.gear || {});
    o.studied = Object.assign({}, b.studied || {}, a.studied || {});
    const seen = new Set(), net = [];
    for (const f of [...(a.net || []), ...(b.net || [])].sort((p, q) => q.at - p.at)) { const k = f.at + f.id; if (!seen.has(k)) { seen.add(k); net.push(f); } }
    o.net = net.slice(0, 60);
    if (b.mis && (!a.mis || b.mis.day > a.mis.day)) o.mis = b.mis;
    return o;
  }
  async function cloudPull() {
    const A = cloudApi(); if (!A || cloudPulled) return;
    cloudPulled = true;
    try { const d = await A.docGet(CLOUD_DOC); if (d) { save = mergeSave(save, typeof d === "string" ? JSON.parse(d) : d); try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} renderPanel(); } cloudState = "ok"; }
    catch (e) { cloudState = "err"; cloudPulled = false; }
  }
  async function cloudPush() {
    const A = cloudApi(); if (!A) return;
    try { await A.docPut(CLOUD_DOC, JSON.stringify(save)); cloudState = "saved"; } catch (e) { cloudState = "err"; }
    const el = root && root.querySelector("#gCloud"); if (el) el.textContent = cloudText();
  }
  function cloudText() {
    if (!cloudApi()) return t("로그인하면 게임 기록이 내 아이디에 저장돼요 (지금은 이 기기에만)");
    return cloudState === "err" ? t("☁️ 저장이 잠깐 안 됐어요. 다음에 다시 저장해요") : cloudState === "saved" ? t("☁️ 내 아이디에 저장했어요") : t("☁️ 내 아이디에 저장돼요");
  }
  // 내 프로필 (카카오·구글 사진) — 아직 캐릭터 만들기 전이라 사진을 얼굴로 써요
  let meImg = null, meFor = "";
  function me() { try { return window.ZAPP && ZAPP.me ? ZAPP.me() : null; } catch (e) { return null; } }
  function meAvatar() {
    const m = me(), u = m && m.avatar ? String(m.avatar).replace(/^http:/, "https:") : "";
    if (u !== meFor) { meFor = u; meImg = null; if (u) { const im = new Image(); im.referrerPolicy = "no-referrer"; im.onload = () => { meImg = im; }; im.src = u; } }
    return meImg;
  }
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
    const pi = PI[place()], z = planDepth(), fl = SPOT_FISH[spot().id] || [];
    return SP.filter((s) => !s.junk && fl.includes(s.id)).map((s) => [s, Math.max(1, s.r[pi]) * baitMul(s) * depthMulAt(s, z) * (s.rare ? 0.35 : 1) * (s.night && COND.night ? 2 : 1)])
      .filter((x) => x[1] >= 1.5).sort((a, b) => b[1] - a[1]).slice(0, 4).map((x) => t(x[0].n));
  }

  // ---------- 현장 상황: 날씨 · 바다 · 물때 ----------
  const DIRS = ["북", "북동", "동", "남동", "남", "남서", "서", "북서"];
  // 시험해 보기: 주소 뒤에 ?wx=storm 을 붙이면 풍랑 장면
  const WX_TEST = (() => { try { return /[?&]wx=storm/.test(location.search); } catch (e) { return false; } })();
  function stormy(c) { if (WX_TEST) Object.assign(c, { wind: 16, wave: 3.4, code: 63, rain: 4, cloud: 95 }); return c; }
  let COND = stormy(defaultCond());
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
  let condBusy = false, condAgain = false;
  async function loadCond() {
    const sp = spot(), key = spot().id;
    const hit = condCache[key];
    if (hit && Date.now() - hit.at < 15 * 60e3) { COND = stormy(hit.v); return; }
    if (condBusy) { condAgain = true; return; }
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
    if (spot().id === key) COND = stormy(c);
    condBusy = false;
    // 불러오는 사이 낚시 방법·장소를 바꿨으면 지금 낚시터로 다시 (QA 11-24)
    if (condAgain) { condAgain = false; if (spot().id !== key) { loadCond(); return; } }
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
  // 풍랑: 2 = 위험(바람 14m/s↑ 또는 파도 2.5m↑), 1 = 주의(10m/s↑ 또는 1.5m↑)
  function storm() { return COND.wind >= 14 || COND.wave >= 2.5 ? 2 : COND.wind >= 10 || COND.wave >= 1.5 ? 1 : 0; }
  let bigWaveT = 4, spray = [];
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
  // 던지기 방향: 누른 채 좌우로 밀면 (aimLat -0.18 ~ 0.18)
  let downX = 0, aimLat = 0;
  let drift = 0, bz = 0, chum = [], chumFly = [], gather = 0, lastTap = null, sinkT = 0;
  let waitT = 0, biteAt = 0, biteT = 0, nibbles = [];
  let lureK = 0, lureTaps = 0, lureNeed = 2, lureBite = -1, hopT = 0, retrT = 0;
  let fish = null, T = 0, P = 0, slackT = 0, hookPt = null, warnT = 0, res = null, perfect = false;
  // 드랙: 무거운 고기·센 고기일수록 줄이 많이 풀려요 (lineOut = 이번에 풀려 나간 m, dragNow = 지금 풀리는 속도)
  let lineOut = 0, dragNow = 0;
  const dragK = () => clamp(0.55 + 0.45 * Math.log2(1 + (fish ? fish.kg : 0.5)), 0.6, 2.4);
  const castM = () => ({ float: 28, lure: 48, surf: 95 }[mode()] || 40) * clamp(cast, 0.3, 1.05);
  const distM = () => Math.max(1, Math.round(castM() * (1 - clamp(P, 0, 100) / 100) + 2));
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
    const fl = SPOT_FISH[spot().id] || [];
    const list = SP.filter((x) => fl.includes(x.id) && x.id !== "squid").sort((a, b) => b.max * b.str - a.max * a.str);
    const s0 = list[Math.floor(Math.random() * Math.min(2, list.length))] || list[0];
    const size = Math.round(s0.max * rnd(1.15, 1.35));
    const short = t(spot().n).split(" ").slice(0, 2).join(" ");
    const o = Object.assign({}, s0, { size, sf: 1.3, st: s0.str * 1.6, boss: true, title: t("👑 {spot}의 주인", { spot: short }), run: false, rt: 1 });
    o.kg = weightOf(o);
    return o;
  }
  function pickFish() {
    const pi = PI[place()], fl = SPOT_FISH[spot().id] || [];
    const list = SP.filter((s) => s.junk || fl.includes(s.id));
    const accBonus = acc ? acc.big : 1;
    let tot = 0;
    const ws = list.map((s) => {
      let w = s.junk ? (s.jw || 0.3) : Math.max(1, s.r[pi]) * baitMul(s) * depthMulAt(s, bz);
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
    const o = Object.assign({}, s, { size: sz, sf, st: s.str * (0.8 + 0.5 * sf), run: false, rt: 1 });
    o.kg = weightOf(o);
    return o;
  }

  // ---------- 던지기 ----------
  function sinkerRange() { const k = tk("sinker"); return k === "s15" ? [0.38, 0.7] : k === "s30" ? [0.55, 1.05] : [0.45, 0.9]; }
  // 던질 수 있는 거리 (화면 앞~뒤 0~1): 방법·채비마다
  function castRange() {
    const m = mode();
    if (m === "surf") return sinkerRange();
    if (m === "lure") return tk("bait") === "jig" ? [0.42, 1.0] : [0.32, 0.86];
    return [0.2, 0.62];
  }
  const POINTS = {
    surf: ["골창 (모래 고랑)", "수중여 옆", "물골", "모래톱 끝"],
    lure: ["방파제 끝 물골", "테트라포드 앞", "석축 끝 바닥 턱", "조류 부딪히는 곳"],
    float: ["본류 경계 (조류 띠)", "수중여 앞", "갯바위 홈통", "물거품 띠"],
  };
  function newTarget() {
    const [a, b] = castRange(), pts = POINTS[mode()];
    target = { d: rnd(a + (b - a) * 0.35, b - 0.02), lat: rnd(-0.12, 0.12), n: pts[Math.floor(Math.random() * pts.length)], m: mode() };
  }
  function toReady() {
    G.s = "ready"; holding = false; drift = 0; chum = []; chumFly = []; gather = 0;
    if (!target || target.m !== mode()) newTarget();
    setBtn();
  }
  // 던지기: 모든 방법이 같아요 — 꾹 누르면 힘 게이지가 오르내리고, 누른 채 좌우로 밀면 방향, 손을 떼면 날아가요
  function startCast() {
    if (!target || target.m !== mode()) newTarget();
    G.s = "windup"; windT = 0; power = 0; phi = 0; aimLat = 0;
    beep(300, 0.06, "triangle", 0.08); setBtn();
  }
  function releaseCast() {
    const [a, b] = castRange(), m = mode();
    if (easy() && windT < 0.2) power = clamp((target.d - a) / (b - a), 0, 1); // 쉬움: 톡 누르면 알아서 알맞게
    let d = a + power * (b - a), l = aimLat + crossWind() * (m === "surf" ? 0.007 : 0.004);
    if (m === "surf") l += Math.sin(phi) * (easy() ? 0.02 : 0.05); // 봉돌 진자가 가운데일 때 놓아야 곧게
    if (easy()) { d = lerp(d, target.d, 0.55); l = lerp(l, target.lat, 0.55); }
    cast = clamp(d, 0.15, 1.05); lat = clamp(l, -0.22, 0.22);
    const e = Math.hypot(cast - target.d, (lat - target.lat) * 1.6);
    const tol = m === "float" ? 1.3 : 1;
    const grade = e < 0.05 * tol ? "hit" : e < 0.12 * tol ? "good" : "miss";
    acc = { e, grade, mul: grade === "hit" ? 0.55 : grade === "good" ? 0.85 : 1.35, big: grade === "hit" ? 1.5 : grade === "good" ? 1.15 : 0.8 };
    save.shots = (save.shots || 0) + 1; if (grade === "hit") save.hits = (save.hits || 0) + 1; store();
    if (power > 0.97 && !easy() && Math.random() < 0.35) { // 너무 세게: 줄이 엉켜요(백래시)
      flash(t("너무 세게 던졌어요! 줄이 엉켜서 다시 던져요")); beep(160, 0.3, "sawtooth", 0.08); toReady(); return;
    }
    G.s = "cast"; castT = 0; castDur = m === "lure" ? 0.45 : m === "surf" ? 0.6 : 0.9; released = false;
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
    if (m !== "surf" && acc) flash(acc.grade === "hit" ? t("🎯 명중! {n}에 정확히 들어갔어요", { n: t(target.n) }) : acc.grade === "good" ? t("👍 좋아요! 포인트 근처예요") : t("😅 포인트에서 벗어났어요. 입질이 늦을 수 있어요"));
    if (m !== "surf" && acc && acc.grade === "hit") { beep(1047, 0.12); setTimeout(() => beep(1319, 0.16), 120); }
    if (m === "lure") { kan(); K.splash(0.25, false); G.s = "retr"; lureK = 0; lureTaps = 0; lureBite = -1; retrT = 0; lureNeed = Math.max(1, (easy() ? Math.floor(rnd(1, 3.99)) : Math.floor(rnd(3, 5.99))) - (acc && acc.grade === "hit" ? 2 : acc && acc.grade === "good" ? 1 : 0)); }
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
  // 입질: 어떤 고기인지 이때 정해져요. 큰 고기일수록 찌가 '쑥', 초릿대가 '쿡쿡' 크게
  let pend = null, hookAt = -1;
  function startBite() {
    G.s = "bite"; biteT = 0; sinkT = 0; hookAt = -1;
    const bossChance = easy() ? 0.012 : 0.02 + 0.004 * (lvOf(save.xp) - 1) + (rushT > 0 ? 0.03 : 0);
    pend = Math.random() < bossChance ? bossFish() : pickFish();
    const big = pend.kg >= 1.2 || pend.st >= 1.4;
    buzz(big ? [220, 80, 220] : [90, 60, 90]);
    if (mode() === "surf") bell(); else beep(big ? 520 : 880, 0.18, "square", 0.12);
    flash(big ? t("묵직한 입질! 꾹 눌러 힘껏 챔질") : t("톡톡 입질! 가볍게 탭"));
    setBtn();
  }
  // 챔질: 큰 고기는 꾹(0.3초 넘게) 힘껏, 작은 고기는 톡 가볍게. 틀리면 바늘이 얕게 걸려요
  let hookQ = "ok";
  function hook(held) {
    perfect = biteT < (easy() ? 0.6 : 0.3);
    hookPt = tackle();
    fish = pend || pickFish(); pend = null;
    const big = fish.kg >= 1.2 || fish.st >= 1.4, strong = held >= 0.3;
    hookQ = easy() ? "ok" : big && !strong ? "weak" : !big && strong && fish.kg < 0.35 ? "hard" : "ok";
    T = 30; P = (fish.boss ? 22 : 30) - (hookQ === "weak" ? 12 : hookQ === "hard" ? 6 : 0); slackT = 0; fish.rt = rnd(0.6, 1.2);
    lineOut = 0;
    zy = 0.35; zv = 0; fy = 0.4; fv = 0; fTo = 0.5; fTimer = 0.5; inT = 0; outT = 0; jump = null; jumpsOk = 0; fightT = 0;
    G.s = "fight"; beep(300, 0.1, "sawtooth", 0.1); buzz(50); K.swoosh(900, 2500, 0.15, 0.3, 2);
    if (fish.boss) { flash(fish.title + " — " + t("엄청난 힘이에요!")); shake = 0.8; buzz([200, 80, 200]); flashT = 0.5; flashCol = "#ffd34d"; [196, 185, 175].forEach((f, i) => setTimeout(() => beep(f, 0.4, "sawtooth", 0.1), i * 180)); }
    else if (hookQ === "weak") flash(t("챔질이 약했어요! 바늘이 얕게 걸렸어요"));
    else if (hookQ === "hard") flash(t("너무 세게 챔질했어요! 작은 고기는 톡 가볍게"));
    else if (perfect) flash(t("⚡ 퍼펙트 챔질!"));
    if (perfect && hookQ === "ok") mission("perfect", 1);
    setBtn();
  }
  // 다 끌어오면: 찌낚시와 큰 고기(45cm 넘음)는 뜰채로, 작은 고기는 들어뽑기
  function landing() {
    if (fish.junk || (mode() !== "float" && fish.size < 45)) { G.s = "lift"; liftT = 0; K.swoosh(800, 2000, 0.3, 0.3); }
    else { G.s = "net"; netT = rnd(0, 3); netMiss = 0; flash(t("🥅 뜰채를 내렸어요. 고기가 뜰채 위로 올 때 탭!")); }
    setBtn();
  }
  function endFight(kind) {
    let res0 = null, pts = 0, isNew = false, second = null, grade = -1, record = false, lvUp = 0, perfFight = false;
    if (kind === "catch") {
      grade = gradeOf(fish);
      perfFight = !easy() && !fish.junk && outT < 0.35 && fightT > 1.5;
      streak = fish.junk ? streak : streak + 1; bestStreak = Math.max(bestStreak, streak);
      const comboMul = 1 + Math.min(streak - 1, 10) * 0.1;
      pts = fish.id === "chest" ? 300 : fish.id === "bottle" ? 50 : fish.junk ? 5 : Math.round(fish.size * fish.p * GRADE[grade].mul * comboMul * (perfect ? 1.2 : 1) * (perfFight ? 1.3 : 1) * (easy() ? 1 : hard() ? 2 : 1.5) * (acc && mode() === "surf" && acc.grade === "hit" ? 1.2 : 1));
      const d = save.dex[fish.id];
      record = !!d && !fish.junk && fish.size > d.max;
      isNew = !d && !fish.junk;
      save.dex[fish.id] = { n: (d ? d.n : 0) + 1, max: Math.max(d ? d.max : 0, fish.size) };
      save.coins += pts; save.total += pts; store();
      sess.push({ n: fish.n, size: fish.size, junk: !!fish.junk });
      if (!fish.junk) {
        save.net = [{ id: fish.id, n: fish.n, size: fish.size, kg: fish.kg, g: grade, sp: spot().id, at: Date.now(), boss: !!fish.boss }, ...(save.net || [])].slice(0, 60);
        if (isNew) { save.xp = (save.xp || 0) + 80; setTimeout(() => flash(t("🎓 {name} 잡는 법을 익혔어요! +80 경험치 · 도감이 열렸어요", { name: t(fish.n) })), 1800); }
        peerSend("catch", { f: fish.id, size: fish.size, g: grade });
        if (tour) { tour.kg += fish.kg; tour.n++; }
      }
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
      cheer();
      if (fish.id === "bottle") res0 = { note: t(NOTES[Math.floor(Math.random() * NOTES.length)]) };
      if (fish.id === "chest") {
        const no = SHOP.filter((it) => !save.gear[it.id]);
        if (no.length && Math.random() < 0.35) { const it = no[Math.floor(Math.random() * no.length)]; save.gear[it.id] = 1; res0 = { note: t("상자 안에 {g}이(가) 들어 있었어요!", { g: t(it.n) }) }; }
        else res0 = { note: t("금화 300개가 반짝반짝!") };
        confetti(60, ["#ffcf3a", "#fff", "#e8a23a"]);
      }
      if (!fish.junk) { mission("any", 1); mission("species", 1, fish.id); if (fish.size >= 40) mission("big", 1); if (grade >= 2) mission("grade", 1); mission("streak", streak, null, true); }
      // 연속이 쌓이면 피딩 러시
      if (!fish.junk && rushT <= 0 && (streak === 3 || streak === 6 || streak === 10 || Math.random() < 0.07)) { rushT = 30; flash(t("🐟 피딩 러시! 30초 동안 입질 폭발")); }
      store();
      // 소리 · 진동은 등급 연출(drawResult)에서
    } else { breakStreak(); beep(150, 0.35, "sawtooth", 0.08); buzz(200); }
    res = { note: res0 && res0.note, kind, fish, pts, isNew, second, t: 0, grade, record, lvUp, perfFight, streak, rolled: 0, stamped: false };
    target = null;
    G.s = "result"; holding = false; setBtn(); renderPanel();
  }

  // ---------- 바다 친구: 가끔 나타나는 돌고래·고래·거북·해파리·물범 — 눌러서 사진 찍기 ----------
  const FRIENDS = {
    dolphin: { n: "남방큰돌고래", ico: "🐬", sea: "SE", xp: 40 },
    whale: { n: "밍크고래", ico: "🐋", sea: "E", xp: 90 },
    turtle: { n: "푸른바다거북", ico: "🐢", sea: "S", xp: 70 },
    jelly: { n: "보름달물해파리", ico: "🪼", sea: "WSE", xp: 15 },
    seal: { n: "점박이물범", ico: "🦭", sea: "W", xp: 80 },
  };
  let friend = null, friendT = 18, gull = null, gullT = 25;
  function friendTick(dt) {
    if (friend) { friend.t += dt; if (friend.t > friend.dur) friend = null; }
    else if (["ready", "wait", "settle", "set", "retr"].includes(G.s) && storm() < 2) {
      friendT -= dt;
      if (friendT <= 0) {
        friendT = rnd(28, 55);
        const ok = Object.keys(FRIENDS).filter((k) => FRIENDS[k].sea.includes(place()) && (k !== "whale" || Math.random() < 0.3) && (k !== "seal" || Math.random() < 0.4));
        if (ok.length) { const id = ok[Math.floor(Math.random() * ok.length)]; friend = { id, x: rnd(0.14, 0.52), y: rnd(0.08, 0.24), t: 0, dur: id === "whale" ? 6 : 4.5 }; }
      }
    }
    // 갈매기 도둑: 미끼가 물에 있을 때 가끔 내려와요. 눌러서 쫓지 않으면 미끼를 채 가요
    if (gull) {
      gull.t += dt;
      const b = tackle();
      if (gull.ph === "in") { gull.x = lerp(gull.sx, b.x - 6 * S, Math.min(1, gull.t / 1.8)); gull.y = lerp(gull.sy, b.y - 34 * S, Math.min(1, gull.t / 1.8)); if (gull.t > 1.8) { gull.ph = "hover"; gull.t = 0; beep(1900, 0.06, "triangle", 0.08); setTimeout(() => beep(1700, 0.08, "triangle", 0.08), 90); } }
      else if (gull.ph === "hover") { gull.x = b.x - 6 * S + Math.sin(now * 4) * 8 * S; gull.y = b.y - 30 * S + Math.sin(now * 7) * 4; if (gull.t > 1.8) {
        if (!["wait", "settle"].includes(G.s)) { gull.ph = "out"; gull.t = 0; } // 그사이 입질·파이팅이면 고기를 지켜요 (QA 11-24)
        else if (easy()) { flash(t("갈매기가 그냥 날아갔어요")); gull.ph = "out"; gull.t = 0; }
        else { flash(t("🐦 갈매기가 미끼를 채 갔어요! 다시 던져요")); K.splash(0.3, false); breakStreak(); gull = null; toReady(); return; }
      } }
      else { gull.x += 140 * S * dt; gull.y -= 90 * S * dt; if (gull.t > 1.5) gull = null; }
    } else if (["wait", "settle"].includes(G.s) && mode() !== "surf" && storm() < 2) {
      gullT -= dt;
      if (gullT <= 0) { gullT = rnd(30, 60); gull = { ph: "in", t: 0, sx: -20, sy: hy() - 40, x: -20, y: hy() - 40 }; }
    }
  }
  function tapSpecial(p) {
    if (gull && gull.ph !== "out" && Math.hypot(p.x - gull.x, p.y - gull.y) < 44) {
      gull.ph = "out"; gull.t = 0; save.xp = (save.xp || 0) + 5; store();
      flash(t("훠이! 갈매기를 쫓았어요 +5 경험치")); beep(600, 0.08, "square", 0.08); return true;
    }
    if (friend) {
      const fp = friendPos();
      if (Math.hypot(p.x - fp.x, p.y - fp.y) < 48) {
        const F0 = FRIENDS[friend.id], first = !(save.friends && save.friends[friend.id]);
        save.friends = save.friends || {}; save.friends[friend.id] = (save.friends[friend.id] || 0) + 1;
        const xp = first ? F0.xp : 5; save.xp = (save.xp || 0) + xp; store();
        flashT = 0.18; flashCol = "#ffffff"; K.click(4000, 0.5); setTimeout(() => K.click(2500, 0.4), 60);
        flash(t("📸 찰칵! {ico} {n}을(를) 만났어요 +{x} 경험치", { ico: F0.ico, n: t(F0.n), x: xp }) + (first ? " · " + t("바다 친구 도감에 올렸어요") : ""));
        friend = null; renderPanel(); return true;
      }
    }
    return false;
  }
  function friendPos() { const h = hy(); return { x: friend.x * W, y: h + friend.y * (H - h) }; }
  function drawFriend() {
    if (friend) {
      const p = friendPos(), k = friend.t / friend.dur, s = S * (1.1 + friend.y * 1.8), id = friend.id;
      ctx.save();
      if (id === "dolphin") {
        for (let i = 0; i < 3; i++) {
          const ph = (friend.t * 1.1 + i * 0.33) % 1, jx = p.x + (i - 1) * 26 * s + ph * 30 * s, jy = p.y - Math.sin(ph * Math.PI) * 24 * s;
          if (ph > 0.05 && ph < 0.95) { ctx.save(); ctx.translate(jx, jy); ctx.rotate(-Math.cos(ph * Math.PI) * 0.9); ctx.fillStyle = "#6c8796"; ctx.beginPath(); ctx.ellipse(0, 0, 13 * s, 4.5 * s, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(-2 * s, -4 * s); ctx.lineTo(2 * s, -9 * s); ctx.lineTo(5 * s, -3 * s); ctx.fill(); ctx.beginPath(); ctx.moveTo(-12 * s, 0); ctx.lineTo(-17 * s, -4 * s); ctx.lineTo(-17 * s, 4 * s); ctx.fill(); ctx.restore(); }
          else { ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.beginPath(); ctx.ellipse(jx, p.y, 8 * s, 2 * s, 0, 0, 7); ctx.stroke(); }
        }
      } else if (id === "whale") {
        const up = Math.sin(Math.min(1, k * 1.4) * Math.PI);
        ctx.fillStyle = "#3f4f5c"; ctx.beginPath(); ctx.ellipse(p.x, p.y + 4 * s, 46 * s, 9 * s * up + 1, 0, Math.PI, 0); ctx.fill();
        if (k > 0.2 && k < 0.6) { ctx.fillStyle = "rgba(255,255,255,0.8)"; for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.arc(p.x - 20 * s + Math.sin(i) * 6 * s, p.y - 10 * s - (k - 0.2) * 90 * s * (i / 10), 3 * s, 0, 7); ctx.fill(); } }
      } else if (id === "turtle") {
        const bob = Math.sin(now * 2) * 2;
        ctx.fillStyle = "#5b8a4a"; ctx.beginPath(); ctx.ellipse(p.x, p.y + bob, 14 * s, 9 * s, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = "#3f6b33"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(p.x, p.y + bob, 8 * s, 5 * s, 0, 0, 7); ctx.stroke();
        ctx.fillStyle = "#8fb07a"; ctx.beginPath(); ctx.arc(p.x + 16 * s, p.y + bob - 2 * s, 4.5 * s, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.ellipse(p.x + 8 * s, p.y + bob + 9 * s, 7 * s, 2.5 * s, 0.6 + Math.sin(now * 3) * 0.3, 0, 7); ctx.fill();
      } else if (id === "jelly") {
        for (let i = 0; i < 3; i++) { const jx = p.x + (i - 1) * 22 * s, jy = p.y + Math.sin(now * 1.6 + i) * 4 + i * 6 * s; ctx.fillStyle = "rgba(220,230,255,0.55)"; ctx.beginPath(); ctx.ellipse(jx, jy, 9 * s, 6 * s, 0, Math.PI, 0); ctx.fill(); ctx.strokeStyle = "rgba(220,230,255,0.5)"; ctx.lineWidth = 1; for (let j = -2; j <= 2; j++) { ctx.beginPath(); ctx.moveTo(jx + j * 3 * s, jy); ctx.quadraticCurveTo(jx + j * 3 * s + Math.sin(now * 3 + j) * 3, jy + 8 * s, jx + j * 3 * s, jy + 14 * s); ctx.stroke(); } }
      } else if (id === "seal") {
        const up = Math.sin(Math.min(1, k * 1.2) * Math.PI);
        ctx.fillStyle = "#8a8f94"; ctx.beginPath(); ctx.ellipse(p.x, p.y - 6 * s * up, 8 * s, 10 * s * up + 1, 0, 0, 7); ctx.fill();
        ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(p.x - 3 * s, p.y - 10 * s * up, 1.4 * s, 0, 7); ctx.arc(p.x + 3 * s, p.y - 10 * s * up, 1.4 * s, 0, 7); ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = "rgba(255,255,255," + (0.5 + 0.4 * Math.sin(now * 8)) + ")"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y - 8 * s, 30 * s, 0, 7); ctx.stroke();
      stxt(t("📸 눌러서 찰칵!"), p.x, p.y - 44 * s, 12, "#fff", "center", "800");
    }
    if (gull) {
      const x = gull.x, y = gull.y, s = S, fl = Math.sin(now * (gull.ph === "hover" ? 18 : 10)) * 6 * s;
      ctx.fillStyle = "#f4f6f7"; ctx.beginPath(); ctx.ellipse(x, y, 9 * s, 4.5 * s, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = "#f4f6f7"; ctx.lineWidth = 3 * s; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x - 2 * s, y - 2 * s); ctx.lineTo(x - 14 * s, y - 6 * s - fl); ctx.moveTo(x + 2 * s, y - 2 * s); ctx.lineTo(x + 12 * s, y - 6 * s - fl); ctx.stroke();
      ctx.strokeStyle = "#4a5560"; ctx.lineWidth = 1.5 * s; ctx.beginPath(); ctx.moveTo(x - 14 * s, y - 6 * s - fl); ctx.lineTo(x - 18 * s, y - 5 * s - fl); ctx.stroke();
      ctx.fillStyle = "#f2b705"; ctx.beginPath(); ctx.moveTo(x + 8 * s, y - 1 * s); ctx.lineTo(x + 13 * s, y); ctx.lineTo(x + 8 * s, y + 1.5 * s); ctx.fill();
      if (gull.ph === "hover") stxt(t("🐦 미끼 도둑! 눌러서 쫓아요"), x, y - 22 * s, 12, "#ffe14a", "center", "800");
    }
  }

  // ---------- 5분 낚시 대회 (동네 꾼들과 잡은 무게로 겨뤄요) ----------
  let tour = null, tourRes = null;
  const RIVALS = ["김씨 아저씨", "낚시왕 박", "동네 고수 이"];
  function startTour() {
    tour = { t: 300, kg: 0, n: 0, npc: RIVALS.map((n, i) => ({ n, kg: 0, next: rnd(15, 50), skill: 0.7 + i * 0.25 })) };
    flash(t("🏆 5분 낚시 대회 시작! 잡은 무게로 순위를 다퉈요")); [523, 659, 784].forEach((f, i) => setTimeout(() => beep(f, 0.15, "square", 0.08), i * 120));
  }
  function tourTick(dt) {
    if (tourRes) { tourRes.t -= dt; if (tourRes.t <= 0) tourRes = null; }
    if (!tour) return;
    tour.t -= dt;
    for (const n of tour.npc) { n.next -= dt; if (n.next <= 0) { n.kg += rnd(0.15, 1.8) * n.skill; n.next = rnd(28, 70); } }
    if (tour.t <= 0) endTour();
  }
  function endTour() {
    const list = [{ n: t("나"), kg: tour.kg, me: 1 }, ...tour.npc.map((n) => ({ n: t(n.n), kg: n.kg }))].sort((a, b) => b.kg - a.kg);
    const rank = list.findIndex((x) => x.me) + 1, prize = tour.kg > 0 ? [500, 200, 100, 0][rank - 1] : 0;
    save.coins += prize; save.xp = (save.xp || 0) + prize / 2; save.tourBest = Math.max(save.tourBest || 0, tour.kg); if (rank === 1) save.tourWins = (save.tourWins || 0) + 1; store();
    tourRes = { list, rank, prize, t: 7 }; tour = null;
    if (rank === 1) { confetti(80, ["#ffcf3a", "#fff", "#62BE84"]); [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => beep(f, 0.22, "triangle", 0.12), i * 110)); }
    else beep(392, 0.3, "triangle", 0.1);
    renderPanel();
  }
  function drawTour() {
    if (tour) {
      const mm = Math.floor(tour.t / 60), ss = String(Math.floor(tour.t % 60)).padStart(2, "0");
      const all = [tour.kg, ...tour.npc.map((n) => n.kg)].sort((a, b) => b - a), rank = all.indexOf(tour.kg) + 1;
      stxt("🏆 " + mm + ":" + ss + " · " + kgTxt(tour.kg) + " · " + t("{n}위", { n: rank }), W - 10, H - 44, 13, tour.t < 30 ? "#ff8a7a" : "#ffe14a", "right", "800");
    }
    if (tourRes) {
      const w = Math.min(300, W - 30), h = 40 + tourRes.list.length * 26 + 40, x = W / 2 - w / 2, y = H * 0.18;
      ctx.fillStyle = "rgba(14,30,26,0.94)"; rr(x, y, w, h, 16); ctx.fill(); ctx.strokeStyle = "#ffcf3a"; ctx.lineWidth = 2; rr(x, y, w, h, 16); ctx.stroke();
      fitTxt(tourRes.rank === 1 ? t("🥇 대회 우승!") : t("🏆 대회 결과: {n}위", { n: tourRes.rank }), W / 2, y + 22, 18, w - 20, "#ffcf3a", "800");
      tourRes.list.forEach((r, i) => { txt((["🥇", "🥈", "🥉", "4."][i]) + " " + r.n, x + 18, y + 52 + i * 26, 14, r.me ? "#ffe14a" : "#fff", "left", r.me ? "800" : "600"); txt(kgTxt(r.kg), x + w - 18, y + 52 + i * 26, 14, r.me ? "#ffe14a" : "#fff", "right", "700"); });
      if (tourRes.prize) fitTxt(t("상금 +{n}🪙", { n: tourRes.prize }), W / 2, y + h - 16, 14, w - 20, "#F2B705", "800");
    }
  }

  // ---------- 인증샷 카드 (잡은 고기를 사진 카드로) ----------
  function makeShot(f) {
    const c = document.createElement("canvas"); c.width = 720; c.height = 900;
    const g = c.getContext("2d"), old = ctx, oF = F, oS = S; ctx = g; F = 1; S = 2;
    const sea = (SCENES[f.sp] || {}).water || SEA_COL[(SPOT_LIST.find((x) => x.id === f.sp) || {}).sea || "S"] || SEA_COL.S;
    const bg = g.createLinearGradient(0, 0, 0, 900); bg.addColorStop(0, "#8ec5ea"); bg.addColorStop(0.45, "#d6eef8"); bg.addColorStop(0.46, sea[0]); bg.addColorStop(1, sea[1]); g.fillStyle = bg; g.fillRect(0, 0, 720, 900);
    g.fillStyle = "rgba(255,255,255,0.18)"; for (let i = 0; i < 30; i++) g.fillRect((i * 97) % 720, 420 + i * 15, 40 + (i * 13) % 60, 2);
    g.fillStyle = "rgba(255,255,255,0.92)"; rr(40, 60, 640, 780, 36); g.fill();
    const sp0 = SP.find((x) => x.id === f.id) || { c: "#888" }, gr = f.g >= 0 ? GRADE[f.g] : null;
    txt("🎣 " + t("제피 낚시"), 360, 120, 30, "#1F6B3A", "center", "800");
    drawFish(360, 330, 420, Object.assign({}, sp0, { id: f.id }));
    txt(t(f.n), 360, 520, 56, "#1c211e", "center", "900");
    txt(f.size + "cm · " + kgTxt(f.kg || 0), 360, 590, 40, "#1c211e", "center", "800");
    if (gr) { g.strokeStyle = gr.c; g.lineWidth = 6; rr(250, 625, 220, 60, 14); g.stroke(); txt(t(gr.n), 360, 656, 32, gr.c, "center", "900"); }
    const spn = (SPOT_LIST.find((x) => x.id === f.sp) || {}).n || "";
    txt("📍 " + t(spn), 360, 730, 26, "#5a635d", "center", "700");
    const d = new Date(f.at); txt(d.getFullYear() + "." + (d.getMonth() + 1) + "." + d.getDate() + " · " + ((me() || {}).name || ""), 360, 776, 22, "#5a635d", "center", "600");
    ctx = old; F = oF; S = oS;
    return c.toDataURL("image/png");
  }
  const NOTES = [
    "물때 표를 보세요. 물이 움직일 때 고기도 움직여요",
    "밑밥은 찌보다 조금 위쪽(조류 위)에 뿌리면 같이 흘러가요",
    "큰 고기는 서두르지 말고 드랙을 믿으세요",
    "해 뜰 무렵과 해 질 무렵이 입질 시간이에요",
    "바람 부는 날엔 바람을 등지고 던지면 멀리 가요",
    "구명조끼는 꼭! 바다는 늘 조심",
    "오늘 못 잡아도 괜찮아요. 바다를 본 것만으로 좋은 날",
    "쓰레기는 꼭 가져가 주세요. 다음 꾼을 위해",
  ];
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
  // 밑밥 주걱질도 던지기처럼: 꾹 → 힘 게이지(거리) · 좌우로 밀어 방향 → 떼면 휙
  let chumHold = null;
  function chumPoint() {
    const p = chumHold ? chumHold.p : 0.5;
    return tgt(0.08 + p * 0.62, aimLat);
  }
  function throwChum() {
    const f = tackle(), c = current();
    let x = f.x - c.dir * W * 0.02, y = f.y; // 쉬움: 찌 조금 위쪽(조류 위)에 알아서
    if (chumHold && !(easy() && chumHold.t < 0.2)) { const q = chumPoint(); x = q.x; y = q.y; }
    chumHold = null;
    const h = hand();
    chumFly.push({ fx: h.x, fy: h.y - 10, x, y, t: 0 });
    K.swoosh(900, 1500, 0.22, 0.18, 2);
  }

  // ---------- 입력 ----------
  function press() {
    if (lastTap && performance.now() - lastTap.at < 80 && tapSpecial(lastTap)) { lastTap = null; holding = false; return; }
    holding = true;
    const m = mode();
    switch (G.s) {
      case "ready": startCast(); break;
      case "windup": break;
      case "wait":
      case "settle":
        if (m === "float") { aimLat = 0; chumHold = { t: 0, p: 0 }; break; }
        else if (easy()) flash(t("아직이에요. 방울이 울리면 탭!"));
        else { flash(t("너무 빨라요! 고기가 놀랐어요")); beep(180, 0.2, "square", 0.08); waitT = 0; }
        holding = false; break;
      case "retr":
        lureTaps++; hopT = 0.3; lureK = Math.min(0.97, lureK + 0.02); beep(700, 0.05, "triangle", 0.08); K.click(2200, 0.25);
        if (lureTaps >= lureNeed && lureBite < 0) lureBite = rnd(0.2, 0.7);
        holding = false; break;
      case "bite":
        if (m === "float" && tk("rig") === "full" && !easy() && sinkT < 1) { flash(t("너무 빨라요! 찌가 끝까지 잠길 때 챔질")); toReady(); break; }
        if (easy()) { hook(0.3); holding = false; break; }
        hookAt = now; break;
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
    if (G.s === "bite" && hookAt >= 0) { const h = now - hookAt; hookAt = -1; holding = false; hook(h); return; }
    if (G.s === "windup" && holding) { holding = false; releaseCast(); return; }
    if (chumHold) { holding = false; throwChum(); return; }
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
    stormTick(dt); walkTick(dt); peerTick(dt); boatTick(dt); friendTick(dt); tourTick(dt);
    if (chumHold) { chumHold.t += dt; chumHold.p = (1 - Math.cos(chumHold.t / 0.9 * Math.PI)) / 2; if (!["wait", "settle"].includes(G.s)) chumHold = null; }
    if (cloudT > 0) { cloudT -= dt; if (cloudT <= 0) cloudPush(); }
    const s = G.s, m = mode(), cur = current();
    if (s === "windup") {
      windT += dt;
      const u = windT / ((easy() ? 1.9 : hard() ? 1.0 : 1.25) * (m === "float" ? 1.2 : m === "lure" ? 0.85 : 1));
      power = (1 - Math.cos(u * Math.PI)) / 2;
      phi = windT * Math.PI * 2 / 1.1;
      if (m === "surf" && Math.floor((windT - dt) / 0.55) !== Math.floor(windT / 0.55)) K.swoosh(300, 600, 0.35, 0.08, 1);
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
      if (hookAt >= 0 && now - hookAt >= 0.35) { hookAt = -1; hook(0.35); return; }
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
    const lam = (0.03 + 0.5 * gather) * condMul() * (easy() ? 1.6 : 1) * (rushT > 0 ? 3 : 1) / (acc ? acc.mul : 1);
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
      if (holding) P += (13 / (0.6 + 0.4 * st)) * dt * (save.gear.reel ? 1.25 : 1) * (fish.run ? 0.45 : 1) / (0.75 + 0.25 * dragK());
      dragNow = fish.run ? 1.2 * dragK() : 0;
      if (fish.run) { P = Math.max(5, P - dragNow * dt * 1.2); lineOut += dragNow * dt; }
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
        if (jump.bad && Math.random() < (hard() ? 0.85 : 0.5) + (hookQ === "weak" ? 0.2 : 0)) { flash(t("바늘털이에 당했어요! 뛸 때는 손을 떼요")); endFight("escape"); return; }
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
      P += (17 / (0.55 + 0.35 * st)) * dt * reel * hot * (fish.boss ? 0.55 : 1) / (0.7 + 0.3 * dragK());
      dragNow = 0;
      T = 45 + 25 * Math.abs(fv);
      K.reel(hot > 1 ? 16 : 10, dt); K.drag(0, dt);
    } else {
      inT = 0; outT += dt;
      dragNow = (hard() ? 12 : 7) * (0.7 + 0.3 * st) * (0.5 + 0.5 * dragK()) * (save.gear.line ? 0.9 : 1);
      P -= dragNow * dt;
      lineOut += dragNow * dt * castM() / 100;
      T = 85;
      K.drag(18 + 16 * st * dragK(), dt); K.reel(0, dt);
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
    else if (s === "windup") {
      if (m === "surf") { a = -2.4 - 0.08 * Math.sin(phi); bend = 0.12 + 0.08 * Math.sin(phi); }
      else if (m === "lure") { a = lerp(-1.3, -2.55, power); bend = 0.06 + 0.1 * power; }
      else { a = lerp(-1.1, -1.6, power); bend = 0.05 + 0.05 * power; }
      a += aimLat * 0.6;
    }
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
        const cx = x * W, cy = c.y * H, r = 16 * c.s * S;
        const top = night ? "rgba(140,150,185,0.4)" : gray > 0.4 ? "rgba(170,176,186,0.95)" : "rgba(255,255,255,0.97)";
        const bot = night ? "rgba(70,80,120,0.3)" : gray > 0.4 ? "rgba(120,128,140,0.9)" : mix("#dfe8f0", "#f2b08a", dusk);
        const cg = ctx.createLinearGradient(0, cy - r * 1.6, 0, cy + r); cg.addColorStop(0, top); cg.addColorStop(1, bot);
        ctx.fillStyle = cg; ctx.beginPath();
        ctx.arc(cx, cy, r * 0.85, 0, 7); ctx.arc(cx + r * 0.9, cy - r * 0.55, r * 1.15, 0, 7); ctx.arc(cx + r * 2, cy - r * 0.2, r * 0.95, 0, 7); ctx.arc(cx + r * 2.8, cy + r * 0.1, r * 0.6, 0, 7);
        ctx.rect(cx - r * 0.2, cy, r * 3.2, r * 0.7); ctx.fill();
      }
      if (!night && gray < 0.5) { // 높은 새털구름
        ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) { const y = H * (0.05 + i * 0.03), x0 = ((i * 0.31 + now * 0.002) % 1.3) * W - W * 0.2; ctx.beginPath(); ctx.moveTo(x0, y); ctx.quadraticCurveTo(x0 + W * 0.1, y - 5, x0 + W * 0.25, y + 2); ctx.stroke(); }
      }
      drawBirds(h, night);
      drawLand(h, night, dusk, gray);
    }
    // 바다
    const sc = (SCENES[spot().id] || {}).water || SEA_COL[place()] || SEA_COL.S;
    const s = ctx.createLinearGradient(0, h, 0, H);
    s.addColorStop(0, night ? "#1d2c55" : mix(mix(sc[0], "#b07a78", dusk * 0.5), "#8d9aa3", gray * 0.6));
    s.addColorStop(1, night ? "#060d24" : mix(sc[1], "#142a50", dusk * 0.5));
    ctx.fillStyle = s; ctx.fillRect(0, h, W, H - h);
    drawReflection(h, night);
    if (!night && gray < 0.55 && !ph) { // 햇빛이 물 위에 만드는 반짝이 길
      const sx = W * 0.8, gc = dusk > 0.3 ? "rgba(255,190,120," : "rgba(255,255,235,";
      for (let i = 0; i < 26; i++) { const yy = h + 3 + i * i * 0.55, ww = (26 - i) * 0.9 + 4, fl = 0.25 + 0.5 * Math.abs(Math.sin(now * 3 + i * 1.7)); ctx.fillStyle = gc + (fl * (1 - i / 30)) + ")"; ctx.fillRect(sx - ww / 2 + Math.sin(now * 2 + i) * (3 + i * 0.3), yy, ww, 1.6); }
    }
    drawBoatPass(h, night);
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
    drawWalkers();
    if (storm() >= 1) drawStormSea(h);
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
  // 낚시터 풍경 (수평선 위 섬·산·등대·다리·굴뚝·풍력·도시…)
  function drawLand(h, night, dusk, gray) {
    const sc = SCENES[spot().id] || { el: [["isl", 0.42, 0.24, 0.05], ["isl", 0.6, 0.16, 0.025]] };
    const far = night ? "#1a2240" : mix(mix("#7f9db4", "#6a5878", dusk), "#9aa3ab", gray * 0.6);
    const near = night ? "#141b33" : mix(mix("#5d7d73", "#4f4560", dusk), "#7d8790", gray * 0.6);
    const lightOn = night || dusk > 0.45;
    for (const e of sc.el) {
      const [k, x0] = e, X = x0 * W;
      if (k === "isl") {
        const w = e[2] * W, hh = e[3] * H;
        ctx.fillStyle = far; ctx.beginPath(); ctx.moveTo(X, h); ctx.quadraticCurveTo(X + w * 0.5, h - hh * 2, X + w, h); ctx.fill();
        if (e[4] === "peak") { ctx.beginPath(); ctx.moveTo(X + w * 0.38, h - hh * 0.8); ctx.lineTo(X + w * 0.5, h - hh * 1.5); ctx.lineTo(X + w * 0.62, h - hh * 0.8); ctx.fill(); }
      } else if (k === "rock") {
        const w = e[2] * W, hh = e[3] * H;
        ctx.fillStyle = near; ctx.beginPath(); ctx.moveTo(X, h);
        if (e[4]) { ctx.lineTo(X + w * 0.08, h - hh); ctx.lineTo(X + w * 0.85, h - hh * 1.05); ctx.lineTo(X + w, h); } // 평평한 꼭대기 섬 (차귀도)
        else { ctx.lineTo(X + w * 0.3, h - hh * 0.7); ctx.lineTo(X + w * 0.45, h - hh * 1.2); ctx.lineTo(X + w * 0.62, h - hh * 0.8); ctx.lineTo(X + w, h); }
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillRect(X - 2, h - 1, w + 4, 2);
      } else if (k === "mtn") {
        const w = e[2] * W, hh = e[3] * H;
        ctx.fillStyle = far; ctx.beginPath(); ctx.moveTo(X, h);
        for (let i = 0; i <= 12; i++) { const u = i / 12, y = h - hh * Math.sin(u * Math.PI) * (e[4] ? 0.75 + 0.25 * Math.abs(Math.sin(u * 23)) : 0.9 + 0.1 * Math.sin(u * 9)); ctx.lineTo(X + w * u, y); }
        ctx.lineTo(X + w, h); ctx.fill();
      } else if (k === "cliff") {
        const right = e[1] === 1, hh = e[2] * H, w = W * 0.2, x = right ? W - w : 0;
        ctx.fillStyle = near; ctx.beginPath();
        if (right) { ctx.moveTo(W, h - hh); ctx.lineTo(x + w * 0.35, h - hh * 0.95); ctx.lineTo(x + w * 0.2, h - hh * 0.4); ctx.lineTo(x, h); ctx.lineTo(W, h); }
        else { ctx.moveTo(0, h - hh); ctx.lineTo(w * 0.65, h - hh * 0.9); ctx.lineTo(w * 0.8, h - hh * 0.35); ctx.lineTo(w, h); ctx.lineTo(0, h); }
        ctx.fill();
      } else if (k === "lh") {
        const yb = h - (e[3] || 0) * H, ht = 26 * S, col = e[2];
        if (!e[3]) { ctx.fillStyle = "#a9aeb3"; ctx.fillRect(X - 22 * S, yb - 2, 26 * S, 3); } // 방파제 끝
        if (col === "ball") {
          ctx.fillStyle = "#e9edf0"; ctx.fillRect(X - 3 * S, yb - ht, 6 * S, ht);
          ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(X, yb - ht * 0.55, 7 * S, 0, 7); ctx.fill();
          ctx.fillStyle = "#222"; for (let i = 0; i < 5; i++) { const a = i * 1.26; ctx.beginPath(); ctx.arc(X + Math.cos(a) * 3.5 * S, yb - ht * 0.55 + Math.sin(a) * 3.5 * S, 1.3 * S, 0, 7); ctx.fill(); }
        } else {
          ctx.fillStyle = col === "red" ? "#d9412f" : col === "yellow" ? "#f2c230" : "#f4f6f7";
          ctx.beginPath(); ctx.moveTo(X - 4 * S, yb); ctx.lineTo(X - 2.6 * S, yb - ht); ctx.lineTo(X + 2.6 * S, yb - ht); ctx.lineTo(X + 4 * S, yb); ctx.fill();
          ctx.fillStyle = "#3b3f45"; ctx.fillRect(X - 3.4 * S, yb - ht - 4 * S, 6.8 * S, 4 * S);
        }
        if (night) { const a = now * 1.2 + x0 * 5, bx = X, by = yb - ht - 2 * S; ctx.fillStyle = "rgba(255,250,210,0.12)"; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a) * W * 0.5, by + Math.sin(a) * 10 - 14); ctx.lineTo(bx + Math.cos(a) * W * 0.5, by + Math.sin(a) * 10 + 14); ctx.fill(); }
        if (lightOn && Math.sin(now * 2.2 + x0 * 9) > 0.2) { const g = ctx.createRadialGradient(X, yb - ht - 2 * S, 0, X, yb - ht - 2 * S, 22 * S); g.addColorStop(0, col === "red" ? "rgba(255,90,70,0.95)" : "rgba(160,255,160,0.95)"); g.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X, yb - ht - 2 * S, 22 * S, 0, 7); ctx.fill(); }
      } else if (k === "chim") {
        for (let i = 0; i < e[2]; i++) {
          const x = X + i * 9 * S, ht = 36 * S;
          ctx.fillStyle = night ? "#2a3150" : "#c9ced3"; ctx.fillRect(x, h - ht, 5 * S, ht);
          ctx.fillStyle = "#d9412f"; ctx.fillRect(x, h - ht, 5 * S, 4 * S);
          ctx.fillStyle = "rgba(235,238,240,0.5)"; ctx.beginPath(); ctx.arc(x + 2 * S + Math.sin(now + i) * 2 + crossWind() * 0.8, h - ht - 8 * S, 6 * S, 0, 7); ctx.fill();
        }
        ctx.fillStyle = night ? "#1f2644" : "#aab1b8"; ctx.fillRect(X - 10 * S, h - 10 * S, (e[2] * 9 + 16) * S, 10 * S);
      } else if (k === "bridge") {
        const x2 = e[2] * W, y = h - 10 * S, mid = (X + x2) / 2;
        ctx.strokeStyle = night ? "#3a4570" : "#e8ecef"; ctx.lineWidth = 3 * S; ctx.beginPath(); ctx.moveTo(X, y); ctx.lineTo(x2, y); ctx.stroke();
        for (const px of [X + (x2 - X) * 0.3, X + (x2 - X) * 0.7]) {
          ctx.lineWidth = 3 * S; ctx.beginPath(); ctx.moveTo(px, h); ctx.lineTo(px, y - 26 * S); ctx.stroke();
          ctx.lineWidth = 1; for (let i = 1; i <= 5; i++) { ctx.beginPath(); ctx.moveTo(px, y - 26 * S); ctx.lineTo(px - i * 10 * S, y); ctx.moveTo(px, y - 26 * S); ctx.lineTo(px + i * 10 * S, y); ctx.stroke(); }
        }
        if (e[3] === "lit" && lightOn) { for (let i = 0; i < 18; i++) { ctx.fillStyle = "hsl(" + ((i * 40 + now * 40) % 360) + ",90%,65%)"; ctx.fillRect(X + (x2 - X) * i / 18, y - 2, 3, 3); } }
        else if (lightOn) { ctx.fillStyle = "#ffd98a"; for (let i = 0; i < 12; i++) ctx.fillRect(X + (x2 - X) * i / 12, y - 2, 2, 2); }
        void mid;
      } else if (k === "wind") {
        for (let i = 0; i < e[2]; i++) {
          const x = X + i * 16 * S, ht = 34 * S, hub = h - ht, a = now * (0.6 + COND.wind * 0.15) + i;
          ctx.strokeStyle = night ? "#4a5580" : "#f0f2f4"; ctx.lineWidth = 2 * S; ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x, hub); ctx.stroke();
          ctx.lineWidth = 1.5 * S; for (let j = 0; j < 3; j++) { const b = a + j * 2.094; ctx.beginPath(); ctx.moveTo(x, hub); ctx.lineTo(x + Math.cos(b) * 12 * S, hub + Math.sin(b) * 12 * S); ctx.stroke(); }
        }
      } else if (k === "city") {
        const w = e[2] * W, hh = e[3] * H;
        for (let i = 0; i < 14; i++) {
          const bw = w / 14, bh = hh * (0.4 + 0.6 * Math.abs(Math.sin(i * 7.7 + x0 * 13)));
          ctx.fillStyle = night ? "#20284a" : mix("#b7c0c8", "#8b8fa8", dusk); ctx.fillRect(X + i * bw, h - bh, bw - 1, bh);
          if (lightOn) { ctx.fillStyle = "rgba(255,220,140,0.85)"; for (let j = 0; j < 3; j++) if (Math.sin(i * 3 + j * 5) > -0.2) ctx.fillRect(X + i * bw + 2, h - bh + 3 + j * 5, 2, 2); }
        }
      } else if (k === "dike") {
        const x2 = e[2] * W; ctx.fillStyle = night ? "#2a3150" : "#b9bec3"; ctx.fillRect(X, h - 4 * S, x2 - X, 4 * S);
        if (lightOn) { ctx.fillStyle = "#ffd98a"; for (let i = 0; i < 20; i++) ctx.fillRect(X + (x2 - X) * i / 20, h - 6 * S, 2, 2); }
      } else if (k === "pav") {
        const y = h + 6 * S; ctx.fillStyle = "#6e6358"; ctx.beginPath(); ctx.moveTo(X - 24 * S, y + 6 * S); ctx.lineTo(X - 10 * S, y - 4 * S); ctx.lineTo(X + 14 * S, y - 5 * S); ctx.lineTo(X + 26 * S, y + 6 * S); ctx.fill();
        ctx.fillStyle = "#c45a3a"; ctx.beginPath(); ctx.moveTo(X - 10 * S, y - 18 * S); ctx.quadraticCurveTo(X, y - 26 * S, X + 10 * S, y - 18 * S); ctx.fill();
        ctx.fillStyle = "#ece6d8"; ctx.fillRect(X - 7 * S, y - 18 * S, 2 * S, 14 * S); ctx.fillRect(X + 5 * S, y - 18 * S, 2 * S, 14 * S);
        ctx.strokeStyle = "#ece6d8"; ctx.lineWidth = 1.5 * S; ctx.beginPath(); ctx.moveTo(X + 14 * S, y - 4 * S); ctx.lineTo(X + 60 * S, y + 2 * S); ctx.stroke(); // 다리
      } else if (k === "ship") {
        const y = h + 2, big = e[2] === "cargo", L = (big ? 60 : 34) * S, x = X + Math.sin(now * 0.05 + x0) * 10;
        ctx.fillStyle = big ? "#3a4652" : "#f2f4f6"; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + L, y); ctx.lineTo(x + L * 0.92, y + 5 * S); ctx.lineTo(x + L * 0.06, y + 5 * S); ctx.fill();
        if (big) { const cols = ["#d9412f", "#3a78c2", "#e8a23a", "#4aa86b"]; for (let i = 0; i < 8; i++) { ctx.fillStyle = cols[i % 4]; ctx.fillRect(x + 6 * S + i * 5 * S, y - 6 * S, 4.5 * S, 6 * S); } ctx.fillStyle = "#f2f4f6"; ctx.fillRect(x + L * 0.82, y - 12 * S, 7 * S, 12 * S); }
        else { ctx.fillStyle = "#3a78c2"; ctx.fillRect(x + 6 * S, y - 7 * S, 20 * S, 7 * S); }
        if (lightOn) { ctx.fillStyle = "#ffe8a0"; ctx.fillRect(x + L * 0.85, y - 10 * S, 2, 2); }
      } else if (k === "boats") {
        for (let i = 0; i < e[2]; i++) {
          const x = X + i * 22 * S + Math.sin(now * 0.3 + i) * 3, y = h + 10 * S + (i % 2) * 6 * S + Math.sin(now * 1.5 + i) * 1.5;
          ctx.fillStyle = ["#e9edf0", "#3a78c2", "#d9412f"][i % 3]; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 18 * S, y); ctx.lineTo(x + 15 * S, y + 4 * S); ctx.lineTo(x + 2 * S, y + 4 * S); ctx.fill();
          ctx.fillStyle = "#f4f6f7"; ctx.fillRect(x + 9 * S, y - 6 * S, 6 * S, 6 * S);
          ctx.strokeStyle = "#555"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 6 * S, y); ctx.lineTo(x + 6 * S, y - 12 * S); ctx.stroke();
        }
      } else if (k === "squid") {
        if (lightOn) for (let i = 0; i < e[2]; i++) { const x = W * (0.3 + i * 0.08) + Math.sin(i * 3) * 10, y = h - 2; const g = ctx.createRadialGradient(x, y, 0, x, y, 16 * S); g.addColorStop(0, "rgba(220,255,230,0.95)"); g.addColorStop(1, "rgba(220,255,230,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 16 * S, 0, 7); ctx.fill(); }
      } else if (k === "pine") {
        const w = e[2] * W;
        for (let i = 0; i < 16; i++) { const x = X + w * i / 16, ht = (14 + (i * 37 % 10)) * S; ctx.fillStyle = night ? "#121a2e" : "#2f5a3c"; ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x + 6 * S, h - ht); ctx.lineTo(x + 12 * S, h); ctx.fill(); }
      } else if (k === "wheel") {
        const r = 18 * S, cy = h - r - 6 * S;
        ctx.strokeStyle = night ? "#6f7bb0" : "#e9edf0"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X, cy, r, 0, 7); ctx.stroke();
        for (let i = 0; i < 8; i++) { const a = i * 0.785 + now * 0.1; ctx.beginPath(); ctx.moveTo(X, cy); ctx.lineTo(X + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.stroke(); if (lightOn) { ctx.fillStyle = "hsl(" + (i * 45) + ",90%,65%)"; ctx.fillRect(X + Math.cos(a) * r - 1.5, cy + Math.sin(a) * r - 1.5, 3, 3); } }
        ctx.beginPath(); ctx.moveTo(X - 8 * S, h); ctx.lineTo(X, cy); ctx.lineTo(X + 8 * S, h); ctx.stroke();
      }
    }
  }
  function drawStormSea(h) {
    const lv = storm();
    // 하얗게 부서지는 너울
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    for (let i = 0; i < 10 * lv; i++) { const x = ((i * 173 + now * (30 + COND.wind * 4)) % (W + 80)) - 40, y = h + 14 + ((i * 61) % (H * 0.45)); ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 14, y - 6 - lv * 3, x + 30, y); ctx.fill(); }
    // 해안에 부딪혀 솟는 물보라
    for (const p of spray) { ctx.globalAlpha = clamp(p.life, 0, 1) * 0.85; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  function stormTick(dt) {
    const lv = storm();
    for (const p of spray) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; }
    spray = spray.filter((p) => p.life > 0);
    if (!lv) return;
    bigWaveT -= dt;
    if (bigWaveT <= 0) {
      bigWaveT = lv === 2 ? rnd(5, 9) : rnd(10, 16);
      const sh = shore(), n = lv === 2 ? 46 : 22;
      for (let i = 0; i < n; i++) spray.push({ x: sh.x - W * 0.05 + rnd(-30, 30), y: sh.y, vx: rnd(-90, 40), vy: rnd(-380, -160) * (lv === 2 ? 1.2 : 0.8), r: rnd(2, 5), life: rnd(0.8, 1.6) });
      K.splash(lv === 2 ? 1 : 0.6, true); if (lv === 2) { buzz([120, 60, 120]); shake = Math.max(shake, 0.35); flash(t("🌊 큰 파도! 실제라면 바로 물러나야 해요")); }
    }
  }
  // ---------- 함께 낚시: 같은 낚시터에 들어온 사람들이 서로 보여요 (Supabase Realtime 접속 · 켜야만) ----------
  // 내 이름·프로필 사진·하는 중(던지는 중/파이팅 중)·잡은 고기만 보내요. 위치(GPS)는 보내지 않아요
  const RT_URL = "wss://xkhfannbztgvarxqhzno.supabase.co/realtime/v1/websocket?apikey=sb_publishable__uulkrUbHekv5cxsE-UyHw_oXkR7wtM&vsn=1.0.0";
  let rt = null, rtTopic = "", rtRef = 0, rtHb = 0, rtTrack = 0, rtLastState = "", peers = {}, peerMsgs = [], rtStatus = "";
  const myKey = (() => { try { let k = localStorage.getItem("jepi.play.peer"); if (!k) { k = "p" + Math.random().toString(36).slice(2, 10); localStorage.setItem("jepi.play.peer", k); } return k; } catch (e) { return "p" + Math.random().toString(36).slice(2, 10); } })();
  function together() { return !!save.together; }
  function rtSend(event, payload, topic) { if (!rt || rt.readyState !== 1) return; rt.send(JSON.stringify({ topic: topic || rtTopic, event, payload, ref: String(++rtRef), join_ref: "1" })); }
  function myMeta() {
    const m = me() || {};
    const st = { ready: "쉬는 중", windup: "던지려는 중", cast: "던지는 중", fly: "던지는 중", wait: "기다리는 중", settle: "기다리는 중", set: "기다리는 중", retr: "루어 움직이는 중", bite: "입질!", fight: "파이팅 중!", net: "뜰채질!", scoop: "뜰채질!", lift: "올리는 중", result: "쉬는 중" }[G.s] || "쉬는 중";
    return { n: (m.name || t("손님")).slice(0, 12), av: m.avatar || "", m: mode(), s: st, lv: lvOf(save.xp), at: Date.now() };
  }
  function rtConnect() {
    if (!together() || typeof WebSocket === "undefined") return;
    const topic = "realtime:zepi-fish-" + spot().id;
    if (rt && rtTopic === topic && rt.readyState <= 1) return;
    rtClose();
    rtTopic = topic; peers = {}; rtStatus = "connecting";
    try { rt = new WebSocket(RT_URL); } catch (e) { rtStatus = "err"; return; }
    rt.onopen = () => {
      rtSend("phx_join", { config: { broadcast: { self: false, ack: false }, presence: { key: myKey }, private: false } });
      rtHb = 0;
    };
    rt.onmessage = (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.topic !== rtTopic) return;
      if (m.event === "phx_reply" && m.payload && m.payload.status === "ok" && rtStatus !== "on") { rtStatus = "on"; rtSend("presence", { type: "presence", event: "track", payload: myMeta() }); renderPeople(); }
      else if (m.event === "phx_reply" && m.payload && m.payload.status === "error") { rtStatus = "err"; renderPeople(); }
      else if (m.event === "presence_state") { peers = {}; for (const k of Object.keys(m.payload || {})) if (k !== myKey) peers[k] = (m.payload[k].metas || [])[0]; renderPeople(); }
      else if (m.event === "presence_diff") {
        const p = m.payload || {};
        for (const k of Object.keys(p.leaves || {})) delete peers[k];
        for (const k of Object.keys(p.joins || {})) if (k !== myKey) { const was = !!peers[k]; peers[k] = (p.joins[k].metas || [])[0]; if (!was) peerMsgs.push({ k, txt: t("👋 {n}님이 왔어요", { n: peers[k].n }), t: 3 }); }
        renderPeople();
      }
      else if (m.event === "broadcast" && m.payload && m.payload.event === "catch") {
        const d = m.payload.payload || {}, sp = SP.find((x) => x.id === d.f), who = Object.keys(peers).find((k) => peers[k] && peers[k].n === d.n) || "";
        if (sp) { peerMsgs.push({ k: who, txt: t("🎉 {n}님이 {f} {c}cm!", { n: d.n || t("손님"), f: t(sp.n), c: d.size }), t: 3.5 }); beep(1175, 0.1, "triangle", 0.08); }
      }
    };
    rt.onclose = () => { if (rtStatus !== "off") rtStatus = rtStatus === "on" ? "lost" : "err"; renderPeople(); };
    rt.onerror = () => { rtStatus = "err"; };
  }
  function rtClose() { if (rt) { try { rtSend("phx_leave", {}); rt.close(); } catch (e) {} } rt = null; peers = {}; }
  function peerSend(ev, data) { if (!together() || rtStatus !== "on") return; rtSend("broadcast", { type: "broadcast", event: ev, payload: Object.assign({ n: myMeta().n }, data) }); }
  function peerTick(dt) {
    for (const q of peerMsgs) q.t -= dt;
    peerMsgs = peerMsgs.filter((q) => q.t > 0);
    if (!together() || !rt) return;
    rtHb += dt; rtTrack += dt;
    if (rtHb > 25) { rtHb = 0; if (rt.readyState === 1) rt.send(JSON.stringify({ topic: "phoenix", event: "heartbeat", payload: {}, ref: String(++rtRef) })); }
    const st = myMeta().s;
    if (rtStatus === "on" && (st !== rtLastState && rtTrack > 1.5 || rtTrack > 30)) { rtLastState = st; rtTrack = 0; rtSend("presence", { type: "presence", event: "track", payload: myMeta() }); }
    if (rtStatus === "lost" && rtTrack > 8) { rtTrack = 0; rtConnect(); }
  }
  const peerImgs = {};
  function peerImg(u) { if (!u) return null; u = String(u).replace(/^http:/, "https:"); if (!(u in peerImgs)) { peerImgs[u] = null; const im = new Image(); im.referrerPolicy = "no-referrer"; im.onload = () => { peerImgs[u] = im; }; im.src = u; } return peerImgs[u]; }
  function drawPeers() {
    const ks = Object.keys(peers).slice(0, 3), f = feet();
    ks.forEach((k, i) => {
      const p = peers[k]; if (!p) return;
      const x = f.x - (i + 1) * 0.07 * W - 6 * S, y = f.y - 4 * S, s = S * 0.8;
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = "#1d2430"; ctx.lineCap = "round"; ctx.lineWidth = 4 * s;
      ctx.beginPath(); ctx.moveTo(x - 5 * s, y); ctx.lineTo(x, y - 24 * s); ctx.moveTo(x + 5 * s, y); ctx.lineTo(x, y - 24 * s); ctx.stroke();
      ctx.fillStyle = "#3a78c2"; rr(x - 8 * s, y - 48 * s, 16 * s, 26 * s, 4 * s); ctx.fill();
      drawHead(x, y - 55 * s, 7 * s, peerImg(p.av), p.n);
      const fighting = p.s === "파이팅 중!";
      ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(x + 6 * s, y - 36 * s); ctx.quadraticCurveTo(x + 30 * s, y - (fighting ? 60 : 80) * s, x + 46 * s, y - (fighting ? 50 : 84) * s); ctx.stroke();
      ctx.globalAlpha = 1;
      fitTxt(p.n + " · " + t(p.s), x, y - 72 * s, 10, W * 0.2, fighting ? "#ffe14a" : "#fff", "700", true);
      const msg = peerMsgs.find((q) => q.k === k);
      if (msg) { ctx.font = "700 " + Math.round(11 * F) + "px " + FONT; const tw = Math.min(W * 0.5, ctx.measureText(msg.txt).width + 12); ctx.fillStyle = "rgba(255,255,255,0.95)"; rr(x - 6, y - 98 * s, tw, 18, 9); ctx.fill(); fitTxt(msg.txt, x - 6 + tw / 2, y - 89 * s, 11, tw - 8, "#1c211e"); }
    });
    const lone = peerMsgs.find((q) => !q.k || !peers[q.k]);
    if (lone) fitTxt(lone.txt, W / 2, H * 0.24, 13, W - 30, "#fff", "800", true);
  }
  function renderPeople() {
    const el = root && root.querySelector("#gPeople"); if (!el) return;
    el.innerHTML = peopleHtml();
  }
  function peopleHtml() {
    if (!together()) return '<p class="tk-like" style="margin:0">' + esc(t("켜면 지금 같은 낚시터에서 게임 중인 사람과 서로 보여요. 내 이름·프로필 사진·잡은 고기가 보여요")) + "</p>";
    const ks = Object.keys(peers);
    const st = rtStatus === "on" ? (ks.length ? t("{n}명이 같이 낚시 중", { n: ks.length }) : t("아직 아무도 없어요. 다른 사람이 오면 여기 보여요")) : rtStatus === "connecting" ? t("연결하는 중…") : t("연결이 안 됐어요. 잠시 뒤 다시 해 볼게요");
    return '<p class="tk-like" style="margin:0 0 6px">' + esc(st) + '</p><div class="gpeople">' + ks.map((k) => { const p = peers[k] || {}; return "<span>" + (p.av ? '<img src="' + esc(p.av) + '" alt="" referrerpolicy="no-referrer">' : "<i>🎣</i>") + esc(p.n || "") + " · " + esc(t(p.s || "")) + "</span>"; }).join("") + "</div>";
  }
  // 지나가는 사람들 (산책 · 다른 꾼 · 강아지) — 내가 잡으면 한마디
  let walkers = [], walkT = 3;
  const SAY = ["와, 크다!", "손맛 좋아요?", "오늘 물때 좋네요", "뭐 잡혀요?", "멋져요 👍"];
  function walkTick(dt) {
    walkT -= dt;
    if (walkT <= 0 && walkers.length < 2 && storm() < 2) {
      walkT = rnd(10, 22);
      const kind = ["walk", "angler", "dog"][Math.floor(Math.random() * 3)], dir = Math.random() < 0.5 ? 1 : -1;
      walkers.push({ kind, dir, x: dir > 0 ? -20 : W * 0.34, sp: rnd(18, 30) * S, say: "", sayT: 0, c: ["#3a78c2", "#c2452d", "#6b8e23", "#8a5a9e"][Math.floor(Math.random() * 4)] });
    }
    for (const w of walkers) { w.x += w.dir * w.sp * dt; if (w.sayT > 0) w.sayT -= dt; }
    walkers = walkers.filter((w) => w.x > -30 && w.x < W * 0.36);
  }
  function cheer() { const w = walkers[0]; if (w) { w.say = t(SAY[Math.floor(Math.random() * SAY.length)]); w.sayT = 2.5; } }
  function drawWalkers() {
    const f = feet();
    for (const w of walkers) {
      const y = f.y - 2 * S, x = w.x, st = Math.sin(now * 8 + x) * 3 * S, s = S * 0.85;
      ctx.globalAlpha = 0.92;
      ctx.strokeStyle = "#2a2f3a"; ctx.lineWidth = 3 * s; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x, y - 22 * s); ctx.lineTo(x - st, y); ctx.moveTo(x, y - 22 * s); ctx.lineTo(x + st, y); ctx.stroke();
      ctx.fillStyle = w.c; rr(x - 6 * s, y - 44 * s, 12 * s, 22 * s, 4 * s); ctx.fill();
      ctx.fillStyle = "#e9c3a0"; ctx.beginPath(); ctx.arc(x, y - 50 * s, 6 * s, 0, 7); ctx.fill();
      if (w.kind === "angler") { ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 1.5 * s; ctx.beginPath(); ctx.moveTo(x + 4 * s, y - 34 * s); ctx.lineTo(x - w.dir * 10 * s, y - 80 * s); ctx.stroke(); ctx.fillStyle = "#3a6ea5"; ctx.fillRect(x - w.dir * 12 * s - 5 * s, y - 30 * s, 10 * s, 9 * s); }
      if (w.kind === "dog") { const dx = x + w.dir * 16 * s; ctx.fillStyle = "#b98a5a"; rr(dx - 8 * s, y - 10 * s, 16 * s, 7 * s, 3 * s); ctx.fill(); ctx.beginPath(); ctx.arc(dx + w.dir * 8 * s, y - 12 * s, 4 * s, 0, 7); ctx.fill(); ctx.strokeStyle = "#555"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 5 * s, y - 30 * s); ctx.lineTo(dx, y - 10 * s); ctx.stroke(); }
      ctx.globalAlpha = 1;
      if (w.sayT > 0) { ctx.font = "700 " + Math.round(11 * F) + "px " + FONT; const tw = ctx.measureText(w.say).width + 12; ctx.fillStyle = "rgba(255,255,255,0.95)"; rr(x - tw / 2, y - 76 * s, tw, 18, 9); ctx.fill(); txt(w.say, x, y - 67 * s, 11, "#1c211e"); }
    }
  }
  // 물그림자: 수평선 위 풍경을 뒤집어 물에 비추고 물결로 일렁이게 (화면을 그대로 복사해요)
  function drawReflection(h, night) {
    const d = cv.width / W, band = Math.min(H * 0.12, h - 4), step = 3;
    ctx.save(); ctx.globalAlpha = night ? 0.18 : 0.22;
    for (let y = 0; y < band; y += step) {
      const sy = (h - 1 - y) * d, dx = Math.sin(y * 0.35 + now * 2.2) * (1 + y * 0.06);
      try { ctx.drawImage(cv, 0, Math.max(0, sy), cv.width, step * d, dx, h + y, W, step); } catch (e) { break; }
    }
    ctx.restore();
  }
  // 갈매기 떼 (하늘을 천천히)
  const birds = Array.from({ length: 5 }, (_, i) => ({ x: Math.random(), y: 0.08 + Math.random() * 0.14, sp: 0.01 + Math.random() * 0.012, ph: Math.random() * 6 }));
  function drawBirds(h, night) {
    if (night) return;
    ctx.strokeStyle = "rgba(40,48,60,0.75)"; ctx.lineWidth = 1.4; ctx.lineCap = "round";
    for (const b of birds) {
      const x = ((b.x + now * b.sp) % 1.15) * W - W * 0.07, y = b.y * H + Math.sin(now * 0.8 + b.ph) * 4, fl = Math.sin(now * 6 + b.ph) * 3 * S, w = 6 * S;
      ctx.beginPath(); ctx.moveTo(x - w, y - fl); ctx.quadraticCurveTo(x - w * 0.4, y - 3 * S, x, y); ctx.quadraticCurveTo(x + w * 0.4, y - 3 * S, x + w, y - fl); ctx.stroke();
    }
  }
  // 가끔 지나가는 고깃배 (물살 자국)
  let boatT = 8, boat = null;
  function drawBoatPass(h, night) {
    if (!boat) return;
    const x = boat.x, y = h + boat.y * (H - h), s = S * (0.6 + boat.y), L = 30 * s;
    ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1.5;
    for (let i = 1; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(x - boat.dir * L * 0.4, y + 3 * s); ctx.lineTo(x - boat.dir * (L * 0.4 + i * 14 * s), y + 3 * s + i * 2.5 * s); ctx.stroke(); }
    ctx.fillStyle = boat.c; ctx.beginPath(); ctx.moveTo(x - L / 2, y); ctx.lineTo(x + L / 2, y); ctx.lineTo(x + L / 2 - boat.dir * 4 * s, y + 6 * s); ctx.lineTo(x - L / 2 + boat.dir * 2 * s, y + 6 * s); ctx.fill();
    ctx.fillStyle = "#f4f6f7"; ctx.fillRect(x - boat.dir * 4 * s - 5 * s, y - 9 * s, 10 * s, 9 * s);
    ctx.fillStyle = "#2b4f7a"; ctx.fillRect(x - boat.dir * 4 * s - 4 * s, y - 7 * s, 8 * s, 3 * s);
    ctx.strokeStyle = "#444"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + boat.dir * 8 * s, y); ctx.lineTo(x + boat.dir * 8 * s, y - 16 * s); ctx.stroke();
    if (night) { ctx.fillStyle = "#ffe8a0"; ctx.beginPath(); ctx.arc(x + boat.dir * 8 * s, y - 16 * s, 2, 0, 7); ctx.fill(); }
  }
  function boatTick(dt) {
    if (boat) { boat.x += boat.dir * boat.sp * dt; if (boat.x < -60 || boat.x > W + 60) boat = null; return; }
    boatT -= dt;
    if (boatT <= 0 && storm() < 2) { boatT = rnd(25, 50); const dir = Math.random() < 0.5 ? 1 : -1; boat = { dir, x: dir > 0 ? -50 : W + 50, y: rnd(0.04, 0.18), sp: rnd(14, 24) * S, c: ["#e9edf0", "#3a78c2", "#d9412f", "#2f8f5f"][Math.floor(Math.random() * 4)] }; }
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
      ctx.fillStyle = (SCENES[spot().id] || {}).sand || "#e6d3a3";
      ctx.beginPath(); ctx.moveTo(0, top); ctx.quadraticCurveTo(W * 0.5, top - H * 0.04 + Math.sin(now) * 2, W, top + H * 0.01); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 2 + COND.wave;
      ctx.beginPath(); ctx.moveTo(0, top - 2 + Math.sin(now * 1.3) * 2); ctx.quadraticCurveTo(W * 0.5, top - H * 0.04 - 3 + Math.sin(now) * 3, W, top + H * 0.01 - 2); ctx.stroke();
      // 삼발이 (원투대 받침)
      const hd = holder(), f = feet();
      ctx.strokeStyle = "#5b5f66"; ctx.lineWidth = 2.5 * S;
      ctx.beginPath(); ctx.moveTo(hd.x, hd.y); ctx.lineTo(hd.x - 9 * S, f.y + 2); ctx.moveTo(hd.x, hd.y); ctx.lineTo(hd.x + 9 * S, f.y + 2); ctx.moveTo(hd.x, hd.y); ctx.lineTo(hd.x + 2 * S, f.y + 5); ctx.stroke();
      ctx.fillStyle = "#c2452d"; ctx.fillRect(hd.x - 4 * S, hd.y - 3 * S, 8 * S, 4 * S);
      // 밀려왔다 빠지는 파도 거품 · 조개 · 발자국 · 의자 · 아이스박스
      const wash = Math.sin(now * 0.9) * 0.5 + 0.5, wy = top + 4 + wash * H * 0.03;
      ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.beginPath(); ctx.moveTo(W * 0.32, wy); for (let x = W * 0.32; x <= W; x += 8) ctx.lineTo(x, wy + Math.sin(x * 0.07 + now * 2) * 2); ctx.lineTo(W, wy + 5); ctx.lineTo(W * 0.32, wy + 5); ctx.fill();
      ctx.fillStyle = "rgba(160,140,110,0.35)"; ctx.beginPath(); ctx.ellipse(W * 0.6, H * 0.93, W * 0.28, H * 0.02, 0, 0, 7); ctx.fill(); // 젖은 모래
      for (let i = 0; i < 6; i++) { ctx.fillStyle = ["#f4e3d0", "#e8c7a8", "#fff"][i % 3]; ctx.beginPath(); ctx.ellipse(W * (0.36 + i * 0.1), H * (0.9 + (i % 3) * 0.025), 2.5 * S, 1.6 * S, i, 0, 7); ctx.fill(); }
      ctx.fillStyle = "rgba(120,100,70,0.25)"; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.ellipse(W * (0.02 + i * 0.035), H * (0.96 - i * 0.012) + (i % 2) * 4, 2.5 * S, 1.3 * S, 0.3, 0, 7); ctx.fill(); }
      chairBox(f.x - 30 * S, f.y);
      return;
    }
    if (m === "float") {
      ctx.fillStyle = (SCENES[spot().id] || {}).rock || "#5b5148";
      ctx.beginPath(); ctx.moveTo(0, H * 0.8); ctx.lineTo(W * 0.1, H * 0.79); ctx.lineTo(W * 0.24, H * 0.81); ctx.lineTo(W * 0.31, H * 0.88); ctx.lineTo(W * 0.29, H); ctx.lineTo(0, H); ctx.fill();
      ctx.fillStyle = "#6e6358"; ctx.beginPath(); ctx.moveTo(W * 0.24, H * 0.83); ctx.lineTo(W * 0.35, H * 0.9); ctx.lineTo(W * 0.4, H); ctx.lineTo(W * 0.26, H); ctx.fill();
      // 젖은 자국 (만조 때 높이) · 따개비
      ctx.fillStyle = "rgba(30,25,20,0.35)"; ctx.fillRect(W * 0.24, H * (0.9 - 0.05 * k), W * 0.16, H * 0.1);
      // 바위 결 · 따개비 · 해초 · 물웅덩이
      ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth = 1.2;
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(W * (0.02 + i * 0.045), H * 0.82); ctx.lineTo(W * (0.04 + i * 0.045), H * (0.88 + (i % 3) * 0.03)); ctx.stroke(); }
      ctx.fillStyle = "rgba(235,230,220,0.75)"; for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.arc(W * (0.24 + (i % 5) * 0.025), H * (0.86 + Math.floor(i / 5) * 0.02), 1.6 * S, 0, 7); ctx.fill(); }
      ctx.strokeStyle = "#3f6b3a"; ctx.lineWidth = 2 * S; for (let i = 0; i < 4; i++) { const x = W * (0.29 + i * 0.025), y = H * 0.93; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.sin(now * 2 + i) * 5 * S, y - 8 * S, x + Math.sin(now * 1.5 + i) * 3 * S, y - 14 * S); ctx.stroke(); }
      ctx.fillStyle = "rgba(120,170,200,0.45)"; ctx.beginPath(); ctx.ellipse(W * 0.1, H * 0.86, W * 0.04, H * 0.008, 0, 0, 7); ctx.fill();
      chairBox(W * 0.03, H * 0.8);
    } else {
      ctx.fillStyle = "#9aa0a6";
      ctx.beginPath(); ctx.moveTo(0, H * 0.8); ctx.lineTo(W * 0.26, H * 0.8); ctx.lineTo(W * 0.3, H); ctx.lineTo(0, H); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fillRect(0, H * 0.8, W * 0.26, 3);
      const r = Math.min(W, H) * 0.05;
      [[0.27, 0.86], [0.31, 0.92], [0.25, 0.97], [0.34, 0.99]].forEach(([x, y]) => tetra(W * x, H * y, r));
      // 난간 · 가로등 · 노란 안전선 · 아이스박스
      ctx.fillStyle = "#e2b63a"; ctx.fillRect(0, H * 0.8 + 6, W * 0.25, 2);
      ctx.strokeStyle = "#7d858c"; ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) { const x = W * (0.01 + i * 0.05); ctx.beginPath(); ctx.moveTo(x, H * 0.8); ctx.lineTo(x, H * 0.8 - 14 * S); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(0, H * 0.8 - 14 * S); ctx.lineTo(W * 0.21, H * 0.8 - 14 * S); ctx.stroke();
      const lx = W * 0.05; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(lx, H * 0.8); ctx.lineTo(lx, H * 0.8 - 46 * S); ctx.lineTo(lx + 8 * S, H * 0.8 - 46 * S); ctx.stroke();
      if (COND.night || kstHour() >= 18) { const g = ctx.createRadialGradient(lx + 8 * S, H * 0.8 - 44 * S, 0, lx + 8 * S, H * 0.8 - 44 * S, 30 * S); g.addColorStop(0, "rgba(255,230,160,0.9)"); g.addColorStop(1, "rgba(255,230,160,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx + 8 * S, H * 0.8 - 44 * S, 30 * S, 0, 7); ctx.fill(); }
      chairBox(W * 0.17, H * 0.8);
    }
    // 물높이: 만조일수록 물이 높이 차올라요
    const wl = H * (0.97 - 0.09 * k);
    ctx.fillStyle = "rgba(40,90,120,0.55)"; ctx.fillRect(W * 0.22, wl, W * 0.2, H - wl);
    ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = W * 0.22; x <= W * 0.42; x += 6) ctx.lineTo(x, wl + Math.sin(x * 0.2 + now * 3) * 1.5);
    ctx.stroke();
  }
  // 아이스박스 · 랜턴(밤엔 불빛)
  function chairBox(x, y) {
    const s = S;
    ctx.fillStyle = "#2f7fc1"; rr(x, y - 12 * s, 18 * s, 12 * s, 2 * s); ctx.fill();
    ctx.fillStyle = "#f4f6f7"; ctx.fillRect(x, y - 13 * s, 18 * s, 3 * s);
    if (COND.night || kstHour() >= 18 || kstHour() < 6) {
      const lx = x + 22 * s, ly = y - 8 * s, g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 34 * s);
      g.addColorStop(0, "rgba(255,220,140,0.75)"); g.addColorStop(1, "rgba(255,220,140,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly, 34 * s, 0, 7); ctx.fill();
      ctx.fillStyle = "#ffe8a0"; rr(lx - 3 * s, ly - 5 * s, 6 * s, 9 * s, 2 * s); ctx.fill();
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

  // ---------- 사람 · 낚싯대 · 릴 ----------
  function drawAngler() {
    const f = feet(), s = S, m = mode(), restRod = m === "surf" && (G.s === "wait" || G.s === "bite" || (G.s === "set" && setT > 0.45));
    const h = restRod ? { x: f.x + 12 * s, y: f.y - 30 * s } : hand();
    ctx.strokeStyle = "#1d2430"; ctx.lineCap = "round"; ctx.lineWidth = 5 * s;
    ctx.beginPath(); ctx.moveTo(f.x - 6 * s, f.y); ctx.lineTo(f.x - 1 * s, f.y - 28 * s); ctx.moveTo(f.x + 7 * s, f.y); ctx.lineTo(f.x + 2 * s, f.y - 28 * s); ctx.stroke();
    ctx.fillStyle = "#e8742c"; rr(f.x - 10 * s, f.y - 56 * s, 20 * s, 30 * s, 5 * s); ctx.fill(); // 구명조끼
    ctx.fillStyle = "#F2B705"; ctx.fillRect(f.x - 10 * s, f.y - 44 * s, 20 * s, 3 * s);
    const av = meAvatar();
    if (av) drawHead(f.x + 1 * s, f.y - 64 * s, 9 * s, av, (me() || {}).name || "");
    else {
      ctx.fillStyle = "#e9c3a0"; ctx.beginPath(); ctx.arc(f.x + 1 * s, f.y - 64 * s, 8 * s, 0, 7); ctx.fill();
      ctx.fillStyle = "#1F6B3A"; ctx.beginPath(); ctx.arc(f.x + 1 * s, f.y - 66 * s, 8.5 * s, Math.PI, 0); ctx.fill(); ctx.fillRect(f.x + 1 * s, f.y - 67 * s, 13 * s, 3 * s);
    }
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
  // 얼굴: 프로필 사진을 동그랗게 (없으면 이름 첫 글자)
  function drawHead(x, y, r, img, name) {
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.closePath();
    if (img) { ctx.clip(); try { ctx.drawImage(img, x - r, y - r, r * 2, r * 2); } catch (e) {} }
    else { ctx.fillStyle = "#1F6B3A"; ctx.fill(); txt((name || "?").slice(0, 1), x, y + 0.5, r * 1.1 / F, "#fff", "center", "800"); }
    ctx.restore();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
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
    if (s === "windup" && m !== "surf") {
      const hang = { x: tp.x + Math.sin(now * 3) * 2, y: tp.y + 16 * S };
      ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tp.x, tp.y); ctx.lineTo(hang.x, hang.y); ctx.stroke();
      ctx.fillStyle = m === "lure" ? "#dfe6ec" : "#ff5a2a"; ctx.beginPath(); ctx.arc(hang.x, hang.y, 3 * S, 0, 7); ctx.fill();
      return;
    }
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
    const tight = s === "fight" ? clamp(T / 100, 0, 1) : 0, vib = s === "fight" && dragNow > 0.5 ? Math.sin(now * 60) * 1.5 : 0;
    ctx.strokeStyle = s === "fight" && dragNow > 0.5 ? "rgba(255,190,170,0.95)" : "rgba(255,255,255," + (0.8 + 0.2 * tight) + ")"; ctx.lineWidth = 1.1 + tight * 0.6;
    ctx.beginPath(); ctx.moveTo(tp.x, tp.y); ctx.quadraticCurveTo((tp.x + b.x) / 2 + vib, (tp.y + b.y) / 2 + sag * (1 - tight * 0.8) + vib, b.x, b.y + bo); ctx.stroke();
    if (s === "fight" && dragNow > 0.5) { // 스풀에서 줄이 풀려 나가는 모습
      const r = rodPts()[0];
      ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) { const a = now * 25 + i * 2.1; ctx.beginPath(); ctx.arc(r[0] + 6 * S, r[1] + 6 * S, (8 + i * 3) * S, a, a + 0.8); ctx.stroke(); }
      stxt("+" + lineOut.toFixed(1) + "m", r[0] + 22 * S, r[1] + 16 * S, 11, "#ffd0c0", "left", "800");
    }
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
  // 걸린 고기: 실제 크기대로 (사람 키 ≈ 170cm 기준), 멀면 작고 가까우면 커져요. 가까이 오면 물 위로 떠올라요
  const pxPerCm = () => 0.42 * S;
  function drawHooked(b) {
    const s = G.s;
    if (s === "fight") {
      const near = clamp(P, 0, 100) / 100, persp = lerp(0.45, 1, near);
      const len = Math.max(10 * S, (fish.junk ? 26 : fish.size) * pxPerCm() * persp * 1.15);
      const up = near > 0.62; // 수면 가까이
      const dir = fish.run ? (Math.sin(now * 3) > 0 ? 1 : -1) : -1, wob = Math.sin(now * (fish.run ? 18 : 7)) * 0.18;
      ctx.save(); ctx.translate(b.x + len * 0.15, b.y + (up ? 2 : 8)); ctx.rotate(wob); ctx.scale(dir, 1);
      if (up) { ctx.globalAlpha = 0.95; drawFish(0, 0, len, fish); ctx.globalAlpha = 1; ctx.fillStyle = "rgba(40,90,120,0.45)"; ctx.fillRect(-len, len * 0.04, len * 2, len * 0.3); }
      else { ctx.fillStyle = "rgba(5,20,35," + (0.35 + 0.3 * near) + ")"; ctx.beginPath(); ctx.ellipse(0, 0, len * 0.5, len * 0.15, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(len * 0.42, 0); ctx.lineTo(len * 0.62, -len * 0.14); ctx.lineTo(len * 0.62, len * 0.14); ctx.fill(); }
      ctx.restore();
      if (fish.run || up) { ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 2; const n = Math.min(8, 3 + Math.round(fish.kg)); for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.4, r1 = 6 + len * 0.2, r2 = r1 + 8 + fish.kg * 2; ctx.beginPath(); ctx.moveTo(b.x + Math.cos(a) * r1, b.y + Math.sin(a) * r1 * 0.6); ctx.lineTo(b.x + Math.cos(a) * r2, b.y + Math.sin(a) * r2 * 0.6); ctx.stroke(); } }
      // 남은 거리 · 드랙
      stxt(distM() + "m" + (dragNow > 0.5 ? " ◀ " + t("드랙 풀림") : ""), b.x, b.y - 16 * S - len * 0.1, 12, dragNow > 0.5 ? "#ffb4a0" : "#fff", "center", "800");
      return;
    }
    // 물 위로 떠오른 고기
    const len = Math.max(14 * S, (fish.junk ? 26 : fish.size) * pxPerCm() * 1.15);
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
    if (f.id === "bottle") { ctx.save(); ctx.translate(x, y); ctx.rotate(-0.5); ctx.fillStyle = "rgba(111,191,154,0.85)"; rr(-len * 0.32, -len * 0.12, len * 0.5, len * 0.24, len * 0.08); ctx.fill(); ctx.fillRect(len * 0.16, -len * 0.05, len * 0.14, len * 0.1); ctx.fillStyle = "#a8742c"; ctx.fillRect(len * 0.28, -len * 0.05, len * 0.06, len * 0.1); ctx.fillStyle = "#f3e6c4"; ctx.fillRect(-len * 0.2, -len * 0.06, len * 0.28, len * 0.12); ctx.restore(); return; }
    if (f.id === "chest") { ctx.fillStyle = "#8a5a22"; rr(x - len * 0.32, y - len * 0.1, len * 0.64, len * 0.32, 4); ctx.fill(); ctx.fillStyle = "#a8742c"; ctx.beginPath(); ctx.ellipse(x, y - len * 0.1, len * 0.32, len * 0.14, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = "#ffcf3a"; ctx.fillRect(x - len * 0.32, y - len * 0.02, len * 0.64, len * 0.04); ctx.fillRect(x - len * 0.04, y - len * 0.08, len * 0.08, len * 0.12); for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(x - len * 0.2 + i * len * 0.1, y - len * 0.16 - (i % 2) * 4, 3, 0, 7); ctx.fill(); } return; }
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
  // 화면 아래 작게: 지금 채비
  function tackleLine() {
    const m = mode(), parts2 = [t(MODES[m].n)];
    for (const g of TK[m]) { if (g.key === "depth" && tk("rig") === "full") continue; const it = g.items.find((i) => i.id === tk(g.key)); if (it) parts2.push(t(it.n).replace(/ \(.*\)/, "")); }
    return "🎣 " + parts2.join(" · ");
  }
  function drawStormBanner() {
    const lv = storm(); if (!lv) return;
    const y = H - 58, blink = lv === 2 ? 0.55 + 0.45 * Math.sin(now * 8) : 0.85;
    ctx.globalAlpha = blink; ctx.fillStyle = lv === 2 ? "#c2452d" : "#d98a1e"; rr(8, y + 14, W - 16, 22, 11); ctx.fill(); ctx.globalAlpha = 1;
    fitTxt(lv === 2 ? t("⚠️ 풍랑 위험 · 바람 {w}m/s · 파도 {h}m — 실제라면 낚시를 멈추세요", { w: Math.round(COND.wind), h: COND.wave.toFixed(1) }) : t("⚠️ 풍랑 주의 · 바람 {w}m/s · 파도 {h}m — 갯바위·방파제 끝 조심", { w: Math.round(COND.wind), h: COND.wave.toFixed(1) }), W / 2, y + 25, 11, W - 30, "#fff", "800");
  }
  function hint(a, col) { fitTxt(a, W / 2, H * 0.165, 18, W - 24, col || "#fff", "700", true); }
  function drawHud() {
    const m = mode(), s = G.s;
    if (s !== "fight") fitTxt(condLine(), W / 2, 13, 11, W - 12, "#fff", "600", true);
    if (s === "ready" && (save.net || []).length) stxt("🧺 " + save.net.length, 22, H - 26, 13, "#fff", "left", "800");
    if (s !== "fight" && s !== "result") { drawStormBanner(); fitTxt(tackleLine(), W / 2, H - 10, 10, W - 16, "rgba(255,255,255,0.9)", "600", true); }
    if (s === "ready") {
      hint(t("{ico} {name} — 아래 버튼을 누르세요", { ico: MODES[m].ico, name: t(MODES[m].n) }));
      if (target) drawTarget();
    }
    else if (s === "windup") {
      drawTarget();
      const gx = W - 34, gy = H * 0.22, gh = H * 0.48, [a, b] = castRange();
      // 떨어질 자리 미리 보기 (방향 포함)
      const pd = a + power * (b - a), pt = tgt(pd, aimLat);
      ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.setLineDash([3, 4]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(pt.x, pt.y, 10 * S, 3.5 * S, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      const ft = feet();
      ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ft.x + 30 * S, ft.y - 40 * S); ctx.lineTo(pt.x, pt.y); ctx.stroke();
      if (Math.abs(aimLat) > 0.01) stxt(aimLat > 0 ? "→" : "←", pt.x + (aimLat > 0 ? 18 : -18) * S, pt.y - 10 * S, 16, "#fff");
      ctx.fillStyle = "rgba(0,0,0,0.4)"; rr(gx, gy, 22, gh, 11); ctx.fill();
      const zc = (target.d - a) / (b - a), zw = easy() ? 0.16 : 0.08;
      ctx.fillStyle = "rgba(98,190,132,0.55)"; ctx.fillRect(gx + 2, gy + 3 + (gh - 6) * (1 - clamp(zc + zw, 0, 1)), 18, (gh - 6) * (Math.min(1, zc + zw) - Math.max(0, zc - zw)));
      ctx.fillStyle = "#F2B705"; rr(gx + 4, gy + 3 + (gh - 6) * (1 - power), 14, (gh - 6) * power, 7); ctx.fill();
      stxt(t("힘"), gx + 11, gy - 12, 12, "#fff", "center", "600");
      hint(t("누른 채 좌우로 밀면 방향 · 초록 칸에서 손을 떼요"));
      const crossTxt = Math.abs(crossWind()) > 3 ? (crossWind() > 0 ? t("옆바람 → 줄이 오른쪽으로 밀려요") : t("옆바람 ← 줄이 왼쪽으로 밀려요")) : "";
      if (crossTxt) stxt(crossTxt, W / 2, H * 0.1 + 24 * F, 12, "#ffe0b0", "center", "600");
    }
    else if (s === "wait" || s === "settle") {
      if (chumHold) {
        const q = chumPoint(), h0 = hand();
        ctx.strokeStyle = "rgba(232,138,58,0.95)"; ctx.setLineDash([3, 4]); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(q.x, q.y, 14 * S, 4.5 * S, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(h0.x, h0.y); ctx.quadraticCurveTo((h0.x + q.x) / 2, Math.min(h0.y, q.y) - H * 0.1, q.x, q.y); ctx.stroke();
        const gx = W - 30, gy = H * 0.3, gh = H * 0.36;
        ctx.fillStyle = "rgba(0,0,0,0.4)"; rr(gx, gy, 16, gh, 8); ctx.fill(); ctx.fillStyle = "#e88a3a"; rr(gx + 3, gy + 3 + (gh - 6) * (1 - chumHold.p), 10, (gh - 6) * chumHold.p, 5); ctx.fill();
        hint(t("밑밥: 누른 채 좌우로 방향 · 떼면 뿌려요 (찌보다 조류 위쪽에)"));
      }
      else if (m === "surf") hint(t("방울 소리를 기다려요… 🔔"));
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
      const w = Math.min(W - 20, ctx.measureText(G.msg).width + 36), my = H * (s === "fight" ? 0.8 : s === "net" ? 0.62 : 0.5);
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
      const title = f.id === "bottle" ? t("📜 병편지를 건졌어요!") : f.id === "chest" ? t("💰 보물상자다!!") : f.junk ? t("😅 …장화네요") : f.boss ? f.title : res.isNew ? t("🎉 처음 낚았어요!") : t("🎉 낚았다!");
      fitTxt(title, cx, y + 30, 21, w - 30, f.boss ? "#ffcf3a" : res.isNew ? "#ffe14a" : "#fff");
      // 물고기: 등급이 높을수록 크게 튀어나와요
      const pop = res.t < 0.25 ? res.t / 0.25 : 1, bob = Math.sin(now * 3) * 3;
      ctx.save(); ctx.translate(cx, y + h * 0.32 + bob); ctx.scale(pop, pop); drawFish(0, 0, Math.min(180, w * 0.52), f); ctx.restore();
      if (!f.junk) {
        // cm 숫자가 촤라락 올라가요
        const k = clamp(res.t / 0.85, 0, 1), cm = Math.round(f.size * (1 - Math.pow(1 - k, 3)));
        if (cm > res.rolled) { const step = Math.max(1, Math.round(f.size / 30)); if (cm - res.rolled >= step || k >= 1) { K.click(900 + cm * 18, 0.25); res.rolled = cm; } }
        fitTxt(t(f.n) + "  " + cm + "cm" + (k >= 1 ? " · " + kgTxt(f.kg) : ""), cx, y + h * 0.53, 26, w - 30, "#fff", "800");
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
      } else fitTxt(res.note ? "“" + res.note + "”" : t("바다 청소 완료"), cx, y + h * 0.53, res.note ? 15 : 22, w - 30, "#fff", "700");
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
    drawFriend();
    drawPeers();
    if (!["ready", "result"].includes(G.s) || true) drawTackle();
    drawAngler();
    drawUnder();
    if (G.s === "result") drawResult(); else { drawHud(); if (G.s !== "fight") drawTopBadges(); }
    drawTour();
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
    if (s === "ready") label = t("{ico} 꾹 눌러 힘 모으기", { ico: MODES[m].ico });
    else if (s === "windup") { label = t("↔ 밀어서 방향 · 떼면 던져요"); cls = "hot"; }
    else if (s === "cast" || s === "fly") label = m === "surf" ? t("쉬이이익~") : m === "lure" ? t("휙!") : "…";
    else if (s === "settle" || s === "wait") label = m === "float" ? t("🥄 밑밥 뿌리기") : m === "surf" ? t("🔔 방울을 기다려요") : "…";
    else if (s === "set") label = t("삼발이에 거치하는 중");
    else if (s === "retr") label = t("👆 톡! 움직이기");
    else if (s === "bite") { label = pend && (pend.kg >= 1.2 || pend.st >= 1.4) && !easy() ? t("❗ 꾹! 힘껏 챔질") : t("❗ 챔질!"); cls = "hot"; }
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
  // 도감: 잡은 고기는 사진·설명·잡는 법이 열려요. 다 읽으면 공부 경험치 +50 (고기마다 한 번)
  const wikiCache = {};
  async function wikiPhoto(id) {
    const g = GUIDE[id]; if (!g) return null;
    if (wikiCache[id] !== undefined) return wikiCache[id];
    try { const c = JSON.parse(localStorage.getItem("jepi.wiki." + id) || "null"); if (c) return (wikiCache[id] = c); } catch (e) {}
    wikiCache[id] = null;
    try {
      const r = await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(g.sci.replace(/ /g, "_")));
      if (!r.ok) return null;
      const j = await r.json();
      const v = { img: j.thumbnail && j.thumbnail.source, page: j.content_urls && j.content_urls.desktop && j.content_urls.desktop.page };
      wikiCache[id] = v; try { localStorage.setItem("jepi.wiki." + id, JSON.stringify(v)); } catch (e) {}
      return v;
    } catch (e) { return null; }
  }
  function dexHtml() {
    let h = "", got = 0, all = 0;
    const here = SPOT_FISH[spot().id] || [];
    h += '<p class="tk-like" style="margin:0 0 4px">' + esc(t("이 낚시터({spot})에 나오는 고기: {list}", { spot: t(spot().n), list: here.map((id) => t((SP.find((x) => x.id === id) || {}).n || "")).join(", ") })) + "</p>";
    for (const sp0 of SP) {
      if (sp0.junk) continue;
      all++;
      const d = save.dex[sp0.id], g = GUIDE[sp0.id] || {};
      if (d) got++;
      const studied = save.studied && save.studied[sp0.id];
      h += '<details class="gfish-d" data-gfish="' + sp0.id + '"><summary>' + (d ? "🐟 " : "❔ ") + esc(t(sp0.n)) + (here.includes(sp0.id) ? " 📍" : "") + (d ? ' <span class="muted" style="font-size:12px">' + esc(t("최대 {n}cm · {c}마리", { n: d.max, c: d.n })) + "</span>" : "") + (studied ? " 🎓" : "") + "</summary>";
      h += '<div class="gfish"><div class="ph" data-gph="' + sp0.id + '">' + (d ? "📷" : "🔒") + "</div><div>";
      if (d) {
        h += "<p>" + esc(t(g.d || sp0.tip)) + "</p><p><b>" + esc(t("잡는 법")) + ":</b> " + esc(t(g.how || "")) + "</p>";
        h += '<small data-gcredit="' + sp0.id + '"></small>';
        if (!studied) h += '<div style="margin-top:6px"><button type="button" class="btn" data-gstudy="' + sp0.id + '">' + esc(t("📖 다 읽었어요 (+50 경험치)")) + "</button></div>";
      } else {
        h += "<p>" + esc(t("아직 못 낚았어요. 잡으면 사진·설명·잡는 법이 열려요")) + "</p><p><b>" + esc(t("힌트")) + ":</b> " + esc(t(g.how || "").split(".")[0]) + "</p>";
      }
      h += "</div></div></details>";
    }
    return { h, got, all };
  }
  function netHtml() {
    const net = save.net || [];
    let h = '<details class="panel gcard"><summary>' + esc(t("🧺 어망 · {n}마리", { n: net.length })) + (net.length ? ' <span class="muted" style="font-size:13px">' + esc(t("총 {kg}", { kg: kgTxt(net.reduce((a, f) => a + (f.kg || 0), 0)) })) + "</span>" : "") + "</summary>";
    if (!net.length) h += '<p class="muted">' + esc(t("잡은 고기가 여기 담겨요")) + "</p>";
    else {
      h += '<div class="gnet">' + net.slice(0, 30).map((f) => { const gr = f.g >= 0 ? GRADE[f.g] : null, sp0 = SPOT_LIST.find((x) => x.id === f.sp); return "<div" + (gr ? ' style="border-color:' + gr.c + '"' : "") + "><b>" + (f.boss ? "👑 " : "") + esc(t(f.n)) + " " + f.size + "cm</b>" + esc(kgTxt(f.kg || 0)) + (gr ? " · " + esc(t(gr.n)) : "") + "<br><span class='muted'>" + esc(sp0 ? t(sp0.n) : "") + "</span></div>"; }).join("") + "</div>";
      h += '<div style="margin-top:8px"><button type="button" class="btn" data-grelease>' + esc(t("🐟 모두 방생하기 (+경험치)")) + "</button></div>";
    }
    return h + "</details>";
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
    if (storm()) h += '<div class="gwarn">' + esc(storm() === 2 ? t("⚠️ 풍랑 위험: 바람 {w}m/s · 파도 {h}m. 실제 바다라면 갯바위·테트라포드·방파제 끝에는 가지 마세요. 파도가 덮칠 수 있어요", { w: Math.round(COND.wind), h: COND.wave.toFixed(1) }) : t("⚠️ 풍랑 주의: 바람 {w}m/s · 파도 {h}m. 물가에서 떨어져 구명조끼를 꼭 입어요", { w: Math.round(COND.wind), h: COND.wave.toFixed(1) })) + "</div>";
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
    h += '<article class="panel gcard"><h3>' + esc(t("👥 함께 낚시")) + ' <button type="button" class="btn" data-gtog style="float:right;min-height:36px">' + esc(together() ? t("끄기") : t("켜기")) + '</button></h3><div id="gPeople">' + peopleHtml() + "</div></article>";
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
    h += '<p class="tk-like" id="gCloud" style="margin:0">' + esc(cloudText()) + "</p>";
    h += '<article class="panel gcard"><h3>' + esc(t("오늘 조과")) + "</h3>";
    if (!sess.length) h += '<p class="muted">' + esc(t("아직 없어요. 한 마리 낚아 볼까요?")) + "</p>";
    else {
      const sum = {};
      for (const c of sess) { const k = c.junk ? t("장화") : t(c.n); const o = sum[k] || (sum[k] = { n: 0, max: 0 }); o.n++; o.max = Math.max(o.max, c.size); }
      h += '<p class="gtoday">' + Object.keys(sum).map((k) => esc(k) + " ×" + sum[k].n + (sum[k].max ? " (" + sum[k].max + "cm)" : "")).join(" · ") + "</p>";
      h += '<button type="button" class="btn" data-gshare>' + esc(t("조과 자랑 문구 복사")) + '</button> <span class="muted" id="gShareMsg" aria-live="polite"></span>';
    }
    h += "</article>";
    // 5분 낚시 대회
    h += '<article class="panel gcard"><h3>' + esc(t("🏆 5분 낚시 대회")) + '</h3><p class="tk-like" style="margin:0 0 8px">' + esc(t("동네 꾼 3명과 5분 동안 잡은 무게로 겨뤄요. 1등 500🪙 · 2등 200🪙 · 3등 100🪙")) + (save.tourBest ? " · " + esc(t("내 최고 {kg} · 우승 {n}번", { kg: kgTxt(save.tourBest), n: save.tourWins || 0 })) : "") + "</p>" +
      (tour ? '<p class="gtoday">' + esc(t("대회 중! 남은 시간 {m}분 {s}초", { m: Math.floor(tour.t / 60), s: Math.floor(tour.t % 60) })) + "</p>" : '<button type="button" class="btn primary" data-gtour>' + esc(t("대회 시작")) + "</button>") + "</article>";
    // 인증샷
    if ((save.net || []).length) h += '<article class="panel gcard"><h3>' + esc(t("📸 인증샷")) + '</h3><p class="tk-like" style="margin:0 0 8px">' + esc(t("마지막에 잡은 고기를 사진 카드로 만들어요")) + '</p><button type="button" class="btn" data-gshot>' + esc(t("인증샷 만들기")) + '</button><div id="gShot" style="margin-top:8px"></div></article>';
    h += netHtml();
    const fr = save.friends || {};
    h += '<details class="panel gcard"><summary>' + esc(t("🐬 바다 친구 도감 {n}/{all}", { n: Object.keys(fr).length, all: Object.keys(FRIENDS).length })) + '</summary><p class="tk-like">' + esc(t("기다리는 동안 가끔 바다 친구가 나타나요. 눌러서 사진을 찍어요")) + '</p><div class="gnet">' + Object.keys(FRIENDS).map((k) => "<div><b>" + (fr[k] ? FRIENDS[k].ico + " " + esc(t(FRIENDS[k].n)) : "❔ ???") + "</b>" + (fr[k] ? esc(t("{n}번 만남", { n: fr[k] })) : esc(t("아직 못 만났어요"))) + "</div>").join("") + "</div></details>";
    h += '<details class="panel gcard" id="gDex"><summary>' + esc(t("물고기 도감 {got}/{all}", { got: dx.got, all: dx.all })) + "</summary>" + dx.h + "</details>";
    h += '<details class="panel gcard"><summary>' + esc(t("낚시점 (포인트로 사기)")) + '</summary><div class="gshop">';
    for (const it of SHOP) {
      const own = !!save.gear[it.id];
      h += "<div><b>" + esc(t(it.n)) + "</b><span>" + esc(t(it.d)) + '</span><button type="button" class="btn" data-gbuy="' + it.id + '"' + (own || save.coins < it.cost ? " disabled" : "") + ">" + (own ? esc(t("가지고 있어요")) : "🪙 " + it.cost) + "</button></div>";
    }
    h += "</div></details>";
    P2.innerHTML = h;
  }
  function busy() { return !["ready", "result"].includes(G.s); }
  // 걸린 고기를 다루는 중(파이팅·뜰채·들어뽑기)에는 판을 바꾸지 않아요 — 바꾸면 고기가 기록 없이 사라져요 (QA 11-24)
  function landingNow() { return ["fight", "net", "scoop", "lift"].includes(G.s); }
  function onPanel(e) {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.gmode) { if (landingNow()) return; save.mode = b.dataset.gmode; store(); target = null; refreshCond(); toReady(); renderPanel(); if (together()) rtConnect(); }
    else if (b.dataset.gdiff) { if (landingNow()) return; save.diff = +b.dataset.gdiff; store(); target = null; toReady(); renderPanel(); }
    else if (b.dataset.gspot) { if (landingNow()) return; (save.spots = save.spots || {})[mode()] = b.dataset.gspot; store(); target = null; refreshCond(); toReady(); renderPanel(); if (together()) rtConnect(); }
    else if (b.hasAttribute("data-ggps")) {
      const msg = root.querySelector("#gGpsMsg"); if (msg) msg.textContent = t("찾는 중…");
      const done = () => { save.spots = {}; store(); target = null; refreshCond(); if (!landingNow()) toReady(); renderPanel(); };
      const fail = () => { const m2 = root.querySelector("#gGpsMsg"); if (m2) m2.textContent = t("위치를 찾지 못했어요. 지금 기준으로 보여 줘요"); };
      if (window.ZLOC && ZLOC.gps) ZLOC.gps().then((l) => { ZLOC.set(l, true); done(); }, fail);
      else if (navigator.geolocation) navigator.geolocation.getCurrentPosition((p) => { gpsLoc = { lat: p.coords.latitude, lng: p.coords.longitude, src: "gps", label: "" }; done(); }, fail, { timeout: 10000, maximumAge: 600000 });
      else fail();
    }

    else if (b.dataset.gtk) {
      if (landingNow()) return;
      const [k, v] = b.dataset.gtk.split(":");
      (save.tk[mode()] = save.tk[mode()] || {})[k] = v; store(); if (k === "sinker") target = null; if (busy()) toReady(); else if (mode() === "surf" && !target) newTarget(); renderPanel();
    }
    else if (b.hasAttribute("data-gtour")) { if (!tour) { startTour(); renderPanel(); const c2 = root.querySelector(".gwrap"); c2 && c2.scrollIntoView({ behavior: "smooth", block: "start" }); } }
    else if (b.hasAttribute("data-gshot")) {
      const f = (save.net || [])[0]; if (!f) return;
      let url = ""; try { url = makeShot(f); } catch (e) {}
      const box = root.querySelector("#gShot"); if (!box || !url) return;
      box.innerHTML = '<img src="' + url + '" alt="" style="width:100%;max-width:360px;border-radius:14px;display:block"><p class="tk-like">' + esc(window.ZNATIVE ? t("공유하기를 누르면 갤러리 저장이나 카톡 보내기를 할 수 있어요") : t("사진을 길게 눌러 저장하세요")) + '</p><button type="button" class="btn" data-gshare2>' + esc(t("공유하기")) + "</button>";
      box.dataset.url = url;
    }
    else if (b.hasAttribute("data-gshare2")) {
      const box = root.querySelector("#gShot"), url = box && box.dataset.url; if (!url) return;
      if (window.ZNATIVE) { window.ZNATIVE.call("shareImage", { data: url, name: "zepi-fish" }).catch(() => { const p = box.querySelector("p"); if (p) p.textContent = t("앱을 최신 버전으로 업데이트하면 공유할 수 있어요"); }); return; }
      fetch(url).then((r) => r.blob()).then((bl) => { const file = new File([bl], "zepi-fish.png", { type: "image/png" }); if (navigator.canShare && navigator.canShare({ files: [file] })) return navigator.share({ files: [file], title: t("제피 낚시") }); throw new Error("no-share"); }).catch(() => { const p = box.querySelector("p"); if (p) p.textContent = t("이 화면에서는 공유가 안 돼요. 사진을 길게 눌러 저장하세요"); });
    }
    else if (b.hasAttribute("data-gtog")) { save.together = !save.together; store(); if (save.together) rtConnect(); else { rtStatus = "off"; rtClose(); } renderPanel(); }
    else if (b.hasAttribute("data-grelease")) {
      const n = (save.net || []).length; if (!n) return;
      save.xp = (save.xp || 0) + n * 10; save.net = []; store();
      flash(t("🐟 {n}마리를 바다로 돌려보냈어요 +{x} 경험치", { n, x: n * 10 })); K.splash(0.6, true); renderPanel();
    }
    else if (b.dataset.gstudy) {
      const id = b.dataset.gstudy; save.studied = save.studied || {};
      if (!save.studied[id] && save.dex[id]) { save.studied[id] = 1; save.xp = (save.xp || 0) + 50; store(); beep(988, 0.1); setTimeout(() => beep(1319, 0.14), 100); flash(t("🎓 공부 경험치 +50")); renderPanel(); const d = root.querySelector('[data-gfish="' + id + '"]'); if (d) { root.querySelector("#gDex").open = true; d.open = true; loadPhoto(id); } }
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
  // 도감 펼치면 사진을 불러와요 (위키백과)
  async function loadPhoto(id) {
    if (!save.dex[id]) return;
    const box = root.querySelector('[data-gph="' + id + '"]'); if (!box || box.dataset.done) return;
    box.dataset.done = "1";
    const v = await wikiPhoto(id);
    if (v && v.img) {
      box.outerHTML = '<img src="' + esc(v.img) + '" alt="' + esc(t((SP.find((x) => x.id === id) || {}).n || "")) + '" loading="lazy" referrerpolicy="no-referrer">';
      const c = root.querySelector('[data-gcredit="' + id + '"]');
      if (c && v.page) c.innerHTML = esc(t("사진·자료: 위키백과")) + ' <a href="' + esc(v.page) + '" target="_blank" rel="noopener">' + esc(t("더 보기")) + "</a>";
    } else box.textContent = "🐟";
  }
  function refreshCond() {
    const key = spot().id, hit = condCache[key];
    COND = stormy(hit ? hit.v : Object.assign(defaultCond(), { spotKey: key }));
    loadCond();
  }

  // ---------- 시작 ----------
  function build(el, kit) {
    K = kit; root = el;
    if (!document.getElementById("fishCss")) {
      const st = document.createElement("style"); st.id = "fishCss";
      st.textContent = ".gcond{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin:0;font-size:15px}.gcond dt{color:var(--muted)}.gcond dd{margin:0}" +
        ".gadv{margin:8px 0 0;padding-left:18px;font-size:14px}.gadv li{margin:2px 0}" +
        '[data-pgame="fish"] .gbig{touch-action:none}' +
        ".gnet{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px;margin-top:6px}.gnet div{padding:8px 10px;border-radius:12px;background:var(--bg);border:1px solid var(--line);font-size:13px}.gnet b{display:block;font-size:14px}" +
        ".gfish{display:grid;grid-template-columns:96px 1fr;gap:10px;align-items:start;padding:10px 0;border-top:1px solid var(--line)}.gfish img{width:96px;height:72px;object-fit:cover;border-radius:10px;background:var(--bg)}.gfish .ph{width:96px;height:72px;border-radius:10px;background:var(--bg);display:grid;place-items:center;font-size:28px}.gfish p{margin:2px 0;font-size:13px}.gfish small{color:var(--muted);font-size:11px}" +
        ".gwarn{background:#fff1ee;border:2px solid #e2583e;color:#8a1f0d;border-radius:14px;padding:10px 14px;font-weight:700}" +
        ".gpeople{display:flex;flex-wrap:wrap;gap:8px}.gpeople span{display:inline-flex;align-items:center;gap:6px;padding:4px 10px 4px 4px;border-radius:999px;background:var(--bg);border:1px solid var(--line);font-size:13px}.gpeople img,.gpeople i{width:24px;height:24px;border-radius:50%;object-fit:cover;background:var(--leaf-soft);display:inline-grid;place-items:center;font-style:normal}";
      document.head.appendChild(st);
    }
    root.innerHTML = '<div class="gwrap"><canvas aria-label="' + esc(t("낚시 게임 화면")) + '"></canvas></div><button type="button" class="gbig"></button><div id="gPanel" style="display:flex;flex-direction:column;gap:12px"></div>';
    cv = root.querySelector("canvas"); ctx = cv.getContext("2d"); btn = root.querySelector(".gbig");
    FONT = K.font();
    // 도전 모드 밑밥: 물을 직접 눌러 뿌릴 자리를 정해요 (press 보다 먼저 기록)
    cv.addEventListener("pointerdown", (e) => { const r = cv.getBoundingClientRect(); lastTap = { x: e.clientX - r.left, y: e.clientY - r.top, at: performance.now() }; });
    // 방향: 누른 곳에서 좌우로 얼마나 밀었는지
    const down = (e) => { downX = e.clientX; try { e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId); } catch (er) {} };
    cv.addEventListener("pointerdown", down); btn.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", (e) => {
      if (!holding || (G.s !== "windup" && !chumHold)) return;
      aimLat = clamp((e.clientX - downX) / Math.max(120, W * 0.45), -1, 1) * 0.18;
    });
    K.bindPress([cv, btn], press, release);
    root.querySelector("#gPanel").addEventListener("click", onPanel);
    root.querySelector("#gPanel").addEventListener("toggle", (e) => { const d = e.target.closest && e.target.closest("[data-gfish]"); if (d && d.open) loadPhoto(d.dataset.gfish); }, true);
    window.addEventListener("zapp-auth", () => { cloudPulled = false; cloudPull(); });
    window.addEventListener("resize", () => { if (K.visible(root)) resize(); });
    K.onOpt((k) => { if (!K.visible(root)) return; if (k === "easy" && !landingNow()) toReady(); renderPanel(); btnKey = ""; setBtn(); });
  }
  function loop(ts) {
    if (!K.visible(root)) { running = false; holding = false; K.drag(0, 0); return; }
    const dt = Math.min(0.05, Math.max(0, (ts - last) / 1000)); last = ts; now += dt;
    update(dt); draw(); setBtn();
    requestAnimationFrame(loop);
  }
  function start() {
    resize(); refreshCond(); cloudPull(); if (together()) rtConnect();
    if (mode() === "surf" && !target) newTarget();
    renderPanel(); btnKey = ""; setBtn();
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
  }
  function stop() { rtClose(); if (cloudT > 0) { cloudT = 0; cloudPush(); } holding = false; if (["fight", "net", "windup"].includes(G.s)) toReady(); }
  const api = { build, start, stop, state: () => G.s, press, release, _dbg: () => ({ fy, zy, jump: !!jump, P, diff: diff(), grade: res && res.grade, streak, rushT, lv: lvOf(save.xp) }), _diff: (v) => { save.diff = v; store(); toReady(); renderPanel(); }, _spot: (id) => { const sp0 = SPOT_LIST.find((x) => x.id === id); if (!sp0) return; save.mode = { f: "float", l: "lure", s: "surf" }[sp0.m]; (save.spots = save.spots || {})[save.mode] = id; target = null; refreshCond(); toReady(); renderPanel(); }, spots: () => SPOT_LIST.map((x) => x.id), _net: () => G.s === "net" && Math.abs(netFish().x - netPos().x) < W * (easy() ? 0.06 : 0.03), cond: () => COND, _force: (k) => { if (k === "gull") gullT = 0; else if (k === "tour") { startTour(); if (tour) tour.t = 4; } else if (k) { friend = { id: k, x: 0.35, y: 0.14, t: 0, dur: 30 }; } }, _fx: () => ({ friend: friend && Object.assign({}, friend, friendPos()), gull: gull && { x: gull.x, y: gull.y, ph: gull.ph }, tour: !!tour, tourRes: tourRes && tourRes.rank }), _shot: () => { const f = (save.net || [])[0]; return f ? makeShot(f).length : 0; } };
  if (window.ZPLAY) ZPLAY.reg("fish", api);
  window.ZGAME = api;
})();
