const API = "https://app.vitamakers.com.br";
const $ = (id) => document.getElementById(id);

function setStatus(msg, cls) {
  const el = $("status");
  el.className = "s" + (cls ? " " + cls : "");
  el.innerHTML = msg;
}

$("go").addEventListener("click", async () => {
  $("go").disabled = true;
  setStatus("Lendo a página do Google…");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !/google\./.test(tab.url || "")) {
      setStatus("Abra um perfil no Google Maps primeiro.", "err");
      $("go").disabled = false;
      return;
    }
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: scrapeProfile });
    if (!result || !result.name) {
      setStatus("Não encontrei um perfil nesta página. Abra a ficha da empresa no Google Maps.", "err");
      $("go").disabled = false;
      return;
    }
    setStatus("Enviando para o GMN PRO…");
    const res = await fetch(API + "/api/extension/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(result),
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) setStatus('Faça login no <a href="' + API + '/entrar" target="_blank">GMN PRO</a> neste navegador e tente de novo.', "err");
      else setStatus("Erro: " + (data.detail || data.error || res.status), "err");
      $("go").disabled = false;
      return;
    }
    setStatus('Pronto! Nota ' + (data.report?.score ?? "—") + '/100. <a href="' + data.url + '" target="_blank">Ver pré-análise completa</a>', "ok");
    if (data.url) chrome.tabs.create({ url: data.url });
  } catch (e) {
    setStatus("Falha: " + (e?.message || e), "err");
  } finally {
    $("go").disabled = false;
  }
});

// Executado DENTRO da página do Google (Busca OU Maps). Mira no painel da empresa.
function scrapeProfile() {
  const isMaps = /\/maps\//.test(location.pathname) || location.hostname.includes("maps.google");
  // Na Busca, o painel da empresa fica no container complementar (lado direito).
  const kp = document.querySelector('[role="complementary"]')
    || document.querySelector('#rhs')
    || document.querySelector('[data-attrid="kc:/local:merchant"]');
  const mapsMain = isMaps ? document.querySelector('[role="main"]') : null;
  const root = mapsMain || kp || document.querySelector('[role="main"]') || document.body;

  const text = (root.innerText || "").slice(0, 150000);

  // Nome: no Maps é o h1; na Busca é a 1ª linha "forte" do painel.
  let name = mapsMain ? (document.querySelector("h1")?.innerText || "").trim() : "";
  if (!name && kp) {
    name = (kp.innerText || "").split("\n").map((x) => x.trim())
      .find((x) => x && x.length >= 3 && !/^[\d.,]|★|avaliaç|Resultados|Patrocinad|Geral|Avaliar|Fotos|Serviços$/i.test(x)) || "";
  }
  if (!name) name = (document.title || "").replace(/\s*[-–].*Google.*/i, "").trim();

  const photos = [...new Set(
    Array.from(root.querySelectorAll("img"))
      .map((im) => im.currentSrc || im.src || "")
      .filter((u) => /googleusercontent\.com|streetviewpixels|ggpht\.com|gstatic/.test(u))
      .map((u) => u.replace(/=w\d+-h\d+.*$/, "=w600-h400"))
  )].slice(0, 12);

  // Site do negócio: âncora externa (não google) mais provável.
  const siteA = Array.from(root.querySelectorAll('a[href^="http"]'))
    .map((a) => a.href)
    .find((h) => !/google\.|gstatic|schema\.org|youtube\.com\/@/.test(h));

  return { name, text, photos, website: siteA, title: document.title, mapsUri: location.href.split("?")[0], isMaps };
}
