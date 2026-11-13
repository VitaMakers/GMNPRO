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

// Executado DENTRO da página do Google. Heurísticas resilientes: campo ausente é omitido.
function scrapeProfile() {
  const T = (document.querySelector('[role="main"]') || document.body).innerText || "";
  const q = (sel) => document.querySelector(sel);
  const attr = (sel, a) => q(sel)?.getAttribute(a) || undefined;
  const num = (re) => { const m = T.match(re); return m ? parseFloat(m[1].replace(/\./g, "").replace(",", ".")) : undefined; };

  const name = q("h1")?.innerText?.trim();
  const rating = num(/([0-9],[0-9])\s*(?:estrela|★|\()/);
  const reviewCount = (() => { const m = T.match(/([\d.]+)\s*(?:avaliaç|coment|review)/i); return m ? parseInt(m[1].replace(/\./g, ""), 10) : undefined; })();

  // Categoria: botão de categoria do Maps
  const category = q('button[jsaction*="category"]')?.innerText?.trim()
    || q('[jsaction*="category"]')?.innerText?.trim();

  const address = attr('button[data-item-id="address"]', "aria-label")?.replace(/^Endereço:\s*/i, "")
    || q('[data-item-id="address"]')?.innerText?.trim();
  const phone = (attr('button[data-item-id^="phone"]', "aria-label") || "").replace(/^Telefone:\s*/i, "") || undefined;
  const website = attr('a[data-item-id="authority"]', "href")
    || q('a[data-item-id="authority"]')?.href;

  const hasHours = /\b(Aberto|Fechado|Horário|Fecha|Abre)\b/i.test(T);
  const verified = /(Você gerencia|Perfil da empresa|proprietário|Você é o proprietário)/i.test(T);
  const businessStatus = /Fechado permanentemente/i.test(T) ? "CLOSED_PERMANENTLY" : "OPERATIONAL";

  // Extras (quando a seção estiver carregada na página)
  const photosMatch = T.match(/(\d+)\s*fotos?/i);
  const photoCount = photosMatch ? parseInt(photosMatch[1], 10) : undefined;
  const postsMatch = T.match(/(\d+)\s*(?:novidades|postagens|atualizações)/i);
  const postsCount = postsMatch ? parseInt(postsMatch[1], 10) : undefined;
  const qaMatch = T.match(/(\d+)\s*perguntas?/i);
  const qaCount = qaMatch ? parseInt(qaMatch[1], 10) : undefined;

  // Descrição "Do estabelecimento"
  let description;
  const di = T.search(/Do estabelecimento|Sobre/i);
  if (di >= 0) description = T.slice(di, di + 400).replace(/^(Do estabelecimento|Sobre)\s*/i, "").split("\n").slice(0, 3).join(" ").trim();

  const mapsUri = location.href.split("?")[0];

  return { name, rating, reviewCount, category, address, phone, website, hasHours, verified,
    businessStatus, photoCount, postsCount, qaCount, description, mapsUri };
}
