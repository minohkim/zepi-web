// 바람소리 웹 · 오늘 (날씨 · 공기 · 해와 달 · 절기 · 제철 · 즐길 거리 · 노래 · 밤하늘)
// 앱의 lib/season*.dart, lib/services/kma.dart 를 옮겨 왔어요.
(function () {
  const Z = window.ZI18N, t = Z.t, tOpt = Z.tOpt;
  const DATA = window.ZDATA;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const locale = { ko: "ko-KR", en: "en-US", zh: "zh-CN", ja: "ja-JP" }[Z.lang] || "ko-KR";
  const fmtTime = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone: "Asia/Seoul" });
  const fmtHour = new Intl.DateTimeFormat(locale, { hour: "numeric", timeZone: "Asia/Seoul" });
  const fmtWd = new Intl.DateTimeFormat(locale, { weekday: "short", month: "numeric", day: "numeric", timeZone: "Asia/Seoul" });
  const fmtDate = new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric", weekday: "long", timeZone: "Asia/Seoul" });

  // 한국 시각 기준 연·월·일·시·분
  function kst(d) {
    const k = new Date((d || new Date()).getTime() + 9 * 3600e3);
    return { y: k.getUTCFullYear(), m: k.getUTCMonth() + 1, d: k.getUTCDate(), h: k.getUTCHours(), mi: k.getUTCMinutes() };
  }
  const pad = (n) => String(n).padStart(2, "0");

  // ---------- 위치 (오늘·바다가 같이 써요) ----------
  const CITIES = [
    ["서울", 37.5665, 126.978], ["인천", 37.4563, 126.7052], ["수원", 37.2636, 127.0286], ["춘천", 37.8813, 127.7298],
    ["강릉", 37.7519, 128.8761], ["속초", 38.207, 128.5918], ["대전", 36.3504, 127.3845], ["청주", 36.6424, 127.489],
    ["전주", 35.8242, 127.148], ["광주", 35.1595, 126.8526], ["목포", 34.8118, 126.3922], ["여수", 34.7604, 127.6622],
    ["대구시", 35.8714, 128.6014], ["경주", 35.8562, 129.2247], ["포항", 36.019, 129.3435], ["울산", 35.5384, 129.3114],
    ["부산", 35.1796, 129.0756], ["통영", 34.8544, 128.4331], ["남해", 34.8377, 127.8924], ["태안", 36.7456, 126.2979],
    ["제주", 33.4996, 126.5312], ["서귀포", 33.2541, 126.5601],
  ];
  const LOC_KEY = "jepi.loc";
  const ZLOC = {
    cur: null, // { lat, lng, label, src: gps|city|record|default }
    subs: [],
    on(f) { this.subs.push(f); },
    set(l, save) {
      this.cur = l;
      if (save) { try { localStorage.setItem(LOC_KEY, JSON.stringify(l)); } catch (e) {} }
      for (const f of this.subs) { try { f(l); } catch (e) { console.error(e); } }
    },
    init() {
      if (this.cur && this.cur.src !== "default") return this.cur;
      // 저장값이 깨져 있으면(문자열·null·빠진 칸) 버려요 — 그대로 쓰면 toFixed 에서 오늘·바다가 영구히 멈춰요
      try {
        const s = JSON.parse(localStorage.getItem(LOC_KEY) || "null");
        const n = (v) => (typeof v === "number" ? v : typeof v === "string" && v.trim() ? +v : NaN);
        if (s && typeof s === "object" && isFinite(n(s.lat)) && isFinite(n(s.lng)) && Math.abs(n(s.lat)) <= 90 && Math.abs(n(s.lng)) <= 180) {
          this.cur = { lat: n(s.lat), lng: n(s.lng), label: typeof s.label === "string" ? s.label : "", src: ["gps", "city", "record"].includes(s.src) ? s.src : "city" };
          return this.cur;
        }
      } catch (e) {}
      const r = window.ZAPP && ZAPP.lastPlace();
      if (r) { this.cur = { lat: r.lat, lng: r.lng, label: "", src: "record" }; return this.cur; }
      this.cur = { lat: CITIES[0][1], lng: CITIES[0][2], label: "서울", src: "default" };
      return this.cur;
    },
    gps() {
      return new Promise((ok, no) => {
        if (!navigator.geolocation) return no(new Error(t("이 브라우저는 위치를 알려 주지 않아요.")));
        navigator.geolocation.getCurrentPosition(
          (p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude, label: "", src: "gps" }),
          (e) => no(new Error(e.code === 1 ? t("위치 권한이 꺼져 있어요. 브라우저 주소창의 자물쇠에서 켤 수 있어요.") : t("위치를 찾지 못했어요."))),
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
      });
    },
  };
  window.ZLOC = ZLOC;

  // 시군구 경계 (이름 찾기용) — 앱과 같은 sigungu.json
  let regionsP = null;
  function regions() {
    if (!regionsP) regionsP = fetch("sigungu.json").then((r) => r.json()).catch(() => []);
    return regionsP;
  }
  function inRing(x, y, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
      const xi = ring[i], yi = ring[i + 1], xj = ring[j], yj = ring[j + 1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  async function regionAt(lat, lng) {
    const rs = await regions();
    let best = null, bestD = 1e9;
    for (const r of rs) {
      let polys = r.p;
      if (typeof polys === "string") { try { polys = r.p = JSON.parse(polys); } catch (e) { continue; } }
      for (const poly of polys || []) {
        if (poly[0] && inRing(lng, lat, poly[0])) return { sido: r.s, name: r.n };
        // 바다 위면 가장 가까운 꼭짓점의 시군구
        const ring = poly[0] || [];
        for (let i = 0; i < ring.length; i += 8) {
          const d = (ring[i] - lng) ** 2 + (ring[i + 1] - lat) ** 2;
          if (d < bestD) { bestD = d; best = { sido: r.s, name: r.n, near: true }; }
        }
      }
    }
    return bestD < 0.05 ? best : null;
  }
  ZLOC.regionAt = regionAt;
  // 에어코리아 시도 이름
  function airSido(sido) {
    const m = { "서울특별시": "서울", "부산광역시": "부산", "대구광역시": "대구", "인천광역시": "인천", "광주광역시": "광주", "대전광역시": "대전", "울산광역시": "울산", "세종특별자치시": "세종", "경기도": "경기", "강원특별자치도": "강원", "강원도": "강원", "충청북도": "충북", "충청남도": "충남", "전북특별자치도": "전북", "전라북도": "전북", "전라남도": "전남", "경상북도": "경북", "경상남도": "경남", "제주특별자치도": "제주", "전남광주통합특별시": "전남" };
    return m[sido] || "";
  }

  // ---------- 계절·절기·제철·즐길 거리·노래 (앱과 같은 규칙) ----------
  const seasonOf = (m) => (m >= 3 && m <= 5 ? "spring" : m >= 6 && m <= 8 ? "summer" : m >= 9 && m <= 11 ? "autumn" : "winter");
  const SEASON_NAMES = ["한겨울", "늦겨울", "초봄", "봄", "늦봄", "초여름", "한여름", "늦여름", "초가을", "가을", "늦가을", "초겨울"];
  const LOOK = {
    spring: { emoji: "🌸", top: "#F9D9E3", bottom: "#FFF5F8", ink: "#8A2F4D", dtop: "#3A2330", dbottom: "#22181D", dink: "#F3B6CB" },
    summer: { emoji: "🌊", top: "#BFE6F2", bottom: "#F0FAFC", ink: "#0E5A73", dtop: "#16323B", dbottom: "#101E23", dink: "#9ED8EA" },
    autumn: { emoji: "🍁", top: "#F6D3AE", bottom: "#FFF6EC", ink: "#8A3B0E", dtop: "#3A2717", dbottom: "#211810", dink: "#F2BE8C" },
    winter: { emoji: "❄️", top: "#D5E3F5", bottom: "#F4F8FF", ink: "#1F3B66", dtop: "#1C2738", dbottom: "#121822", dink: "#B5CBEB" },
  };
  const ymd = (y, m, d) => Date.UTC(y, m - 1, d);
  function solarTerm(k) {
    const today = ymd(k.y, k.m, k.d);
    const list = [];
    for (const y of [k.y - 1, k.y, k.y + 1]) for (const s of DATA.terms) list.push({ at: ymd(y, s.m, s.d), name: s.name, note: s.note });
    let i = -1;
    for (let j = 0; j < list.length; j++) if (list[j].at <= today) i = j;
    if (i < 0) i = 0;
    return { now: list[i].name, note: list[i].note, next: list[i + 1].name, days: Math.round((list[i + 1].at - today) / 864e5) };
  }
  function actOn(a, k) {
    const md = k.m * 100 + k.d;
    return a.from <= a.to ? md >= a.from && md <= a.to : md >= a.from || md <= a.to;
  }
  function actLeft(a, k) {
    const today = ymd(k.y, k.m, k.d);
    // 윤년에는 2/28로 끝나는 것도 2/29까지 보여요 (actsNow와 맞춤, QA 11-26)
    const endOf = (y) => (a.to === 228 && y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? ymd(y, 2, 29) : ymd(y, Math.floor(a.to / 100), a.to % 100));
    let end = endOf(k.y);
    if (end < today) end = endOf(k.y + 1);
    return Math.round((end - today) / 864e5);
  }
  function actsNow(k) {
    // 윤년 2월 29일은 2월 28일로 봐요 (to: 228 인 겨울 즐길 거리가 하루 사라지던 것)
    if (k.m === 2 && k.d === 29) k = { ...k, d: 28 };
    return DATA.acts.filter((a) => actOn(a, k)).sort((a, b) => actLeft(a, k) - actLeft(b, k));
  }
  function songNow(k, o) {
    const pick = (f) => { const l = DATA.songs.filter(f); return l.length ? l[(k.d + k.h) % l.length] : null; };
    // 기본 위치(서울)일 때는 '왔으니까'가 사실이 아니라서 장소 노래를 건너뛰어요
    // 시군구 이름을 적어 둔 노래는 그 시군구에서만, 시도까지 적혀 있으면 시도도 맞아야 해요
    // (서울 '중구' 노래가 대구·대전·울산 중구에서 '중구에 왔으니까'로 나오던 것)
    const inSido = (s) => !!s.sido && (o.sido || "").includes(s.sido);
    const byPlace = o.region && !o.isDefault && pick((s) => (s.places.length ? s.places.includes(o.region) && (!s.sido || inSido(s)) : inSido(s)));
    if (byPlace) return { song: byPlace, why: t("{place}에 왔으니까", { place: o.region }) };
    if (o.snow) return { song: pick((s) => s.moment === "snow"), why: t("눈 오는 날") };
    if (o.rain) return { song: pick((s) => s.moment === "rain"), why: t("비 오는 날") };
    // 10월 31일 저녁·밤에만 (전에는 25일 낮부터 나오고, 정작 31일 밤에는 '밤' 노래에 밀렸어요)
    if (k.m === 10 && k.d === 31 && (o.sunset || o.night)) { const s = DATA.songs.find((x) => x.title === "잊혀진 계절"); if (s) return { song: s, why: t("10월의 마지막 밤") }; }
    if (o.sunset) return { song: pick((s) => s.moment === "sunset"), why: t("해 질 녘") };
    if (o.night) return { song: pick((s) => s.moment === "night"), why: t("밤하늘 아래") };
    if (o.dawn) return { song: pick((s) => s.moment === "dawn"), why: t("이른 아침") };
    return { song: pick((s) => s.moment === seasonOf(k.m)), why: t("{season}에", { season: t(SEASON_NAMES[k.m - 1]) }) };
  }

  // ---------- 날씨 ----------
  // WMO 날씨 코드 → 그림·말
  function wmo(c, day) {
    if (c === 0) return [day === 0 ? "🌙" : "☀️", "맑음"];
    if (c === 1 || c === 2) return [day === 0 ? "☁️" : "⛅", "구름 조금"];
    if (c === 3) return ["☁️", "흐림"];
    if (c === 45 || c === 48) return ["🌫️", "안개"];
    if (c >= 51 && c <= 57) return ["🌦️", "이슬비"];
    if (c >= 61 && c <= 67) return ["🌧️", "비"];
    if (c >= 71 && c <= 77) return ["🌨️", "눈"];
    if (c >= 80 && c <= 82) return ["🌦️", "소나기"];
    if (c === 85 || c === 86) return ["🌨️", "눈 소나기"];
    if (c >= 95) return ["⛈️", "뇌우"];
    return ["🌡️", ""];
  }
  const cache = new Map();
  async function cached(key, ms, f) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < ms) return hit.v;
    const v = await f();
    cache.set(key, { at: Date.now(), v });
    return v;
  }
  // 응답이 오지 않으면 10초에 끊어요 (안 그러면 오늘 탭 전체가 '준비하는 중'에 멈춰요)
  async function getJson(url) {
    const ac = new AbortController(), to = setTimeout(() => ac.abort(), 10000);
    try {
      const r = await fetch(url, { signal: ac.signal });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    } finally { clearTimeout(to); }
  }
  function openMeteo(lat, lng) {
    const u = "https://api.open-meteo.com/v1/forecast?latitude=" + lat.toFixed(3) + "&longitude=" + lng.toFixed(3) +
      "&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,is_day" +
      "&hourly=temperature_2m,precipitation_probability,weather_code,is_day" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max" +
      "&timezone=Asia%2FSeoul&forecast_days=8&wind_speed_unit=ms";
    const d = kst(new Date());
    return cached("om" + d.y + "-" + d.m + "-" + d.d + "|" + lat.toFixed(2) + lng.toFixed(2), 15 * 60e3, () => getJson(u));
  }
  function openMeteoAir(lat, lng) {
    const u = "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=" + lat.toFixed(3) + "&longitude=" + lng.toFixed(3) + "&current=pm10,pm2_5&timezone=Asia%2FSeoul";
    return cached("oa" + lat.toFixed(2) + lng.toFixed(2), 30 * 60e3, () => getJson(u));
  }
  // 기상청 격자 (앱 kmaGrid 와 같은 식)
  function kmaGrid(lat, lng) {
    const RE = 6371.00877, GRID = 5.0, SLAT1 = 30.0, SLAT2 = 60.0, OLON = 126.0, OLAT = 38.0, XO = 43, YO = 136;
    const D = Math.PI / 180, re = RE / GRID, s1 = SLAT1 * D, s2 = SLAT2 * D, olon = OLON * D, olat = OLAT * D;
    let sn = Math.tan(Math.PI * 0.25 + s2 * 0.5) / Math.tan(Math.PI * 0.25 + s1 * 0.5);
    sn = Math.log(Math.cos(s1) / Math.cos(s2)) / Math.log(sn);
    let sf = Math.tan(Math.PI * 0.25 + s1 * 0.5);
    sf = (Math.pow(sf, sn) * Math.cos(s1)) / sn;
    let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
    ro = (re * sf) / Math.pow(ro, sn);
    let ra = Math.tan(Math.PI * 0.25 + lat * D * 0.5);
    ra = (re * sf) / Math.pow(ra, sn);
    let theta = lng * D - olon;
    if (theta > Math.PI) theta -= 2 * Math.PI;
    if (theta < -Math.PI) theta += 2 * Math.PI;
    theta *= sn;
    return { nx: Math.floor(ra * Math.sin(theta) + XO + 0.5), ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5) };
  }
  function items(j) {
    const it = j && j.response && j.response.body && j.response.body.items;
    if (Array.isArray(it)) return it; // 에어코리아 JSON 은 items 가 바로 배열 (기상청은 items.item)
    const v = it && it.item;
    return Array.isArray(v) ? v : v ? [v] : [];
  }
  async function kmaNow(lat, lng) {
    const g = kmaGrid(lat, lng);
    let d = new Date();
    if (kst(d).mi < 40) d = new Date(d.getTime() - 3600e3);
    const k = kst(d);
    const q = "1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?pageNo=1&numOfRows=60&dataType=JSON&base_date=" + k.y + pad(k.m) + pad(k.d) + "&base_time=" + pad(k.h) + "00&nx=" + g.nx + "&ny=" + g.ny;
    return cached("kma" + g.nx + "," + g.ny + k.h, 20 * 60e3, async () => {
      const it = items(await ZAPP.proxy("/datago/" + q));
      if (!it.length) throw new Error("no data");
      const o = {};
      for (const x of it) o[x.category] = +x.obsrValue;
      return o;
    });
  }
  async function airKorea(sido) {
    const q = "B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty?sidoName=" + encodeURIComponent(sido) + "&returnType=json&numOfRows=200&pageNo=1&ver=1.0";
    return cached("air" + sido, 30 * 60e3, async () => {
      const it = items(await ZAPP.proxy("/datago/" + q));
      const avg = (key) => { const v = it.map((x) => parseFloat(x[key])).filter((x) => isFinite(x) && x >= 0); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
      const r = { pm10: avg("pm10Value"), pm25: avg("pm25Value"), at: (it[0] && it[0].dataTime) || "" };
      if (r.pm10 == null && r.pm25 == null) throw new Error("no data");
      return r;
    });
  }
  function grade(v, cuts) {
    if (v == null || !isFinite(v)) return ["", ""];
    if (v <= cuts[0]) return ["좋음", ""];
    if (v <= cuts[1]) return ["보통", ""];
    if (v <= cuts[2]) return ["나쁨", "warn"];
    return ["매우 나쁨", "bad"];
  }

  // ---------- 해·달·밤하늘 ----------
  const SYNODIC = 29.530588853;
  function moonAge(d) {
    const days = (d.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 864e5;
    const a = days % SYNODIC;
    return a < 0 ? a + SYNODIC : a;
  }
  function moonPhaseName(a) {
    if (a < 1.5 || a >= 28.0) return ["🌑", "그믐 · 삭"];
    if (a < 6.4) return ["🌒", "초승달"];
    if (a < 8.9) return ["🌓", "상현달"];
    if (a < 13.8) return ["🌔", "차오르는 달"];
    if (a < 15.8) return ["🌕", "보름달"];
    if (a < 21.1) return ["🌖", "기우는 달"];
    if (a < 23.6) return ["🌗", "하현달"];
    return ["🌘", "그믐달"];
  }
  const DIRS = ["북", "북동", "동", "남동", "남", "남서", "서", "북서"];
  const dirName = (az) => t(DIRS[Math.round(az / 45) % 8] + "쪽");
  function sky(lat, lng, now) {
    const A = window.Astronomy;
    const out = { moonRise: null, moonSet: null, illum: null, planets: [], darkFrom: null };
    if (!A) return out;
    try {
      const obs = new A.Observer(lat, lng, 0);
      const k = kst(now);
      const midnight = new Date(Date.UTC(k.y, k.m - 1, k.d) - 9 * 3600e3);
      const mr = A.SearchRiseSet(A.Body.Moon, obs, +1, midnight, 1);
      const ms = A.SearchRiseSet(A.Body.Moon, obs, -1, midnight, 1);
      out.moonRise = mr && mr.date; out.moonSet = ms && ms.date;
      out.illum = A.Illumination(A.Body.Moon, now).phase_fraction;
      // 천문 박명 끝 (해가 -18° 아래로)
      const dusk = A.SearchAltitude(A.Body.Sun, obs, -1, midnight, 1, -18);
      out.darkFrom = dusk && dusk.date;
      // 오늘 밤 9시에 보이는 행성
      const at = new Date(Date.UTC(k.y, k.m - 1, k.d, 21) - 9 * 3600e3);
      const names = { Venus: "금성", Mars: "화성", Jupiter: "목성", Saturn: "토성", Mercury: "수성" };
      for (const b of ["Venus", "Jupiter", "Mars", "Saturn", "Mercury"]) {
        const eq = A.Equator(A.Body[b], at, obs, true, true);
        const hor = A.Horizon(at, obs, eq.ra, eq.dec, "normal");
        const mag = A.Illumination(A.Body[b], at).mag;
        if (hor.altitude > 10 && mag < 2.5) out.planets.push({ name: names[b], alt: Math.round(hor.altitude), dir: dirName(hor.azimuth), mag });
      }
      const meq = A.Equator(A.Body.Moon, at, obs, true, true);
      out.moonAlt9 = A.Horizon(at, obs, meq.ra, meq.dec, "normal").altitude;
    } catch (e) { console.warn(e); }
    return out;
  }

  // ---------- 그리기 ----------
  const naverMap = (q) => "https://map.naver.com/p/search/" + encodeURIComponent(q);
  const naverSearch = (q) => "https://search.naver.com/search.naver?query=" + encodeURIComponent(q);
  const youtube = (q) => "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);
  const ext = 'target="_blank" rel="noopener"';
  const dark = () => document.documentElement.dataset.theme === "dark" || (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);

  let shownFor = "", busy = false, again = 0; // again: 불러오는 중에 들어온 요청 (1 보통, 2 force)
  function locLabel(l, reg) {
    if (l.label) return tOpt(l.label);
    if (reg) return (Z.lang === "ko" ? reg.sido.replace(/(통합특별시|특별자치도|특별자치시|광역시|특별시)$/, "") : tOpt(reg.sido)) + " " + reg.name;
    return l.lat.toFixed(3) + ", " + l.lng.toFixed(3);
  }
  function locBar(l, reg) {
    const src = { gps: "지금 있는 곳", record: "내 기록의 마지막 위치", default: "기본 위치", city: "고른 곳" }[l.src] || "";
    return '<div class="locbar"><div><div class="where">📍 ' + esc(locLabel(l, reg)) + '</div><div class="muted">' + esc(t(src)) + (reg && reg.near ? " · " + esc(t("가까운 바다")) : "") + "</div></div>" +
      '<div class="chips"><button type="button" data-loc="gps">◎ ' + esc(t("내 위치")) + "</button>" +
      '<select data-loc="city" aria-label="' + esc(t("다른 곳 보기")) + '"><option value="">' + esc(t("다른 곳 보기")) + "</option>" +
      CITIES.map((c, i) => '<option value="' + i + '">' + esc(tOpt(c[0])) + "</option>").join("") + "</select></div></div>";
  }
  function bindLoc(root, msgEl) {
    root.querySelector('[data-loc="gps"]').addEventListener("click", async (e) => {
      const b = e.currentTarget; b.disabled = true;
      try { ZLOC.set(await ZLOC.gps(), true); } catch (err) { if (msgEl) msgEl.textContent = err.message; else alertInline(root, err.message); }
      finally { b.disabled = false; }
    });
    root.querySelector('[data-loc="city"]').addEventListener("change", (e) => {
      const c = CITIES[+e.target.value];
      if (c) ZLOC.set({ lat: c[1], lng: c[2], label: c[0], src: "city" }, true);
    });
  }
  function alertInline(root, msg) {
    let m = root.querySelector(".locmsg");
    if (!m) { m = document.createElement("div"); m.className = "needlogin locmsg"; root.querySelector(".locbar").after(m); }
    m.textContent = msg;
  }
  ZLOC.bar = locBar; ZLOC.bind = bindLoc; ZLOC.label = locLabel;

  const pct = (v) => (v == null || !isFinite(+v) ? "–" : Math.round(+v));
  // 응답 칸이 빠져도(daily·hourly·sunrise …) 탭 전체가 오류로 바뀌지 않게
  const arr = (o, k) => (o && Array.isArray(o[k]) ? o[k] : []);
  const kdt = (s) => { if (typeof s !== "string") return null; const d = new Date(s + ":00+09:00"); return isFinite(d) ? d : null; };
  const fix1 = (v) => (v == null || !isFinite(+v) ? "–" : (+v).toFixed(1));
  async function render(force) {
    const root = $("todayRoot");
    if (!root) return;
    if (busy) { again = Math.max(again, force ? 2 : 1); return; } // 끝나면 다시 그려요 (불러오는 중 도시 바꾸기)
    const l = ZLOC.init();
    const now = new Date(), k = kst(now);
    const key = l.lat.toFixed(3) + l.lng.toFixed(3) + k.y + "-" + k.m + "-" + k.d + "h" + k.h + (ZAPP.signedIn() ? "s" : "");
    if (!force && key === shownFor) return;
    busy = true;
    try {
      const reg = await regionAt(l.lat, l.lng);
      const ss = seasonOf(k.m), lk = LOOK[ss], dk = dark();
      const term = solarTerm(k);
      let wx = null, air = null, kma = null, wxErr = "", airSrc = "";
      const signed = ZAPP.signedIn();
      const jobs = [
        openMeteo(l.lat, l.lng).then((v) => (wx = v)).catch((e) => { wxErr = e.message; console.warn("open-meteo", e); }),
        (async () => {
          const sd = reg && airSido(reg.sido);
          if (signed && sd) { try { air = await airKorea(sd); airSrc = t("에어코리아 · {sido} 평균", { sido: Z.lang === "ko" ? sd : tOpt(reg.sido) }); return; } catch (e) {} }
          try { const a = await openMeteoAir(l.lat, l.lng); const rv = (v) => (v == null || !isFinite(+v) ? null : Math.round(+v)); air = { pm10: rv(a.current && a.current.pm10), pm25: rv(a.current && a.current.pm2_5) }; if (air.pm10 == null && air.pm25 == null) { air = null; throw new Error("no data"); } airSrc = t("예측 모델 값"); } catch (e) {}
        })(),
      ];
      if (signed) jobs.push(kmaNow(l.lat, l.lng).then((v) => (kma = v)).catch(() => {}));
      await Promise.all(jobs);

      const cur = wx && wx.current;
      const daily = wx && wx.daily && Array.isArray(wx.daily.time) ? wx.daily : null;
      const sunrise = kdt(arr(daily, "sunrise")[0]);
      const sunset = kdt(arr(daily, "sunset")[0]);
      const sk = sky(l.lat, l.lng, now);
      const code = cur ? cur.weather_code : -1;
      const rain = kma ? kma.PTY === 1 || kma.PTY === 2 || kma.PTY === 5 || kma.PTY === 6 : code >= 51 && code <= 67 || (code >= 80 && code <= 82);
      const snow = kma ? kma.PTY === 3 || kma.PTY === 7 : code >= 71 && code <= 77 || code === 85 || code === 86;
      const nowMs = now.getTime();
      const isSunset = sunset && Math.abs(nowMs - sunset.getTime()) < 45 * 60e3;
      const isDawn = sunrise && nowMs < sunrise.getTime() + 60 * 60e3 && nowMs > sunrise.getTime() - 60 * 60e3;
      const isNight = sunset && sunrise && (nowMs > sunset.getTime() + 45 * 60e3 || nowMs < sunrise.getTime() - 60 * 60e3);
      const song = songNow(k, { isDefault: l.src === "default", region: reg && reg.name, sido: reg && reg.sido, rain, snow, sunset: isSunset, night: isNight, dawn: isDawn });
      const foods = DATA.foods.filter((f) => f.months.includes(k.m));
      const acts = actsNow(k).slice(0, 6);

      let h = locBar(l, reg);
      // 계절 머리
      h += '<div class="seasonhead" style="background:linear-gradient(160deg,' + (dk ? lk.dtop : lk.top) + "," + (dk ? lk.dbottom : lk.bottom) + ");color:" + (dk ? lk.dink : lk.ink) + '">' +
        '<div class="muted" style="color:inherit;opacity:.8">' + esc(fmtDate.format(now)) + "</div>" +
        '<div class="t">' + lk.emoji + " " + esc(t(SEASON_NAMES[k.m - 1])) + " · " + esc(tOpt(term.now)) + "</div>" +
        "<div>" + esc(tOpt(term.note)) + " " + esc(t("{next}까지 {n}일", { next: tOpt(term.next), n: term.days })) + "</div></div>";

      h += '<div class="cardgrid">';
      // 날씨
      if (cur) {
        let [em, txt] = wmo(code, cur.is_day);
        // 기상청 실황이 비·눈이면 그림·말도 맞춰요 ('-3° 맑음'인데 눈 노래가 나오던 것)
        if (kma && snow) [em, txt] = ["🌨️", "눈"];
        else if (kma && rain) [em, txt] = ["🌧️", "비"];
        const temp = kma && isFinite(kma.T1H) ? kma.T1H : cur.temperature_2m;
        const hum = kma && isFinite(kma.REH) ? kma.REH : cur.relative_humidity_2m;
        const wind = kma && isFinite(kma.WSD) ? kma.WSD : cur.wind_speed_10m;
        const rn = kma && isFinite(kma.RN1) ? kma.RN1 : cur.precipitation;
        h += '<article class="card2"><h2>' + esc(t("지금 날씨")) + "<small>" + esc(kma && isFinite(kma.T1H) ? t("기상청 초단기 실황") : "Open-Meteo") + "</small></h2>" +
          '<div style="display:flex;align-items:center;gap:14px"><span style="font-size:44px" aria-hidden="true">' + em + '</span><div><div class="big">' + pct(temp) + '°</div><div class="muted">' + esc(t(txt)) + " · " + esc(t("체감 {n}°", { n: pct(cur.apparent_temperature) })) + "</div></div></div>" +
          '<dl class="kv"><dt>' + esc(t("습도")) + "</dt><dd>" + pct(hum) + "%</dd><dt>" + esc(t("바람")) + "</dt><dd>" + fix1(wind) + " m/s</dd><dt>" + esc(t("강수")) + "</dt><dd>" + fix1(rn) + " mm</dd>" +
          (daily ? "<dt>" + esc(t("오늘")) + "</dt><dd>" + pct(arr(daily, "temperature_2m_min")[0]) + "° / " + pct(arr(daily, "temperature_2m_max")[0]) + "° · " + esc(t("비 올 확률 {n}%", { n: pct(arr(daily, "precipitation_probability_max")[0]) })) + "</dd>" : "") +
          "</dl>";
        // 시간별 24시간
        const hr = wx.hourly, ht = arr(hr, "time"), start = ht.findIndex((x) => { const d = kdt(x); return d && d.getTime() >= nowMs - 3600e3; });
        if (start >= 0) {
          h += '<div class="hours" aria-label="' + esc(t("시간별")) + '">';
          for (let i = start; i < Math.min(start + 24, ht.length); i++) {
            const [e2] = wmo(arr(hr, "weather_code")[i], arr(hr, "is_day")[i]);
            const d2 = kdt(ht[i]); if (!d2) continue;
            h += "<div><span>" + esc(fmtHour.format(d2)) + '</span><span aria-hidden="true">' + e2 + "</span><b>" + pct(arr(hr, "temperature_2m")[i]) + "°</b><span>" + pct(arr(hr, "precipitation_probability")[i] || 0) + "%</span></div>";
          }
          h += "</div>";
        }
        // 며칠
        h += '<dl class="kv">';
        for (let i = 1; i < arr(daily, "time").length; i++) {
          const d3 = new Date(daily.time[i] + "T12:00:00+09:00"); if (!isFinite(d3)) continue;
          const [e3, t3] = wmo(arr(daily, "weather_code")[i], 1);
          h += "<dt>" + esc(fmtWd.format(d3)) + "</dt><dd>" + e3 + " " + pct(arr(daily, "temperature_2m_min")[i]) + "° / " + pct(arr(daily, "temperature_2m_max")[i]) + "° · " + esc(t(t3)) + " · " + pct(arr(daily, "precipitation_probability_max")[i]) + "%</dd>";
        }
        h += "</dl>";
        if (!signed) h += '<div class="muted">' + esc(t("로그인하면 기상청 실황 값으로 보여요.")) + "</div>";
        h += "</article>";
      } else {
        h += '<article class="card2"><h2>' + esc(t("지금 날씨")) + '</h2><div class="muted">' + esc(t("날씨를 불러오지 못했어요.")) + "</div></article>";
      }

      // 공기
      h += '<article class="card2"><h2>' + esc(t("미세먼지")) + "<small>" + esc(airSrc) + "</small></h2>";
      if (air) {
        const g10 = grade(air.pm10, [30, 80, 150]), g25 = grade(air.pm25, [15, 35, 75]);
        h += '<dl class="kv"><dt>' + esc(t("미세먼지")) + " PM10</dt><dd>" + (air.pm10 ?? "–") + ' ㎍/㎥ <span class="pill ' + g10[1] + '">' + esc(t(g10[0])) + "</span></dd>" +
          "<dt>" + esc(t("초미세먼지")) + " PM2.5</dt><dd>" + (air.pm25 ?? "–") + ' ㎍/㎥ <span class="pill ' + g25[1] + '">' + esc(t(g25[0])) + "</span></dd></dl>";
        const worst = [g10[1], g25[1]].includes("bad") ? "bad" : [g10[1], g25[1]].includes("warn") ? "warn" : "";
        h += '<div class="muted">' + esc(t(worst === "bad" ? "바깥 활동은 줄이고 마스크를 챙기세요." : worst === "warn" ? "오래 걷는다면 마스크를 챙기세요." : "밖에 나가기 좋은 공기예요.")) + "</div>";
        if (!signed) h += '<div class="muted">' + esc(t("로그인하면 에어코리아 측정값으로 보여요.")) + "</div>";
      } else h += '<div class="muted">' + esc(t("공기 정보를 불러오지 못했어요.")) + "</div>";
      h += "</article>";

      // 해와 달
      const age = moonAge(now), [mEmoji, mName] = moonPhaseName(age);
      h += '<article class="card2"><h2>' + esc(t("해와 달")) + "</h2>" +
        '<dl class="kv">' +
        (sunrise ? "<dt>🌅 " + esc(t("해 뜨는 시각")) + "</dt><dd>" + esc(fmtTime.format(sunrise)) + "</dd>" : "") +
        (sunset ? "<dt>🌇 " + esc(t("해 지는 시각")) + "</dt><dd>" + esc(fmtTime.format(sunset)) + "</dd>" : "") +
        (sunrise && sunset ? "<dt>☀️ " + esc(t("낮 길이")) + "</dt><dd>" + esc(t("{h}시간 {m}분", { h: Math.floor(Math.round((sunset - sunrise) / 60e3) / 60), m: Math.round((sunset - sunrise) / 60e3) % 60 })) + "</dd>" : "") +
        "<dt>" + mEmoji + " " + esc(t("달")) + "</dt><dd>" + esc(t(mName)) + " · " + esc(window.ZLUNAR ? t("음력 {n}일", { n: ZLUNAR.lunarDay(now) }) : t("음력 {n}일쯤", { n: Math.floor(age) + 1 })) + (sk.illum != null ? " · " + Math.round(sk.illum * 100) + "%" : "") + "</dd>" +
        (sk.moonRise ? "<dt>🌙 " + esc(t("달 뜨는 시각")) + "</dt><dd>" + esc(fmtTime.format(sk.moonRise)) + "</dd>" : "") +
        (sk.moonSet ? "<dt>🌘 " + esc(t("달 지는 시각")) + "</dt><dd>" + esc(fmtTime.format(sk.moonSet)) + "</dd>" : "") +
        "</dl></article>";

      // 밤하늘
      h += '<article class="card2" id="skyCard"><h2>' + esc(t("오늘 밤하늘")) + "<small>" + esc(t("밤 9시 기준")) + "</small></h2>";
      let moonUp = sk.moonAlt9 != null && sk.moonAlt9 > 0, illum = sk.illum;
      if (sk.moonAlt9 == null) {
        // astronomy-engine이 없으면 달 나이로 어림: 밤 9시에 떠 있는 때(4~18일)·밝기
        const a9 = moonAge(new Date(Date.UTC(k.y, k.m - 1, k.d, 12)));
        illum = (1 - Math.cos((2 * Math.PI * a9) / SYNODIC)) / 2;
        moonUp = a9 > 4 && a9 < 18;
      }
      const bright = illum != null && illum > 0.5 && moonUp;
      const cloud = (() => { const i = arr(wx && wx.hourly, "time").findIndex((x) => typeof x === "string" && x.endsWith("T21:00")); const c = i >= 0 ? arr(wx.hourly, "weather_code")[i] : -1; return c == null ? -1 : c; })();
      const cloudy = cloud >= 3;
      // 밤 9시 구름을 모르면(날씨 실패) '좋은 밤'이라고 단정하지 않아요
      if (cloudy || bright || cloud >= 0) h += '<div class="pill ' + (cloudy || bright ? "warn" : "") + '">' + esc(t(cloudy ? "구름이 많아 별 보기 어려워요" : bright ? "달이 밝아 희미한 별은 잘 안 보여요" : "별 보기 좋은 밤이에요")) + "</div>";
      if (sk.darkFrom) h += '<div class="muted">' + esc(t("하늘이 완전히 어두워지는 시각 {time}", { time: fmtTime.format(sk.darkFrom) })) + "</div>";
      if (sk.planets.length) {
        h += '<dl class="kv">' + sk.planets.map((p) => "<dt>✨ " + esc(t(p.name)) + "</dt><dd>" + esc(p.dir) + " · " + esc(t("높이 {n}°", { n: p.alt })) + "</dd>").join("") + "</dl>";
      } else if (window.Astronomy) h += '<div class="muted">' + esc(t("밤 9시에 맨눈으로 볼 만한 행성은 없어요.")) + "</div>";
      h += '<div class="muted">' + esc(t("도시 불빛에서 멀어질수록 별이 많이 보여요.")) + "</div></article>";

      // 지금 즐길 거리
      h += '<article class="card2"><h2>' + esc(t("지금 즐길 거리")) + "<small>" + esc(t("끝나 가는 것부터")) + "</small></h2>";
      if (acts.length) {
        h += '<dl class="kv" style="grid-template-columns:auto 1fr">' + acts.map((a) => {
          const left = actLeft(a, k);
          let href = "";
          if (a.go === "tide") href = "#sea";
          else if (a.go === "sky") href = "#skyCard";
          // wizard 의 arg(camp·spa·sea·valley)는 앱 마법사용 영어 키라 검색어로 쓰지 않아요
          else href = naverSearch((a.go !== "wizard" && a.arg) || a.title);
          const isExt = !href.startsWith("#");
          return "<dt>" + a.emoji + '</dt><dd><a href="' + esc(href) + '" ' + (isExt ? ext : "") + ' data-act="' + esc(a.go) + '"><b>' + esc(tOpt(a.title)) + "</b></a>" + (left <= 14 ? ' <span class="pill warn">' + esc(t("{n}일 남음", { n: left })) + "</span>" : "") + '<div class="muted">' + esc(tOpt(a.why)) + "</div></dd>";
        }).join("") + "</dl>";
      } else h += '<div class="muted">' + esc(t("지금은 딱 맞는 게 없어요.")) + "</div>";
      h += "</article>";

      // 제철 음식
      h += '<article class="card2"><h2>' + esc(t("이달의 제철")) + "<small>" + esc(t("{m}월", { m: k.m })) + "</small></h2>";
      h += foods.map((f) => '<div><b>' + f.emoji + " " + esc(tOpt(f.name)) + '</b> <span class="muted">' + esc(tOpt(f.note)) + '</span><div class="chips" style="margin-top:4px">' +
        f.origins.map((o) => '<a href="' + naverMap(o + " " + f.query) + '" ' + ext + ">📍 " + esc(o) + "</a>").join("") + "</div></div>").join("");
      h += "</article>";

      // 노래
      if (song && song.song) {
        h += '<article class="card2"><h2>' + esc(t("지금 들을 노래")) + "<small>" + esc(song.why) + "</small></h2>" +
          '<div style="font-size:18px">🎵 <b>' + esc(song.song.title) + "</b> · " + esc(song.song.artist) + "</div>" +
          '<div class="chips"><a href="' + youtube(song.song.artist + " " + song.song.title) + '" ' + ext + ">▶ " + esc(t("유튜브에서 듣기")) + "</a></div></article>";
      }
      h += "</div>";
      root.innerHTML = h;
      bindLoc(root);
      root.querySelectorAll('[data-act="sky"]').forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); $("skyCard").scrollIntoView({ behavior: "smooth", block: "center" }); }));
      root.querySelectorAll('[data-act="tide"]').forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); ZAPP.showTab("sea"); }));
      shownFor = key;
    } catch (e) {
      console.error(e);
      root.innerHTML = '<div class="needlogin">' + esc(t("오늘 정보를 준비하지 못했어요.")) + " " + esc(e.message || e) + "</div>";
    } finally {
      busy = false;
      if (again) { const f = again === 2; again = 0; render(f); }
    }
  }

  ZLOC.on(() => { shownFor = ""; if (!$("view-today").hidden) render(true); });
  window.ZTODAY = { show: () => render(false), refresh: () => render(true) };
  // 켜 둔 채 자정·시간이 바뀌면 다시 그려요 (key 에 날짜·시가 들어 있어 같은 시간엔 그대로, QA 11-26)
  setInterval(() => { const v = document.getElementById("view-today"); if (window.ZAPP_READY && v && !v.hidden && !document.hidden) render(false); }, 60e3);
  // 로그인 상태가 바뀌면 다시
  window.addEventListener("zapp-auth", () => { shownFor = ""; if (window.ZAPP_READY && !$("view-today").hidden) render(true); });
  // app.html 준비가 이 파일보다 먼저 끝났으면(예: CDN 실패) 지금 그려요
  if (window.ZAPP_READY && !$("view-today").hidden) render(false);
})();
