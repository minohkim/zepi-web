// 오늘의 한 줄 고르기 규칙 점검 (앱 test/today_line_test.dart 와 같은 경우들)
// node tools/test_line.js
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..");
const store = {};
const ctx = {
  window: {}, location: { search: "" }, URLSearchParams,
  localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => (store[k] = String(v)) },
  console, Math, Date, JSON, Set, Object, String, Array, Promise,
};
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, "js/today-line.js"), "utf8"), ctx);
const T = ctx.ZLINE._test;
const lines = JSON.parse(fs.readFileSync(path.join(root, "data/lines.json"), "utf8")).lines;
const photos = JSON.parse(fs.readFileSync(path.join(root, "data/photos.json"), "utf8")).photos;
const moods = JSON.parse(fs.readFileSync(path.join(root, "data/region-moods.json"), "utf8")).moods;
const songs = JSON.parse(fs.readFileSync(path.join(root, "data/songs.json"), "utf8")).songs;
let fail = 0;
const ok = (c, msg) => { if (!c) { fail++; console.error("✗ " + msg); } else console.log("✓ " + msg); };
const K = (y, m, d, h) => ({ y, m, d, h, mi: 0 });

ok(lines.length >= 150, "감성 사전 150줄 넘음 (" + lines.length + ")");
ok(new Set(lines.map((l) => l.id)).size === lines.length, "id 안 겹침");
ok(Object.keys(moods).length === 230, "지역 한 줄 230곳");
ok(T.sidoShort("경상남도") === "경남" && T.sidoShort("전남광주통합특별시") === "전남" && T.sidoShort("서울특별시") === "서울", "시도 짧은 이름");
ok(T.worldTags(K(2026, 11, 19, 9)).has("수능") && !T.worldTags(K(2026, 11, 26, 9)).has("수능"), "수능 = 11월 셋째 목요일");
ok(T.worldTags(K(2026, 12, 24, 9)).has("크리스마스") && T.worldTags(K(2026, 9, 24, 9)).has("추석"), "크리스마스·추석");
ok(T.timeSlot(8) === "아침" && T.timeSlot(23) === "밤" && T.timeSlot(5) === "새벽", "때");

const clear = { k: K(2026, 11, 27, 8), sky: "맑음", places: [], specials: [] };
let bad = 0;
for (let tap = 0; tap < 30; tap++) {
  const p = T.pick(lines, clear, { tap });
  if (p.line.tags && p.line.tags.sky && !p.line.tags.sky.includes("맑음")) bad++;
  if (p.line.tags && p.line.tags.special) bad++;
}
ok(bad === 0, "맑은 날엔 비 줄·특별한 순간 줄이 안 나와요");
ok(T.score({ sky: ["비"] }, clear) === null && T.score({ dow: ["금"], time: ["아침"] }, clear) === 5, "태그는 이럴 때만");

const cloudy = { k: K(2026, 11, 27, 8), sky: "흐림", region: "성남시", sido: "경기도" };
const a = T.pick(lines, cloudy, { tap: 0 }), b = T.pick(lines, cloudy, { tap: 0 });
ok(a.line.id === b.line.id && a.score >= 5 && !a.text.includes("{"), "흐린 금요일 아침 — 같은 조건이면 같은 줄: " + a.text);

const snowDay = { k: K(2026, 12, 3, 9), sky: "눈", specials: ["첫눈", "생일"] };
ok(!!T.pick(lines, snowDay, {}).line.tags.special, "특별한 순간이 맨 먼저");

let reg = 0;
for (let tap = 0; tap < 20; tap++) if (T.pick(lines, { k: K(2026, 11, 28, 10), places: ["여행"] }, { tap }).line.text.includes("{지역}")) reg++;
ok(reg === 0, "{지역} 줄은 지역을 알 때만");
ok(T.fill("{지역}에서 맞는 {요일}", { k: K(2026, 11, 28, 10), region: "남해군" }) === "남해군에서 맞는 토요일", "빈칸 채우기");

const first = T.pick(lines, cloudy, {});
let again = 0;
for (let tap = 0; tap < 20; tap++) if (T.pick(lines, cloudy, { skipped: [first.line.id], tap }).line.id === first.line.id) again++;
ok(again === 0, "넘긴 줄은 다시 안 나와요");

ok((T.pickPhoto(photos, { k: K(2027, 1, 10, 9), sky: "눈" }, 0) || {}).id === "snow-trees", "눈 오는 겨울엔 눈 사진");
const s = T.songFor({ id: "x", tags: { mood: ["차분함"] } }, { k: K(2026, 11, 27, 21), sky: "맑음" }, songs, new Set());
ok(s && !(s.tags || []).some((x) => ["rain", "snow", "fog"].includes(x)), "맑은 밤 노래 짝: " + (s && s.title));

// 오늘 아침 (11/27 금, 흐림) 실제로 무엇이 나오나 — 탭하면 오늘 본 줄은 빼고
const seen = [];
for (let tap = 0; tap < 3; tap++) {
  const p = T.pick(lines, cloudy, { tap, recent: tap ? seen : [] });
  ok(!seen.includes(p.line.id), "   오늘 " + (tap + 1) + "번째: " + p.text);
  seen.push(p.line.id);
}
if (fail) { console.error(fail + "개 실패"); process.exit(1); }
console.log("모두 통과");
