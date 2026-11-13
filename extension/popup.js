const $ = (id) => document.getElementById(id);
function setStatus(m, c) { const e = $("status"); e.className = "s" + (c ? " " + c : ""); e.innerHTML = m; }

$("go").addEventListener("click", async () => {
  $("go").disabled = true; setStatus("Lendo a página…");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !/google\./.test(tab.url || "")) { setStatus("Abra um perfil no Google/Maps primeiro.", "err"); $("go").disabled = false; return; }
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: scrapePage });
    if (!result || !result.name) { setStatus("Não encontrei uma ficha de empresa aqui.", "err"); $("go").disabled = false; return; }
    setStatus("Enviando ao GMN PRO…");
    chrome.runtime.sendMessage({ type: "gmnpro-analyze", data: result }, (resp) => {
      if (resp?.ok) setStatus('Pronto! Nota ' + (resp.score ?? "—") + '. <a href="' + resp.url + '" target="_blank">Abrir</a>', "ok");
      else if (resp?.status === 401) setStatus('Faça login no <a href="https://app.vitamakers.com.br/entrar" target="_blank">GMN PRO</a>.', "err");
      else setStatus("Erro: " + (resp?.error ?? "falhou"), "err");
      $("go").disabled = false;
    });
  } catch (e) { setStatus("Falha: " + (e?.message || e), "err"); $("go").disabled = false; }
});

async function scrapePage() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const isMaps = /\/maps\//.test(location.pathname) || location.hostname.includes("maps.google");
  const kp = document.querySelector('[role="complementary"]') || document.querySelector('#rhs');
  const mapsMain = isMaps ? document.querySelector('[role="main"]') : null;
  const root = mapsMain || kp || document.querySelector('[role="main"]') || document.body;
  const scroller = mapsMain || root;
  try { for (let i = 0; i < 6; i++) { (scroller.scrollBy ? scroller.scrollBy(0, 900) : window.scrollBy(0, 900)); await sleep(300); } (scroller.scrollTo ? scroller.scrollTo(0, 0) : window.scrollTo(0, 0)); await sleep(250); } catch (e) {}
  const text = (root.innerText || "").slice(0, 200000);
  let name = mapsMain ? (document.querySelector("h1")?.innerText || "").trim() : "";
  if (!name && kp) name = (kp.innerText || "").split("\n").map((x) => x.trim()).find((x) => x && x.length >= 3 && !/^[\d.,]|★|avaliaç|coment|Resultados|Patrocinad|Geral|Avaliar|Fotos|Serviços$/i.test(x)) || "";
  if (!name) name = (document.title || "").replace(/\s*[-–].*Google.*/i, "").trim();
  const photos = [...new Set(Array.from(root.querySelectorAll("img")).map((im) => im.currentSrc || im.src || "").filter((u) => /googleusercontent\.com|streetviewpixels|ggpht\.com/.test(u)).map((u) => u.replace(/=w\d+-h\d+.*$/, "=w600-h400")))].slice(0, 12);
  const siteA = Array.from(root.querySelectorAll('a[href^="http"]')).map((a) => a.href).find((h) => !/google\.|gstatic|schema\.org|youtube\.com\/@/.test(h));
  const category = document.querySelector('[data-attrid="subtitle"] span, button[jsaction*="category"]')?.innerText?.trim();
  return { name, text, photos, website: siteA, category, title: document.title, mapsUri: location.href.split("?")[0], isMaps };
}
