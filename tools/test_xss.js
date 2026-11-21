// 가져오기 미리보기(drawPending)가 장소 이름·메모를 글자로만 그리는지 확인해요.
// 실행: node tools/test_xss.js   (app.html 에서 esc 와 drawPending 을 그대로 꺼내 돌려요)
"use strict";
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "..", "app.html"), "utf8");

const escLine = src.match(/^\s*const esc = .*$/m)[0];
const start = src.indexOf("  function drawPending() {");
const end = src.indexOf("\n  }\n", start) + 4;
const drawSrc = src.slice(start, end);

// 아주 작은 HTML 태그 읽개: 속성 이름과 (엔티티를 푼) 값을 꺼내요
function decode(s) {
  return s.replace(/&(#\d+|#x[0-9a-f]+|amp|lt|gt|quot|apos);/gi, (m, e) =>
    e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : +e.slice(1))
      : { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }[e.toLowerCase()]);
}
function tags(html) {
  const out = [];
  const re = /<([a-zA-Z][\w-]*)((?:\s+[^\s"'>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?>/g;
  let m;
  while ((m = re.exec(html))) {
    const attrs = [];
    const ar = /\s+([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    let a;
    while ((a = ar.exec(m[2]))) attrs.push([a[1].toLowerCase(), decode(a[2] ?? a[3] ?? a[4] ?? "")]);
    out.push({ tag: m[1].toLowerCase(), attrs, end: re.lastIndex });
  }
  return out;
}
const textOf = (html) => decode(html.replace(/<[^>]*>/g, ""));

const rowsEl = { innerHTML: "" };
const dummy = () => ({ textContent: "", hidden: false, disabled: false });
const els = { ioRows: rowsEl, ioSum: dummy(), ioFind: dummy(), ioSave: dummy() };
const $ = (id) => els[id];
const t = (s, p) => String(s).replace(/\{(\w+)\}/g, (_, k) => (p && k in p ? p[k] : "{" + k + "}"));
const Z = { tOpt: (s) => s };
const canEdit = () => true;

const EVIL = "카페' autofocus onfocus='alert(1)' x='";
const EVIL2 = '"><img src=x onerror=alert(2)>';
const longMemo = "가".repeat(119) + "&<b>뒤</b>"; // 120자째가 & → 엔티티가 반으로 잘리면 안 돼요
let pending = [
  { name: EVIL, sub: EVIL2, list: EVIL, memo: EVIL2, sel: true, st: "ok" },
  { name: EVIL2, sub: "", list: "x", memo: longMemo, sel: true, st: "none" },
];

// eslint-disable-next-line no-new-func
const run = new Function("$", "t", "Z", "canEdit", "pending", escLine + "\n" + drawSrc + "\nreturn { drawPending, esc };");
const api = run($, t, Z, canEdit, pending);
api.drawPending();
const html = rowsEl.innerHTML;

let fail = 0;
const ok = (cond, msg) => { console.log((cond ? "PASS " : "FAIL ") + msg); if (!cond) fail++; };

const all = tags(html);
const names = all.flatMap((x) => x.attrs.map((a) => a[0]));
ok(!names.some((n) => /^on/.test(n)), "이벤트 속성(on*)이 생기지 않아요: " + [...new Set(names)].join(","));
ok(!names.includes("autofocus") && !names.includes("x"), "autofocus / x 속성이 새로 생기지 않아요");
ok(!all.some((x) => x.tag === "img"), "<img> 태그가 생기지 않아요");
const boxes = all.filter((x) => x.tag === "input");
ok(boxes.length === 2, "체크박스 2개");
ok(boxes[0].attrs.find((a) => a[0] === "aria-label")[1] === EVIL + " 선택", "aria-label 은 이름 글자 그대로: " + JSON.stringify(boxes[0].attrs.find((a) => a[0] === "aria-label")[1]));
ok(textOf(html).includes(EVIL) && textOf(html).includes(EVIL2), "이름이 화면에 글자로 보여요");
const memoCell = html.split("</tr>")[1].split("<td>")[4].split("</td>")[0];
ok(!/&[#a-z0-9]*$/i.test(memoCell) && decode(memoCell) === longMemo.slice(0, 120), "메모는 자른 다음 바꿔서 엔티티가 반으로 잘리지 않아요: " + JSON.stringify(memoCell.slice(-12)));
ok(api.esc(null) === "" && api.esc(undefined) === "", "esc(null/undefined) → 빈 글자");
ok(api.esc("'") === "&#39;", "esc 가 작은따옴표를 &#39; 로 바꿔요");

console.log(fail ? "\n" + fail + "개 실패" : "\n모두 통과");
process.exit(fail ? 1 : 0);
