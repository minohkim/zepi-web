// 제피 웹 · 문의하기 + 오류 알림 → 서버 reports 표 (넣기만 되고, 읽기는 Supabase 대시보드에서만)
(function () {
  const SB_URL = "https://xkhfannbztgvarxqhzno.supabase.co";
  const SB_KEY = "sb_publishable__uulkrUbHekv5cxsE-UyHw_oXkR7wtM";
  const Z = window.ZI18N;
  const t = Z ? Z.t : (s) => s;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function session() {
    try { const s = JSON.parse(localStorage.getItem("jepi.session") || "null"); return s && s.access && Date.now() < s.exp - 30000 ? s : null; } catch (e) { return null; }
  }
  async function send(row) {
    const s = session();
    const r = await fetch(SB_URL + "/rest/v1/reports", {
      method: "POST",
      headers: { apikey: SB_KEY, Authorization: "Bearer " + (s ? s.access : SB_KEY), "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify([{ page: (location.pathname + location.hash).slice(0, 300), ua: navigator.userAgent.slice(0, 300), lang: (Z && Z.lang) || "", ...row }]),
    });
    if (!r.ok) throw new Error(t("보내지 못했어요") + " (" + r.status + ")");
  }

  // ---------- 오류 알림 (한 화면에 5번까지, 같은 오류는 한 번) ----------
  const seen = new Set();
  let count = 0;
  const NOISE = /ResizeObserver|Script error\.?$|Load failed|Failed to fetch|NetworkError|AbortError|cancelled|취소/i;
  function report(msg, stack) {
    msg = String(msg || "").slice(0, 500);
    if (!msg || NOISE.test(msg) || seen.has(msg) || count >= 5) return;
    if (/^(localhost|127\.)/.test(location.hostname)) return;
    seen.add(msg); count++;
    send({ kind: "error", message: (msg + (stack ? "\n" + String(stack) : "")).slice(0, 3500) }).catch(() => {});
  }
  window.addEventListener("error", (e) => report(e.message, e.error && e.error.stack));
  window.addEventListener("unhandledrejection", (e) => { const r = e.reason; report(r && r.message ? r.message : String(r), r && r.stack); });

  // ---------- 문의하기 ----------
  function open() {
    let d = document.getElementById("fbDlg");
    if (!d) {
      d = document.createElement("dialog");
      d.id = "fbDlg";
      d.className = "dlg fbdlg";
      d.setAttribute("aria-labelledby", "fbTitle");
      d.innerHTML = '<form method="dialog" id="fbForm" novalidate><h2 id="fbTitle">' + esc(t("문의하기")) + "</h2>" +
        '<p class="lead">' + esc(t("불편한 점, 바라는 기능, 고마운 말 다 좋아요. 답이 필요하면 이메일을 남겨 주세요.")) + "</p>" +
        '<label class="field" for="fbMsg">' + esc(t("내용")) + '<textarea id="fbMsg" rows="5" maxlength="4000" required></textarea></label>' +
        '<label class="field" for="fbEmail">' + esc(t("답장 받을 이메일 (선택)")) + '<input id="fbEmail" type="email" maxlength="120" autocomplete="email"></label>' +
        '<div class="msg" id="fbMsgOut" role="status"></div>' +
        '<div class="row"><button class="btn primary" type="submit" id="fbSend">' + esc(t("보내기")) + '</button><button class="btn" type="button" id="fbClose">' + esc(t("닫기")) + "</button></div></form>";
      document.body.appendChild(d);
      d.querySelector("#fbClose").addEventListener("click", () => d.close());
      d.querySelector("#fbForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const msg = d.querySelector("#fbMsg").value.trim(), out = d.querySelector("#fbMsgOut"), b = d.querySelector("#fbSend");
        if (!msg) { out.textContent = t("내용을 적어 주세요."); return; }
        b.disabled = true; out.textContent = t("보내는 중이에요…");
        try {
          await send({ kind: "feedback", message: msg, email: d.querySelector("#fbEmail").value.trim().slice(0, 120) });
          d.querySelector("#fbMsg").value = "";
          out.textContent = t("잘 받았어요. 고마워요!");
          setTimeout(() => d.open && d.close(), 1500);
        } catch (err) { out.textContent = err.message + " · " + t("개인정보처리방침의 문의 메일로 보내 주셔도 돼요."); }
        finally { b.disabled = false; }
      });
    }
    const s = session();
    const em = d.querySelector("#fbEmail");
    if (!em.value && s && s.email) em.value = s.email;
    d.querySelector("#fbMsgOut").textContent = "";
    d.showModal();
    d.querySelector("#fbMsg").focus();
  }
  document.addEventListener("click", (e) => { const a = e.target.closest("[data-feedback]"); if (a) { e.preventDefault(); open(); } });
  window.ZREPORT = { open, report };
})();
