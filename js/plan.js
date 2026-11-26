// 제피 웹 · 여행 계획 (뭐가 당겨요 → 추천 시군구 → AI 일정)
// 앱의 lib/recommender.dart, lib/screens/planner_screen.dart, trip_plan_screen.dart 를 옮겨 왔어요.
(function () {
  const Z = window.ZI18N, t = Z.t, tOpt = Z.tOpt;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // AI 답(또는 저장해 둔 일정)을 화면이 기대하는 모양으로 맞춰요. 모양이 달라도 탭이 깨지지 않게.
  const num = (v) => { const n = typeof v === "number" ? v : typeof v === "string" && /^\s*-?\d+(\.\d+)?\s*$/.test(v) ? parseFloat(v) : NaN; return Number.isFinite(n) ? n : undefined; };
  function normPlan(p) {
    const str = (v) => (v == null ? "" : typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
    const items = (list) => (Array.isArray(list) ? list : [])
      // 제목 없는 '비워둠' 칸은 남겨요. 빼면 칸 번호가 밀려서 폰 앱과 체크(d0i2…)가 어긋나요 (QA 11-25)
      .filter((it) => it && typeof it === "object" && (str(it.title) || it.kind === "free"))
      .map((it) => {
        const lat = num(it.lat), lng = num(it.lng);
        const ok = lat != null && lng != null && lat > 32 && lat < 39.5 && lng > 124 && lng < 132;
        return {
          ...it,
          time: str(it.time), title: str(it.title) || t("비워둠"), why: str(it.why), tip: str(it.tip),
          options: Array.isArray(it.options) ? it.options.map(str).filter(Boolean) : [],
          lat: ok ? lat : undefined, lng: ok ? lng : undefined,
        };
      });
    const days = (Array.isArray(p && p.days) ? p.days : [])
      .filter((d) => d && typeof d === "object")
      .map((d) => ({
        ...d,
        label: str(d.label),
        items: items(d.items),
      }))
      .filter((d) => d.items.length);
    // 비 오면·출발 전에·챙길 것도 모양을 맞춰요. 하나라도 null·문자열이면 탭이 멈추던 것 (QA 11-23)
    const arr = (v) => (Array.isArray(v) ? v : []);
    const plan_b = items(arr(p && p.plan_b).map((x) => (typeof x === "string" ? { title: x } : x)));
    const prep = arr(p && p.prep)
      .map((x) => (typeof x === "string" ? { when: "", what: x } : x))
      .filter((x) => x && typeof x === "object" && str(x.what))
      .map((x) => ({ when: str(x.when), what: str(x.what) }));
    const packing = arr(p && p.packing).map(str).filter(Boolean);
    return { ...(p || {}), title: str(p && p.title), hook: str(p && p.hook), days, plan_b, prep, packing };
  }
  const locale = { ko: "ko-KR", en: "en-US", zh: "zh-CN", ja: "ja-JP" }[Z.lang] || "ko-KR";
  const fmtDay = new Intl.DateTimeFormat(locale, { month: "long", day: "numeric", weekday: "short" });
  const pad = (n) => String(n).padStart(2, "0");
  const ext = 'target="_blank" rel="noopener"';
  const SAVE_KEY = "jepi.plan.v1";
  const MODEL = "claude-sonnet-5-5";

  // ---------- 고르는 것 (앱 allWants 와 같은 값) ----------
  // [id, 그림, 이름, 설명, 관광공사 분류, 이름 키워드, 무리, {sea, rural, urban, camping, places}]
  const WANTS = [
    ["season", "🐟", "제철 산지", "지금 제철 먹으러", [39, 12], [], "제피"],
    ["nopo", "🏮", "노포·백년가게", "오래 검증된 집", [39, 38], ["시장"], "제피"],
    ["remote", "🏔️", "오지·한적한 곳", "도시에서 먼 깊은 곳", [12], ["계곡", "마을", "숲", "섬"], "제피", { rural: 1 }],
    ["unconquered", "🗺️", "미정복 땅", "안 가 본 시군구", [12], [], "제피"],
    ["random", "🎲", "P처럼 아무거나", "바람소리가 골라요", [12, 39], [], "제피"],
    ["sea", "🌊", "바다·해변", "해변 산책·노을", [12], ["해변", "해수욕장", "해안", "등대", "바다", "섬"], "자연", { sea: 1 }],
    ["forest", "🌲", "숲·휴양림", "휴양림·수목원", [12, 32], ["휴양림", "숲", "수목원", "자연"], "자연", { rural: 1 }],
    ["trek", "🥾", "산·트레킹", "등산·둘레길", [12], ["산", "둘레길", "트레킹", "국립공원", "오름", "길"], "자연", { rural: 1 }],
    ["valley", "💧", "계곡·호수", "물가에서 쉬기", [12], ["계곡", "호수", "폭포", "저수지", "강"], "자연", { rural: 1 }],
    ["bloom", "🌸", "꽃·단풍 풍경", "제철 풍경 명소", [12, 15], ["꽃", "축제", "단풍", "정원", "공원", "억새", "수국", "벚꽃"], "자연"],
    ["camp", "🏕️", "캠핑·차박", "캠핑장·노지", [12], ["캠핑", "야영"], "액티비티", { camping: 1, rural: 1 }],
    ["sea_fish", "🎣", "낚시", "바다·민물", [28, 12], ["낚시", "방파제", "갯바위", "좌대", "포구", "항"], "액티비티", { sea: 1 }],
    ["bike", "🚴", "자전거", "자전거길·레일바이크", [28, 12], ["자전거", "라이딩", "레일바이크"], "액티비티"],
    ["water", "🏄", "물놀이·수상레저", "카약·서핑·SUP", [28], ["서핑", "카약", "카누", "요트", "SUP", "래프팅", "수상"], "액티비티", { sea: 1 }],
    ["spa", "♨️", "온천·스파", "몸 녹이기", [12, 32], ["온천", "스파", "찜질"], "액티비티", { places: ["아산", "충주", "동래", "울진", "예산", "이천", "부곡", "창녕", "유성"] }],
    ["stars", "✨", "별 보기", "밤하늘 어두운 곳", [12, 14], ["천문대", "별", "은하수"], "액티비티", { rural: 1, places: ["영양", "영월", "정선", "양평", "화천", "무주", "장수", "청송"] }],
    ["walk", "🚶", "동네·뚜벅이", "가까이·걷거나 대중교통", [12, 14, 39], ["거리", "골목", "공원", "시장", "카페", "산책"], "문화", { urban: 1 }],
    ["city", "🏙️", "도시 골목", "골목·거리 산책", [12, 14], ["거리", "골목", "마을"], "문화", { urban: 1 }],
    ["palace", "🏯", "역사·고궁", "궁·성곽·읍성", [12, 14], ["궁", "종묘", "읍성", "향교", "성곽", "행궁", "서원", "사찰", "절"], "문화", { places: ["종로", "경주", "공주", "부여", "수원", "전주", "안동"] }],
    ["museum", "🖼️", "전시·박물관", "미술관·박물관", [14], ["미술관", "박물관", "전시", "갤러리", "기념관"], "문화", { urban: 1 }],
    ["festival", "🎪", "축제·공연", "이번 주 행사", [15], ["축제", "공연", "행사"], "문화"],
    ["food", "🍜", "맛집·제철", "그 동네 먹거리", [39], [], "먹거리"],
    ["market", "🧺", "시장·노포", "전통시장·백년가게", [38, 39], ["시장", "장터"], "먹거리"],
    ["cafe", "☕", "카페·빵지순례", "뷰 카페·빵집", [39], ["카페", "베이커리", "빵"], "먹거리"],
    ["kids", "🧒", "아이와 체험", "체험·동물·과학", [12, 14, 28], ["체험", "동물원", "과학관", "농장", "목장", "키즈"], "함께"],
    ["pet", "🐕", "반려견과", "같이 갈 수 있는 곳", [12, 32], ["반려", "애견", "펫"], "함께"],
    ["gh_party", "🎉", "게하·여행자 모임", "게스트하우스", [32], ["게스트하우스", "게하"], "함께", { places: ["제주", "강릉", "양양", "부산", "여수", "전주"] }],
  ].map(([id, emoji, label, sub, types, kws, group, f]) => ({ id, emoji, label, sub, types, kws, group, ...(f || {}) }));
  const GROUPS = ["제피", "자연", "액티비티", "문화", "먹거리", "함께"];
  const WHENS = [
    { id: "weekend", label: "이번 주말 1박", nights: 1 },
    { id: "weekendDay", label: "주말 당일치기", nights: 0 },
    { id: "today", label: "오늘", nights: 0 },
    { id: "month", label: "이번 달 (2주 뒤 주말)", nights: 1 },
  ];
  const DRIVES = [60, 120, 180, 240];
  const CITIES = [[37.5665, 126.978], [35.1796, 129.0756], [35.8714, 128.6014], [37.4563, 126.7052], [35.1595, 126.8526], [36.3504, 127.3845], [35.5384, 129.3114], [37.2636, 127.0286], [35.228, 128.6811], [36.6424, 127.489], [35.8242, 127.148]];

  function startDay(when, now) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (when === "today") return d;
    const toSat = (6 - d.getDay() + 7) % 7;
    if (when === "month") return new Date(d.getFullYear(), d.getMonth(), d.getDate() + toSat + 14);
    if (d.getDay() === 0 && nightsOf(when) === 0) return d; // 일요일 당일치기는 오늘. 1박은 일→월(출근날)이 되니 다음 토요일로 (QA 11-24)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + toSat);
  }
  const nightsOf = (when) => (WHENS.find((w) => w.id === when) || WHENS[0]).nights;
  const ymd = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const ymdKo = (d) => ymd(d) + "(" + "일월화수목금토"[d.getDay()] + ")";
  const hm = (d) => pad(d.getHours()) + ":" + pad(d.getMinutes());
  function distKm(a, b, c, d) {
    const r = Math.PI / 180, x = (d - b) * r * Math.cos(((a + c) / 2) * r), y = (c - a) * r;
    return Math.sqrt(x * x + y * y) * 6371;
  }
  const driveMin = (km) => Math.round(15 + km * 0.85);

  // ---------- 데이터 (시군구 경계·백년가게) ----------
  let regionsP = null, baekP = null;
  function regions() {
    if (!regionsP) regionsP = fetch("sigungu.json").then((r) => r.json()).then((rs) => rs.map((r) => {
      let polys = r.p;
      if (typeof polys === "string") polys = JSON.parse(polys);
      let minLat = 99, maxLat = -99, minLng = 999, maxLng = -999, sx = 0, sy = 0, n = 0;
      for (const poly of polys) for (let i = 0; i < (poly[0] || []).length; i += 2) {
        const x = poly[0][i], y = poly[0][i + 1];
        minLng = Math.min(minLng, x); maxLng = Math.max(maxLng, x); minLat = Math.min(minLat, y); maxLat = Math.max(maxLat, y);
        sx += x; sy += y; n++;
      }
      return { code: String(r.c), name: r.n, sido: r.s, lat: n ? sy / n : 0, lng: n ? sx / n : 0, polys, minLat, maxLat, minLng, maxLng };
    }));
    return regionsP;
  }
  function baek() {
    if (!baekP) baekP = fetch("data/baek.json").then((r) => r.json()).catch(() => ({}));
    return baekP;
  }
  const EAT = new Set(["food", "bakery", "cafe"]);
  function inRing(x, y, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
      const xi = ring[i], yi = ring[i + 1], xj = ring[j], yj = ring[j + 1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  const contains = (r, lat, lng) => lat >= r.minLat && lat <= r.maxLat && lng >= r.minLng && lng <= r.maxLng && r.polys.some((p) => p[0] && inRing(lng, lat, p[0]));
  function nearStation(lat, lng, km) {
    let best = null, bd = 1e9;
    for (const s of window.ZDATA.tideStations) { const d = distKm(lat, lng, s.lat, s.lng); if (d < bd) { bd = d; best = s; } }
    return bd <= (km || 25) ? best : null;
  }
  function seasonOrigins(month) {
    const m = {};
    for (const f of window.ZDATA.foods) if (f.months.includes(month)) for (const o of f.origins) (m[o] = m[o] || []).push(f.name);
    return m;
  }

  // ---------- 1단계: 시군구 점수 (앱 rankRegions 와 같은 규칙) ----------
  async function rank(st) {
    const [regs, bk] = await Promise.all([regions(), baek()]);
    const mine = (window.ZAPP && ZAPP.mine && ZAPP.mine()) || { conq: new Set(), notes: [] };
    const now = new Date();
    const wants = new Set(st.wants);
    const dayTrip = nightsOf(st.when) === 0;
    const seasonNow = seasonOrigins(startDay(st.when, now).getMonth() + 1);
    let seed = (now.getFullYear() * 1000 + now.getMonth() * 40 + now.getDate() + [...wants].join("").length * 7 + (st.roll || 0) * 7919) % 233280;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const out = [];
    for (const r of regs) {
      const km = distKm(st.from.lat, st.from.lng, r.lat, r.lng);
      const m = driveMin(km);
      if (m > st.maxMin) continue;
      const walk = wants.has("walk");
      if (!dayTrip && !walk && m < 35) continue;
      if (walk && m > 60) continue;
      let s = 0;
      const why = [];
      const conquered = mine.conq.has(r.code);
      const metro = r.sido.includes("서울") || r.sido.endsWith("광역시") || r.name.endsWith("구");
      if (wants.has("unconquered") && !conquered) { s += 3; why.push("미정복"); }
      else if (!conquered) s += 0.5;
      const sea = nearStation(r.lat, r.lng, 25);
      for (const w of WANTS) {
        if (!wants.has(w.id)) continue;
        if (w.sea) s += sea ? 2.5 : -2.5;
        if (w.rural && r.name.endsWith("군")) s += 1.2;
        if (w.urban && metro) s += 1.5;
        if ((w.places || []).some((p) => r.name.includes(p) || r.sido.includes(p))) { s += 3; why.push(w.label); }
      }
      if (wants.has("palace") && r.sido.includes("서울") && r.name === "중구") s += 2;
      // 제철 산지 이름은 시군구 이름만 있어요. '고성군'은 강원·경남 둘이라 도루묵(강원 고성)은 강원만
      const foods = r.name === "고성군" && !r.sido.startsWith("강원") ? null : seasonNow[r.name];
      if (foods) { s += wants.has("season") ? 4 : 0.8; why.push("제철 " + foods.join("·")); }
      if (wants.has("remote")) {
        const far = Math.min(...CITIES.map(([a, b]) => distKm(r.lat, r.lng, a, b)));
        if (far > 70) { s += 3; why.push("오지"); } else if (far > 45) s += 1.2; else if (far < 25) s -= 2.5;
      }
      let saved = 0;
      for (const n of mine.notes) {
        if (!contains(r, n.lat, n.lng)) continue;
        saved++;
        if (n.rating >= 4) s += 0.6;
        if (wants.has("food") && n.tags.includes("먹거리")) s += 1;
        if (wants.has("sea_fish") && n.tags.includes("낚시 포인트")) s += 1.5;
      }
      if (saved) why.push("내 장소 " + saved);
      const baekN = (bk[r.code] || []).filter((x) => EAT.has(x[2])).length;
      if (baekN) {
        const eat = wants.has("food") || wants.has("market") || wants.has("nopo");
        s += Math.min(wants.has("nopo") ? 4 : 2, baekN * (wants.has("nopo") ? 0.8 : eat ? 0.4 : 0.15));
        if (baekN >= 2 || eat) why.push("백년가게 " + baekN);
      }
      s -= dayTrip ? m / 60 : Math.max(0, m - 150) / 90;
      if (walk) { s += m < 20 ? 4 : m < 40 ? 1.5 : -2; if (m < 20) why.push("가까워요"); }
      s += rnd() * (wants.has("random") || st.roll ? 3 : 0.6);
      out.push({ code: r.code, name: r.name, sido: r.sido, full: r.sido + " " + r.name, lat: r.lat, lng: r.lng, driveMin: m, score: s, why, conquered, sea: sea && sea.name, seaCode: sea && sea.code });
    }
    out.sort((a, b) => b.score - a.score);
    const picked = [], perSido = {};
    for (const c of out) {
      if ((perSido[c.sido] || 0) >= 2) continue;
      picked.push(c); perSido[c.sido] = (perSido[c.sido] || 0) + 1;
      if (picked.length >= 6) break;
    }
    return picked;
  }

  // ---------- 2단계: 관광공사·고캠핑·날씨·물때·백년가게로 채우기 ----------
  const common = "MobileOS=ETC&MobileApp=Jepi&_type=json&pageNo=1";
  function itemsOf(j) {
    const it = j && j.response && j.response.body && j.response.body.items;
    const v = it && it.item;
    return Array.isArray(v) ? v : v ? [v] : [];
  }
  const TYPE_NAME = { 12: "관광지", 14: "문화시설", 15: "축제·공연", 28: "레포츠", 32: "숙박", 38: "쇼핑", 39: "음식점" };
  async function tourNear(lat, lng, type, rows) {
    const j = await ZAPP.proxy("/datago/B551011/KorService2/locationBasedList2?" + common + "&numOfRows=" + rows + "&arrange=E&mapX=" + lng.toFixed(6) + "&mapY=" + lat.toFixed(6) + "&radius=20000&contentTypeId=" + type);
    return itemsOf(j).filter((m) => +m.mapy).map((m) => ({ title: String(m.title || "").trim(), kind: TYPE_NAME[type] || "장소", addr: m.addr1 || "", lat: +(+m.mapy).toFixed(5), lng: +(+m.mapx).toFixed(5) }));
  }
  async function campNear(lat, lng) {
    const j = await ZAPP.proxy("/datago/B551011/GoCamping/locationBasedList?" + common + "&numOfRows=20&mapX=" + lng.toFixed(6) + "&mapY=" + lat.toFixed(6) + "&radius=20000");
    return itemsOf(j).filter((m) => +m.mapY).map((m) => ({ title: String(m.facltNm || "").trim(), kind: "캠핑장" + (m.induty ? " (" + m.induty + ")" : ""), addr: m.addr1 || "", intro: m.lineIntro || "", lat: +(+m.mapY).toFixed(5), lng: +(+m.mapX).toFixed(5), url: m.resveUrl || m.homepage || "" }));
  }
  async function locateBaek(b) {
    try {
      const j = await ZAPP.proxy("/naver/search/v1/local?display=1&query=" + encodeURIComponent((b[0] + " " + b[1].split(" ").slice(0, 2).join(" ")).slice(0, 60)));
      const it = (j.items || [])[0];
      const y = it && +it.mapy, x = it && +it.mapx;
      if (!y || !x) return null;
      return { title: b[0], kind: "백년가게 " + ({ food: "음식점", bakery: "빵집", cafe: "카페", market: "시장" }[b[2]] || ""), addr: b[1], intro: "중기부 지정 백년가게 (30년 넘게 이어 온 노포)", lat: +(y > 1000 ? y / 1e7 : y).toFixed(5), lng: +(x > 1000 ? x / 1e7 : x).toFixed(5) };
    } catch (e) { return null; }
  }
  async function weatherOn(lat, lng, day) {
    const j = await fetch("https://api.open-meteo.com/v1/forecast?latitude=" + lat.toFixed(3) + "&longitude=" + lng.toFixed(3) +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunset&timezone=Asia%2FSeoul&forecast_days=16").then((r) => r.json());
    const i = (j.daily && j.daily.time || []).indexOf(ymd(day));
    if (i < 0) return null;
    const c = j.daily.weather_code[i];
    const txt = c === 0 ? "맑음" : c <= 2 ? "구름 조금" : c === 3 ? "흐림" : c <= 48 ? "안개" : c <= 67 || (c >= 80 && c <= 82) ? "비" : c <= 77 || c === 85 || c === 86 ? "눈" : "뇌우";
    return { summary: txt, tmin: Math.round(j.daily.temperature_2m_min[i]), tmax: Math.round(j.daily.temperature_2m_max[i]), pop: j.daily.precipitation_probability_max[i], sunset: (j.daily.sunset[i] || "").slice(11, 16), rain: /비|뇌우|눈/.test(txt) || j.daily.precipitation_probability_max[i] >= 60 };
  }
  // 간조 시각 (바다 화면과 같은 조석예보, 10분 간격에서 낮은 꼭짓점)
  async function lowsOn(code, day) {
    const j = await ZAPP.proxy("/datago/1192136/tideFcstTime/GetTideFcstTimeApiService?obsCode=" + code + "&reqDate=" + ymd(day).replace(/-/g, "") + "&min=10&numOfRows=300&pageNo=1&type=json");
    const its = (j.body && j.body.items && j.body.items.item) || (j.response && j.response.body && j.response.body.items && j.response.body.items.item) || [];
    const pts = (Array.isArray(its) ? its : [its]).map((it) => ({ tm: String(it.predcDt || "").slice(11, 16), v: parseFloat(it.tdlvHgt) })).filter((p) => p.tm && isFinite(p.v));
    const out = [];
    for (let i = 1; i + 1 < pts.length; i++) {
      if (pts[i].v <= pts[i - 1].v && pts[i].v < pts[i + 1].v) {
        const h = +pts[i].tm.slice(0, 2);
        if (h >= 6 && h <= 19) out.push(pts[i].tm);
      }
    }
    return out;
  }
  async function enrich(c, st, day, note) {
    const wants = new Set(st.wants);
    const ws = WANTS.filter((w) => wants.has(w.id));
    const types = [...new Set(ws.flatMap((w) => w.types))].filter((x) => x !== 32);
    if (!types.length) types.push(12);
    const kws = ws.flatMap((w) => w.kws);
    const match = (p, k) => !k.length || k.some((x) => p.title.includes(x));
    c.spots = []; c.stays = []; c.errors = [];
    const safe = async (what, f) => { try { await f(); } catch (e) { c.errors.push(what); } };
    const byType = [];
    const jobs = types.slice(0, 3).map((ty) => safe("관광정보", async () => {
      const list = await tourNear(c.lat, c.lng, ty, 40);
      const hit = list.filter((p) => match(p, kws));
      byType.push((hit.length ? hit.slice(0, 6) : list.slice(0, 3)));
    }));
    if (nightsOf(st.when) > 0) {
      const stayKw = [...(wants.has("gh_party") ? ["게스트하우스"] : []), ...(wants.has("forest") ? ["휴양림"] : []), ...(wants.has("spa") ? ["온천"] : []), ...(wants.has("pet") ? ["애견"] : [])];
      if (wants.has("camp") || wants.has("forest") || !stayKw.length) jobs.push(safe("고캠핑", async () => { c.stays.push(...(await campNear(c.lat, c.lng)).slice(0, 4)); }));
      jobs.push(safe("숙박", async () => {
        const list = await tourNear(c.lat, c.lng, 32, 40);
        const hit = list.filter((p) => match(p, stayKw));
        c.stays.push(...(stayKw.length && hit.length ? hit : list).slice(0, 4));
      }));
    }
    if (st.when !== "month") jobs.push(safe("날씨", async () => { c.weather = await weatherOn(c.lat, c.lng, day); }));
    if (c.seaCode && ["sea_fish", "sea", "water", "random", "food"].some((x) => wants.has(x))) jobs.push(safe("물때", async () => { c.lows = await lowsOn(c.seaCode, day); }));
    const bk = (await baek())[c.code] || [];
    const eats = bk.filter((b) => EAT.has(b[2])).concat(bk.filter((b) => b[2] === "market")); // 밸브상사·안경점 같은 음식점 아닌 백년가게는 넣지 않아요 (QA 11-23)
    const baekSpots = [];
    jobs.push((async () => {
      for (const b of eats.slice(0, wants.has("food") || wants.has("nopo") ? 5 : 3)) { const p = await locateBaek(b); if (p) baekSpots.push(p); }
    })());
    await Promise.all(jobs);
    const lists = [baekSpots, ...byType].filter((l) => l.length);
    const mixed = [];
    for (let i = 0; lists.some((l) => i < l.length); i++) for (const l of lists) if (i < l.length) mixed.push(l[i]);
    const seen = new Set();
    c.spots = mixed.filter((p) => p.title && !seen.has(p.title) && seen.add(p.title));
    const seenS = new Set();
    c.stays = c.stays.filter((p) => p.title && !seenS.has(p.title) && seenS.add(p.title));
    note && note();
  }

  // ---------- 3단계: AI 일정 ----------
  const SYSTEM = `너는 개인 여행 앱 "바람소리"의 주말 일정 설계자야. 사용자는 "J 같은 P"(숙소·물때처럼 놓치면 안 되는 건 미리 잡고, 나머지는 현장에서 즐기는 사람).
교과서 같은 무난한 코스 말고, 이 사람이 이번 주말 실제로 들고 따라갈 수 있는 구체적인 일정을 짜.

규칙:
- 장소는 반드시 주어진 "갈 만한 곳"과 "숙소" 목록에서만 고르고, 그 lat/lng를 그대로 옮겨. 목록에 없는 가게·장소 이름을 지어내지 마.
- 시간은 앞뒤가 맞아야 해: 다음 칸 time = 앞 칸 time + stay_min + 다음 칸 drive_min. drive_min은 직선 어림을 참고해 현실적으로.
- 간조 앞뒤 2시간은 갯벌·낚시 황금시간, 일몰 30분 전엔 노을 볼 자리. 이런 "시간이 정해진 것"을 먼저 박고 나머지를 맞춰.
- 토요일 아침 출발은 정체를 피해 이르게, 일요일 귀가는 정체 전(대개 15시 전 출발)으로. 하루 운전 한계를 넘기지 마.
- 하루에 한 칸은 kind "free"(비워둠). options에 그 근처 목록 장소 2~3개 이름을 넣어서 현장에서 고르게 해.
- 먹거리 칸은 "갈 만한 곳" 중 kind가 "백년가게"로 시작하는 곳(30년 넘은 중기부 지정 노포)이 있으면 우선 넣고, why에 노포라는 점을 살려 써.
- 술은 운전이 끝난 뒤 숙소에서만. 밤 기온이 낮거나 비 예보면 챙길 것·plan_b에 반영.
- why: 왜 이 시간에 여기인지 구체적으로 한 줄 (예: "간조 13:40, 물 빠진 갯벌이 가장 넓을 때"). 뻔한 소개 문구 금지.
- tip: 현장에서 쓸 실전 팁 한 줄 (주차, 붐비는 시간, 챙길 것 등). 모르면 비워.
- title은 이번 여행의 콘셉트를 8~18자로, hook은 이 조합을 고른 이유 한 문장.
- plan_b: 비 오면 바꿀 2~4칸. prep: 출발 전에 할 일 (예: {"when":"금요일 밤","what":"미끼·얼음 사기"}).
- kind: move|spot|food|stay|free|fish|walk|view|cafe 중 하나.
- days는 "날짜" 하나에 하나씩 꼭 만들어(1박이면 2개). 둘째 날은 숙소 체크아웃부터 귀가 출발까지 채우고, 첫날에 다 몰아넣지 마.
- 사용자 언어가 한국어가 아니면 모든 글(title·hook·why·tip·label·prep·packing)을 그 언어로 쓰되, 장소 이름(title 중 장소)은 목록의 한국어 이름 그대로 둬.

JSON 하나만 답해:
{"title":"","hook":"","days":[{"label":"11월 14일 (토)","items":[{"time":"07:30","title":"","why":"","tip":"","kind":"move","stay_min":0,"drive_min":0,"lat":null,"lng":null,"options":[]}]}],"plan_b":[],"prep":[{"when":"","what":""}],"packing":[""]}`;

  function context(st, picks, day) {
    const n = nightsOf(st.when);
    return {
      "사용자 언어": { ko: "한국어", en: "English", zh: "简体中文", ja: "日本語" }[Z.lang] || "한국어",
      "언제": tOptKo(WHENS.find((w) => w.id === st.when).label),
      "오늘": ymdKo(new Date()),
      "날짜": Array.from({ length: n + 1 }, (_, i) => ymdKo(new Date(day.getFullYear(), day.getMonth(), day.getDate() + i))),
      "출발지": st.from.label || "현재 위치",
      "하루 운전 한계(분)": st.maxMin,
      "하고 싶은 것": WANTS.filter((w) => st.wants.includes(w.id)).map((w) => w.label),
      "후보지": picks.map((c) => ({
        "시군구": c.full,
        "출발지에서 차로(분, 직선 어림)": c.driveMin,
        ...(c.weather ? { "날씨": c.weather.summary + " " + c.weather.tmin + "~" + c.weather.tmax + "° 강수확률 " + c.weather.pop + "%" } : {}),
        ...(c.lows && c.lows.length ? { ["간조(" + c.sea + ")"]: c.lows } : {}),
        ...(c.weather && c.weather.sunset ? { "일몰": c.weather.sunset } : {}),
        "갈 만한 곳": c.spots.slice(0, 10).map(({ title, kind, addr, intro, lat, lng }) => ({ title, kind, addr, ...(intro ? { intro } : {}), lat, lng })),
        "숙소": c.stays.slice(0, 6).map(({ title, kind, addr, lat, lng }) => ({ title, kind, addr, lat, lng })),
      })),
    };
  }
  const tOptKo = (s) => s; // 프롬프트는 한국어 그대로
  // AI 답에서 JSON 꺼내기. 앞에 '{'가 든 설명이 붙거나 max_tokens 로 끝이 잘려도 살려요 (QA 11-24)
  function extractJson(text) {
    text = String(text || "");
    for (let a = text.indexOf("{"), tries = 0; a >= 0 && tries < 20; a = text.indexOf("{", a + 1), tries++) {
      const j = parseFrom(text, a);
      if (j && typeof j === "object" && Array.isArray(j.days)) return j;
    }
    return null;
  }
  function parseFrom(text, a) {
    const stack = [];
    let inStr = false, escp = false, cut = -1, cutStack = null;
    for (let i = a; i < text.length; i++) {
      const c = text[i];
      if (inStr) { if (escp) escp = false; else if (c === "\\") escp = true; else if (c === '"') inStr = false; continue; }
      if (c === '"') inStr = true;
      else if (c === "{" || c === "[") stack.push(c === "{" ? "}" : "]");
      else if (c === "}" || c === "]") {
        if (stack.pop() !== c) return null;
        if (!stack.length) { try { return JSON.parse(text.slice(a, i + 1)); } catch (e) { return null; } }
        cut = i + 1; cutStack = stack.slice(); // 마지막으로 온전히 닫힌 칸
      }
    }
    if (cut < 0) return null; // 잘린 답: 마지막으로 닫힌 칸까지만 두고 나머지 괄호를 닫아요
    try { return JSON.parse(text.slice(a, cut) + cutStack.reverse().join("")); } catch (e) { return null; }
  }
  async function askClaude(ctx) {
    const j = await ZAPP.post("/claude/v1/messages", { model: MODEL, max_tokens: 7000, system: SYSTEM, messages: [{ role: "user", content: JSON.stringify(ctx) }] });
    return (j.content || []).filter((p) => p.type === "text").map((p) => p.text).join("");
  }
  function localPlan(st, picks, day) {
    const items = [{ time: "07:30", title: t("출발"), why: t("토요일 아침 정체 전에"), kind: "move" }];
    let tm = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 7, 30);
    for (const c of picks) {
      tm = new Date(tm.getTime() + c.driveMin * 60e3);
      const low = c.lows && c.lows[0];
      if (low) { const [h, m] = low.split(":").map(Number); const lt = new Date(tm); lt.setHours(h - 1, m); if (lt > tm) tm = lt; }
      const s = c.spots[0];
      items.push({ time: hm(tm), title: s ? s.title : c.full, why: low ? t("간조 {time} 앞뒤로", { time: low }) : c.full, kind: low ? "fish" : "spot", lat: s ? s.lat : c.lat, lng: s ? s.lng : c.lng, stay_min: 120, drive_min: c.driveMin });
      tm = new Date(tm.getTime() + 120 * 60e3);
    }
    items.push({ time: hm(tm), title: t("비워둠"), why: t("가서 정하기"), kind: "free", options: picks.flatMap((c) => c.spots.slice(1, 3).map((s) => s.title)) });
    const stay = picks.flatMap((c) => c.stays)[0];
    if (stay && nightsOf(st.when) > 0) items.push({ time: (picks[0].weather && picks[0].weather.sunset) ? hm(new Date(new Date(ymd(day) + "T" + picks[0].weather.sunset + ":00").getTime() - 30 * 60e3)) : "17:00", title: stay.title, why: t("해 지기 전에 체크인"), kind: "stay", lat: stay.lat, lng: stay.lng });
    return { title: picks.map((c) => c.name).join(" + "), hook: "", days: [{ label: fmtDay.format(day), items }], plan_b: [], prep: [], packing: [] };
  }

  // ---------- 상태·저장 ----------
  let st = load() || { step: "wants", when: "weekend", wants: [], maxMin: 180, from: null, cands: [], picks: [], plan: null, done: [], day: 0 };
  // 저장값이 깨져 있어도(빈 객체·숫자·wants:null 등) 탭이 영구 오류로 멈추지 않게 모양을 맞춰요 (QA 11-24)
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (!s || typeof s !== "object" || Array.isArray(s)) return null;
      for (const k of ["wants", "cands", "picks", "done"]) if (!Array.isArray(s[k])) s[k] = [];
      s.wants = s.wants.filter((x) => typeof x === "string");
      s.picks = s.picks.filter((x) => typeof x === "string");
      s.done = s.done.map(String);
      s.cands = s.cands.filter((c) => c && typeof c === "object" && typeof c.code === "string" && typeof c.name === "string" && typeof c.sido === "string" && Array.isArray(c.why));
      if (!WHENS.some((w) => w.id === s.when)) s.when = "weekend";
      if (!DRIVES.includes(s.maxMin)) s.maxMin = 180;
      if (s.from && !(s.from && Number.isFinite(s.from.lat) && Number.isFinite(s.from.lng))) s.from = null;
      if (!s.plan || typeof s.plan !== "object" || Array.isArray(s.plan)) s.plan = null;
      if (!Number.isFinite(s.dismissed)) s.dismissed = 0;
      if (!Number.isInteger(s.day) || s.day < 0) s.day = 0; // 글자·음수면 일정 화면이 멈추던 것 (QA 11-25)
      return s;
    } catch (e) { return null; }
  }
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(st)); } catch (e) {} }
  // 일정은 폰과 같이 써요 (서버 이름 'trip_plan', 앱 TripPlan.toJson 과 같은 모양)
  function planDoc() {
    const p = st.plan, n = normPlan(p); // 폰에서 받은 일정의 prep 이 문자열이어도 체크를 올릴 수 있게 (QA 11-24)
    return JSON.stringify({ key: p.key || "web|" + (p.start || "") + "|" + (st.picks || []).join(","), start: (p.start || ymd(new Date())) + "T00:00:00", title: p.title || "", hook: p.hook || "",
      days: Array.isArray(p.days) ? p.days : [], plan_b: n.plan_b, prep: n.prep, packing: n.packing, by_ai: !!p.byAi, done: st.done || [], updated: Number.isFinite(st.planUpdated) ? st.planUpdated : 0 }); // 시각 없는 옛 일정은 0(가장 오래됨). 지금 시각을 붙이면 폰의 새 일정을 덮어요 (QA 11-25)
  }
  function planChanged() {
    st.planUpdated = Math.max(Date.now(), (Number.isFinite(st.planUpdated) ? st.planUpdated : 0) + 1); // 폰 시계가 빨라도 updated 가 거꾸로 가지 않게 (QA 11-26 B4)
    save();
    if (st.plan && window.ZDOCS) ZDOCS.push("trip_plan", planDoc());
  }
  async function syncPlan() {
    if (!window.ZDOCS) return false;
    // 첫 로그인 때 app.html 이 저장값의 시각을 0으로 내렸으면 화면의 것도 맞춰요 (QA 11-26 B7)
    try { const ls = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (ls && ls.planUpdated === 0 && st.planUpdated) { st.planUpdated = 0; st.dismissed = 0; } } catch (e) {}
    const got = await ZDOCS.sync("trip_plan", st.plan ? planDoc() : null);
    if (!got) return false;
    try {
      const j = JSON.parse(got);
      if (!Array.isArray(j.days) || !j.days.length) return false;
      if (st.dismissed && j.updated === st.dismissed) return false; // '새 여행 만들기'로 치운 그 판(같은 updated)만 다시 꺼내지 않아요. 크기 비교는 폰·PC 시계가 어긋나면 폰의 새 일정까지 숨겨요 (QA 11-26 B4)
      st.plan = { key: j.key, title: j.title, hook: j.hook, days: j.days, plan_b: j.plan_b || [], prep: j.prep || [], packing: j.packing || [], byAi: !!j.by_ai, start: String(j.start || "").slice(0, 10), fromPhone: !String(j.key || "").startsWith("web|") };
      st.done = (Array.isArray(j.done) ? j.done : []).map(String); st.planUpdated = j.updated || 0; st.day = 0;
      if (st.step === "plan" || st.step === "wants") st.step = "plan";
      save();
      return true;
    } catch (e) { return false; }
  }
  let busy = false, busyMsg = "", errMsg = "";

  // ---------- 그리기 ----------
  const KIND = { move: "🚗", food: "🍜", stay: "🛏️", free: "🎲", fish: "🎣", walk: "🥾", view: "🌅", cafe: "☕", spot: "📍" };
  const naverSearch = (q) => "https://map.naver.com/p/search/" + encodeURIComponent(q);
  function stepper() {
    const steps = [["wants", "1. 뭐가 당겨요"], ["regions", "2. 어디로"], ["plan", "3. 일정"]];
    const idx = steps.findIndex((s) => s[0] === st.step);
    const hasPlan = !!(st.plan && normPlan(st.plan).days.length); // 폰에서 온 일정·지난 일정으로 돌아가기
    return '<ol class="steps3">' + steps.map(([id, l], i) => '<li class="' + (i === idx ? "on" : i < idx ? "done" : "") + '">' + (i < idx || (id === "plan" && i !== idx && hasPlan) ? '<button type="button" data-go="' + id + '">' + esc(t(l)) + "</button>" : esc(t(l))) + "</li>").join("") + "</ol>";
  }
  function viewWants() {
    const loc = window.ZLOC ? ZLOC.init() : { lat: 37.5665, lng: 126.978, label: "서울" };
    const fromLabel = st.from ? (st.from.label ? tOpt(st.from.label) : t("고른 곳")) : (loc.label ? tOpt(loc.label) : t("내 기록의 마지막 위치"));
    let h = '<div class="card2"><h2>' + esc(t("언제")) + '</h2><div class="chips">' +
      WHENS.map((w) => '<button type="button" class="' + (st.when === w.id ? "on" : "") + '" data-when="' + w.id + '">' + esc(t(w.label)) + "</button>").join("") + "</div>";
    h += '<h2 style="margin-top:6px">' + esc(t("출발지 · 편도 운전")) + '</h2><div class="chips"><span class="pill">📍 ' + esc(fromLabel) + "</span>" +
      '<button type="button" data-from="gps">◎ ' + esc(t("내 위치")) + "</button>" +
      DRIVES.map((m) => '<button type="button" class="' + (st.maxMin === m ? "on" : "") + '" data-max="' + m + '">' + esc(t("{n}시간 안", { n: m / 60 })) + "</button>").join("") + "</div></div>";
    for (const g of GROUPS) {
      h += '<div class="card2"><h2>' + esc(t(g === "제피" ? "바람소리 추천" : g)) + '</h2><div class="wants">' +
        WANTS.filter((w) => w.group === g).map((w) => '<button type="button" class="want' + (st.wants.includes(w.id) ? " on" : "") + '" data-want="' + w.id + '" aria-pressed="' + st.wants.includes(w.id) + '"><span aria-hidden="true">' + w.emoji + "</span><b>" + esc(t(w.label)) + "</b><small>" + esc(t(w.sub)) + "</small></button>").join("") + "</div></div>";
    }
    h += '<div class="planbar"><span>' + esc(st.wants.length ? t("{n}개 골랐어요", { n: st.wants.length }) : t("하나 이상 골라 주세요")) + '</span><button class="btn primary" type="button" data-act="rank"' + (st.wants.length ? "" : " disabled") + ">" + esc(t("어디로 갈지 추천받기")) + "</button></div>";
    return h;
  }
  // '어디로': 늘어놓지 않고 1~2곳만 크게. 나머지는 접어 두고, 한 번 누르면 그곳으로 바로 일정 짜기 (QA 11-26 UX⑧)
  function candHtml(c, top) {
    const on = st.picks.includes(c.code);
    return '<article class="card2 cand' + (on ? " on" : "") + '"><h2' + (top ? ' style="font-size:22px"' : "") + ">" + esc(c.sido.replace(/(특별자치도|특별자치시|광역시|특별시)$/, "")) + " " + esc(c.name) + "<small>" + esc(t("차로 약 {n}분", { n: c.driveMin })) + "</small></h2>" +
      '<div class="chips">' + (c.why.length ? c.why : ["가 볼 만해요"]).map((w) => '<span class="pill">' + esc(reason(w)) + "</span>").join("") + (c.sea ? '<span class="pill">🌊 ' + esc(tOpt(c.sea)) + "</span>" : "") + "</div>" +
      '<div class="row" style="display:flex;gap:8px;flex-wrap:wrap">' +
      (top ? '<button class="btn primary" type="button" data-only="' + c.code + '">' + esc(t("이곳으로 일정 짜기")) + "</button>" : "") +
      '<button class="btn' + (on ? " primary" : "") + '" type="button" data-pick="' + c.code + '">' + esc(on ? t("담았어요 ✓") : t("같이 담기")) + '</button><a class="btn" href="' + naverSearch(c.full + " 가볼만한곳") + '" ' + ext + ">" + esc(t("둘러보기")) + "</a></div></article>";
  }
  function viewRegions() {
    const top = st.cands.slice(0, 2), rest = st.cands.slice(2);
    let h = '<p class="muted">' + esc(t("지금 가기 딱 좋은 곳이에요. 누르면 바로 일정을 짜요.")) + '</p><div class="cardgrid">' + top.map((c) => candHtml(c, true)).join("") + "</div>";
    if (rest.length) h += '<details class="candmore"' + (rest.some((c) => st.picks.includes(c.code)) ? " open" : "") + "><summary>" + esc(t("다른 후보 {n}곳 더 보기", { n: rest.length })) + '</summary><div class="cardgrid">' + rest.map((c) => candHtml(c, false)).join("") + "</div></details>";
    h += '<div class="planbar"><button class="btn" type="button" data-act="reroll">' + esc(t("다른 곳 추천")) + "</button><span>" + esc(t("{n}곳 담음", { n: st.picks.length })) + '</span><button class="btn primary" type="button" data-act="make"' + (st.picks.length ? "" : " disabled") + ">" + esc(t("담은 곳으로 일정 짜기")) + "</button></div>";
    if (!ZAPP.signedIn()) h += '<div class="needlogin">' + esc(t("일정 짜기는 로그인하면 돼요. 관광공사 장소·날씨·물때를 모아 AI가 짜 줘요. 무료예요.")) + ' <button class="btn primary" type="button" data-login>' + esc(t("로그인")) + "</button></div>";
    return h;
  }
  function reason(w) {
    if (w.startsWith("제철 ")) return t("제철") + " " + w.slice(3).split("·").map((x) => tOpt(x)).join("·");
    const m = w.match(/^(.*) (\d+)$/);
    if (m) return t(m[1]) + " " + m[2];
    return t(w);
  }
  function itemHtml(it, id, doneSet) {
    const has = Number.isFinite(it.lat) && Number.isFinite(it.lng); // normPlan 이 숫자만 남겨요 (AI 답의 좌표 칸에 글자가 와도 링크에 못 들어가게)
    const done = doneSet.has(id);
    return '<li class="pitem' + (done ? " done" : "") + '"><label class="ptime"><input type="checkbox" data-done="' + id + '"' + (done ? " checked" : "") + '><b>' + esc(it.time || "") + '</b></label><div class="pbody"><div class="ptitle"><span aria-hidden="true">' + (Object.prototype.hasOwnProperty.call(KIND, it.kind) ? KIND[it.kind] : "📍") + "</span> " + esc(it.title) +
      (it.drive_min ? ' <span class="muted">· ' + esc(t("이동 {n}분", { n: it.drive_min })) + "</span>" : "") + (it.stay_min ? ' <span class="muted">· ' + esc(t("머물기 {n}분", { n: it.stay_min })) + "</span>" : "") + "</div>" +
      (it.why ? '<div class="pwhy">' + esc(it.why) + "</div>" : "") + (it.tip ? '<div class="ptip">💡 ' + esc(it.tip) + "</div>" : "") +
      (it.options && it.options.length ? '<div class="chips">' + it.options.map((o) => '<a href="' + naverSearch(o) + '" ' + ext + ">🎲 " + esc(o) + "</a>").join("") + "</div>" : "") +
      (has ? '<div class="chips"><a href="' + naverSearch(it.title) + '" ' + ext + ">" + esc(t("네이버 지도")) + '</a><a href="https://map.naver.com/p/directions/-/' + it.lng + "," + it.lat + "," + encodeURIComponent(it.title) + ',,/-/car" ' + ext + ">" + esc(t("길찾기")) + "</a></div>" : "") +
      "</div></li>";
  }
  function viewPlan() {
    const p = st.plan ? normPlan(st.plan) : null;
    if (!p || !p.days.length) return "";
    const doneSet = new Set(st.done);
    const di = Math.min(st.day || 0, p.days.length - 1);
    let h = '<div class="seasonhead" style="background:var(--leaf-soft)"><div class="t">' + esc(p.title || t("이번 여행")) + "</div>" + (p.hook ? "<div>" + esc(p.hook) + "</div>" : "") +
      '<div class="muted">' + esc(p.byAi ? t("AI가 관광공사 장소·날씨·물때로 짠 일정이에요. 가기 전에 영업시간은 한번 확인해 주세요.") : t("AI 없이 간단히 짠 일정이에요.")) + "</div>" +
      '<div class="muted">' + esc(p.fromPhone ? t("폰 앱에서 짠 일정이에요.") : ZAPP.signedIn() ? t("폰 앱의 여행 계획과 같이 맞춰져요.") : t("로그인하면 폰 앱과 같이 맞춰져요.")) + "</div></div>";
    if (errMsg) h += '<div class="needlogin">' + esc(errMsg) + "</div>";
    if (p.days.length > 1) h += '<div class="chips" role="tablist">' + p.days.map((d, i) => '<button type="button" class="' + (i === di ? "on" : "") + '" data-day="' + i + '">' + esc(d.label || t("{n}일째", { n: i + 1 })) + "</button>").join("") + "</div>";
    h += '<div class="cardgrid" style="grid-template-columns:minmax(0,1.3fr) minmax(0,1fr)"><article class="card2"><h2>' + esc(p.days[di].label || "") + '</h2><ol class="plist">' + p.days[di].items.map((it, i) => itemHtml(it, "d" + di + "i" + i, doneSet)).join("") + "</ol></article>";
    h += '<div style="display:flex;flex-direction:column;gap:16px;min-width:0"><div id="planMap" class="planmap" aria-label="' + esc(t("일정 지도")) + '"></div>';
    if (p.plan_b && p.plan_b.length) h += '<article class="card2"><h2>☔ ' + esc(t("비 오면")) + '</h2><ol class="plist">' + p.plan_b.map((it, i) => itemHtml(it, "b" + i, doneSet)).join("") + "</ol></article>";
    if (p.prep && p.prep.length) h += '<article class="card2"><h2>' + esc(t("출발 전에")) + "</h2>" + p.prep.map((x, i) => { const id = "prep" + i; const w = typeof x === "string" ? { when: "", what: x } : x; return '<label class="chk"><input type="checkbox" data-done="' + id + '"' + (doneSet.has(id) ? " checked" : "") + "> " + (w.when ? "<b>" + esc(w.when) + "</b> " : "") + esc(w.what) + "</label>"; }).join("") + "</article>";
    if (p.packing && p.packing.length) h += '<article class="card2"><h2>' + esc(t("챙길 것")) + "</h2>" + p.packing.filter(Boolean).map((x, i) => { const id = "pack" + i; return '<label class="chk"><input type="checkbox" data-done="' + id + '"' + (doneSet.has(id) ? " checked" : "") + "> " + esc(x) + "</label>"; }).join("") + "</article>";
    h += "</div></div>";
    h += '<div class="planbar"><button class="btn" type="button" data-act="new">' + esc(t("새 여행 만들기")) + '</button><button class="btn" type="button" data-act="remake">' + esc(t("같은 곳으로 다시 짜기")) + "</button></div>";
    return h;
  }
  let pmap = null;
  function drawMap() {
    const el = $("planMap");
    if (!el || !st.plan) return;
    const items = (() => { const np = normPlan(st.plan); return np.days.length ? np.days[Math.min(st.day || 0, np.days.length - 1)].items : []; })().filter((i) => i.lat != null && i.lng != null);
    if (!items.length) { el.hidden = true; return; }
    if (!(window.naver && naver.maps && naver.maps.Map)) { el.innerHTML = '<div class="muted" style="padding:12px">' + esc(t("지도를 불러오지 못했어요.")) + "</div>"; return; }
    pmap = new naver.maps.Map(el, { zoomControl: true, zoomControlOptions: { position: naver.maps.Position.TOP_RIGHT } });
    const path = items.map((i) => new naver.maps.LatLng(i.lat, i.lng));
    new naver.maps.Polyline({ map: pmap, path, strokeColor: "#0E8465", strokeWeight: 4, strokeOpacity: 0.8 });
    items.forEach((it, n) => new naver.maps.Marker({ map: pmap, position: path[n], title: it.title, icon: { content: '<div class="pmark">' + (n + 1) + "</div>", anchor: new naver.maps.Point(13, 13) } }));
    const b = new naver.maps.LatLngBounds(path[0], path[0]);
    path.forEach((p) => b.extend(p));
    if (path.length > 1) pmap.fitBounds(b, { top: 30, right: 30, bottom: 30, left: 30 }); else pmap.setCenter(path[0]), pmap.setZoom(13);
  }
  function render() {
    const root = $("planRoot");
    if (!root) return;
    let h = stepper();
    if (busy) h += '<div class="card2"><div class="loading">' + esc(busyMsg || t("준비하는 중이에요…")) + "</div></div>";
    else if (st.step === "regions") h += viewRegions();
    else if (st.step === "plan" && st.plan && normPlan(st.plan).days.length) h += viewPlan(); // 날이 하나도 없는 일정이면 빈 화면 대신 처음으로
    else { st.step = "wants"; h += viewWants(); }
    if (!busy && errMsg && st.step !== "plan") h += '<div class="needlogin">' + esc(errMsg) + "</div>";
    root.innerHTML = h;
    if (st.step === "plan" && !busy) drawMap();
  }

  // ---------- 동작 ----------
  async function doRank() {
    const loc = st.from || (window.ZLOC ? ZLOC.init() : { lat: 37.5665, lng: 126.978, label: "서울" });
    st.from = { lat: loc.lat, lng: loc.lng, label: loc.label || "" };
    busy = true; busyMsg = t("가까운 시군구를 살펴보는 중이에요…"); errMsg = ""; render();
    try {
      st.cands = await rank(st);
      st.picks = [];
      st.step = "regions";
      if (!st.cands.length) errMsg = t("조건에 맞는 곳이 없어요. 운전 시간을 늘려 보세요.");
    } catch (e) { errMsg = t("추천을 만들지 못했어요.") + " " + (e.message || e); }
    busy = false; save(); render();
  }
  async function doMake() {
    if (!ZAPP.signedIn()) { ZAPP.openLogin(); return; }
    const picks = st.cands.filter((c) => st.picks.includes(c.code));
    if (!picks.length) return;
    const day = startDay(st.when, new Date());
    const keepAi = !!(st.plan && st.plan.byAi && st.step === "plan"); // 기다리는 동안 단계 버튼을 눌러도 다시 짜기로 봐요 (QA 11-26 B4)
    busy = true; errMsg = "";
    let n = 0;
    busyMsg = t("관광공사 장소·숙소·날씨·물때를 모으는 중이에요… ({n}/{total})", { n, total: picks.length }); render();
    await Promise.all(picks.map((c) => enrich(c, st, day, () => { n++; busyMsg = t("관광공사 장소·숙소·날씨·물때를 모으는 중이에요… ({n}/{total})", { n, total: picks.length }); render(); })));
    busyMsg = t("AI가 일정을 짜는 중이에요… 30초쯤 걸려요"); render();
    let plan;
    try {
      const j = extractJson(await askClaude(context(st, picks, day)));
      if (!j || !Array.isArray(j.days) || !j.days.length) throw new Error(t("AI 답을 읽지 못했어요"));
      plan = normPlan({ ...j, byAi: true });
      if (!plan.days.length) throw new Error(t("AI 답을 읽지 못했어요"));
    } catch (e) {
      // 이미 AI 일정이 있으면(다시 짜기) 간단 일정으로 덮지 않고 그대로 둬요. 폰 쪽 일정도 지켜요 (QA 11-23)
      if (keepAi && st.plan && st.plan.byAi) {
        errMsg = t("AI 일정을 받지 못했어요.") + " " + (e.message || e);
        busy = false; render(); return;
      }
      plan = { ...localPlan(st, picks, day), byAi: false };
      errMsg = t("AI 일정을 받지 못해서 간단히 짰어요.") + " " + (e.message || e);
    }
    plan.start = ymd(day);
    st.plan = plan; st.done = []; st.day = 0; st.step = "plan";
    busy = false; planChanged(); render();
  }
  document.addEventListener("click", async (e) => {
    const root = $("planRoot");
    if (!root || !root.contains(e.target)) return;
    const b = e.target.closest("button,[data-done]");
    if (!b) return;
    const d = b.dataset;
    if (d.go) { st.step = d.go; errMsg = ""; save(); render(); return; }
    if (d.when) { st.when = d.when; save(); render(); return; }
    if (d.max) { st.maxMin = +d.max; save(); render(); return; }
    if (d.from === "gps") {
      b.disabled = true;
      try { const g = await ZLOC.gps(); st.from = { lat: g.lat, lng: g.lng, label: "" }; ZLOC.set(g, true); errMsg = ""; } catch (err) { errMsg = err.message; }
      save(); render(); return;
    }
    if (d.want) { const i = st.wants.indexOf(d.want); i >= 0 ? st.wants.splice(i, 1) : st.wants.push(d.want); save(); render(); return; }
    if (d.only) { st.picks = [d.only]; save(); return doMake(); }
    if (d.pick) { const i = st.picks.indexOf(d.pick); i >= 0 ? st.picks.splice(i, 1) : st.picks.length < 3 && st.picks.push(d.pick); save(); render(); return; }
    if (d.day) { st.day = +d.day; save(); render(); return; }
    if (d.login !== undefined) { ZAPP.openLogin(); return; }
    if (d.act === "rank") { st.roll = 0; return doRank(); }
    if (d.act === "reroll") { st.roll = (st.roll || 0) + 1; return doRank(); }
    if (d.act === "remake" && st.plan && st.plan.fromPhone) { errMsg = t("폰 앱에서 짠 일정은 폰 앱에서 다시 짜 주세요."); render(); return; } // 웹의 옛 후보로 폰 일정을 덮지 않게 (QA 11-23)
    if (d.act === "make" || d.act === "remake") return doMake();
    if (d.act === "new") { st = { step: "wants", when: st.when, wants: [], maxMin: st.maxMin, from: st.from, cands: [], picks: [], plan: null, done: [], day: 0, dismissed: st.planUpdated || st.dismissed || 0 }; errMsg = ""; save(); render(); return; }
  });
  document.addEventListener("change", (e) => {
    const c = e.target.closest && e.target.closest("[data-done]");
    if (!c || !$("planRoot") || !$("planRoot").contains(c)) return;
    const id = c.dataset.done, i = st.done.indexOf(id);
    if (c.checked && i < 0) st.done.push(id);
    if (!c.checked && i >= 0) st.done.splice(i, 1);
    c.closest(".pitem") && c.closest(".pitem").classList.toggle("done", c.checked);
    planChanged();
  });
  if (window.ZLOC) ZLOC.on((l) => { if (st.step === "wants") { st.from = { lat: l.lat, lng: l.lng, label: l.label || "" }; save(); if (!$("view-plan").hidden) render(); } });
  async function show() { render(); if (!busy && (await syncPlan())) render(); }
  window.addEventListener("zapp-auth", () => { if (window.ZAPP_READY && !$("view-plan").hidden) show(); });
  window.ZPLAN = { show };
})();
