/* GMN PRO — content script v4: lê a ficha aberta e, no Maps, abre as abas de Avaliações/Sobre para captar mais dados. */
(function () {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const isMaps = /\/maps\//.test(location.pathname) || location.hostname.includes("maps.google");

  function mainText() {
    const kp = document.querySelector('[role="complementary"]') || document.querySelector('#rhs');
    const mapsMain = isMaps ? document.querySelector('[role="main"]') : null;
    const root = mapsMain || kp || document.querySelector('[role="main"]') || document.body;
    return (root.innerText || "");
  }
  async function scrollFeed() {
    const feed = isMaps ? (document.querySelector('[role="main"] .m6QErb') || document.querySelector('[role="main"]')) : (document.querySelector('[role="complementary"]') || document.body);
    try { for (let i = 0; i < 10; i++) { (feed && feed.scrollBy ? feed.scrollBy(0, 1200) : window.scrollBy(0, 1200)); await sleep(350); } if (feed && feed.scrollTo) feed.scrollTo(0, 0); else window.scrollTo(0, 0); await sleep(300); } catch (e) {}
  }
  async function clickTab(labels) {
    const btns = Array.from(document.querySelectorAll('button[role="tab"], button[jsaction], [role="tab"]'));
    const t = btns.find((b) => labels.some((l) => ((b.getAttribute("aria-label") || b.innerText || "").toLowerCase()).includes(l)));
    if (t) { t.click(); await sleep(1600); return true; }
    return false;
  }

  async function scrape() {
    await scrollFeed();
    const text = mainText().slice(0, 200000);
    const kp = document.querySelector('[role="complementary"]') || document.querySelector('#rhs');
    const mapsMain = isMaps ? document.querySelector('[role="main"]') : null;
    const root = mapsMain || kp || document.querySelector('[role="main"]') || document.body;

    let name = mapsMain ? (document.querySelector("h1")?.innerText || "").trim() : (document.querySelector('[data-attrid="title"]')?.innerText || "").trim();
    if (!name && kp) name = (kp.querySelector('[role="heading"], h2, h3')?.innerText || "").trim();
    if (!name) name = (document.title || "").replace(/\s*[-–].*Google.*/i, "").trim();

    const photos = [...new Set(Array.from(root.querySelectorAll("img")).map((im) => im.currentSrc || im.src || "").filter((u) => /googleusercontent\.com|streetviewpixels|ggpht\.com/.test(u)).map((u) => u.replace(/=w\d+-h\d+.*$/, "=w600-h400")))].slice(0, 12);
    const siteA = Array.from(root.querySelectorAll('a[href^="http"]')).map((a) => a.href).find((h) => !/google\.|gstatic|schema\.org|youtube\.com\/@/.test(h));
    const category = document.querySelector('[data-attrid="subtitle"] span, button[jsaction*="category"]')?.innerText?.trim();

    // No Maps: abre abas de Avaliações, Mídia e Postagens para captar os dados finos.
    let reviewsText = "", mediaText = "", postsText = "";
    if (isMaps && name) {
      try {
        if (await clickTab(["avaliaç", "reviews"])) { await scrollFeed(); reviewsText = mainText().slice(0, 120000); }
      } catch (e) {}
      try {
        if (await clickTab(["fotos", "mídia", "midia", "photos"])) { await scrollFeed(); mediaText = mainText().slice(0, 60000); }
      } catch (e) {}
      try {
        if (await clickTab(["atualizações", "novidades", "postagens", "updates", "posts"])) { await scrollFeed(); postsText = mainText().slice(0, 40000); }
      } catch (e) {}
      try { await clickTab(["visão geral", "overview", "sobre"]); } catch (e) {}
    }

    return { name, text, reviewsText, mediaText, postsText, photos, website: siteA, category, title: document.title, mapsUri: location.href.split("?")[0], isMaps };
  }

  function setBtn(b, t, busy) { b.textContent = t; b.style.opacity = busy ? "0.7" : "1"; b.disabled = !!busy; }
  async function run(btn) {
    setBtn(btn, isMaps ? "Lendo a ficha e avaliações…" : "Lendo a ficha…", true);
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
    btn.id = "gmnpro-btn"; btn.textContent = "Analisar no GMN PRO";
    btn.style.cssText = "position:fixed;z-index:999999;top:88px;right:24px;background:#059669;color:#fff;border:0;border-radius:10px;padding:10px 14px;font:700 13px system-ui;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.25)";
    btn.addEventListener("click", () => run(btn));
    document.body.appendChild(btn);
  }
  setTimeout(injectButton, 1200);
  new MutationObserver(() => injectButton()).observe(document.body, { childList: true, subtree: false });
})();
