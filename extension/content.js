/* GMN PRO — content script: lê o painel da empresa que já está aberto (busca OU Maps). Simples e confiável. */
(function () {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const isMaps = /\/maps\//.test(location.pathname) || location.hostname.includes("maps.google");

  async function scrape() {
    const kp = document.querySelector('[role="complementary"]') || document.querySelector('#rhs');
    const mapsMain = isMaps ? document.querySelector('[role="main"]') : null;
    const root = mapsMain || kp || document.querySelector('[role="main"]') || document.body;

    // Rola o painel para carregar fotos/serviços/Q&A (sem trocar de página).
    const feed = isMaps ? (document.querySelector('[role="main"] .m6QErb') || mapsMain) : root;
    try {
      for (let i = 0; i < 10; i++) { (feed && feed.scrollBy ? feed.scrollBy(0, 1100) : window.scrollBy(0, 1100)); await sleep(350); }
      if (feed && feed.scrollTo) feed.scrollTo(0, 0); else window.scrollTo(0, 0);
      await sleep(300);
    } catch (e) {}

    const text = (root.innerText || "").slice(0, 200000);
    let name = mapsMain ? (document.querySelector("h1")?.innerText || "").trim() : (document.querySelector('[data-attrid="title"]')?.innerText || "").trim();
    if (!name && kp) name = (kp.querySelector('[role="heading"], h2, h3')?.innerText || "").trim();
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

  function setBtn(btn, t, busy) { btn.textContent = t; btn.style.opacity = busy ? "0.7" : "1"; btn.disabled = !!busy; }

  async function run(btn) {
    setBtn(btn, "Lendo a ficha…", true);
    const data = await scrape();
    if (!data.name) { setBtn(btn, "Abra a ficha de uma empresa", false); setTimeout(() => setBtn(btn, "Analisar no GMN PRO", false), 3000); return; }
    setBtn(btn, "Enviando…", true);
    chrome.runtime.sendMessage({ type: "gmnpro-analyze", data }, (resp) => {
      setBtn(btn, resp?.ok ? "✓ Pré-análise aberta (nota " + (resp.score ?? "—") + ")" : (resp?.status === 401 ? "Faça login no GMN PRO" : "Erro: " + (resp?.error ?? "falhou")), false);
      setTimeout(() => setBtn(btn, "Analisar no GMN PRO", false), 4000);
    });
  }

  function injectButton() {
    if (document.getElementById("gmnpro-btn")) return;
    const btn = document.createElement("button");
    btn.id = "gmnpro-btn";
    btn.textContent = "Analisar no GMN PRO";
    btn.style.cssText = "position:fixed;z-index:999999;top:88px;right:24px;background:#059669;color:#fff;border:0;border-radius:10px;padding:10px 14px;font:700 13px system-ui;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.25)";
    btn.addEventListener("click", () => run(btn));
    document.body.appendChild(btn);
  }

  setTimeout(injectButton, 1200);
  new MutationObserver(() => injectButton()).observe(document.body, { childList: true, subtree: false });
})();
