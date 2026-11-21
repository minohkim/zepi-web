// 웹 음력·물때(js/lunar.js) 확인: node tools/test_lunar.js
"use strict";
const L = require("../js/lunar.js");
let fail = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fail++; };
const pad = (n) => String(n).padStart(2, "0");
const kst = (ms) => { const d = new Date(ms + 9 * 3600e3); return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()) + " " + pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()); };

// 비교용: 앱 fish_plan.dart 의 예전 방식 (황경 차 · 1시간 간격 찾기)
function elong(ms) {
  const r = (x) => (x * Math.PI) / 180, d = ms / 864e5 - 10957.5;
  const lm = 218.316 + 13.176396 * d, mm = r(134.963 + 13.064993 * d), dd = r(297.85 + 12.190749 * d), g = r(357.528 + 0.9856003 * d);
  const moon = lm + 6.289 * Math.sin(mm) + 1.274 * Math.sin(2 * dd - mm) + 0.658 * Math.sin(2 * dd) - 0.186 * Math.sin(g);
  const sun = 280.46 + 0.9856474 * d + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g);
  return (((moon - sun) % 360) + 360) % 360;
}
function elongNewMoon(nearMs) { // nearMs ± 2일에서 황경 차가 0 을 지나는 시각 (분 단위로 좁혀요)
  let a = nearMs - 2 * 864e5, b = nearMs + 2 * 864e5;
  const f = (ms) => { const e = elong(ms); return e > 180 ? e - 360 : e; };
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (f(m) < 0) a = m; else b = m; }
  return a;
}

// 2026 삭 (UTC, 공개 천문 자료 기준 분 단위)
const REF2026 = ["01-18 19:52", "02-17 12:01", "03-19 01:23", "04-17 11:52", "05-16 20:01", "06-15 02:54",
  "07-14 09:44", "08-12 17:37", "09-11 03:27", "10-10 15:50", "11-09 07:02", "12-09 00:52"];

console.log("2026 삭 (KST) · 공개 자료와 차이 · 앱 예전 방식과 차이 · 그날 음력/물때 · 전날 음력");
const k0 = Math.round((Date.UTC(2026, 0, 1) / 864e5 + 2440587.5 - 2451550.09766) / 29.530588861);
const moons = [];
for (let k = k0 - 1; k < k0 + 14; k++) { const ms = L.newMoonMs(k); if (new Date(ms + 9 * 3600e3).getUTCFullYear() === 2026) moons.push(ms); }
ok(moons.length === 12, "2026년 삭은 12번 (KST): " + moons.length);
let maxRef = 0, maxApp = 0;
moons.forEach((ms, i) => {
  const ref = Date.parse("2026-" + REF2026[i].replace(" ", "T") + ":00Z");
  const dRef = (ms - ref) / 60e3, dApp = (ms - elongNewMoon(ms)) / 60e3;
  maxRef = Math.max(maxRef, Math.abs(dRef)); maxApp = Math.max(maxApp, Math.abs(dApp));
  const d = new Date(ms + 9 * 3600e3), y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, dd = d.getUTCDate();
  const prev = new Date(Date.UTC(y, m - 1, dd - 1));
  const l = L.lunarDayYmd(y, m, dd), lp = L.lunarDayYmd(prev.getUTCFullYear(), prev.getUTCMonth() + 1, prev.getUTCDate());
  console.log("  " + kst(ms) + "  " + (dRef >= 0 ? "+" : "") + dRef.toFixed(1) + "분  " + (dApp >= 0 ? "+" : "") + (dApp / 60).toFixed(2) + "시간  음력 " + l + "일/" + L.mulName(l) + "  전날 " + lp + "일");
  if (l !== 1 || (lp !== 29 && lp !== 30)) { fail++; console.log("FAIL 위 줄: 삭 날은 음력 1일, 전날은 29·30일이어야 해요"); }
});
ok(maxRef <= 2, "공개 자료와 차이 최대 " + maxRef.toFixed(1) + "분 (2분 이내)");
console.log("     (앱 예전 황경 방식과 차이 최대 " + (maxApp / 60).toFixed(2) + "시간)");

// 꼭 맞아야 하는 날
for (const [y, m, d] of [[2026, 1, 19], [2026, 2, 17], [2026, 11, 9]]) ok(L.lunarDayYmd(y, m, d) === 1, y + "-" + pad(m) + "-" + pad(d) + " 은 음력 1일 (KST)");
// 자정 근처: 2029-12-05 23:52 KST 삭
const k29 = Math.round((Date.UTC(2029, 11, 5) / 864e5 + 2440587.5 - 2451550.09766) / 29.530588861);
const nm29 = [k29 - 1, k29, k29 + 1].map(L.newMoonMs).find((ms) => Math.abs(ms - Date.UTC(2029, 11, 5, 14, 52)) < 864e5);
ok(nm29 && Math.abs(nm29 - Date.UTC(2029, 11, 5, 14, 52)) < 3 * 60e3, "2029-12 삭 " + (nm29 ? kst(nm29) : "?") + " KST (23:52 ±3분)");
ok(L.lunarDayYmd(2029, 12, 5) === 1 && L.lunarDayYmd(2029, 12, 6) === 2 && L.lunarDayYmd(2029, 12, 4) >= 29, "2029-12-05 = 음력 1일, 12-06 = 2일, 12-04 = 29·30일");
// 순간(Date) → 한국 날짜: 2026-11-08 15:30 UTC = 11-09 00:30 KST → 음력 1일
ok(L.lunarDay(new Date(Date.UTC(2026, 10, 8, 15, 30))) === 1, "UTC 저녁이어도 한국 날짜로 셈 (2026-11-09 00:30 KST → 1일)");
ok(L.lunarDay(new Date(Date.UTC(2026, 10, 8, 14, 30))) !== 1, "2026-11-08 23:30 KST → 1일 아님");

// 물때 이름표 (앱 mulName 과 같은지)
const appMul = (l) => (l <= 7 ? l + 6 + "물" : l === 8 || l === 23 ? "조금" : l === 9 || l === 24 ? "무시" : l <= 22 ? l - 9 + "물" : l - 24 + "물");
let same = true;
for (let l = 1; l <= 30; l++) if (L.mulName(l) !== appMul(l)) same = false;
ok(same, "음력 1~30일 물때 이름이 앱 mulName 과 같아요");
console.log("  " + Array.from({ length: 30 }, (_, i) => i + 1 + ":" + L.mulName(i + 1) + "/" + L.springNeap(i + 1)).join(" "));

// 2026 한 해 날마다 음력 날짜가 1씩 늘고, 1일로 돌아갈 땐 29·30일 다음
let prevL = L.lunarDayYmd(2025, 12, 31), seq = true;
for (let n = 0; n < 365; n++) {
  const d = new Date(Date.UTC(2026, 0, 1 + n));
  const l = L.lunarDayYmd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  if (!(l === prevL + 1 || (l === 1 && (prevL === 29 || prevL === 30)))) { seq = false; console.log("  끊김 " + d.toISOString().slice(0, 10) + " " + prevL + "→" + l); }
  prevL = l;
}
ok(seq, "2026년 365일 음력 날짜가 끊기지 않아요");
const dts = L.daysToSpring(new Date(Date.UTC(2026, 10, 21, 3)));
ok(dts === 4, "2026-11-21 사리까지 " + dts + "일 (음력 " + L.lunarDayYmd(2026, 11, 21) + "일 · " + L.mulName(L.lunarDayYmd(2026, 11, 21)) + ")");

console.log(fail ? "\n" + fail + "개 실패" : "\n모두 통과");
process.exit(fail ? 1 : 0);
