// 바람소리 웹 · 주말농장 (이번 주말 할 일 · 물주기 · 서리 · 병해충 · 텃밭 달력 · 사진 진단)
// 앱의 lib/farm/*.dart, lib/screens/farm_screen.dart 를 옮겨 왔어요.
(function () {
  const Z = window.ZI18N, t = Z.t, tOpt = Z.tOpt;
  const CROPS = window.ZFARM_CROPS;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const locale = { ko: "ko-KR", en: "en-US", zh: "zh-CN", ja: "ja-JP" }[Z.lang] || "ko-KR";
  const fmtMd = new Intl.DateTimeFormat(locale, { month: "numeric", day: "numeric" });
  const fmtMon = new Intl.DateTimeFormat(locale, { month: "short" });
  const fmtWd = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const KEY = "jepi.farm.v1";
  // 흰 글자 11px 이 AA(4.5:1)를 넘게 조금 진하게 (QA 11-26 C7: 3.0~4.3 이던 것)
  const KIND = { sow: ["씨 뿌리기", "#8F6412"], plant: ["모종 심기", "#25763F"], care: ["관리", "#3A6797"], harvest: ["수확", "#B23B24"] };
  const byId = (id) => CROPS.find((c) => c.id === id);
  const cities = [["서울", 37.5665, 126.978], ["수원", 37.2636, 127.0286], ["춘천", 37.8813, 127.7298], ["대전", 36.3504, 127.3845], ["청주", 36.6424, 127.489], ["전주", 35.8242, 127.148], ["광주", 35.1595, 126.8526], ["대구시", 35.8714, 128.6014], ["부산", 35.1796, 129.0756], ["강릉", 37.7519, 128.8761], ["제주", 33.4996, 126.5312]];

  // ---------- 지역 보정 (앱 zoneOf 와 같음) ----------
  const ZONES = { jeju: ["제주", -21], south: ["남부", -10], central: ["중부", 0], north: ["중북부·산간", 7] };
  function zoneOf(lat, lng) {
    if (lat == null) return "central";
    if (lat < 33.8) return "jeju";
    if (lat < 35.6) return "south";
    if (lat >= 37.7 || (lng >= 127.9 && lat >= 37.2)) return "north";
    return "central";
  }
  const day0 = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  function range(task, year, zone) {
    const sp = ZONES[zone][1];
    const shift = task.s === "S" ? sp : task.s === "A" ? -sp : Math.trunc(sp / 2);
    const s = addDays(new Date(year, Math.floor(task.f / 100) - 1, task.f % 100), shift);
    let e = addDays(new Date(year, Math.floor(task.t / 100) - 1, task.t % 100), shift);
    if (task.t < task.f) e = addDays(new Date(year + 1, Math.floor(task.t / 100) - 1, task.t % 100), shift);
    return [s, e];
  }
  function tasksAround(mine, d, zone, slack = 3) {
    const out = [];
    for (const c of mine) for (const tk of c.tasks) for (const y of [d.getFullYear() - 1, d.getFullYear()]) {
      const [s, e] = range(tk, y, zone);
      if (d >= addDays(s, -slack) && d <= addDays(e, slack)) out.push({ c, tk, s, e });
    }
    return out;
  }
  function upcoming(mine, d, zone, days = 60) {
    const out = [];
    for (const c of mine) for (const tk of c.tasks) for (const y of [d.getFullYear(), d.getFullYear() + 1]) {
      const [s, e] = range(tk, y, zone);
      const diff = Math.round((s - d) / 864e5);
      if (diff > 3 && diff <= days) out.push({ c, tk, s, e, diff });
    }
    return out.sort((a, b) => a.s - b.s);
  }
  // 밭에 있을 때: 첫 심기(씨·모종)부터 마지막 수확 끝까지 (가을에 심어 이듬해 거두는 마늘·양파·딸기 포함)
  function inGround(c, d, zone) {
    const st = c.tasks.filter((x) => x.k === "sow" || x.k === "plant"), hv = c.tasks.filter((x) => x.k === "harvest");
    if (!st.length || !hv.length) return true;
    for (const s0 of st) for (const y of [d.getFullYear() - 1, d.getFullYear()]) {
      const s = range(s0, y, zone)[0];
      const ends = hv.map((h) => { let e = range(h, y, zone)[1]; if (e < s) e = range(h, y + 1, zone)[1]; return e; }).filter((e) => e >= s);
      if (!ends.length) continue;
      const e = new Date(Math.min(...ends)); // 이 심기에 이어지는 첫 수확 끝
      if (d >= addDays(s, -3) && d <= addDays(e, 3)) return true;
    }
    return false;
  }
  const pestsIn = (mine, m) => mine.flatMap((c) => c.pests.filter((p) => p.months.includes(m)).map((p) => ({ c, p })));
  function shouldWater(waterDays, past3, next2, tmax, leafy) {
    if (tmax < 5) return [false, t("추워서 물은 쉬어도 돼요")];
    if (next2 >= 10) return [false, t("이틀 안에 비 {n}mm 예보 — 물 안 줘도 돼요", { n: Math.round(next2) })];
    if (past3 >= 15) return [false, t("최근 비 {n}mm — 흙이 젖어 있어요", { n: Math.round(past3) })];
    const hot = tmax >= 28;
    if (waterDays <= 2 || hot) return [true, hot ? t("최고 {n}° 더워요 — 흠뻑, 아침이나 저녁에", { n: Math.round(tmax) }) : (leafy ? t("잎채소는 자주 — 흠뻑 주세요") : t("물을 자주 찾는 작물이에요 — 흠뻑 주세요"))];
    if (past3 < 3) return [true, t("최근 비가 거의 없어요 — 흠뻑 주세요")];
    return [false, t("흙을 손가락 한 마디 파 보고 말랐으면 주세요")];
  }
  function weekendOf(now) {
    const d = day0(now);
    if (d.getDay() === 6) return d;
    if (d.getDay() === 0) return addDays(d, -1);
    return addDays(d, 6 - d.getDay());
  }

  // ---------- 날씨 (지난 7일 + 앞으로 10일, Open-Meteo) ----------
  const wxCache = new Map();
  async function farmWx(lat, lng) {
    const k = lat.toFixed(2) + "," + lng.toFixed(2);
    const hit = wxCache.get(k);
    if (hit && Date.now() - hit.at < 3600e3) return hit.v;
    const j = await fetch("https://api.open-meteo.com/v1/forecast?latitude=" + lat.toFixed(4) + "&longitude=" + lng.toFixed(4) + "&timezone=Asia%2FSeoul&past_days=7&forecast_days=10&daily=temperature_2m_min,temperature_2m_max,precipitation_sum").then((r) => r.json());
    const d = j.daily;
    const v = d.time.map((x, i) => ({ day: new Date(x + "T00:00:00"), tmin: d.temperature_2m_min[i], tmax: d.temperature_2m_max[i], rain: d.precipitation_sum[i] || 0 }));
    wxCache.set(k, { at: Date.now(), v });
    return v;
  }
  const rainSum = (wx, from, days) => wx.filter((d) => d.day >= from && d.day < addDays(from, days)).reduce((a, d) => a + d.rain, 0);

  // ---------- 저장 ----------
  // 저장값·서버(앱) 값의 모양이 조금 달라도 탭이 멈추지 않게 맞춰요. 모르는 칸(앱 쪽 필드)은 그대로 둬요 (QA 11-23)
  const numOrNull = (v) => (v === null || v === "" || v === undefined || !Number.isFinite(+v) ? null : +v);
  const normFarm = (j) => {
    j = j && typeof j === "object" && !Array.isArray(j) ? j : {};
    // 위도·경도 중 하나만 있으면 위치 없음으로 (QA 11-24: lat만 있으면 toFixed 오류로 영구 멈춤)
    const lat = numOrNull(j.lat), lng = numOrNull(j.lng), hasLoc = lat != null && lng != null;
    return {
      ...j,
      name: typeof j.name === "string" && j.name ? j.name : "내 텃밭",
      lat: hasLoc ? lat : null, lng: hasLoc ? lng : null,
      label: typeof j.label === "string" ? j.label : "",
      crops: Array.isArray(j.crops) ? j.crops.map((c) => (typeof c === "string" ? c : c && typeof c.id === "string" ? c.id : null)).filter(Boolean) : [],
      notes: j.notes && typeof j.notes === "object" && !Array.isArray(j.notes) ? j.notes : {},
      updated: typeof j.updated === "number" ? j.updated : 0,
    };
  };
  let farm = normFarm((() => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } })());
  // 고칠 때마다 시각을 붙이고, 로그인했으면 폰과 맞춰요 (서버 이름 'farm', 앱 farm_v1 과 같은 모양)
  const save = () => {
    // 시계가 늦은 기기에서 고쳐도 방금 받은 것보다 새것이 되게 (QA 11-25: 폰 시계가 빠르면 웹 수정이 다음 맞추기 때 되돌아가던 것)
    farm.updated = Math.max(Date.now(), (farm.updated || 0) + 1);
    const s = JSON.stringify(farm);
    try { localStorage.setItem(KEY, s); } catch (e) {}
    if (window.ZDOCS && !needMerge()) ZDOCS.push("farm", s); // 첫 로그인 합치기 전에는 폰 텃밭을 덮지 않게 기다려요
  };
  const MERGE = "jepi.farm.merge";
  const needMerge = () => { try { return localStorage.getItem(MERGE) === "1"; } catch (e) { return false; } };
  // 이 브라우저 첫 로그인: 로그인 전에 만든 웹 텃밭을 서버(폰) 텃밭에 더해요. 실패하면 다음에 다시 (QA 11-26 B7)
  async function mergeFirst() {
    if (!window.ZAPP || !ZAPP.signedIn()) return false;
    let remote = null;
    try { remote = await ZAPP.docGet("farm"); } catch (e) { console.warn("farm merge", e); return false; }
    let r = null;
    try { r = remote ? normFarm(JSON.parse(remote)) : null; } catch (e) {}
    if (r) {
      const crops = [...r.crops, ...farm.crops.filter((c) => !r.crops.includes(c))];
      const loc = r.lat != null ? { lat: r.lat, lng: r.lng, label: r.label, name: r.name } : { lat: farm.lat, lng: farm.lng, label: farm.label, name: farm.name };
      const added = farm.crops.filter((c) => !r.crops.includes(c) && byId(c)).length;
      if (added) mergedMsg = t("이 브라우저에서 고른 작물 {n}가지를 폰 텃밭에 더했어요. 이제 폰과 같이 맞춰져요.", { n: added });
      farm = { ...farm, ...r, ...loc, crops, notes: { ...farm.notes, ...r.notes } };
    }
    farm.updated = Math.max(Date.now(), ((r && r.updated) || 0) + 1);
    const s = JSON.stringify(farm);
    try { localStorage.setItem(KEY, s); localStorage.removeItem(MERGE); } catch (e) {}
    ZDOCS.push("farm", s);
    picking = !farm.crops.length;
    return true;
  }
  async function syncFarm() {
    if (!window.ZDOCS) return false;
    let local = null;
    try { local = localStorage.getItem(KEY); } catch (e) {}
    if (needMerge()) return mergeFirst();
    const before = farm.updated;
    const got = await ZDOCS.sync("farm", local);
    if (!got) return false;
    // 서버를 기다리는 사이에 웹에서 고쳤으면 내 것(더 새것)을 지키고, 그 수정은 save()가 이미 올리는 중이에요 (QA 11-23)
    if (farm.updated !== before) return false;
    try {
      farm = normFarm(JSON.parse(got));
      localStorage.setItem(KEY, JSON.stringify(farm));
      picking = !farm.crops.length;
      return true;
    } catch (e) { return false; }
  }
  let mergedMsg = "", picking = !farm.crops.length, openCrop = null, memoOrig = "", wx = null, wxErr = "", diag = null;

  // ---------- 그리기 ----------
  const cropName = (c) => tOpt(c.name);
  const kindLabel = (k) => t(KIND[k][0]);
  function pickerHtml() {
    const groups = [...new Set(CROPS.map((c) => c.group))];
    const nMine = farm.crops.filter(byId).length; // 이 버전이 모르는 작물 id는 세지 않아요 (QA 11-25)
    return '<article class="card2"><h2>' + esc(t("무엇을 키우나요?")) + "<small>" + esc(t("{zone} 기준 · 노란 테두리는 곧 심을 때예요", { zone: t(ZONES[zoneOf(farm.lat, farm.lng)][0]) })) + "</small></h2>" +
      groups.map((g) => "<div><b>" + esc(t(g)) + '</b><div class="chips" style="margin-top:6px">' + CROPS.filter((c) => c.group === g).map((c) => {
        const on = farm.crops.includes(c.id);
        const soon = upcoming([c], day0(new Date()), zoneOf(farm.lat, farm.lng), 30).some((u) => u.tk.k === "plant" || u.tk.k === "sow");
        return '<button type="button" class="' + (on ? "on" : "") + (soon ? " soon" : "") + '" data-crop="' + c.id + '" aria-pressed="' + on + '">' + c.emoji + " " + esc(cropName(c)) + "</button>";
      }).join("") + "</div></div>").join("") +
      '<div class="row" style="display:flex;gap:8px"><button class="btn primary" type="button" data-fa="pickdone"' + (nMine ? "" : " disabled") + ">" + esc(nMine ? t("{n}가지 저장", { n: nMine }) : t("키울 작물을 골라 주세요")) + "</button>" + (nMine ? '<button class="btn" type="button" data-fa="pickcancel">' + esc(t("닫기")) + "</button>" : "") + "</div></article>";
  }
  function placeHtml() {
    const z = zoneOf(farm.lat, farm.lng);
    return '<div class="locbar"><div><div class="where">🌱 ' + esc(farm.name === "내 텃밭" ? t("내 텃밭") : farm.name) + '</div><div class="muted">' +
      (farm.lat != null ? esc(farm.label ? tOpt(farm.label) : farm.lat.toFixed(3) + ", " + farm.lng.toFixed(3)) + " · " + esc(t("{zone} 기준", { zone: t(ZONES[z][0]) })) : esc(t("위치를 정하면 날씨·물주기·서리 판단이 붙어요"))) +
      '</div></div><div class="chips"><button type="button" data-fa="gps">◎ ' + esc(t("지금 위치를 텃밭으로")) + '</button><select data-fa="city" aria-label="' + esc(t("텃밭 위치")) + '"><option value="">' + esc(t("텃밭 위치")) + "</option>" +
      cities.map((c, i) => '<option value="' + i + '">' + esc(tOpt(c[0])) + "</option>").join("") + '</select><button type="button" data-fa="pick">✏️ ' + esc(t("작물 고르기")) + "</button></div></div>";
  }
  function weekendHtml(mine, zone) {
    const sat = weekendOf(new Date());
    const tasks = tasksAround(mine, sat, zone);
    const pests = pestsIn(mine, sat.getMonth() + 1);
    let waterNeeded = false, satWx = null, sunWx = null, frost = false, past = 0, next = 0, tmax = 20;
    if (wx) {
      satWx = wx.find((d) => +d.day === +sat); sunWx = wx.find((d) => +d.day === +addDays(sat, 1));
      const today = day0(new Date());
      frost = wx.some((d) => d.day >= today && d.tmin != null && d.tmin <= 2);
      past = rainSum(wx, addDays(sat, -3), 3); next = rainSum(wx, sat, 2);
      const known = wx.filter((d) => d.tmax != null).map((d) => d.tmax);
      tmax = satWx && satWx.tmax != null ? satWx.tmax : known.length ? Math.max(...known) : 20;
    }
    let h = '<article class="card2" style="background:color-mix(in srgb, #F4C542 16%, var(--surface))"><h2>' + esc(t("이번 주말 · {date}", { date: fmtMd.format(sat) })) +
      (satWx ? "<small>" + esc(fmtWd.format(sat)) + " " + Math.round(satWx.tmin) + "~" + Math.round(satWx.tmax) + "°" + (satWx.rain >= 1 ? " · " + esc(t("비 {n}mm", { n: Math.round(satWx.rain) })) : "") + (sunWx ? "  " + esc(fmtWd.format(addDays(sat, 1))) + " " + Math.round(sunWx.tmin) + "~" + Math.round(sunWx.tmax) + "°" : "") + "</small>" : "") + "</h2>";
    if (wxErr) h += '<div class="muted">' + esc(wxErr) + "</div>";
    if (frost) h += '<div class="pill bad" style="white-space:normal">🥶 ' + esc(t("열흘 안에 2° 이하로 내려가는 날이 있어요 — 모종은 미루고, 심은 건 덮어 주세요")) + "</div>";
    if (wx && mine.some((c) => inGround(c, sat, zone))) {
      // 이유 문구는 물이 필요한 작물이 있으면 그 작물의 것으로 (QA 11-24: 순서에 따라 '말랐으면 주세요'가 붙던 것)
      const need = [], rest = [];
      let needWhy = null, restWhy = null;
      for (const c of mine.filter((c) => inGround(c, sat, zone))) { const [n, r] = shouldWater(c.water, past, next, tmax, c.group === "잎채소"); (n ? need : rest).push(cropName(c)); if (n && !needWhy) needWhy = r; if (!n && !restWhy) restWhy = r; }
      const why = need.length ? needWhy : restWhy;
      waterNeeded = need.length > 0;
      h += "<div><b>💧 " + (need.length ? esc(need.join(", ")) + " — " : "") + esc(why || t("물은 쉬어도 돼요")) + "</b></div>";
    }
    // 바로 위에 '흠뻑 주세요'가 있는데 '둘러보기만 해도 돼요'가 붙던 것 (QA 11-26 C7)
    if (!tasks.length && !pests.length) h += '<div class="muted">' + esc(waterNeeded ? t("물 주기 말고 따로 할 일은 없어요 🌱") : t("이번 주말은 둘러보기만 해도 돼요 🌱")) + "</div>";
    for (const x of tasks) h += '<div class="ftask"><span class="fk" style="background:' + KIND[x.tk.k][1] + '">' + esc(kindLabel(x.tk.k)) + "</span> " + x.c.emoji + " " + esc(cropName(x.c)) + (x.tk.n ? " · " + esc(tOpt(x.tk.n)) : "") + ' <span class="muted">(' + fmtMd.format(x.s) + "~" + fmtMd.format(x.e) + ")</span></div>";
    if (pests.length) h += "<div><b>🐛 " + esc(t("{m}월에 조심할 것", { m: sat.getMonth() + 1 })) + "</b>" + pests.map((x) => '<div class="muted" style="color:var(--ink)">' + esc(cropName(x.c)) + " · " + esc(tOpt(x.p.name)) + " — " + esc(tOpt(x.p.tip)) + "</div>").join("") + "</div>";
    return h + "</article>";
  }
  function upcomingHtml(mine, zone) {
    const list = upcoming(mine, day0(new Date()), zone);
    return '<article class="card2"><h2>' + esc(t("다가오는 일 · 두 달")) + "</h2>" + (list.length ? list.map((x) =>
      '<div class="ftask"><span class="fk" style="background:' + KIND[x.tk.k][1] + '">' + esc(kindLabel(x.tk.k)) + "</span> " + x.c.emoji + " " + esc(cropName(x.c)) + (x.tk.n ? " · " + esc(tOpt(x.tk.n)) : "") + ' <span class="muted">D-' + x.diff + " · " + fmtMd.format(x.s) + "</span></div>").join("") : '<div class="muted">' + esc(t("두 달 안에 시작할 일은 없어요.")) + "</div>") + "</article>";
  }
  function calendarHtml(mine, zone) {
    const y = new Date().getFullYear();
    const yStart = new Date(y, 0, 1), yEnd = new Date(y + 1, 0, 1), span = yEnd - yStart;
    const nowPct = ((new Date() - yStart) / span) * 100;
    let h = '<article class="card2" style="grid-column:1/-1"><h2>' + esc(t("{y} 텃밭 달력", { y })) + '<small class="flegend">' + Object.keys(KIND).map((k) => '<span><i style="background:' + KIND[k][1] + '"></i>' + esc(kindLabel(k)) + "</span>").join("") + "</small></h2>";
    h += '<div class="fcal"><div class="fcal-row fcal-head"><span></span><div class="fcal-bar">' + Array.from({ length: 12 }, (_, m) => '<span style="left:' + (m / 12) * 100 + '%">' + esc(fmtMon.format(new Date(y, m, 1))) + "</span>").join("") + "</div></div>";
    for (const c of mine) {
      h += '<div class="fcal-row"><span>' + c.emoji + " " + esc(cropName(c)) + '</span><div class="fcal-bar"><i class="fnow" style="left:' + nowPct + '%"></i>';
      for (const tk of c.tasks) for (const yy of [y - 1, y]) {
        let [s, e] = range(tk, yy, zone);
        if (e < yStart || s >= yEnd) continue;
        if (s < yStart) s = yStart; if (e > yEnd) e = yEnd;
        h += '<b style="left:' + ((s - yStart) / span) * 100 + "%;width:" + Math.max(0.8, ((e - s) / span) * 100) + "%;background:" + KIND[tk.k][1] + '" title="' + esc(kindLabel(tk.k) + " " + fmtMd.format(s) + "~" + fmtMd.format(e)) + '"></b>';
      }
      h += "</div></div>";
    }
    return h + "</div></article>";
  }
  function cropDetailHtml(c, zone) {
    const y = new Date().getFullYear();
    return '<dialog class="dlg" id="cropDlg" aria-labelledby="cropDlgT"><div style="display:flex;flex-direction:column;gap:10px"><h2 id="cropDlgT">' + c.emoji + " " + esc(cropName(c)) + "</h2>" +
      '<div class="muted">' + esc(t("{zone} 기준 · 비 없으면 {n}일에 한 번 물", { zone: t(ZONES[zone][0]), n: c.water })) + "</div><b>" + esc(t("일정")) + "</b>" +
      c.tasks.map((tk) => { const [s, e] = range(tk, y, zone); return '<div class="ftask"><span class="fk" style="background:' + KIND[tk.k][1] + '">' + esc(kindLabel(tk.k)) + "</span> " + fmtMd.format(s) + " ~ " + fmtMd.format(e) + (tk.n ? ' <span class="muted">' + esc(tOpt(tk.n)) + "</span>" : "") + "</div>"; }).join("") +
      "<b>" + esc(t("관리 요령")) + "</b>" + c.care.map((x) => "<div>· " + esc(tOpt(x)) + "</div>").join("") +
      "<b>" + esc(t("조심할 병해충")) + "</b>" + c.pests.map((p) => "<div>🐛 <b>" + esc(tOpt(p.name)) + '</b> <span class="muted">(' + p.months.map((m) => t("{m}월", { m })).join("·") + ")</span> — " + esc(tOpt(p.tip)) + "</div>").join("") +
      '<label class="field" for="cropMemo">' + esc(t("내 메모")) + '<textarea id="cropMemo" rows="3" style="font:inherit;padding:8px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--ink)">' + esc(farm.notes[c.id] || "") + "</textarea></label>" +
      '<div class="muted">' + esc(t("시기는 {zone} 노지 기준 어림이에요. 그해 날씨에 따라 1~2주 달라질 수 있어요.", { zone: t(ZONES[zone][0]) })) + "</div>" +
      '<div class="row" style="display:flex;gap:8px;justify-content:flex-end"><button class="btn primary" type="button" data-fa="closecrop">' + esc(t("닫기")) + "</button></div></div></dialog>";
  }
  function diagHtml() {
    let h = '<article class="card2"><h2>📷 ' + esc(t("사진으로 병충해 보기")) + "</h2>";
    if (!ZAPP.signedIn()) return h + '<div class="needlogin">' + esc(t("로그인하면 사진 진단을 쓸 수 있어요.")) + ' <button class="btn primary" type="button" data-login>' + esc(t("로그인")) + "</button></div></article>";
    h += '<div class="muted">' + esc(t("잎이나 열매를 가까이 찍은 사진 한 장을 고르면 AI가 무엇으로 보이는지, 이번 주말 할 일을 알려 줘요.")) + "</div>" +
      '<label class="btn" for="farmPhoto" style="align-self:flex-start' + (diag && diag.busy ? ";opacity:.5;pointer-events:none" : "") + '">' + esc(t("사진 고르기")) + '</label><input type="file" id="farmPhoto" accept="image/*"' + (diag && diag.busy ? " disabled" : "") + ' style="position:absolute;width:1px;height:1px;opacity:0">';
    if (diag) {
      if (diag.img) h += '<img src="' + diag.img + '" alt="" style="max-width:100%;max-height:220px;object-fit:cover;border-radius:10px">';
      h += diag.busy ? '<div class="loading">' + esc(t("사진을 살펴보는 중…")) + "</div>" : diag.err ? '<div class="needlogin">' + esc(t("진단을 못 했어요: {e}", { e: diag.err })) + "</div>" : '<div class="fdiag">' + esc(diag.text) + "</div>";
      if (!diag.busy && !diag.err) h += '<div class="muted">' + esc(t("AI 추정이에요. 번지는 속도가 빠르면 가까운 농업기술센터에 사진을 보여 주세요.")) + "</div>";
    }
    return h + "</article>";
  }
  function render() {
    const root = $("farmRoot");
    if (!root) return;
    // 작물 안내 창을 연 채로 다시 그리면(날씨 도착·동기화) 쓰던 메모가 사라지던 것 (QA 11-23)
    const memo = $("cropMemo");
    // 손대지 않은 메모는 옮기지 않아요 — 그사이 폰에서 받은 새 메모를 옛 글로 덮던 것 (QA 11-25)
    if (memo && openCrop) { if (memo.value !== memoOrig) farm.notes[openCrop] = memo.value; else memoOrig = typeof farm.notes[openCrop] === "string" ? farm.notes[openCrop] : ""; }
    const zone = zoneOf(farm.lat, farm.lng);
    const mine = farm.crops.map(byId).filter(Boolean);
    let h = (mergedMsg ? '<div class="needlogin" role="status">🌱 ' + esc(mergedMsg) + "</div>" : "") + placeHtml();
    if (picking || !mine.length) h += pickerHtml();
    if (mine.length) {
      h += '<div class="cardgrid">' + weekendHtml(mine, zone) + upcomingHtml(mine, zone) + diagHtml() + calendarHtml(mine, zone) +
        '<article class="card2" style="grid-column:1/-1"><h2>' + esc(t("내 작물")) + "<small>" + esc(t("누르면 관리 요령·병해충·내 메모")) + '</small></h2><div class="chips">' +
        mine.map((c) => '<button type="button" data-open="' + c.id + '">' + c.emoji + " " + esc(cropName(c)) + (farm.notes[c.id] ? " 📝" : "") + "</button>").join("") + "</div></article></div>";
    }
    h += '<div class="muted">' + esc(ZAPP.signedIn() ? t("로그인돼 있어서 폰 앱의 텃밭과 같이 맞춰져요.") : t("텃밭 정보는 이 브라우저에만 저장돼요. 로그인하면 폰 앱과 같이 맞춰져요.")) + "</div>";
    if (openCrop) h += cropDetailHtml(byId(openCrop), zone);
    root.innerHTML = h;
    const dlg = $("cropDlg");
    if (dlg) { dlg.showModal(); dlg.addEventListener("close", () => { if (openCrop) {
      // 메모를 고쳤을 때만 저장해요. 보기만 하고 닫아도 '방금 고침'이 돼서 폰의 더 새 수정을 덮던 것 (QA 11-25)
      const v = $("cropMemo").value.trim();
      if (v !== memoOrig.trim()) { if (v) farm.notes[openCrop] = v; else delete farm.notes[openCrop]; save(); }
      openCrop = null; render();
    } }); }
    // 좁은 화면에서 달력이 1월부터 보여 '지금' 선이 화면 밖이던 것 — 지금이 왼쪽 1/3쯤 오게 (QA 11-26 C7, A7)
    const cal = root.querySelector(".fcal"), fnow = cal && cal.querySelector(".fnow");
    if (fnow && cal.scrollWidth > cal.clientWidth) { const name = cal.querySelector(".fcal-row > span"); cal.scrollLeft = Math.max(0, fnow.getBoundingClientRect().left - cal.getBoundingClientRect().left - (name ? name.offsetWidth : 0) - (cal.clientWidth - (name ? name.offsetWidth : 0)) / 3); }
    const ph = $("farmPhoto");
    if (ph) ph.addEventListener("change", () => ph.files[0] && diagnose(ph.files[0]));
  }
  async function loadWx() {
    if (farm.lat == null) { wx = null; return; }
    try { wx = await farmWx(farm.lat, farm.lng); wxErr = ""; } catch (e) { wx = null; wxErr = t("텃밭 날씨를 못 받았어요"); }
  }
  async function show() { const had = mergedMsg; render(); await syncFarm(); await loadWx(); render(); if (had && had === mergedMsg) mergedMsg = ""; }

  // ---------- 사진 진단 ----------
  function shrink(file) {
    return new Promise((ok, no) => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, 1280 / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        ok(c.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = () => no(new Error(t("사진을 열지 못했어요")));
      img.src = URL.createObjectURL(file);
    });
  }
  async function diagnose(file) {
    // 살펴보는 동안은 사진 고르기를 잠그고, 그래도 늦게 온 예전 답은 버려요 (QA 11-24: AI 두 번·답 섞임)
    if (diag && diag.busy) return;
    const me = diag = { busy: true };
    render();
    try {
      const url = await shrink(file);
      if (diag !== me) return;
      diag.img = url; render();
      const mine = farm.crops.map(byId).filter(Boolean).map((c) => c.name).join(", ");
      const now = new Date();
      const lang = { ko: "쉬운 한국어", en: "simple English", zh: "简单的中文", ja: "やさしい日本語" }[Z.lang] || "쉬운 한국어";
      const j = await ZAPP.post("/claude/v1/messages", {
        model: "claude-sonnet-5-5", max_tokens: 1500,
        system: "너는 한국 주말농장(취미 텃밭)을 돕는 식물 병해충 도우미야. 사진 속 작물과 증상을 보고 " + lang + "로 답해. " +
          "확실하지 않으면 그렇다고 말하고 가능성 높은 순서로 2~3개만. 농약 이름보다 손으로 할 수 있는 친환경 방법을 먼저, " +
          "농약이 필요하면 \"농약 판매점에서 작물 이름과 증상을 말하고 등록된 약을 받으라\"고 안내해. " +
          "형식: 1) 무엇으로 보이는지 2) 이유(사진에서 보이는 것) 3) 이번 주말 할 일 3가지 4) 더 확인할 것. 마크다운 기호(#, **)는 쓰지 마.",
        messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: url.split(",")[1] } },
          { type: "text", text: "내 텃밭 작물: " + (mine || "모름") + ". 오늘은 " + (now.getMonth() + 1) + "월 " + now.getDate() + "일, 지역 " + ZONES[zoneOf(farm.lat, farm.lng)][0] + ". 이 사진을 봐 줘." },
        ] }],
      });
      if (diag !== me) return;
      diag.text = (Array.isArray(j && j.content) ? j.content : []).filter((p) => p && p.type === "text").map((p) => String(p.text || "")).join("").trim();
      if (!diag.text) throw new Error(t("답을 받지 못했어요. 잠시 뒤 다시 해 주세요.")); // 빈 답이면 'AI 추정' 안내만 남던 것 (QA 11-26 B7)
      diag.busy = false;
    } catch (e) { if (diag !== me) return; diag.busy = false; diag.err = e.message || String(e); }
    render();
  }

  // ---------- 동작 ----------
  document.addEventListener("click", async (e) => {
    const root = $("farmRoot");
    if (!root || !root.contains(e.target)) return;
    const b = e.target.closest("button");
    if (!b) return;
    const d = b.dataset;
    if (d.crop) { const i = farm.crops.indexOf(d.crop); i >= 0 ? farm.crops.splice(i, 1) : farm.crops.push(d.crop); save(); render(); return; }
    if (d.fa === "pick") { picking = true; render(); return; }
    if (d.fa === "pickdone" || d.fa === "pickcancel") { picking = false; render(); return; }
    if (d.fa === "gps") {
      b.disabled = true;
      try { const g = await ZLOC.gps(); farm.lat = g.lat; farm.lng = g.lng; farm.label = ""; save(); await loadWx(); } catch (err) { wxErr = err.message; }
      render(); return;
    }
    if (d.open) { openCrop = d.open; memoOrig = typeof farm.notes[openCrop] === "string" ? farm.notes[openCrop] : ""; render(); return; }
    if (d.fa === "closecrop") { $("cropDlg").close(); return; }
    if (d.login !== undefined) { ZAPP.openLogin(); return; }
  });
  document.addEventListener("change", async (e) => {
    const s = e.target;
    if (!s.matches || !s.matches('#farmRoot [data-fa="city"]') || s.value === "") return;
    const c = cities[+s.value];
    farm.lat = c[1]; farm.lng = c[2]; farm.label = c[0]; save();
    await loadWx(); render();
  });
  window.addEventListener("zapp-auth", () => { if (window.ZAPP_READY && $("view-farm") && !$("view-farm").hidden) show(); });
  // 다른 탭에서 텃밭을 고치면 이 탭도 그것을 받아요. 안 그러면 이 탭에서 고칠 때 옛 텃밭 통째로 덮어써요 (QA 11-26)
  window.addEventListener("storage", (e) => {
    if (e.storageArea !== localStorage || e.key !== KEY || !e.newValue) return;
    try { farm = normFarm(JSON.parse(e.newValue)); picking = !farm.crops.length; if ($("view-farm") && !$("view-farm").hidden) render(); } catch (err) {}
  });
  window.ZFARM = { show };
})();
