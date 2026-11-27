// 바람소리 웹 · 오늘의 사진 + 한 줄 (실험실)
// 앱 lib/today_line.dart 와 같은 고르기 규칙이에요. 데이터 원본: data/lines.json · photos.json · region-moods.json
// 켜는 법: app.html?line=1 로 한 번 열면 이 브라우저에 기억해요 (?line=0 으로 끄기). 한국어 화면에서만 보여요.
(function () {
  const Z = window.ZI18N, t = Z ? Z.t : (s) => s;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  try {
    const q = new URLSearchParams(location.search).get("line");
    if (q === "1") store.set("jepi.line.on", true);
    if (q === "0") store.set("jepi.line.on", false);
  } catch (e) {}
  const enabled = () => store.get("jepi.line.on", false) && (!Z || Z.lang === "ko");

  // ---------- 규칙 (앱과 같이) ----------
  const DOW = ["일", "월", "화", "수", "목", "금", "토"];
  const W = { special: 20, world: 10, sky: 5, place: 4, air: 3, time: 3, dow: 2, season: 2 };
  const HOLI = {
    설: ["2026-02-17", "2027-02-07", "2028-01-27", "2029-02-13", "2030-02-03"],
    추석: ["2026-09-25", "2027-09-15", "2028-10-03", "2029-09-22", "2030-09-12"],
  };
  const pad = (n) => String(n).padStart(2, "0");
  function timeSlot(h) { return h >= 4 && h < 7 ? "새벽" : h >= 7 && h < 11 ? "아침" : h >= 11 && h < 17 ? "낮" : h >= 17 && h < 21 ? "저녁" : "밤"; }
  function seasonWord(k) { const m = k.m; if (m === 11 || (m === 12 && k.d < 10)) return "늦가을"; if (m >= 3 && m <= 5) return "봄"; if (m >= 6 && m <= 8) return "여름"; if (m >= 9 && m <= 10) return "가을"; return "겨울"; }
  function weekday(k) { return new Date(Date.UTC(k.y, k.m - 1, k.d)).getUTCDay(); } // 0 = 일
  function worldTags(k) {
    const out = new Set(), wd = weekday(k);
    if (k.m === 12 && k.d >= 20) out.add("연말");
    if (k.m === 12 && (k.d === 24 || k.d === 25)) out.add("크리스마스");
    if (k.m === 1 && k.d <= 7) out.add("새해");
    if (k.m === 11 && wd === 4 && k.d >= 15 && k.d <= 21) out.add("수능");
    const day = Date.UTC(k.y, k.m - 1, k.d);
    for (const [name, days] of Object.entries(HOLI)) for (const s of days) if (Math.abs(day - Date.parse(s + "T00:00:00Z")) <= 86400e3) out.add(name);
    return out;
  }
  function sidoShort(s) { s = s || ""; return s.length >= 3 && /^(경상|충청|전라)/.test(s) ? s[0] + s[2] : s.slice(0, 2); }
  const dayKey = (k) => k.y + "-" + pad(k.m) + "-" + pad(k.d);

  function values(c, kind) {
    switch (kind) {
      case "sky": return new Set([c.sky, c.windy ? "바람" : ""].filter(Boolean));
      case "air": return new Set(c.air || []);
      case "time": return new Set([timeSlot(c.k.h)]);
      case "dow": { const w = weekday(c.k); return new Set([DOW[w], w === 0 || w === 6 ? "주말" : ""].filter(Boolean)); }
      case "season": return new Set([seasonWord(c.k)]);
      case "place": return new Set(c.places || []);
      case "world": return worldTags(c.k);
      case "special": return new Set(c.specials || []);
      default: return new Set();
    }
  }
  function score(tags, c, needsRegion) {
    if (needsRegion && !c.region) return null;
    let s = 0;
    for (const [kind, vs] of Object.entries(tags || {})) {
      if (!(kind in W)) continue;
      const now = values(c, kind);
      if (!vs.some((v) => now.has(v))) return null;
      s += W[kind];
    }
    return s;
  }
  function rng(seed) { let x = (seed >>> 0) || 1; return () => ((x = (Math.imul(x, 1103515245) + 12345) >>> 0) % 2147483647) / 2147483647; }
  const seedOf = (k, tap) => k.y * 10000 + k.m * 100 + k.d + timeSlot(k.h).charCodeAt(0) * 7 + tap * 7919;

  function pick(lines, c, o) {
    const liked = new Set(o.liked || []), skipped = new Set(o.skipped || []), recent = new Set(o.recent || []);
    const taste = {};
    for (const l of lines) { const d = liked.has(l.id) ? 1 : skipped.has(l.id) ? -1 : 0; if (d) for (const m of (l.tags && l.tags.mood) || []) taste[m] = (taste[m] || 0) + d; }
    const cands = (useRecent) => {
      const out = [];
      for (const l of lines) {
        if (skipped.has(l.id) || (useRecent && recent.has(l.id))) continue;
        const s = score(l.tags, c, l.text.includes("{지역}"));
        if (s == null) continue;
        let w = s + (l.fresh ? 3 : 0) + (liked.has(l.id) ? 1 : 0), tt = 0;
        for (const m of (l.tags && l.tags.mood) || []) tt += taste[m] || 0;
        w *= 1 + 0.25 * Math.max(-2, Math.min(4, tt));
        out.push([l, w]);
      }
      return out;
    };
    let l = cands(true);
    if (!l.length) l = cands(false);
    if (!l.length) return null;
    l.sort((a, b) => b[1] - a[1]);
    const top = l[0][1], pool = l.filter((x) => x[1] >= top - 3).slice(0, 12);
    const ws = pool.map((x) => Math.exp((x[1] - top) / 3)), r = rng(seedOf(c.k, o.tap || 0));
    let at = r() * ws.reduce((a, b) => a + b, 0), chosen = pool[pool.length - 1];
    for (let i = 0; i < pool.length; i++) { at -= ws[i]; if (at <= 0) { chosen = pool[i]; break; } }
    return { line: chosen[0], text: fill(chosen[0].text, c), score: chosen[1] };
  }
  function fill(s, c) { return s.replace(/\{지역\}/g, c.region || "이 동네").replace(/\{요일\}/g, DOW[weekday(c.k)] + "요일"); }
  function pickPhoto(photos, c, tap) {
    const l = [];
    for (const p of photos) { const s = score(p.tags, c, false); if (s != null) l.push([p, s]); }
    if (!l.length) return null;
    l.sort((a, b) => b[1] - a[1]);
    const top = l.filter((x) => x[1] === l[0][1]);
    return top[Math.floor(rng(seedOf(c.k, tap))() * top.length)][0];
  }
  const MOOD_SONG = { 차분함: ["calm"], 위로: ["emotional"], 설렘: ["free", "drive"], 그리움: ["memory", "classic"], 떠나고싶음: ["drive", "free"], 다정함: ["coffee", "calm"] };
  const SKY_SONG = { 비: "rain", 눈: "snow", 안개: "fog", 바람: "wind", 맑음: "clear" };
  function songFor(line, c, songs, ban) {
    const want = {}, add = (k, n) => (want[k] = (want[k] || 0) + n);
    for (const m of (line.tags && line.tags.mood) || []) for (const s of MOOD_SONG[m] || []) add(s, 2);
    const sky = SKY_SONG[c.sky];
    if (sky) add(sky, 3);
    const ts = timeSlot(c.k.h);
    if (ts === "밤") add("night", 2);
    if (ts === "새벽") add("dawn", 2);
    const weatherTags = new Set(Object.values(SKY_SONG));
    const l = [];
    for (const s of songs || []) {
      if (ban.has(s.title + "/" + s.artist)) continue;
      if (s.months && s.months.length && !s.months.includes(c.k.m)) continue;
      const wt = (s.tags || []).filter((x) => weatherTags.has(x));
      if (wt.length && (!sky || !wt.includes(sky))) continue;
      let sc = 0;
      for (const x of s.tags || []) sc += want[x] || 0;
      if (sc > 0) l.push([s, sc]);
    }
    if (!l.length) return null;
    l.sort((a, b) => b[1] - a[1]);
    const pool = l.filter((x) => x[1] >= l[0][1] - 2).slice(0, 10);
    return pool[Math.floor(rng(seedOf(c.k, 0) + line.id.length * 31)() * pool.length)][0];
  }
  function buddy(line, c) {
    const sp = new Set(c.specials || []), wd = worldTags(c.k), ts = timeSlot(c.k.h);
    if (sp.has("생일")) return "🎂";
    if (sp.has("첫눈")) return "⛄";
    if (c.sky === "비") return "☂️";
    if (c.sky === "눈") return "❄️";
    if (wd.has("크리스마스")) return "🎄";
    if (wd.has("연말")) return "🧣";
    if (ts === "밤" || ts === "새벽") return "🌙";
    if (seasonWord(c.k) === "겨울") return "🧣";
    if (c.sky === "맑음") return "☀️";
    return "☕";
  }

  // ---------- 데이터 ----------
  let D = null, loading = null;
  async function load() {
    if (D) return D;
    if (!loading) loading = (async () => {
      const get = async (n) => { try { const r = await fetch("data/" + n + "?v=" + new Date().toISOString().slice(0, 10)); return r.ok ? r.json() : null; } catch (e) { return null; } };
      const [a, b, c] = await Promise.all([get("lines.json"), get("photos.json"), get("region-moods.json")]);
      let daily = [];
      try {
        const r = await fetch("https://xkhfannbztgvarxqhzno.supabase.co/functions/v1/daily-lines");
        if (r.ok) { const j = await r.json(); daily = Array.isArray(j.lines) ? j.lines.map((x) => ({ ...x, id: "daily-" + x.id, fresh: true, day: j.day })) : []; }
      } catch (e) {}
      D = { lines: (a && a.lines) || [], photos: (b && b.photos) || [], moods: (c && c.moods) || {}, daily };
      return D;
    })();
    return loading;
  }

  // ---------- 내 반응 (이 브라우저에만) ----------
  const PK = "jepi.line.v1";
  function prefs() { return store.get(PK, { liked: [], skipped: [], shown: {} }); }
  function recent(p, k) {
    const today = dayKey(k), cut = Date.UTC(k.y, k.m - 1, k.d) - 14 * 86400e3;
    return Object.entries(p.shown || {}).filter(([, d]) => d !== today && Date.parse(d + "T00:00:00Z") > cut).map(([id]) => id);
  }
  function tapNow(k) { const x = store.get("jepi.line.tap", {}); return x.day === dayKey(k) ? x.n : 0; }

  // ---------- 그리기 ----------
  let last = null; // { c, box, songs }
  async function mount(box, c, songs) {
    if (!box) return;
    if (!enabled()) { box.innerHTML = ""; return; }
    const d = await load();
    last = { c, box, songs };
    const p = prefs(), tap = tapNow(c.k), today = dayKey(c.k);
    const s = sidoShort(c.sido), slot = timeSlot(c.k.h);
    const daily = d.daily.filter((x) => x.day === today && (!x.sido || x.sido === s) && (!x.slot || x.slot === slot));
    const rec = recent(p, c.k);
    if (tap > 0) for (const [id, dd] of Object.entries(p.shown || {})) if (dd === today) rec.push(id); // 다음 한 줄은 오늘 본 것 말고
    const pk = pick([...d.lines, ...daily], c, { liked: p.liked, skipped: p.skipped, recent: rec, tap });
    if (!pk) { box.innerHTML = ""; return; }
    p.shown = p.shown || {};
    p.shown[pk.line.id] = today;
    store.set(PK, p);
    const ph = pickPhoto(d.photos, c, tap);
    const mood = c.region ? d.moods[sidoShort(c.sido) + " " + c.region] || "" : "";
    const sub = pk.line.sub || mood;
    const ban = new Set(store.get("zSongBan", []));
    const song = songFor(pk.line, c, songs, ban);
    const liked = (p.liked || []).includes(pk.line.id);
    const wd = DOW[weekday(c.k)];
    box.innerHTML =
      '<article class="lineCard' + (ph ? " photo" : "") + '"' + (ph ? ' style="background-image:linear-gradient(180deg,rgba(0,0,0,.1),rgba(0,0,0,.55)),url(' + esc(ph.src) + ')"' : "") + ">" +
      '<div class="lineHead">' + esc(t("오늘의 한 줄")) + " · " + c.k.m + "/" + c.k.d + " " + wd + (c.region ? " · " + esc(c.region) : "") + (pk.line.fresh ? ' <span class="pill">' + esc(t("오늘 새로")) + "</span>" : "") + "</div>" +
      '<button type="button" class="lineText" data-line-next title="' + esc(t("누르면 다음 한 줄")) + '">' + esc(pk.text) + "</button>" +
      (sub ? '<div class="lineSub">' + esc(sub) + "</div>" : "") +
      '<div class="lineFoot"><span class="lineBuddy" aria-hidden="true"><img src="img/buddies/buddies.svg" alt="" onerror="this.remove()">' + buddy(pk.line, c) + "</span>" +
      (song ? '<a class="lineSong" href="https://www.youtube.com/results?search_query=' + encodeURIComponent(song.title + " " + song.artist) + '" target="_blank" rel="noopener">♪ ' + esc(song.title) + " · " + esc(song.artist) + "</a>" : '<span class="lineSong"></span>') +
      '<button type="button" class="btn" data-line-like aria-pressed="' + liked + '" aria-label="' + esc(t("좋아요")) + '">' + (liked ? "♥" : "♡") + "</button>" +
      '<button type="button" class="btn" data-line-skip aria-label="' + esc(t("이 한 줄 넘기기")) + '">✕</button>' +
      ("speechSynthesis" in window ? '<button type="button" class="btn" data-line-say aria-label="' + esc(t("소리 내어 읽기")) + '">🔊</button>' : "") +
      '<button type="button" class="btn" data-line-share aria-label="' + esc(t("공유")) + '">↗</button></div>' +
      '<div class="lineHint">' + esc(tap + 1 >= 3 ? t("오늘은 여기까지예요") : t("한 줄을 누르면 다음 한 줄 (하루 3번)")) + "</div></article>";
    const q = (a) => box.querySelector("[" + a + "]");
    q("data-line-next").onclick = () => {
      if (tap + 1 >= 3) return;
      store.set("jepi.line.tap", { day: today, n: tap + 1 });
      mount(box, c, songs);
    };
    q("data-line-like").onclick = () => {
      const p2 = prefs(); p2.liked = p2.liked || [];
      const i = p2.liked.indexOf(pk.line.id);
      if (i >= 0) p2.liked.splice(i, 1); else p2.liked.push(pk.line.id);
      store.set(PK, p2); mount(box, c, songs);
    };
    q("data-line-skip").onclick = () => {
      const p2 = prefs(); p2.skipped = [...(p2.skipped || []), pk.line.id]; p2.liked = (p2.liked || []).filter((x) => x !== pk.line.id);
      store.set(PK, p2); mount(box, c, songs);
    };
    const say = q("data-line-say");
    if (say) say.onclick = () => {
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(pk.text);
        u.lang = "ko-KR"; u.rate = 0.85; u.pitch = 0.95;
        const v = speechSynthesis.getVoices().find((x) => /ko/i.test(x.lang));
        if (v) u.voice = v;
        speechSynthesis.speak(u);
      } catch (e) {}
    };
    q("data-line-share").onclick = async () => {
      const text = pk.text + "\n— 바람소리 · baramsori.kr";
      try { if (navigator.share) { await navigator.share({ text }); return; } } catch (e) { return; }
      try { await navigator.clipboard.writeText(text); q("data-line-share").textContent = "✓"; } catch (e) {}
    };
  }

  window.ZLINE = { mount, enabled, _test: { pick, score, worldTags, sidoShort, timeSlot, seasonWord, pickPhoto, songFor, fill } };
})();
