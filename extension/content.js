/* GMN Profile — content script v4: lê a ficha aberta e, no Maps, abre as abas de Avaliações/Sobre para captar mais dados. */
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
    if (!data.name) { setBtn(btn, "Abra a ficha de uma empresa", false); setTimeout(() => setBtn(btn, "Pré-análise GMN", false), 3000); return; }
    setBtn(btn, "Enviando…", true);
    chrome.runtime.sendMessage({ type: "gmnpro-analyze", data }, (resp) => {
      setBtn(btn, resp?.ok ? "✓ Pré-análise aberta (nota " + (resp.score ?? "—") + ")" : (resp?.status === 401 ? "Faça login no GMN Profile" : "Erro: " + (resp?.error ?? "falhou")), false);
      setTimeout(() => setBtn(btn, "Pré-análise GMN", false), 4000);
    });
  }

  function makeBtn() {
    const btn = document.createElement("button");
    btn.id = "gmnpro-btn";
    btn.textContent = "Pré-análise GMN";
    btn.style.cssText =
      "display:inline-flex;align-items:center;gap:6px;background:#22C7B8;color:#fff;border:0;border-radius:8px;padding:8px 14px;font:700 13px system-ui;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.2);white-space:nowrap";
    btn.addEventListener("click", () => run(btn));
    return btn;
  }

  function injectButton() {
    if (document.getElementById("gmnpro-btn")) return;

    // 1) Busca do Google: topo do painel de conhecimento (acima das fotos).
    const kp = !isMaps && (document.querySelector('[role="complementary"]') || document.querySelector("#rhs"));
    if (kp) {
      const bar = document.createElement("div");
      bar.id = "gmnpro-bar";
      bar.style.cssText = "display:flex;justify-content:flex-end;gap:8px;margin:0 0 6px;padding:8px 12px 0;";
      bar.appendChild(makeBtn());
      kp.prepend(bar);
      return;
    }

    // 2) Google Maps: ao lado da avaliação (ou logo abaixo do nome). Só injeta
    //    quando a ficha de uma empresa está aberta — senão espera (o observer
    //    tenta de novo), pra não ficar um botão solto no canto do mapa.
    if (isMaps) {
      const main = document.querySelector('[role="main"]');
      if (main) {
        // Preferência: logo DEPOIS da contagem de avaliações ("(36)").
        const count = main.querySelector('button[aria-label*="avaliaç"],button[aria-label*="resenha"],button[aria-label*="review"]');
        const star = main.querySelector('[role="img"][aria-label*="estrela"],[role="img"][aria-label*="star"]');
        const h1 = main.querySelector("h1");
        if (count) {
          const btn = makeBtn();
          btn.style.marginLeft = "8px";
          btn.style.verticalAlign = "middle";
          count.insertAdjacentElement("afterend", btn);
          return;
        }
        if (star) {
          let row = star.parentElement;
          if (row && (row.tagName === "A" || row.tagName === "BUTTON")) row = row.parentElement;
          if (row) {
            const btn = makeBtn();
            btn.style.marginLeft = "8px";
            btn.style.verticalAlign = "middle";
            row.appendChild(btn);
            return;
          }
        }
        if (h1 && h1.parentElement) {
          const bar = document.createElement("div");
          bar.id = "gmnpro-bar";
          bar.style.cssText = "margin:8px 0 2px";
          bar.appendChild(makeBtn());
          h1.parentElement.insertBefore(bar, h1.nextSibling);
          return;
        }
      }
      return; // ficha ainda não aberta: aguarda o próximo ciclo do observer
    }

    // 3) Fallback (busca sem painel): botão flutuante no canto.
    const btn = makeBtn();
    btn.style.cssText += ";position:fixed;z-index:999999;top:88px;right:24px";
    document.body.appendChild(btn);
  }
  setTimeout(injectButton, 1200);
  // Observa a página toda: o painel do Google é renderizado/atualizado depois,
  // e às vezes recriado — o guard por id evita duplicar.
  new MutationObserver(() => injectButton()).observe(document.documentElement, { childList: true, subtree: true });
})();
