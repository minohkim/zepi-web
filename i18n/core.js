// 제피 웹 번역 (한국어 · English · 中文 · 日本語)
// - 문구는 한국어 문장을 그대로 키로 써요: t("기록한 날") → "Days recorded"
// - {n} 같은 자리는 t("{n}곳", {n: 3}) 처럼 채워요
// - 화면에 박힌 문구는 apply()가 한 번에 바꿔요 (언어를 바꾸면 페이지를 다시 열어요)
// 번역 원본: i18n/strings.json → tools/build_i18n.py 로 i18n.js 를 만들어요.
(function () {
  "use strict";
  var LANGS = { ko: "한국어", en: "English", zh: "中文", ja: "日本語" };
  var LOCALE = { ko: "ko-KR", en: "en-US", zh: "zh-CN", ja: "ja-JP" };
  var IDX = { en: 0, zh: 1, ja: 2 };
  var HANGUL = /[가-힣]/;
  var INLINE = { B: 1, STRONG: 1, A: 1, SMALL: 1, BR: 1, EM: 1, I: 1, SPAN: 1 };

  function pick() {
    try {
      var q = new URLSearchParams(location.search).get("lang");
      if (q && LANGS[q]) { try { localStorage.setItem("jepi.lang", q); } catch (e) {} return q; }
    } catch (e) {}
    try { var s = localStorage.getItem("jepi.lang"); if (s && LANGS[s]) return s; } catch (e) {}
    var list = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "ko"]);
    for (var i = 0; i < list.length; i++) {
      var l = String(list[i]).toLowerCase();
      if (l.indexOf("ko") === 0) return "ko";
      if (l.indexOf("ja") === 0) return "ja";
      if (l.indexOf("zh") === 0) return "zh";
      if (l.indexOf("en") === 0) return "en";
    }
    return "en";
  }

  var lang = pick();
  var L = LOCALE[lang];
  var Z = { lang: lang, locale: L, LANGS: LANGS, dict: {}, missing: {} };

  Z.t = function (ko, vars) {
    var s = ko;
    if (lang !== "ko") {
      var e = Z.dict[ko];
      if (e && e[IDX[lang]]) s = e[IDX[lang]];
      else if (HANGUL.test(ko)) Z.missing[ko] = 1;
    }
    if (vars) s = s.replace(/\{(\w+)\}/g, function (m, k) { return Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : m; });
    return s;
  };
  // 사용자 데이터(태그 등) 중 번역이 있는 것만 바꿔 보여줘요
  Z.tOpt = function (ko) {
    if (lang === "ko") return ko;
    var e = Z.dict[ko];
    return (e && e[IDX[lang]]) || ko;
  };

  function norm(h) { return h.replace(/\s+/g, " ").trim(); }
  function inlineText(n) { return n.nodeType === 1 && !n.id && INLINE[n.tagName] && HANGUL.test(n.textContent); }

  Z.apply = function (root) {
    if (lang === "ko") return;
    if (!root) {
      root = document.body;
      if (HANGUL.test(document.title)) document.title = Z.t(document.title);
    }
    (function walk(el) {
      if (el.tagName === "SCRIPT" || el.tagName === "STYLE" || (el.hasAttribute && el.hasAttribute("data-no-i18n"))) return;
      ["placeholder", "aria-label", "title", "alt", "content"].forEach(function (a) {
        var v = el.getAttribute && el.getAttribute(a);
        if (v && HANGUL.test(v)) el.setAttribute(a, Z.t(v));
      });
      var kids = Array.prototype.slice.call(el.childNodes);
      // 문장 안에 <b>·<a> 같은 꾸밈이 섞여 있으면 문장 통째로 번역 (어순이 언어마다 달라서)
      var hasText = kids.some(function (n) { return n.nodeType === 3 && HANGUL.test(n.nodeValue); });
      var sentence = hasText && kids.some(inlineText) && kids.every(function (n) {
        if (n.nodeType === 3 || n.nodeType === 8) return true;
        if (n.nodeType !== 1 || n.id || !INLINE[n.tagName]) return false;
        return Array.prototype.every.call(n.querySelectorAll("*"), function (x) { return INLINE[x.tagName] && !x.id; });
      });
      if (sentence) { el.innerHTML = Z.t(norm(el.innerHTML)); return; }
      kids.forEach(function (n) {
        if (n.nodeType === 3) {
          if (HANGUL.test(n.nodeValue)) { var k = n.nodeValue.trim(); n.nodeValue = n.nodeValue.replace(k, Z.t(k)); }
        } else if (n.nodeType === 1) walk(n);
      });
    })(root);
  };

  Z.setLang = function (l) {
    try { localStorage.setItem("jepi.lang", l); } catch (e) {}
    try {
      var u = new URL(location.href);
      u.searchParams.set("lang", l);
      location.replace(u.toString());
    } catch (e) { location.reload(); }
  };
  Z.switcher = function (sel) {
    sel.innerHTML = Object.keys(LANGS).map(function (k) {
      return '<option value="' + k + '"' + (k === lang ? " selected" : "") + ">" + LANGS[k] + "</option>";
    }).join("");
    sel.addEventListener("change", function () { Z.setLang(sel.value); });
  };

  // 날짜·숫자 형식
  function df(o) { return new Intl.DateTimeFormat(L, o); }
  var fDay = df({ month: "short", day: "numeric", weekday: "short" });
  var fShort = df({ year: "numeric", month: "numeric", day: "numeric" });
  var fMonthTitle = df({ year: "numeric", month: "long" });
  var fMonthShort = df({ month: "short" });
  var fMonthDay = df({ month: "long", day: "numeric" });
  var fYear = df({ year: "numeric" });
  var fWeek = df({ weekday: "narrow" });
  Z.fmt = {
    int: new Intl.NumberFormat(L),
    day: function (d) { return fDay.format(d); },
    dayShort: function (d) { return fShort.format(d); },
    monthTitle: function (y, m) { return fMonthTitle.format(new Date(y, m - 1, 1)); },
    monthShort: function (m) { return fMonthShort.format(new Date(2026, m - 1, 1)); },
    monthDay: function (y, m, d) { return fMonthDay.format(new Date(y, m - 1, d)); },
    year: function (y) { return fYear.format(new Date(y, 6, 1)); },
    dow: [0, 1, 2, 3, 4, 5, 6].map(function (i) { return fWeek.format(new Date(2026, 10, 1 + i)); }), // 2026-11-01 = 일요일
  };

  document.documentElement.lang = lang;
  window.ZI18N = Z;
})();
