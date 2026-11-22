// 폰과 웹이 같이 쓰는 문서 (텃밭·여행 계획). 앱 lib/cloud_docs.dart 와 같은 규칙:
// 서버 blobs 표에 통째로 두고, 'updated'(ms)가 더 큰 쪽이 이겨요.
(function () {
  const updatedOf = (s) => { try { const v = JSON.parse(s).updated; return typeof v === "number" ? v : 0; } catch (e) { return 0; } };
  function decide(local, remote) {
    const lu = updatedOf(local), ru = updatedOf(remote);
    if (remote != null && ru > lu) return "pull";
    if (local != null && (remote == null || lu > ru || (lu === 0 && ru === 0))) return "push";
    return null;
  }
  const timers = {};
  window.ZDOCS = {
    updatedOf, decide,
    // 로그인했으면 서버와 맞추고, 서버 것이 더 새로우면 그 글을 돌려줘요
    async sync(name, local) {
      if (!window.ZAPP || !ZAPP.signedIn()) return null;
      try {
        const remote = await ZAPP.docGet(name);
        const d = decide(local, remote);
        if (d === "pull") return remote;
        if (d === "push") await ZAPP.docPut(name, updatedOf(local) ? local : JSON.stringify({ ...JSON.parse(local), updated: Date.now() }));
      } catch (e) { console.warn("docs sync", name, e); }
      return null;
    },
    // 고칠 때마다 조금 기다렸다 올려요
    push(name, data) {
      if (!window.ZAPP || !ZAPP.signedIn()) return;
      clearTimeout(timers[name]);
      timers[name] = setTimeout(() => ZAPP.docPut(name, data).catch((e) => console.warn("docs push", name, e)), 1500);
    },
  };
})();
