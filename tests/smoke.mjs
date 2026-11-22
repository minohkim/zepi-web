// 제피 웹 기본 점검: 페이지가 뜨는지, 메뉴마다 오류가 없는지, 번역이 빠지지 않았는지
// 실행: python3 -m http.server 8765 & node tests/smoke.mjs
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:8765/";
const TABS = ["today", "sea", "plan", "farm", "day", "conquest", "report", "trips", "badges", "notes", "routes", "io"];
let fails = 0;
const ok = (cond, name, extra) => { if (cond) console.log("✓", name); else { fails++; console.log("✗", name, extra || ""); } };

const browser = await chromium.launch();
async function page(lang) {
  const ctx = await browser.newContext({ locale: lang === "ko" ? "ko-KR" : "en-US" });
  const pg = await ctx.newPage();
  pg.errors = [];
  pg.on("pageerror", (e) => pg.errors.push(String(e)));
  return pg;
}

// 1) 정적 페이지
for (const path of ["?home", "beta.html", "privacy.html", "terms.html"]) {
  const pg = await page("ko");
  const r = await pg.goto(BASE + path, { waitUntil: "load" });
  ok(r.ok(), "열림 " + path);
  ok(pg.errors.length === 0, "오류 없음 " + path, pg.errors.join(" | "));
  await pg.close();
}

// 2) 웹 앱: 예시 데이터로 메뉴 전부
for (const lang of ["ko", "en"]) {
  const pg = await page(lang);
  await pg.goto(BASE + "app.html?lang=" + lang, { waitUntil: "load" });
  await pg.waitForFunction(() => window.ZAPP_READY === true, null, { timeout: 30000 });
  ok(await pg.evaluate(() => !document.getElementById("main").hidden), lang + " 예시 데이터로 앱이 열림");
  for (const tab of TABS) {
    await pg.evaluate((t) => ZAPP.showTab(t), tab);
    await pg.waitForTimeout(tab === "today" || tab === "sea" ? 4000 : 800);
    const visible = await pg.evaluate((t) => !document.getElementById("view-" + t).hidden, tab);
    ok(visible, lang + " 메뉴 " + tab);
  }
  // 놀이: 탭마다 게임 카드가 있고, 게임 4개가 열리고 한 판씩 돌아가는지
  for (const [tab, kind] of [["sea", "fish"], ["conquest", "mount"], ["farm", "farm"], ["today", "star"]]) {
    await pg.evaluate((t) => ZAPP.showTab(t), tab);
    ok((await pg.locator('#view-' + tab + ' .playcard[data-pcard="' + kind + '"]').count()) === 1, lang + " 놀이 카드 " + tab);
  }
  for (const kind of ["fish", "mount", "farm", "star"]) {
    await pg.evaluate((k) => ZPLAY.open(k), kind);
    await pg.waitForTimeout(300);
    for (let i = 0; i < 25; i++) { await pg.click('[data-pgame="' + kind + '"] .gbig', { force: true }); await pg.waitForTimeout(kind === "farm" ? 900 : 350); }
    ok(await pg.evaluate((k) => !document.querySelector('[data-pgame="' + k + '"]').hidden && ZPLAY.current() === k, kind), lang + " 놀이 " + kind + " 열림·진행");
  }
  await pg.evaluate(() => ZPLAY.close());
  ok(pg.errors.length === 0, lang + " 메뉴 전부 오류 없음", pg.errors.join(" | "));
  if (lang === "en") {
    const missing = await pg.evaluate(() => Object.keys(ZI18N.missing || {}));
    ok(missing.length === 0, "영어 번역 빠진 문구 없음", missing.slice(0, 10).join(" / "));
  }
  // 3) 여행 계획 추천
  if (lang === "ko") {
    await pg.evaluate(() => { localStorage.removeItem("jepi.plan.v1"); ZAPP.showTab("today"); });
    await pg.reload({ waitUntil: "load" });
    await pg.waitForFunction(() => window.ZAPP_READY === true, null, { timeout: 30000 });
    await pg.evaluate(() => ZAPP.showTab("plan"));
    await pg.click('[data-want="sea"]');
    await pg.click('[data-act="rank"]');
    await pg.waitForSelector(".cand", { timeout: 15000 });
    ok((await pg.locator(".cand").count()) > 0, "여행 계획: 바다로 추천 시군구가 나옴");
    // 4) 내 여행·배지
    await pg.evaluate(() => ZAPP.showTab("trips"));
    ok((await pg.locator("#tripsRoot .trip").count()) > 0, "내 여행: 예시 데이터에서 여행이 묶임");
    await pg.evaluate(() => ZAPP.showTab("badges"));
    ok((await pg.locator("#badgesRoot .badge").count()) >= 30, "배지·레벨: 배지가 보임");
  }
  // 5) 폰과 맞추는 규칙 (앱 cloud_docs_test.dart 와 같은 경우)
  if (lang === "ko") {
    const r = await pg.evaluate(() => {
      const D = ZDOCS.decide, o = '{"updated":100}', n = '{"updated":200}';
      return [D(o, n), D(n, o), D(o, o), D(null, n), D(o, null), D(null, null), D("{}", null), D("{}", "{}"), D("{}", n)].join(",");
    });
    ok(r === "pull,push,,pull,push,,push,push,pull", "폰과 맞추기 규칙", r);
  }
  await pg.close();
}
await browser.close();
console.log(fails ? `\n${fails}개 실패` : "\n모두 통과");
process.exit(fails ? 1 : 0);
