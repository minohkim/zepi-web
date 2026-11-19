// 제피 웹 · 바다 (가까운 관측소 물때표 · 사리/조금 · 파도와 수온)
// 앱의 lib/services/tide.dart, sea.dart 를 옮겨 왔어요.
(function () {
  const Z = window.ZI18N, t = Z.t, tOpt = Z.tOpt;
  const ST = window.ZDATA.tideStations;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const locale = { ko: "ko-KR", en: "en-US", zh: "zh-CN", ja: "ja-JP" }[Z.lang] || "ko-KR";
  const fmtTime = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone: "Asia/Seoul" });
  const fmtDay = new Intl.DateTimeFormat(locale, { month: "numeric", day: "numeric", weekday: "short", timeZone: "Asia/Seoul" });
  const fmtInt = new Intl.NumberFormat(locale);
  const pad = (n) => String(n).padStart(2, "0");
  function kstYmd(d) { const k = new Date(d.getTime() + 9 * 3600e3); return k.getUTCFullYear() + pad(k.getUTCMonth() + 1) + pad(k.getUTCDate()); }
  function distM(a, b, c, d) {
    const R = 6371000, r = Math.PI / 180, x = (d - b) * r * Math.cos(((a + c) / 2) * r), y = (c - a) * r;
    return Math.sqrt(x * x + y * y) * R;
  }
  const byDist = (lat, lng) => ST.map((s) => ({ ...s, m: distM(lat, lng, s.lat, s.lng) })).sort((a, b) => a.m - b.m);

  // ---------- 물때 (앱 tide.dart 와 같은 규칙) ----------
  const SYN = 29.530588853;
  function moonAge(d) { const a = ((d.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 864e5) % SYN; return a < 0 ? a + SYN : a; }
  function springNeap(d) {
    const a = moonAge(d);
    const near = (x, c) => Math.abs(x - c) <= 3 || Math.abs(x - c - 29.53) <= 3;
    if (near(a, 1.5) || near(a, 16.3)) return ["사리", "사리 무렵: 물이 많이 들어오고 많이 빠지는 때예요. 갯벌이 넓게 드러나고 물살이 세요."];
    if (near(a, 8.9) || near(a, 23.6)) return ["조금", "조금 무렵: 물높이 차이가 작은 때예요. 물이 많이 빠지지 않고 물살이 약해요."];
    return ["중간", "사리와 조금 사이예요. 물높이 차이가 중간 정도예요."];
  }
  function daysToSpring(d) {
    const a = moonAge(d);
    let best = 99;
    for (const s of [1.5, 16.3, 31.0]) { const x = s - a; if (Math.abs(x) < Math.abs(best)) best = x; }
    return Math.round(best);
  }
  const RX = /^(\d{4})-?(\d{2})-?(\d{2})[ T]?(\d{2}):?(\d{2})/;
  function parseTime(s) { const m = RX.exec(String(s).trim()); return m ? new Date(m[1] + "-" + m[2] + "-" + m[3] + "T" + m[4] + ":" + m[5] + ":00+09:00") : null; }
  function collect(v, out) {
    if (Array.isArray(v)) { for (const x of v) if (x && typeof x === "object") out.push(x); }
    else if (v && typeof v === "object") { if ("item" in v) collect(v.item, out); else if ("items" in v) collect(v.items, out); else out.push(v); }
    return out;
  }
  function parseTide(j) {
    const its = collect((j.body && j.body.items) || (j.response && j.response.body && j.response.body.items), []);
    let name = "";
    const pts = [];
    for (const it of its) {
      let tm = null, lv = null, sc = -1;
      for (const [k0, v0] of Object.entries(it)) {
        const k = k0.toLowerCase(), v = String(v0);
        if (k.endsWith("nm") && !name) name = v;
        if (!tm && (k.includes("dt") || k.includes("time") || k.includes("date"))) tm = parseTime(v);
        if (/tdlv|hgt|hght|tide|tph|level/.test(k)) {
          const score = (k.includes("predc") ? 2 : 0) + (k.endsWith("vl") ? 1 : 0) - (k.includes("bsc") ? 2 : 0);
          const x = parseFloat(v);
          if (isFinite(x) && score > sc) { lv = x; sc = score; }
        }
      }
      if (tm && lv != null) pts.push({ time: tm, level: lv });
    }
    pts.sort((a, b) => a.time - b.time);
    return { name, pts };
  }
  function extremes(s) {
    const out = [];
    for (let i = 1; i + 1 < s.length; i++) {
      const a = s[i - 1].level, b = s[i].level, c = s[i + 1].level;
      if (b >= a && b > c) out.push({ ...s[i], high: true });
      if (b <= a && b < c) out.push({ ...s[i], high: false });
    }
    return out;
  }
  function levelAt(s, tm) {
    for (let i = 1; i < s.length; i++) {
      if (s[i].time >= tm) {
        const a = s[i - 1], b = s[i], span = b.time - a.time;
        if (span <= 0) return b.level;
        return a.level + (b.level - a.level) * Math.min(1, Math.max(0, (tm - a.time) / span));
      }
    }
    return null;
  }
  const cache = new Map();
  async function tideDay(code, ymd, min) {
    const key = code + ymd + min;
    if (cache.has(key)) return cache.get(key);
    const q = "1192136/tideFcstTime/GetTideFcstTimeApiService?obsCode=" + code + "&reqDate=" + ymd + "&min=" + min + "&numOfRows=300&pageNo=1&type=json";
    const v = parseTide(await ZAPP.proxy("/datago/" + q));
    if (!v.pts.length) throw new Error(t("물때 정보가 비어 있어요."));
    cache.set(key, v);
    return v;
  }
  async function marine(lat, lng) {
    const key = "m" + lat.toFixed(2) + lng.toFixed(2);
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < 30 * 60e3) return hit.v;
    const u = "https://marine-api.open-meteo.com/v1/marine?latitude=" + lat.toFixed(3) + "&longitude=" + lng.toFixed(3) +
      "&current=wave_height,wave_direction,wave_period,sea_surface_temperature&daily=wave_height_max&timezone=Asia%2FSeoul&forecast_days=4";
    const w = "https://api.open-meteo.com/v1/forecast?latitude=" + lat.toFixed(3) + "&longitude=" + lng.toFixed(3) + "&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=Asia%2FSeoul&wind_speed_unit=ms";
    const [a, b] = await Promise.all([fetch(u).then((r) => r.json()), fetch(w).then((r) => r.json()).catch(() => null)]);
    const v = { sea: a, wind: b };
    cache.set(key, { at: Date.now(), v });
    return v;
  }
  const DIRS = ["북", "북동", "동", "남동", "남", "남서", "서", "북서"];
  const fromDir = (deg) => t(DIRS[Math.round(deg / 45) % 8] + "쪽에서");

  // ---------- 물높이 그래프 (SVG) ----------
  function chart(pts, ex, now) {
    const W = 640, H = 200, L = 36, R = 8, T = 14, B = 26;
    const t0 = pts[0].time.getTime(), t1 = pts[pts.length - 1].time.getTime();
    const lo = Math.min(...pts.map((p) => p.level)), hi = Math.max(...pts.map((p) => p.level));
    const pad2 = (hi - lo) * 0.1 || 10;
    const y0 = lo - pad2, y1 = hi + pad2;
    const X = (tm) => L + ((tm - t0) / (t1 - t0)) * (W - L - R);
    const Y = (v) => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
    const d = pts.map((p, i) => (i ? "L" : "M") + X(p.time.getTime()).toFixed(1) + "," + Y(p.level).toFixed(1)).join("");
    const area = d + "L" + X(t1).toFixed(1) + "," + (H - B) + "L" + L + "," + (H - B) + "Z";
    let g = "";
    for (let hh = 0; hh <= 24; hh += 6) {
      const x = L + (hh / 24) * (W - L - R);
      g += '<line x1="' + x + '" x2="' + x + '" y1="' + T + '" y2="' + (H - B) + '" stroke="var(--line)" stroke-width="1"/>' +
        '<text x="' + x + '" y="' + (H - 8) + '" font-size="11" text-anchor="middle" fill="var(--muted)">' + hh + ":00</text>";
    }
    for (const v of [lo, hi]) g += '<text x="' + (L - 4) + '" y="' + (Y(v) + 4) + '" font-size="11" text-anchor="end" fill="var(--muted)">' + Math.round(v) + "</text>";
    let mk = "";
    for (const e of ex) {
      const x = X(e.time.getTime()), y = Y(e.level);
      mk += '<circle cx="' + x + '" cy="' + y + '" r="4" fill="' + (e.high ? "var(--leaf)" : "var(--pepper)") + '"/>' +
        '<text x="' + x + '" y="' + (e.high ? y - 8 : y + 16) + '" font-size="11" text-anchor="middle" fill="var(--ink)">' + esc(fmtTime.format(e.time)) + "</text>";
    }
    const nt = now.getTime();
    if (nt >= t0 && nt <= t1) {
      const x = X(nt), lv = levelAt(pts, now);
      mk += '<line x1="' + x + '" x2="' + x + '" y1="' + T + '" y2="' + (H - B) + '" stroke="var(--ink)" stroke-dasharray="3 3"/>' +
        (lv != null ? '<circle cx="' + x + '" cy="' + Y(lv) + '" r="5" fill="var(--surface)" stroke="var(--ink)" stroke-width="2"/>' : "");
    }
    return '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(t("오늘 물높이 그래프")) + '">' + g +
      '<path d="' + area + '" fill="color-mix(in srgb, #2C7FB8 18%, transparent)"/><path d="' + d + '" fill="none" stroke="#2C7FB8" stroke-width="2"/>' + mk + "</svg>";
  }

  let shownFor = "", busy = false, pickCode = "";
  async function render(force) {
    const root = $("seaRoot");
    if (!root || busy || !window.ZLOC) return;
    const l = ZLOC.init();
    const now = new Date();
    const near = byDist(l.lat, l.lng);
    const st = (pickCode && near.find((s) => s.code === pickCode)) || near[0];
    const key = st.code + l.lat.toFixed(3) + l.lng.toFixed(3) + kstYmd(now) + now.getHours() + (ZAPP.signedIn() ? "s" : "");
    if (!force && key === shownFor) return;
    busy = true;
    try {
      const reg = await ZLOC.regionAt(l.lat, l.lng);
      const [snKey, snText] = springNeap(now);
      const dts = daysToSpring(now);
      let h = ZLOC.bar(l, reg);
      h += '<div class="locbar"><label class="muted" for="stSel">' + esc(t("조위 관측소")) + '</label><select id="stSel">' +
        near.slice(0, 10).map((s) => '<option value="' + s.code + '"' + (s.code === st.code ? " selected" : "") + ">" + esc(tOpt(s.name)) + " · " + fmtInt.format(Math.round(s.m / 1000)) + " km</option>").join("") +
        "</select></div>";
      h += '<div class="cardgrid">';

      // 물때표
      h += '<article class="card2" style="grid-column:1/-1"><h2>' + esc(t("{name} 물때", { name: tOpt(st.name) })) + "<small>" + esc(t("국립해양조사원 예측")) + "</small></h2>";
      if (!ZAPP.signedIn()) {
        h += '<div class="needlogin">' + esc(t("만조·간조 시각과 물높이 그래프는 로그인하면 보여요. 무료예요.")) + ' <button class="btn primary" type="button" data-login>' + esc(t("로그인")) + "</button></div>";
      } else {
        try {
          const ymd = kstYmd(now), tm = kstYmd(new Date(now.getTime() + 864e5));
          const [a, b] = await Promise.all([tideDay(st.code, ymd, 10), tideDay(st.code, tm, 30).catch(() => null)]);
          const ex = extremes(a.pts);
          const exNext = b ? extremes(b.pts) : [];
          const lv = levelAt(a.pts, now);
          const nextEx = [...ex, ...exNext].find((e) => e.time > now);
          const rising = nextEx ? nextEx.high : null;
          if (lv != null) {
            h += '<div style="display:flex;flex-wrap:wrap;gap:8px 18px;align-items:baseline"><span class="big">' + Math.round(lv) + ' <small style="font-size:14px">cm</small></span>' +
              (rising != null ? '<span class="pill">' + esc(t(rising ? "물이 들어오는 중" : "물이 빠지는 중")) + "</span>" : "") +
              (nextEx ? '<span class="muted">' + esc(t(nextEx.high ? "다음 만조 {time}" : "다음 간조 {time}", { time: fmtTime.format(nextEx.time) })) + "</span>" : "") + "</div>";
          }
          h += '<div class="tidechart">' + chart(a.pts, ex, now) + "</div>";
          h += '<dl class="kv">' + ex.map((e) => "<dt>" + (e.high ? "▲ " + esc(t("만조")) : "▼ " + esc(t("간조"))) + "</dt><dd>" + esc(fmtTime.format(e.time)) + " · " + Math.round(e.level) + " cm</dd>").join("") + "</dl>";
          if (exNext.length) h += '<div class="muted">' + esc(t("내일")) + " (" + esc(fmtDay.format(new Date(now.getTime() + 864e5))) + "): " + exNext.map((e) => (e.high ? "▲" : "▼") + " " + esc(fmtTime.format(e.time))).join(" · ") + "</div>";
          const lo = Math.min(...a.pts.map((p) => p.level)), hi = Math.max(...a.pts.map((p) => p.level));
          h += '<div class="muted">' + esc(t("오늘 물높이 차이 {n} cm", { n: Math.round(hi - lo) })) + " · " + esc(t("높이는 그 지역 기준면에서 잰 값이에요.")) + "</div>";
        } catch (e) {
          h += '<div class="muted">' + esc(t("물때를 불러오지 못했어요.")) + " " + esc(e.message || e) + "</div>";
        }
      }
      h += "</article>";

      // 사리·조금
      h += '<article class="card2"><h2>' + esc(t("사리 · 조금")) + '</h2><div><span class="pill ' + (snKey === "사리" ? "warn" : "") + '">' + esc(t(snKey)) + "</span></div><div>" + esc(t(snText)) + "</div>" +
        '<div class="muted">' + esc(dts === 0 ? t("오늘이 사리 무렵이에요.") : dts > 0 ? t("다음 사리까지 {n}일", { n: dts }) : t("사리가 {n}일 지났어요", { n: -dts })) + "</div>" +
        '<div class="muted">' + esc(t("갯벌 체험은 사리 무렵 간조 앞뒤 두 시간이 좋아요.")) + "</div></article>";

      // 파도·수온·바람 (관측소 앞바다 기준)
      h += '<article class="card2"><h2>' + esc(t("파도와 바다")) + "<small>" + esc(t("{name} 앞바다 · 예측 모델", { name: tOpt(st.name) })) + "</small></h2>";
      try {
        const m = await marine(st.lat, st.lng);
        const c = m.sea && m.sea.current;
        if (!c || c.wave_height == null) throw new Error(t("이 자리는 바다 예보가 없어요."));
        const wh = c.wave_height;
        const lvl = wh < 0.5 ? ["잔잔해요", ""] : wh < 1.5 ? ["조금 일렁여요", ""] : wh < 2.5 ? ["파도가 높아요", "warn"] : ["매우 높아요 · 바다에 들어가지 마세요", "bad"];
        h += '<div style="display:flex;gap:14px;align-items:baseline"><span class="big">' + wh.toFixed(1) + ' <small style="font-size:14px">m</small></span><span class="pill ' + lvl[1] + '">' + esc(t(lvl[0])) + "</span></div>" +
          '<dl class="kv">' +
          (c.wave_period != null ? "<dt>" + esc(t("파도 주기")) + "</dt><dd>" + c.wave_period.toFixed(0) + " " + esc(t("초")) + "</dd>" : "") +
          (c.sea_surface_temperature != null ? "<dt>" + esc(t("바닷물 온도")) + "</dt><dd>" + c.sea_surface_temperature.toFixed(1) + "°</dd>" : "") +
          (m.wind && m.wind.current ? "<dt>" + esc(t("바람")) + "</dt><dd>" + esc(fromDir(m.wind.current.wind_direction_10m)) + " " + m.wind.current.wind_speed_10m.toFixed(1) + " m/s · " + esc(t("돌풍 {n} m/s", { n: m.wind.current.wind_gusts_10m.toFixed(0) })) + "</dd>" : "") +
          "</dl>";
        const dl = m.sea.daily;
        if (dl && dl.time) h += '<dl class="kv">' + dl.time.slice(1).map((d, i) => "<dt>" + esc(fmtDay.format(new Date(d + "T12:00:00+09:00"))) + "</dt><dd>" + esc(t("최고 파고 {n} m", { n: (dl.wave_height_max[i + 1] ?? 0).toFixed(1) })) + "</dd>").join("") + "</dl>";
        h += '<div class="muted">' + esc(t("바다에 나가기 전에는 기상청 해상 특보를 꼭 확인하세요.")) + "</div>";
      } catch (e) {
        h += '<div class="muted">' + esc(t("바다 예보를 불러오지 못했어요.")) + " " + esc(e.message || e) + "</div>";
      }
      h += "</article></div>";

      root.innerHTML = h;
      ZLOC.bind(root);
      $("stSel").addEventListener("change", (e) => { pickCode = e.target.value; render(true); });
      const lb = root.querySelector("[data-login]");
      if (lb) lb.addEventListener("click", () => ZAPP.openLogin());
      shownFor = key;
    } catch (e) {
      console.error(e);
      root.innerHTML = '<div class="needlogin">' + esc(t("바다 정보를 준비하지 못했어요.")) + " " + esc(e.message || e) + "</div>";
    } finally { busy = false; }
  }
  if (window.ZLOC) ZLOC.on(() => { shownFor = ""; pickCode = ""; if (!$("view-sea").hidden) render(true); });
  window.ZSEA = { show: () => render(false), refresh: () => render(true) };
  window.addEventListener("zapp-auth", () => { shownFor = ""; if (!$("view-sea").hidden) render(true); });
})();
