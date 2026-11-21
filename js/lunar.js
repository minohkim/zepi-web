// 제피 웹 · 음력 날짜와 물때 (앱 lib/services/fish_plan.dart 의 lunarDay · mulName 을 옮겨 왔어요)
// - 삭(새달) 시각: Meeus 「Astronomical Algorithms」 49장 (평균 삭 + 주요 주기 보정항 25개 + 행성 보정 14개)
// - 음력 날짜: 한국 시각(KST) 달력 날짜로, 그날 안에 삭이 든 날이 초하루
// - 물때 이름: 서해식 7물때 (음력 1일 = 7물, 8일·23일 = 조금, 9일·24일 = 무시)
(function (root) {
  "use strict";
  const DAY = 864e5, KST = 9 * 3600e3, SYN = 29.530588861;
  const rad = Math.PI / 180;
  const sin = (deg) => Math.sin(deg * rad);

  // 지구 자전 늦어짐 ΔT (초): 2010~2035 는 관측값 근처 69초, 그 밖은 Espenak-Meeus 식
  function deltaT(y) {
    if (y >= 2010 && y <= 2035) return 69;
    const t = y - 2000;
    return 62.92 + 0.32217 * t + 0.005589 * t * t;
  }

  // k 번째 삭(2000-01-06 근처가 k=0)의 역학시 율리우스일
  function newMoonJDE(k) {
    const T = k / 1236.85, T2 = T * T, T3 = T2 * T, T4 = T3 * T;
    let jde = 2451550.09766 + SYN * k + 0.00015437 * T2 - 0.00000015 * T3 + 0.00000000073 * T4;
    const E = 1 - 0.002516 * T - 0.0000074 * T2;
    const M = 2.5534 + 29.1053567 * k - 0.0000014 * T2 - 0.00000011 * T3; // 해 평균 근점이각
    const Mp = 201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4; // 달 평균 근점이각
    const F = 160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4; // 달 위도 인수
    const Om = 124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3; // 승교점 황경
    jde +=
      -0.4072 * sin(Mp) + 0.17241 * E * sin(M) + 0.01608 * sin(2 * Mp) + 0.01039 * sin(2 * F) +
      0.00739 * E * sin(Mp - M) - 0.00514 * E * sin(Mp + M) + 0.00208 * E * E * sin(2 * M) -
      0.00111 * sin(Mp - 2 * F) - 0.00057 * sin(Mp + 2 * F) + 0.00056 * E * sin(2 * Mp + M) -
      0.00042 * sin(3 * Mp) + 0.00042 * E * sin(M + 2 * F) + 0.00038 * E * sin(M - 2 * F) -
      0.00024 * E * sin(2 * Mp - M) - 0.00017 * sin(Om) - 0.00007 * sin(Mp + 2 * M) +
      0.00004 * sin(2 * Mp - 2 * F) + 0.00004 * sin(3 * M) + 0.00003 * sin(Mp + M - 2 * F) +
      0.00003 * sin(2 * Mp + 2 * F) - 0.00003 * sin(Mp + M + 2 * F) + 0.00003 * sin(Mp - M + 2 * F) -
      0.00002 * sin(Mp - M - 2 * F) - 0.00002 * sin(3 * Mp + M) + 0.00002 * sin(4 * Mp);
    const A = [
      [0.000325, 299.77 + 0.107408 * k - 0.009173 * T2], [0.000165, 251.88 + 0.016321 * k],
      [0.000164, 251.83 + 26.651886 * k], [0.000126, 349.42 + 36.412478 * k], [0.00011, 84.66 + 18.206239 * k],
      [0.000062, 141.74 + 53.303771 * k], [0.00006, 207.14 + 2.453732 * k], [0.000056, 154.84 + 7.30686 * k],
      [0.000047, 34.52 + 27.261239 * k], [0.000042, 207.19 + 0.121824 * k], [0.00004, 291.34 + 1.844379 * k],
      [0.000037, 161.72 + 24.198154 * k], [0.000035, 239.56 + 25.513099 * k], [0.000023, 331.55 + 3.592518 * k],
    ];
    for (const [c, a] of A) jde += c * sin(a);
    return jde;
  }

  // k 번째 삭의 시각 (UTC 밀리초)
  function newMoonMs(k) {
    const jde = newMoonJDE(k);
    const y = 2000 + k / 12.3685;
    return (jde - deltaT(y) / 86400 - 2440587.5) * DAY;
  }

  const kstDayNum = (ms) => Math.floor((ms + KST) / DAY); // 한국 날짜의 일련번호
  const ymdDayNum = (y, m, d) => Math.floor(Date.UTC(y, m - 1, d) / DAY);
  function dayNumYmd(n) { const d = new Date(n * DAY); return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()]; }

  // 한국 날짜 n 이 끝나기 전(그날 24시 KST 전)의 가장 최근 삭 번호
  function lastNewMoonK(n) {
    const endMs = (n + 1) * DAY - KST;
    let k = Math.floor((endMs / DAY + 2440587.5 - 2451550.09766) / SYN);
    while (newMoonMs(k + 1) < endMs) k++;
    while (newMoonMs(k) >= endMs) k--;
    return k;
  }

  // 음력 날짜 (1~30): 한국 달력 날짜 y-m-d
  function lunarDayYmd(y, m, d) {
    const n = ymdDayNum(y, m, d);
    return n - kstDayNum(newMoonMs(lastNewMoonK(n))) + 1;
  }
  // 음력 날짜: 어떤 순간(Date)의 한국 날짜 기준
  function lunarDay(date) {
    const [y, m, d] = dayNumYmd(kstDayNum(date.getTime()));
    return lunarDayYmd(y, m, d);
  }

  // 서해식 7물때: { n: 1~13 } 또는 { name: "조금" | "무시" } (앱 mulName 과 같은 규칙)
  function mul(lunar) {
    const l = Math.min(30, Math.max(1, lunar));
    if (l <= 7) return { n: l + 6 };
    if (l === 8 || l === 23) return { name: "조금" };
    if (l === 9 || l === 24) return { name: "무시" };
    if (l <= 22) return { n: l - 9 };
    return { n: l - 24 };
  }
  const mulName = (lunar) => { const x = mul(lunar); return x.name || x.n + "물"; };

  // 사리·조금 (음력 날짜로): 6~11물 = 사리, 13물·조금·무시·1~3물 = 조금, 나머지(4·5·12물) = 중간
  function springNeap(lunar) {
    // 앱 lib/services/tide.dart springNeapText 와 같은 기준 (음력 날짜로)
    const l = lunar;
    if (l >= 29 || l <= 5 || (l >= 14 && l <= 20)) return "사리";
    if ((l >= 6 && l <= 10) || (l >= 21 && l <= 25)) return "조금";
    return "중간";
  }

  // 가장 가까운 사리 한가운데(8물 = 음력 2일·17일)까지 남은 날 (음수면 지난 날, 같으면 앞날 먼저)
  function daysToSpring(date) {
    const n0 = kstDayNum(date.getTime());
    for (let o = 0; o <= 16; o++) {
      for (const s of o ? [o, -o] : [0]) {
        const [y, m, d] = dayNumYmd(n0 + s);
        const l = lunarDayYmd(y, m, d);
        if (l === 2 || l === 17) return s;
      }
    }
    return 0;
  }

  const api = { newMoonJDE, newMoonMs, deltaT, lunarDay, lunarDayYmd, mul, mulName, springNeap, daysToSpring, kstDayNum };
  root.ZLUNAR = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
