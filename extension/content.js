/* GMN PRO — content script: injeta botão na ficha, abre o Maps, rola e captura tudo. */
(function () {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const isMaps = /\/maps\//.test(location.pathname) || location.hostname.includes("maps.google");

  // ---------- captura (com rolagem) ----------
  async function scrape() {
    const kp = document.querySelector('[role="complementary"]') || document.querySelector('#rhs');
    const mapsMain = isMaps ? document.querySelector('[role="main"]') : null;
    const root = mapsMain || kp || document.querySelector('[role="main"]') || document.body;

    // Rola para carregar seções preguiçosas.
    const scroller = mapsMain || root;
    try {
      for (let i = 0; i < 8; i++) {
        if (scroller.scrollBy) scroller.scrollBy(0, 1000); else window.scrollBy(0, 1000);
        await sleep(350);
      }
      if (scroller.scrollTo) scroller.scrollTo(0, 0); else window.scrollTo(0, 0);
      await sleep(300);
    } catch (e) {}

    const text = (root.innerText || "").slice(0, 200000);
    let name = mapsMain ? (document.querySelector("h1")?.innerText || "").trim() : "";
    if (!name && kp) {
      name = (kp.innerText || "").split("\n").map((x) => x.trim())
        .find((x) => x && x.length >= 3 && !/^[\d.,]|★|avaliaç|coment|Resultados|Patrocinad|Geral|Avaliar|Fotos|Serviços$/i.test(x)) || "";
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
    const a = document.querySelector('a[href*="/maps/place/"]') ||
      Array.from(document.querySelectorAll('a[href*="/maps/"]')).find((x) => /\/maps\/place|\/maps\?/.test(x.href));
    return a ? a.href : null;
  }

  async function run(btn) {
    setBtn(btn, "Lendo a ficha…", true);
    try {
      // Na busca: se achar link do Maps, abre lá (mais dados). Senão, lê o painel da busca.
      if (!isMaps) {
        const mapsLink = findMapsLink();
        if (mapsLink) {
          const u = new URL(mapsLink, location.origin);
          u.hash = "gmnanalyze";
          window.open(u.toString(), "_blank");
          setBtn(btn, "Abrindo no Maps…", false);
          setTimeout(() => setBtn(btn, "Analisar no GMN PRO", false), 2500);
          return;
        }
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

  // Auto-análise quando chegamos ao Maps vindos da busca (#gmnanalyze).
  async function maybeAuto() {
    if (isMaps && location.hash.includes("gmnanalyze")) {
      await sleep(1500);
      const data = await scrape();
      if (data.name) chrome.runtime.sendMessage({ type: "gmnpro-analyze", data }, () => {});
    }
  }

  // Injeta e reage a mudanças (Google recarrega conteúdo via JS).
  const boot = () => { injectButton(); };
  setTimeout(boot, 1200);
  new MutationObserver(() => injectButton()).observe(document.body, { childList: true, subtree: false });
  maybeAuto();
})();
