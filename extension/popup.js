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

// Executado DENTRO da página do Google. Coleta o conteúdo bruto; o servidor extrai tudo.
function scrapeProfile() {
  const main = document.querySelector('[role="main"]') || document.body;
  const text = (main.innerText || "").slice(0, 120000);
  const name = (document.querySelector("h1")?.innerText || "").trim();

  // Fotos reais do perfil
  const photos = [...new Set(
    Array.from(document.querySelectorAll("img"))
      .map((im) => im.currentSrc || im.src || "")
      .filter((u) => /googleusercontent\.com|streetviewpixels|ggpht\.com/.test(u))
      .map((u) => u.replace(/=w\d+-h\d+.*$/, "=w600-h400"))
  )].slice(0, 12);

  // Dicas estruturadas (fallback caso o texto não baste)
  const attr = (sel, a) => document.querySelector(sel)?.getAttribute(a) || undefined;
  const address = (attr('button[data-item-id="address"]', "aria-label") || "").replace(/^Endereço:\s*/i, "") || undefined;
  const phone = (attr('button[data-item-id^="phone"]', "aria-label") || "").replace(/^Telefone:\s*/i, "") || undefined;
  const website = attr('a[data-item-id="authority"]', "href");
  const category = document.querySelector('button[jsaction*="category"]')?.innerText?.trim();

  return { name, text, photos, address, phone, website, category, mapsUri: location.href.split("?")[0] };
}
