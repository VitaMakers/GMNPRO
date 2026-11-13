/**
 * Extrai os dados do perfil a partir do conteúdo bruto que a extensão envia
 * (texto do painel da empresa no Google Busca/Maps). Fica no servidor para
 * poder melhorar sem reinstalar a extensão.
 */
export interface ExtScrape {
  name?: string;
  text?: string;
  photos?: string[];
  website?: string;
  category?: string;
  title?: string;
  mapsUri?: string;
  isMaps?: boolean;
}

export interface ParsedProfile {
  name: string;
  rating?: number; reviewCount?: number; category?: string; address?: string;
  phone?: string; website?: string; hasHours?: boolean; verified?: boolean;
  businessStatus?: string; description?: string; photoCount?: number; photoUrl?: string;
  postsCount?: number; qaCount?: number; qaAnswered?: number;
  attributesCount?: number; attributes?: string[]; foundingDate?: string; mapsUri?: string;
}

export function parseScrape(x: ExtScrape): ParsedProfile {
  const T = (x.text ?? "").replace(/ /g, " ");
  const lines = T.split("\n").map((l) => l.trim()).filter(Boolean);
  const find = (re: RegExp) => { const m = T.match(re); return m ? m[1] : undefined; };

  // Nota ancorada ao "(N)" das avaliações: "4,6 (289)" — evita pegar estrelas de reviews.
  const anchor = T.match(/([0-5][.,]\d)\s*[\(（]\s*([\d.]{1,9})\s*[\)）]/);
  const rating = (() => {
    const m = anchor
      || T.match(/([0-5][.,]\d)\s*(?:\u2605|★|estrela)/)
      || T.match(/\b([0-5][.,]\d)\b/);
    const v = m ? parseFloat(m[1].replace(",", ".")) : undefined;
    return v != null && v >= 1 && v <= 5 ? v : undefined;
  })();

  // Avaliações: do próprio âncora, ou "289 avaliações/Avaliar"
  const reviewCount = (() => {
    if (anchor) return parseInt(anchor[2].replace(/\./g, ""), 10);
    const m = T.match(/([\d.]{1,9})\s*(?:avaliaç|coment|Avaliar|avaliac|review)/i);
    return m ? parseInt(m[1].replace(/\./g, ""), 10) : undefined;
  })();

  // Categoria: usa a dica do DOM, depois tenta no texto.
  let category: string | undefined = (x.category || "").trim() || undefined;
  const ratingLine = lines.find((l) => anchor && l.includes(anchor[0])) || lines.find((l) => /^[0-5][.,]\d/.test(l)) || "";
  if (!category && ratingLine.includes("·")) category = ratingLine.split("·").pop()?.trim();
  if (category && /coment|avaliaç|Google/i.test(category)) category = undefined;
  if (!category) {
    // Linha de categoria do tipo "Ótica em Campinas, Brasil" (logo após a nota)
    const idx = ratingLine ? lines.indexOf(ratingLine) : -1;
    const cand = (idx >= 0 ? lines.slice(idx + 1, idx + 4) : lines.slice(0, 4))
      .find((l) => / em /.test(l) && l.length < 60 && !/\d{2}/.test(l) && !/avaliaç|coment|Endereço|Horário|Telefone|Opções/i.test(l));
    if (cand) category = cand.split(/ em | - |,/)[0].trim();
  }
  if (category && (/\d/.test(category) || category.length > 40)) category = undefined;

  // Endereço: linha com rua + cidade/CEP
  const address = lines.find((l) => /(^|\b)(R\.|Av\.|Rua|Avenida|Rod\.|Rodovia|Praça|Al\.|Alameda)\s/.test(l) && /\d/.test(l) && l.length < 160)
    || find(/((?:R\.|Av\.|Rua|Avenida)[^\n]{5,120}\d{5}-?\d{3}[^\n]{0,20})/);

  // Telefone BR
  const phone = find(/(\(\d{2}\)\s*\d{4,5}-?\d{4})/);

  // Serviços / Atributos: "Serviços: A, B, C" e seções de comodidades
  const attrSet = new Set<string>();
  for (const re of [/Serviços?:\s*([^\n]{3,300})/i, /Opções de serviço:\s*([^\n]{3,300})/i, /Comodidades?:\s*([^\n]{3,300})/i, /Acessibilidade:\s*([^\n]{3,300})/i, /Formas de pagamento:\s*([^\n]{3,300})/i]) {
    const mm = T.match(re);
    if (mm) mm[1].split(/,|·/).forEach((a) => { const t = a.replace(/\.\.\.$|…$/, "").trim(); if (t && t.length >= 2 && t.length <= 50) attrSet.add(t); });
  }
  for (const sec of T.match(/(Opções de serviço|Acessibilidade|Comodidades|Formas de pagamento|Público|Oferece|Destaques)[\s\S]{0,300}/gi) || []) {
    for (const line of sec.split("\n").slice(1)) {
      const t = line.trim();
      if (t && t.length <= 40 && /^[A-Za-zÀ-ú]/.test(t)) attrSet.add(t);
    }
  }

  // Descrição
  let description: string | undefined;
  const di = T.search(/Do estabelecimento|Sobre este|Descrição/i);
  if (di >= 0) description = T.slice(di, di + 500).replace(/^[^\n]*\n/, "").split("\n").filter(Boolean).slice(0, 3).join(" ").trim();

  // Posts e Q&A só são confiáveis no Maps (na Busca há seções genéricas).
  const postsCount = x.isMaps ? (() => { const m = T.match(/(\d+)\s*(?:novidades|postagens|atualizações)/i); return m ? parseInt(m[1], 10) : undefined; })() : undefined;
  const qaCount = (() => {
    const m = T.match(/perguntas?\s*[\(（]\s*(\d+)\s*[\)）]/i)  // "Ver todas as perguntas (1)"
      || T.match(/(\d+)\s*perguntas?\b/i);
    return m ? parseInt(m[1], 10) : undefined;
  })();
  const qaAnswered = qaCount && /respondid/i.test(T) ? qaCount : undefined;

  const founding = find(/(?:Aberto desde|Inaugurado em|Fundado em|Estabelecido em|Há (\d+) anos)/i);

  const photos = (x.photos ?? []).filter(Boolean);
  const photoCount = photos.length >= 3 ? photos.length : (() => { const m = T.match(/(\d+)\s*fotos?/i); return m ? parseInt(m[1], 10) : undefined; })();

  let name = (x.name ?? "").trim();
  if (!name || /^(Resultados|Pesquisa|Google)/i.test(name)) {
    name = lines.find((l) => l.length >= 3 && !/^[\d.,]|★|avaliaç|Patrocinad|Resultados/i.test(l)) || x.name || "Empresa";
  }

  const hasHours = /\b(Aberto|Fechado|Horário|Fecha|Abre às|Abre)\b/i.test(T);
  const businessStatus = /Fechado permanentemente|Encerrado definitivamente/i.test(T) ? "CLOSED_PERMANENTLY" : "OPERATIONAL";

  return {
    name, rating, reviewCount, category, address, phone, website: x.website,
    hasHours, verified: /(Você gerencia|Você é o proprietário)/i.test(T), businessStatus,
    description, photoCount, photoUrl: photos[0],
    postsCount, qaCount, qaAnswered,
    attributesCount: attrSet.size || undefined, attributes: attrSet.size ? [...attrSet].slice(0, 25) : undefined,
    foundingDate: founding, mapsUri: x.mapsUri,
  };
}
