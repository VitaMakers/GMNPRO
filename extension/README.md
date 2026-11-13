# GMN PRO — Extensão de Pré-análise (Chrome)

Lê a página do Google (Maps) que você tem aberta e manda os dados para o GMN PRO
gerar a pré-análise — sem custo de API, igual ao modelo do GBP Check.

## Instalar (modo desenvolvedor, enquanto não está na Chrome Web Store)
1. Abra `chrome://extensions`
2. Ligue "Modo do desenvolvedor" (canto superior direito)
3. Clique em "Carregar sem compactação" e selecione esta pasta `extension/`
4. Faça login no GMN PRO (app.vitamakers.com.br) no mesmo navegador

## Usar
1. Abra a ficha de uma empresa no Google Maps
2. Clique no ícone da extensão → "Analisar este perfil"
3. Abre a pré-análise completa no GMN PRO

## Observações
- Os seletores do scraper (`popup.js` → `scrapeProfile`) seguem o layout atual do
  Google Maps. Se o Google mudar o HTML, ajuste os seletores ali.
- O domínio da API está em `popup.js` (`const API`). Troque se publicar em outro domínio.
- Para publicar na Chrome Web Store, adicione ícones (16/48/128 px) e os campos
  `icons`/`action.default_icon` no manifest.
