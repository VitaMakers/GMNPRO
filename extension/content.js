/* GMN PRO — content script: injeta botão na ficha, abre o Maps, rola e captura tudo. */
(function () {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const isMaps = /\/maps\//.test(location.pathname) || location.hostname.includes("maps.google");

  // ---------- captura (com rolagem) ----------
  async function scrape() {
    const kp = document.querySelector('[role="complementary"]') || document.querySelector('#rhs');
    const mapsMain = isMaps ? document.querySelector('[role="main"]') : null;
    const root = mapsMain || kp || document.querySelector('[role="main"]') || document.body;

    // Rola para carregar seções preguiçosas (no Maps o scroller é o feed da ficha).
    const feed = isMaps ? (document.querySelector('[role="main"] .m6QErb') || document.querySelector('.m6QErb[role="region"]') || mapsMain) : root;
    const scroller = feed || root;
    try {
      for (let i = 0; i < 12; i++) {
        if (scroller && scroller.scrollBy) scroller.scrollBy(0, 1200); else window.scrollBy(0, 1200);
        await sleep(400);
      }
      if (scroller && scroller.scrollTo) scroller.scrollTo(0, 0); else window.scrollTo(0, 0);
      await sleep(400);
    } catch (e) {}

    const text = (root.innerText || "").slice(0, 200000);
    let name = mapsMain ? (document.querySelector("h1")?.innerText || "").trim() : "";
    if (!name) name = (document.querySelector('[data-attrid="title"]')?.innerText || "").trim();
    if (!name && kp) {
      const h = kp.querySelector('[role="heading"], h2, h3');
      name = (h?.innerText || "").trim();
    }
    if (!name && kp) {
      name = (kp.innerText || "").split("\n").map((x) => x.trim())
        .find((x) => x && x.length >= 3 && /[A-ZÀ-Ú]/.test(x[0]) && !/^[\d.,]|★|avaliaç|coment|Resultados|Patrocinad|Geral|Avaliar|Fotos|Serviços$/i.test(x)) || "";
    }
    if (!name) name = (document.title || "").replace(/\s*[-–].*Google.*/i, "").trim();

    const photos = [...new Set(
      Array.from(root.querySelectorAll("img")).map((im) => im.currentSrc || im.src || "")
        .filter((u) => /googleusercontent\.com|streetviewpixels|ggpht\.com/.test(u))
        .map((u) => u.replace(/=w\d+-h\d+.*$/, "=w600-h400"))
    )].slice(0, 12);

    const siteA = Array.from(root.querySelectorAll('a[href^="http"]')).map((a) => a.href)
      .find((h) => !/google\.|gstatic|schema\.org|youtube\.com\/@/.test(h));
    const category = document.querySelector('[data-attrid="subtitle"] span, button[jsaction*="category"]')?.innerText?.trim();

    return { name, text, photos, website: siteA, category, title: document.title, mapsUri: location.href.split("?")[0], isMaps };
  }

  function findMapsLink() {
    const place = document.querySelector('a[href*="/maps/place/"]');
    if (place) return place.href;
    const any = document.querySelector('a[href*="google.com/maps"], a[href*="maps.google"], a[data-url*="/maps"]');
    if (any) return any.href || any.getAttribute("data-url");
    // Sem link: monta uma busca no Maps pelo nome (autoAnalyze abre o 1º resultado).
    const name = (document.querySelector("h1, [role=heading], h2, h3")?.innerText || document.title || "").trim();
    return name ? ("https://www.google.com/maps/search/" + encodeURIComponent(name.slice(0, 80))) : null;
  }

  async function run(btn) {
    setBtn(btn, "Lendo a ficha…", true);
    try {
      // Na busca: marca "pendente" e navega para o Maps. O flag sobrevive ao reload.
      if (!isMaps) {
        const mapsLink = findMapsLink();
        if (mapsLink) {
          setBtn(btn, "Abrindo no Maps…", true);
          chrome.storage.local.set({ gmnPending: Date.now() }, () => location.assign(mapsLink));
          return;
        }
        // Sem link do Maps: lê o painel da busca mesmo.
      }
      const data = await scrape();
      if (!data.name) { setBtn(btn, "Abra uma ficha de empresa", false); return; }
      setBtn(btn, "Enviando…", true);
      chrome.runtime.sendMessage({ type: "gmnpro-analyze", data }, (resp) => {
        if (resp?.ok) setBtn(btn, "✓ Pré-análise aberta (nota " + (resp.score ?? "—") + ")", false);
        else if (resp?.status === 401) setBtn(btn, "Faça login no GMN PRO", false);
        else setBtn(btn, "Erro: " + (resp?.error ?? "falhou"), false);
        setTimeout(() => setBtn(btn, "Analisar no GMN PRO", false), 4000);
      });
    } catch (e) {
      setBtn(btn, "Erro ao ler", false);
    }
  }

  function setBtn(btn, text, busy) { btn.textContent = text; btn.style.opacity = busy ? "0.7" : "1"; btn.disabled = !!busy; }

  function injectButton() {
    if (document.getElementById("gmnpro-btn")) return;
    const panel = document.querySelector('[role="complementary"]') || (isMaps ? document.querySelector('[role="main"]') : null);
    if (!panel && !isMaps) return;
    const btn = document.createElement("button");
    btn.id = "gmnpro-btn";
    btn.textContent = "Analisar no GMN PRO";
    btn.style.cssText = "position:fixed;z-index:999999;top:88px;right:24px;background:#059669;color:#fff;border:0;border-radius:10px;padding:10px 14px;font:700 13px system-ui;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.25)";
    btn.addEventListener("click", () => run(btn));
    document.body.appendChild(btn);
  }

  // Auto-análise ao chegar no Maps vindo da busca (flag na memória da extensão).
  async function autoAnalyze() {
    const banner = showBanner("GMN PRO: abrindo a ficha da empresa…");
    // Se caiu numa LISTA do Maps, navega direto para a URL da 1ª ficha (recarrega e reanalisa).
    if (!document.querySelector('[role="main"] h1')) {
      for (let i = 0; i < 16; i++) {
        const first = document.querySelector('a.hfpxzc[href*="/maps/place/"]') || document.querySelector('a[href*="/maps/place/"]');
        if (first && first.href && !/\/maps\/search/.test(first.href)) {
          chrome.storage.local.set({ gmnPending: Date.now() }, () => location.assign(first.href));
          return; // o content script roda de novo já na ficha
        }
        if (document.querySelector('[role="main"] h1')) break;
        await sleep(600);
      }
    }
    banner.textContent = "GMN PRO: analisando a ficha… rolando para carregar tudo";
    for (let i = 0; i < 24; i++) { if (document.querySelector('[role="main"] h1')) break; await sleep(500); }
    await sleep(700);
    const data = await scrape();
    if (data.name) {
      banner.textContent = "GMN PRO: enviando pré-análise…";
      chrome.runtime.sendMessage({ type: "gmnpro-analyze", data }, (resp) => {
        banner.textContent = resp?.ok ? "GMN PRO: pré-análise aberta ✓" : "GMN PRO: " + (resp?.error ?? "falhou");
        setTimeout(() => banner.remove(), 4000);
      });
    } else { banner.textContent = "GMN PRO: não consegui ler a ficha"; setTimeout(() => banner.remove(), 4000); }
  }
  function maybeAuto() {
    try {
      chrome.storage.local.get(["gmnPending"], (r) => {
        if (isMaps && r && r.gmnPending && Date.now() - r.gmnPending < 120000) {
          chrome.storage.local.remove("gmnPending");
          autoAnalyze();
        }
      });
    } catch (e) {}
  }
  function showBanner(text) {
    let b = document.getElementById("gmnpro-banner");
    if (!b) {
      b = document.createElement("div");
      b.id = "gmnpro-banner";
      b.style.cssText = "position:fixed;z-index:1000000;top:0;left:0;right:0;background:#059669;color:#fff;font:600 13px system-ui;padding:8px 14px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.2)";
      document.body.appendChild(b);
    }
    b.textContent = text;
    return b;
  }

  // Injeta e reage a mudanças (Google recarrega conteúdo via JS).
  const boot = () => { injectButton(); };
  setTimeout(boot, 1200);
  new MutationObserver(() => injectButton()).observe(document.body, { childList: true, subtree: false });
  maybeAuto();
})();
