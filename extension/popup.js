const $ = (id) => document.getElementById(id);
function setStatus(m, c) { const e = $("status"); e.className = "s" + (c ? " " + c : ""); e.innerHTML = m; }

$("go").addEventListener("click", async () => {
  $("go").disabled = true; setStatus("Lendo a página…");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !/google\./.test(tab.url || "")) { setStatus("Abra um perfil no Google/Maps primeiro.", "err"); $("go").disabled = false; return; }
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: smartDetect });
    if (result?.mapsUrl && !result.isMaps) {
      await chrome.storage.local.set({ gmnPending: Date.now() });
      await chrome.tabs.update(tab.id, { url: result.mapsUrl });
      setStatus("Abrindo no Google Maps e analisando…", "ok"); $("go").disabled = false; return;
    }
    if (!result?.data?.name) { setStatus("Não encontrei uma ficha de empresa aqui. Abra a empresa no Google Maps.", "err"); $("go").disabled = false; return; }
    setStatus("Enviando ao GMN PRO…");
    chrome.runtime.sendMessage({ type: "gmnpro-analyze", data: result.data }, (resp) => {
      if (resp?.ok) setStatus('Pronto! Nota ' + (resp.score ?? "—") + '. <a href="' + resp.url + '" target="_blank">Abrir</a>', "ok");
      else if (resp?.status === 401) setStatus('Faça login no <a href="https://app.vitamakers.com.br/entrar" target="_blank">GMN PRO</a>.', "err");
      else setStatus("Erro: " + (resp?.error ?? "falhou"), "err");
      $("go").disabled = false;
    });
  } catch (e) { setStatus("Falha: " + (e?.message || e), "err"); $("go").disabled = false; }
});

async function smartDetect() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const isMaps = /\/maps\//.test(location.pathname) || location.hostname.includes("maps.google");
  if (!isMaps) {
    const place = document.querySelector('a[href*="/maps/place/"]');
    let mapsUrl = place ? place.href : null;
    if (!mapsUrl) { const a = document.querySelector('a[href*="google.com/maps"], a[href*="maps.google"], a[data-url*="/maps"]'); mapsUrl = a ? (a.href || a.getAttribute("data-url")) : null; }
    if (!mapsUrl) { const nm = (document.querySelector('[data-attrid="title"], h2, h3')?.innerText || document.title || "").trim(); if (nm) mapsUrl = "https://www.google.com/maps/search/" + encodeURIComponent(nm.slice(0, 80)); }
    if (mapsUrl) return { isMaps: false, mapsUrl };
  }
  const kp = document.querySelector('[role="complementary"]') || document.querySelector('#rhs');
  const mapsMain = isMaps ? document.querySelector('[role="main"]') : null;
  const root = mapsMain || kp || document.querySelector('[role="main"]') || document.body;
  const feed = isMaps ? (document.querySelector('[role="main"] .m6QErb') || mapsMain) : root;
  try { for (let i = 0; i < 10; i++) { (feed?.scrollBy ? feed.scrollBy(0, 1100) : window.scrollBy(0, 1100)); await sleep(380); } (feed?.scrollTo ? feed.scrollTo(0, 0) : window.scrollTo(0, 0)); await sleep(300); } catch (e) {}
  const text = (root.innerText || "").slice(0, 200000);
  let name = mapsMain ? (document.querySelector("h1")?.innerText || "").trim() : (document.querySelector('[data-attrid="title"]')?.innerText || "").trim();
  if (!name && kp) name = (kp.querySelector('[role="heading"], h2, h3')?.innerText || "").trim();
  if (!name) name = (document.title || "").replace(/\s*[-–].*Google.*/i, "").trim();
  const photos = [...new Set(Array.from(root.querySelectorAll("img")).map((im) => im.currentSrc || im.src || "").filter((u) => /googleusercontent\.com|streetviewpixels|ggpht\.com/.test(u)).map((u) => u.replace(/=w\d+-h\d+.*$/, "=w600-h400")))].slice(0, 12);
  const siteA = Array.from(root.querySelectorAll('a[href^="http"]')).map((a) => a.href).find((h) => !/google\.|gstatic|schema\.org|youtube\.com\/@/.test(h));
  const category = document.querySelector('[data-attrid="subtitle"] span, button[jsaction*="category"]')?.innerText?.trim();
  return { isMaps, data: { name, text, photos, website: siteA, category, title: document.title, mapsUri: location.href.split("?")[0], isMaps } };
}
