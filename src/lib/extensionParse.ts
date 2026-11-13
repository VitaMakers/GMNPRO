/**
 * Extrai os dados do perfil a partir do conteúdo bruto que a extensão envia
 * (texto e HTML da página do Google Maps). Fica no servidor para poder
 * melhorar a extração sem reinstalar a extensão.
 */
export interface ExtScrape {
  name?: string;
  text?: string;       // innerText do painel principal
  photos?: string[];   // urls de imagens (googleusercontent)
  mapsUri?: string;
  // dicas já extraídas no cliente (fallback)
  rating?: number; reviewCount?: number; category?: string; address?: string;
  phone?: string; website?: string;
}

export interface ParsedProfile {
  name: string;
  rating?: number;
  reviewCount?: number;
  category?: string;
  address?: string;
  phone?: string;
  website?: string;
  hasHours?: boolean;
  verified?: boolean;
  businessStatus?: string;
  description?: string;
  photoCount?: number;
  photoUrl?: string;
  postsCount?: number;
  qaCount?: number;
  qaAnswered?: number;
  attributesCount?: number;
  attributes?: string[];
  foundingDate?: string;
  mapsUri?: string;
}

const numBR = (s?: string) => (s ? parseFloat(s.replace(/\./g, "").replace(",", ".")) : NaN);

export function parseScrape(x: ExtScrape): ParsedProfile {
  const T = x.text ?? "";
  const find = (re: RegExp) => { const m = T.match(re); return m ? m[1] : undefined; };

  const rating = x.rating ?? (numBR(find(/\b([0-9],[0-9])\b(?=\s*(?:★|\(|estrela))/)) || undefined);
  const reviewCount = x.reviewCount ?? (() => {
    const m = T.match(/\(?\s*([\d.]+)\s*\)?\s*(?:avaliaç|coment|review)/i); return m ? parseInt(m[1].replace(/\./g, ""), 10) : undefined;
  })();

  // Atributos: seções típicas do Maps (Serviços, Comodidades, Acessibilidade, Pagamentos, Opções)
  const attrSet = new Set<string>();
  const attrSections = T.match(/(Opções de serviço|Acessibilidade|Comodidades|Serviços|Formas de pagamento|Público|Planejamento|Oferece|Destaques)[\s\S]{0,400}/gi) || [];
  for (const block of attrSections) {
    for (const line of block.split("\n").slice(1)) {
      const t = line.trim();
      if (t && t.length <= 40 && /^[A-Za-zÀ-ú]/.test(t) && !/^(Opções|Acessibilidade|Comodidades|Serviços|Formas|Público|Planejamento)/i.test(t)) {
        attrSet.add(t);
      }
    }
  }

  // Descrição
  let description: string | undefined;
  const di = T.search(/Do estabelecimento|Sobre este/i);
  if (di >= 0) description = T.slice(di, di + 500).replace(/^(Do estabelecimento|Sobre este[^\n]*)\s*/i, "").split("\n").filter(Boolean).slice(0, 3).join(" ").trim();

  const posts = T.match(/(\d+)\s*(?:novidades|postagens|atualizações|updates)/i);
  const qa = T.match(/(\d+)\s*perguntas?/i);
  const founding = find(/(?:Aberto desde|Inaugurado em|Fundado em|Estabelecido em)\s*([^\n]{2,30})/i);

  const photos = (x.photos ?? []).filter(Boolean);
  const photoCount = photos.length >= 3 ? photos.length : (() => { const m = T.match(/(\d+)\s*fotos?/i); return m ? parseInt(m[1], 10) : undefined; })();

  return {
    name: x.name ?? "Empresa",
    rating: Number.isFinite(rating as number) ? (rating as number) : undefined,
    reviewCount,
    category: x.category || find(/\n([A-Za-zÀ-ú][A-Za-zÀ-ú /]{3,40})\n(?=.*(?:avaliaç|★))/),
    address: x.address,
    phone: x.phone,
    website: x.website,
    hasHours: /\b(Aberto|Fechado|Horário|Fecha|Abre)\b/i.test(T),
    verified: /(Você gerencia|proprietário|Você é o proprietário)/i.test(T),
    businessStatus: /Fechado permanentemente/i.test(T) ? "CLOSED_PERMANENTLY" : "OPERATIONAL",
    description,
    photoCount,
    photoUrl: photos[0],
    postsCount: posts ? parseInt(posts[1], 10) : undefined,
    qaCount: qa ? parseInt(qa[1], 10) : undefined,
    qaAnswered: undefined,
    attributesCount: attrSet.size || undefined,
    attributes: attrSet.size ? [...attrSet].slice(0, 20) : undefined,
    foundingDate: founding,
    mapsUri: x.mapsUri,
  };
}
