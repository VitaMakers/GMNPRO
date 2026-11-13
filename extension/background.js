const API = "https://app.vitamakers.com.br";

// Recebe os dados raspados pelo content script e envia ao GMN PRO (autenticado por cookie).
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== "gmnpro-analyze") return;
  (async () => {
    try {
      const res = await fetch(API + "/api/extension/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(msg.data),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { sendResponse({ ok: false, status: res.status, error: data.detail || data.error || res.status }); return; }
      if (data.url) chrome.tabs.create({ url: data.url });
      sendResponse({ ok: true, url: data.url, score: data.report?.score });
    } catch (e) {
      sendResponse({ ok: false, error: String(e) });
    }
  })();
  return true; // resposta assíncrona
});
