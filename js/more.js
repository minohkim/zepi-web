// 제피 웹 · 내 여행 (집 밖 며칠을 자동으로 묶은 목록) · 배지·레벨
// 앱의 lib/trips.dart, lib/badges.dart, lib/explore_grid.dart, screens/trips·badges_screen.dart 를 옮겨 왔어요.
(function () {
  const Z = window.ZI18N, t = Z.t, tOpt = Z.tOpt;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const locale = { ko: "ko-KR", en: "en-US", zh: "zh-CN", ja: "ja-JP" }[Z.lang] || "ko-KR";
  const fmtMd = new Intl.DateTimeFormat(locale, { month: "numeric", day: "numeric" });
  const fmtMdW = new Intl.DateTimeFormat(locale, { month: "numeric", day: "numeric", weekday: "short" });
  const fmtNum = new Intl.NumberFormat(locale);
  const HOUR = 3600e3;
  const dayOfKey = (k) => new Date(Math.floor(k / 10000), (Math.floor(k / 100) % 100) - 1, k % 100);
  const keyOfDay = (d) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  const shortSido = (s) => ({ 충청남도: "충남", 충청북도: "충북", 경상남도: "경남", 경상북도: "경북", 전라남도: "전남", 전라북도: "전북" }[s] || s.replace(/(특별자치도|특별자치시|광역시|특별시)$/, "").replace(/도$/, ""));
  const regionLabel = (r) => (Z.lang === "ko" ? shortSido(r.s) : tOpt(r.s)) + " " + r.n;

  // ---------- 재료 ----------
  function inRing(x, y, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
      const xi = ring[i], yi = ring[i + 1], xj = ring[j], yj = ring[j + 1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function codeAt(regions, lat, lng) {
    for (const r of regions) {
      let polys = r.p;
      if (typeof polys === "string") { try { polys = r.p = JSON.parse(polys); } catch (e) { continue; } }
      for (const p of polys || []) if (p[0] && inRing(lng, lat, p[0])) return String(r.c);
    }
    return "";
  }
  let cache = null;
  function data() {
    const R = window.ZAPP && ZAPP.recs && ZAPP.recs();
    if (!R) return null;
    if (cache && cache.R === R.stamp) return cache;
    const homes = new Set([...R.home].map(String));
    // 사는 곳(집)과 일하는 곳(회사) 태그가 있는 시군구는 여행에서 빼요
    const daily = new Set();
    for (const n of R.notes) if (n.tags.includes("집") || n.tags.includes("회사")) { const c = codeAt(R.regions, n.lat, n.lng); if (c) { daily.add(c); if (n.tags.includes("집")) homes.add(c); } }
    const first = new Map();
    for (const [code, set] of R.conq) first.set(String(code), Math.min(...set));
    const conquered = new Set([...R.conq.keys(), ...R.manual].map(String));
    const skip = new Set([...homes, ...daily]);
    cache = { R: R.stamp, rec: R, homes, skip, first, conquered, trips: detectTrips(R.regionDays, skip, first), cells: null };
    return cache;
  }

  // ---------- 여행 묶기 (앱 detectTrips 와 같음) ----------
  function detectTrips(regionDays, homes, first) {
    const byDay = new Map(), nightDays = new Set();
    for (const [code0, m] of regionDays) {
      const code = String(code0);
      if (homes.has(code)) continue;
      for (const [k, d] of m) {
        if (d.ms >= HOUR || d.night) { if (!byDay.has(k)) byDay.set(k, new Map()); byDay.get(k).set(code, d.ms); }
        if (d.night) nightDays.add(k);
      }
    }
    const keys = [...byDay.keys()].sort((a, b) => a - b);
    const out = [];
    let i = 0;
    while (i < keys.length) {
      let j = i;
      while (j + 1 < keys.length && Math.round((dayOfKey(keys[j + 1]) - dayOfKey(keys[j])) / 864e5) <= 1) j++;
      const group = keys.slice(i, j + 1);
      const nights = group.filter((k) => nightDays.has(k)).length;
      let total = 0;
      const order = [];
      for (const k of group) {
        const regs = [...byDay.get(k).entries()].sort((a, b) => b[1] - a[1]);
        for (const [c, ms] of regs) { total += ms; if (!order.includes(c)) order.push(c); }
      }
      if (nights > 0 || total >= 3 * HOUR) {
        const s = group[0], e = group[group.length - 1];
        out.push({ s, e, nights, regions: order, fresh: order.filter((c) => (first.get(c) || 0) >= s && (first.get(c) || 0) <= e), days: group });
      }
      i = j + 1;
    }
    return out.reverse();
  }

  // ---------- 탐험 칸 (≈167m, 앱 ExploreGrid 와 같은 칸) ----------
  const CL = 0.0015, CG = 0.0019;
  const cellOf = (lat, lng) => Math.floor(lat / CL) * 100000 + Math.floor(lng / CG);
  function cells(R) {
    const set = new Set();
    const { lat, lng, ts, n } = R;
    for (let i = 0; i < n; i++) {
      if (i > 0 && ts[i] - ts[i - 1] < 10 * 60e3) {
        const dl = Math.abs(lat[i] - lat[i - 1]) / CL, dg = Math.abs(lng[i] - lng[i - 1]) / CG;
        const steps = Math.ceil(Math.max(dl, dg));
        if (steps > 1 && steps < 200) for (let s = 1; s < steps; s++) { const f = s / steps; set.add(cellOf(lat[i - 1] + (lat[i] - lat[i - 1]) * f, lng[i - 1] + (lng[i] - lng[i - 1]) * f)); }
      }
      set.add(cellOf(lat[i], lng[i]));
    }
    return set.size;
  }

  // ---------- 배지 (앱 computeBadges 와 같음) ----------
  const ISLANDS = ["울릉군", "옹진군", "신안군", "제주시", "서귀포시", "완도군", "진도군", "강화군", "남해군", "거제시"];
  function badges(x) {
    const out = [];
    const B = (id, emoji, title, desc, cur, goal, vars) => out.push({ id, emoji, title, desc, cur, goal, vars: vars || {} });
    const n = x.conquered.size;
    for (const [goal, emoji, title] of [[1, "🚩", "첫 깃발"], [10, "🏘️", "열 고을"], [50, "🗺️", "쉰 고을"], [100, "💯", "백 고을"], [150, "🧭", "백오십 고을"], [200, "🏔️", "이백 고을"], [230, "👑", "전국 일주"]])
      B("conq_" + goal, emoji, title, "시군구 {n}곳 정복", n, goal, { n: goal });
    const bySido = new Map();
    for (const r of x.regions) { if (!bySido.has(r.s)) bySido.set(r.s, []); bySido.get(r.s).push(r); }
    for (const [sido, rs] of bySido) B("sido_" + sido, "🏅", "{sido} 완주", "{full} {n}곳 모두 정복", rs.filter((r) => x.conquered.has(String(r.c))).length, rs.length, { sido: Z.lang === "ko" ? shortSido(sido) : tOpt(sido), full: tOpt(sido), n: rs.length });
    const has = (name, sido) => x.regions.some((r) => r.n === name && (!sido || r.s.startsWith(sido)) && x.conquered.has(String(r.c)));
    B("island", "🏝️", "섬 탐험가", "섬 지역 3곳 정복 (울릉·제주·옹진·신안 등)", ISLANDS.filter((nm) => has(nm)).length, 3);
    B("ulleung", "🦑", "울릉도 상륙", "울릉군 정복", has("울릉군") ? 1 : 0, 1);
    B("jeju", "🍊", "제주 정복", "제주시와 서귀포시 정복", (has("제주시") ? 1 : 0) + (has("서귀포시") ? 1 : 0), 2);
    B("poles", "🧲", "4극 정복", "북 고성·동 울릉·남 서귀포·서 옹진", (has("고성군", "강원") ? 1 : 0) + (has("울릉군") ? 1 : 0) + (has("서귀포시") ? 1 : 0) + (has("옹진군") ? 1 : 0), 4);
    const nights = new Set();
    for (const [code, m] of x.regionDays) { if (x.homes.has(String(code))) continue; for (const [k, d] of m) if (d.night) nights.add(k); }
    const byYear = new Map();
    for (const k of nights) { const y = Math.floor(k / 10000), mo = Math.floor(k / 100) % 100; const s = mo >= 3 && mo <= 5 ? 0 : mo >= 6 && mo <= 8 ? 1 : mo >= 9 && mo <= 11 ? 2 : 3; if (!byYear.has(y)) byYear.set(y, new Set()); byYear.get(y).add(s); }
    B("seasons", "🍂", "사계절 여행자", "한 해에 봄·여름·가을·겨울 모두 1박 여행", Math.max(0, ...[...byYear.values()].map((s) => s.size)), 4);
    for (const [goal, emoji, title] of [[1000, "👣", "동네 탐험가"], [5000, "🥾", "길 위의 사람"], [20000, "🌏", "안개 걷는 자"]])
      B("cells_" + goal, emoji, title, "{n}㎢ 안개 걷기", x.cells, goal, { n: Math.round(goal * 0.028) });
    B("saved_10", "📌", "수집가", "내 장소 {n}곳 저장", x.saved, 10, { n: 10 });
    B("saved_50", "🗂️", "큐레이터", "내 장소 {n}곳 저장", x.saved, 50, { n: 50 });
    return out;
  }
  const earned = (b) => b.cur >= b.goal;
  function levelOf(xp) {
    let lv = 1;
    while ((lv + 1) * (lv + 1) * 100 <= xp) lv++;
    const cur = lv * lv * 100, next = (lv + 1) * (lv + 1) * 100;
    return [lv, xp - cur, next - cur];
  }

  // ---------- 내 여행 ----------
  let openTrip = null, tmap = null;
  function tripTitle(tr, byCode) {
    const names = tr.regions.slice(0, 3).map((c) => { const r = byCode.get(c); return r ? r.n : c; });
    return names.join(" · ") + (tr.regions.length > 3 ? " " + t("외 {n}곳", { n: tr.regions.length - 3 }) : "");
  }
  function tripDates(tr) {
    const s = dayOfKey(tr.s), e = dayOfKey(tr.e);
    const cnt = Math.round((e - s) / 864e5) + 1;
    return s.getFullYear() + ". " + fmtMd.format(s) + (cnt === 1 ? " · " + t("당일") : " ~ " + fmtMd.format(e) + " · " + (tr.nights === 1 ? t("1박 {d}일", { d: cnt }) : t("{n}박 {d}일", { n: tr.nights, d: cnt })));
  }
  function renderTrips() {
    const root = $("tripsRoot");
    if (!root) return;
    const x = data();
    if (!x) { root.innerHTML = '<div class="loading">' + esc(t("준비하는 중이에요…")) + "</div>"; return; }
    const byCode = new Map(x.rec.regions.map((r) => [String(r.c), r]));
    const trips = x.trips;
    let h = '<div class="iohead"><h2>' + esc(t("내 여행 {n}", { n: trips.length })) + "</h2><p>" + esc(t("집 밖에서 하룻밤 잤거나 3시간 넘게 머문 날을 이어서 여행 하나로 묶었어요. 사는 곳(한 해 30밤 이상 잔 곳, '집' 태그)과 '회사' 태그가 있는 곳은 빼요.")) + "</p>" +
      (x.rec.sample ? '<p class="muted">' + esc(t("지금은 예시 데이터예요. 로그인하면 내 여행이 보여요.")) + "</p>" : "") + "</div>";
    if (!trips.length) { root.innerHTML = h + '<div class="card2"><div class="muted">' + esc(t("아직 묶인 여행이 없어요. 집 밖에서 하룻밤 자면 여기에 생겨요.")) + "</div></div>"; return; }
    // 해마다 묶기
    let year = null;
    for (const [i, tr] of trips.entries()) {
      const y = Math.floor(tr.s / 10000);
      if (y !== year) { if (year !== null) h += "</div>"; year = y; const yt = trips.filter((q) => Math.floor(q.s / 10000) === y); h += '<h3 class="tyear">' + y + ' <small class="muted">' + esc(t("여행 {n}번 · {m}박", { n: yt.length, m: yt.reduce((a, q) => a + q.nights, 0) })) + '</small></h3><div class="tlist">'; }
      const on = openTrip === i;
      h += '<article class="card2 trip' + (on ? " on" : "") + '"><button type="button" class="thead" data-trip="' + i + '" aria-expanded="' + on + '"><div><b>' + esc(tripTitle(tr, byCode)) + '</b><div class="muted">' + esc(tripDates(tr)) + "</div></div>" +
        (tr.fresh.length ? '<span class="pill">🚩 ' + esc(t("새로 정복 {n}", { n: tr.fresh.length })) + "</span>" : "") + "</button>";
      if (on) {
        h += '<div id="tripMap" class="planmap" style="height:260px"></div>';
        let km = 0;
        const rows = tr.days.map((k) => {
          const d = ZAPP.dayInfo(k);
          km += d.km;
          const regs = [...x.rec.regionDays].filter(([c, m]) => !x.skip.has(String(c)) && m.has(k) && m.get(k).ms >= HOUR / 4).sort((a, b) => b[1].get(k).ms - a[1].get(k).ms).map(([c]) => byCode.get(String(c))).filter(Boolean);
          return '<li class="tday"><div><b>' + esc(fmtMdW.format(dayOfKey(k))) + '</b> <span class="muted">' + (d.km ? fmtNum.format(Math.round(d.km)) + " km" : "") + (d.stays ? " · " + esc(t("머문 곳 {n}", { n: d.stays })) : "") + "</span><div>" + regs.slice(0, 4).map((r) => esc(regionLabel(r)) + (tr.fresh.includes(String(r.c)) && x.first.get(String(r.c)) === k ? " 🚩" : "")).join(" · ") + '</div></div><button class="btn" type="button" data-openday="' + k + '">' + esc(t("하루 보기")) + "</button></li>";
        }).join("");
        h += '<div class="muted">' + esc(t("다닌 거리 약 {n} km · 시군구 {m}곳", { n: fmtNum.format(Math.round(km)), m: tr.regions.length })) + '</div><ol class="plist">' + rows + "</ol>";
      }
      h += "</article>";
    }
    h += "</div>";
    root.innerHTML = h;
    if (openTrip != null && trips[openTrip]) drawTripMap(trips[openTrip]);
  }
  function drawTripMap(tr) {
    const el = $("tripMap");
    if (!el) return;
    const pts = ZAPP.pointsBetween(tr.s, tr.e);
    if (!pts.length || !(window.naver && naver.maps && naver.maps.Map)) { el.hidden = true; return; }
    const step = Math.max(1, Math.floor(pts.length / 1500));
    const path = [];
    for (let i = 0; i < pts.length; i += step) path.push(new naver.maps.LatLng(pts[i][0], pts[i][1]));
    tmap = new naver.maps.Map(el, { zoomControl: true, zoomControlOptions: { position: naver.maps.Position.TOP_RIGHT } });
    new naver.maps.Polyline({ map: tmap, path, strokeColor: "#A8402A", strokeWeight: 4, strokeOpacity: 0.85 });
    const b = new naver.maps.LatLngBounds(path[0], path[0]);
    path.forEach((p) => b.extend(p));
    tmap.fitBounds(b, { top: 24, right: 24, bottom: 24, left: 24 });
  }

  // ---------- 배지·레벨 ----------
  let openBadge = null;
  function renderBadges() {
    const root = $("badgesRoot");
    if (!root) return;
    const x = data();
    if (!x) { root.innerHTML = '<div class="loading">' + esc(t("준비하는 중이에요…")) + "</div>"; return; }
    if (x.cells == null) x.cells = cells(x.rec);
    const saved = x.rec.notes.filter((n) => !n.tags.includes("집") && !n.tags.includes("회사")).length;
    const bs = badges({ regions: x.rec.regions, conquered: x.conquered, regionDays: x.rec.regionDays, homes: x.homes, cells: x.cells, saved });
    const got = bs.filter(earned);
    const xp = x.conquered.size * 100 + x.cells + got.length * 200;
    const [lv, cur, need] = levelOf(xp);
    let h = '<div class="lvcard"><div class="lvtop"><span class="lv">' + esc(t("레벨 {n}", { n: lv })) + '</span><span>' + esc(t("경험치 {xp} · 배지 {a}/{b}", { xp: fmtNum.format(xp), a: got.length, b: bs.length })) + "</span></div>" +
      '<div class="lvbar" role="progressbar" aria-valuemin="0" aria-valuemax="' + need + '" aria-valuenow="' + cur + '"><i style="width:' + Math.round((cur / need) * 100) + '%"></i></div>' +
      '<div class="lvsub"><span>' + esc(t("다음 레벨까지 {n}", { n: fmtNum.format(need - cur) })) + "</span><span>" + esc(t("정복 100 · 안개 칸 1 · 배지 200")) + "</span></div>" +
      '<div class="lvsub"><span>' + esc(t("정복 {n}곳 · 안개 {k}㎢ · 내 장소 {s}곳", { n: x.conquered.size, k: (x.cells * 0.028).toFixed(1), s: saved })) + "</span></div></div>";
    if (x.rec.sample) h += '<p class="muted">' + esc(t("지금은 예시 데이터예요. 로그인하면 내 배지가 보여요.")) + "</p>";
    const tr = (b) => ({ title: t(b.title, b.vars), desc: t(b.desc, b.vars) });
    // 딴 것 먼저, 그다음 가까운 순
    const order = [...bs].sort((a, b) => (earned(b) - earned(a)) || (b.cur / b.goal - a.cur / a.goal));
    h += '<div class="bgrid">' + order.map((b) => {
      const T = tr(b);
      const pct = Math.min(100, Math.round((b.cur / b.goal) * 100));
      return '<button type="button" class="badge' + (earned(b) ? " got" : "") + '" data-badge="' + esc(b.id) + '"><span class="bemoji" aria-hidden="true">' + b.emoji + "</span><b>" + esc(T.title) + "</b>" +
        (earned(b) ? '<span class="bok">✓</span>' : '<span class="bbar"><i style="width:' + pct + '%"></i></span><small>' + fmtNum.format(Math.min(b.cur, b.goal)) + " / " + fmtNum.format(b.goal) + "</small>") + "</button>";
    }).join("") + "</div>";
    const ob = openBadge && bs.find((b) => b.id === openBadge);
    if (ob) { const T = tr(ob); h += '<div class="card2 bdetail"><span style="font-size:44px" aria-hidden="true">' + ob.emoji + "</span><h2>" + esc(T.title) + "</h2><div>" + esc(T.desc) + '</div><b style="color:var(--leaf)">' + esc(earned(ob) ? t("획득했어요!") : fmtNum.format(ob.cur) + " / " + fmtNum.format(ob.goal)) + "</b></div>"; }
    h += '<p class="muted">' + esc(t("앱의 여행 MBTI 배지는 앱에서만 받을 수 있어요.")) + "</p>";
    root.innerHTML = h;
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.trip != null && b.closest("#tripsRoot")) { const i = +b.dataset.trip; openTrip = openTrip === i ? null : i; renderTrips(); return; }
    if (b.dataset.openday && b.closest("#tripsRoot")) { ZAPP.openDay(+b.dataset.openday); return; }
    if (b.dataset.badge && b.closest("#badgesRoot")) { openBadge = openBadge === b.dataset.badge ? null : b.dataset.badge; renderBadges(); return; }
  });
  window.addEventListener("zapp-auth", () => { cache = null; openTrip = null; if (window.ZAPP_READY) { if ($("view-trips") && !$("view-trips").hidden) renderTrips(); if ($("view-badges") && !$("view-badges").hidden) renderBadges(); } });
  window.ZMORE = { trips: renderTrips, badges: renderBadges, reset: () => { cache = null; openTrip = null; } };
})();
