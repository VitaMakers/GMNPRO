/**
 * Motor de auditoria do perfil do Google Meu Negócio.
 *
 * A partir dos dados públicos de um lugar (Google Places API), calcula uma
 * nota de 0 a 100 e uma lista de verificações com status e recomendação.
 */

export type CheckStatus = "ok" | "warn" | "fail";

export interface CheckResult {
  key: string;
  label: string;
  status: CheckStatus;
  points: number;
  maxPoints: number;
  detail: string;
  tip: string;
}

/** Dados normalizados que a auditoria consome (vindos da Places API). */
export interface PlaceData {
  placeId?: string;
  name: string;
  address?: string;
  primaryType?: string;
  types?: string[];
  phone?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  hasHours?: boolean;
  weekdayDescriptions?: string[];
  openNow?: boolean;
  photoCount?: number;
  photoName?: string;
  photoUrl?: string;
  // Campos extras vindos da extensão (não existem na Places API)
  postsCount?: number;
  qaCount?: number;
  qaAnswered?: number;
  attributesCount?: number;
  secondaryCount?: number;
  hasSpecialHours?: boolean;
  videoCount?: number;
  verified?: boolean;
  hasLogo?: boolean;
  source?: "places" | "extension";
  businessStatus?: string;
  description?: string;
  googleMapsUri?: string;
  searchUri?: string;
  priceLevel?: string;
  lat?: number;
  lng?: number;
}

export interface AuditReport {
  place: PlaceData;
  score: number;
  checks: CheckResult[];
  strengths: string[];
  priorities: string[];
}

function check(
  key: string,
  label: string,
  status: CheckStatus,
  points: number,
  maxPoints: number,
  detail: string,
  tip: string,
): CheckResult {
  return { key, label, status, points, maxPoints, detail, tip };
}

export function auditPlace(place: PlaceData): AuditReport {
  const checks: CheckResult[] = [];

  // Operacional
  const operational = place.businessStatus === "OPERATIONAL" || !place.businessStatus;
  checks.push(
    check(
      "status",
      "Status do perfil",
      operational ? "ok" : "fail",
      operational ? 5 : 0,
      5,
      operational ? "Perfil ativo e operacional." : "Perfil marcado como fechado.",
      "Mantenha o perfil marcado como aberto e com os horários corretos.",
    ),
  );

  // Categoria
  const hasType = !!(place.primaryType || (place.types && place.types.length));
  checks.push(
    check(
      "category",
      "Categoria definida",
      hasType ? "ok" : "fail",
      hasType ? 12 : 0,
      12,
      hasType ? `Categoria: ${place.primaryType ?? place.types?.[0]}.` : "Sem categoria principal.",
      "Escolha a categoria principal mais específica e adicione categorias secundárias.",
    ),
  );

  // Telefone
  const hasPhone = !!place.phone;
  checks.push(
    check(
      "phone",
      "Telefone de contato",
      hasPhone ? "ok" : "fail",
      hasPhone ? 10 : 0,
      10,
      hasPhone ? `Telefone: ${place.phone}.` : "Nenhum telefone cadastrado.",
      "Adicione um telefone para facilitar o contato direto do cliente.",
    ),
  );

  // Site
  const hasSite = !!place.website;
  checks.push(
    check(
      "website",
      "Site cadastrado",
      hasSite ? "ok" : "warn",
      hasSite ? 13 : 0,
      13,
      hasSite ? `Site: ${place.website}.` : "Nenhum site cadastrado.",
      "Adicione um site (pode ser uma landing page) para ganhar autoridade e cliques.",
    ),
  );

  // Horários
  const hasHours = !!place.hasHours;
  checks.push(
    check(
      "hours",
      "Horário de funcionamento",
      hasHours ? "ok" : "fail",
      hasHours ? 12 : 0,
      12,
      hasHours ? "Horários preenchidos." : "Sem horário de funcionamento.",
      "Preencha os horários — inclusive feriados — para aparecer melhor nas buscas.",
    ),
  );

  // Descrição
  const hasDesc = !!(place.description && place.description.trim().length > 20);
  checks.push(
    check(
      "description",
      "Descrição da empresa",
      hasDesc ? "ok" : "warn",
      hasDesc ? 8 : 0,
      8,
      hasDesc ? "Descrição preenchida." : "Descrição curta ou ausente.",
      "Escreva uma descrição com as palavras-chave que os clientes buscam.",
    ),
  );

  // Nota média
  const rating = place.rating ?? 0;
  let ratingStatus: CheckStatus = "fail";
  let ratingPts = 0;
  if (rating >= 4.5) { ratingStatus = "ok"; ratingPts = 10; }
  else if (rating >= 4.0) { ratingStatus = "warn"; ratingPts = 7; }
  else if (rating > 0) { ratingStatus = "warn"; ratingPts = 3; }
  checks.push(
    check(
      "rating",
      "Nota média",
      ratingStatus,
      ratingPts,
      10,
      rating > 0 ? `Nota ${rating.toFixed(1)} de 5.` : "Sem avaliações.",
      "Peça avaliações a clientes satisfeitos; mire em manter acima de 4,5.",
    ),
  );

  // Número de avaliações
  const reviews = place.reviewCount ?? 0;
  let revStatus: CheckStatus = "fail";
  let revPts = 0;
  if (reviews >= 50) { revStatus = "ok"; revPts = 15; }
  else if (reviews >= 10) { revStatus = "warn"; revPts = 10; }
  else if (reviews > 0) { revStatus = "warn"; revPts = 5; }
  checks.push(
    check(
      "reviews",
      "Volume de avaliações",
      revStatus,
      revPts,
      15,
      reviews > 0 ? `${reviews} avaliações.` : "Nenhuma avaliação.",
      "Crie uma rotina de pedir avaliações (link e QR code) para acumular volume.",
    ),
  );

  // Fotos
  const photos = place.photoCount ?? 0;
  let photoStatus: CheckStatus = "fail";
  let photoPts = 0;
  if (photos >= 10) { photoStatus = "ok"; photoPts = 15; }
  else if (photos >= 3) { photoStatus = "warn"; photoPts = 9; }
  else if (photos > 0) { photoStatus = "warn"; photoPts = 4; }
  checks.push(
    check(
      "photos",
      "Fotos do perfil",
      photoStatus,
      photoPts,
      15,
      photos > 0 ? `${photos}+ fotos encontradas.` : "Poucas ou nenhuma foto.",
      "Suba fotos novas com frequência — use a ferramenta de Geotag para otimizá-las.",
    ),
  );

  // Pré-análise profunda (extensão): checklist completo de ~20 itens, como o GBP.
  if (place.source === "extension") {
    const nameOk = !!place.name && place.name.length >= 2;
    checks.push(check("nome", "Nome do negócio", nameOk ? "ok" : "fail", nameOk ? 4 : 0, 4,
      nameOk ? place.name : "Nome não identificado.", "O nome deve ser o real da fachada, sem palavras-chave extras."));

    const sec = place.secondaryCount ?? 0;
    checks.push(check("cat2", "Categorias secundárias", sec >= 1 ? "ok" : "warn", sec >= 1 ? 5 : 0, 5,
      sec > 0 ? `${sec} categoria(s) secundária(s).` : "Sem categorias secundárias.",
      "Adicione todas as categorias que descrevem seus serviços."));

    checks.push(check("hesp", "Horário especial (feriados)", place.hasSpecialHours ? "ok" : "warn", place.hasSpecialHours ? 3 : 0, 3,
      place.hasSpecialHours ? "Horário especial configurado." : "Sem horário especial/feriados.",
      "Configure horários de feriados para não frustrar o cliente."));

    const attrs = place.attributesCount ?? 0;
    checks.push(check("attrs", "Atributos / opções de serviço", attrs >= 3 ? "ok" : attrs >= 1 ? "warn" : "fail", attrs >= 3 ? 5 : attrs >= 1 ? 2 : 0, 5,
      attrs > 0 ? `${attrs} atributo(s).` : "Poucos atributos.",
      "Preencha atributos (wi-fi, acessibilidade, formas de pagamento, etc.)."));

    checks.push(check("verif", "Perfil verificado", place.verified ? "ok" : "fail", place.verified ? 6 : 0, 6,
      place.verified ? "Perfil verificado." : "Perfil aparenta não verificado.",
      "Verifique o perfil pelo painel do Google para liberar todos os recursos."));

    const photos = place.photoCount ?? 0;
    checks.push(check("capa", "Foto de capa", photos >= 1 ? "ok" : "fail", photos >= 1 ? 4 : 0, 4,
      photos >= 1 ? "Foto de capa presente." : "Sem foto de capa.", "Defina uma foto de capa de alta qualidade."));
    checks.push(check("logo", "Logo", place.hasLogo ? "ok" : "warn", place.hasLogo ? 3 : 0, 3,
      place.hasLogo ? "Logo definido." : "Logo não identificado.", "Adicione o logo da marca ao perfil."));
    checks.push(check("fvar", "Variedade de fotos", photos >= 8 ? "ok" : photos >= 3 ? "warn" : "fail", photos >= 8 ? 5 : photos >= 3 ? 3 : 0, 5,
      `${photos} foto(s).`, "Suba fotos de fachada, interior, produtos e equipe."));

    const videos = place.videoCount ?? 0;
    checks.push(check("vids", "Vídeos", videos >= 1 ? "ok" : "warn", videos >= 1 ? 3 : 0, 3,
      videos > 0 ? `${videos} vídeo(s).` : "Sem vídeos.", "Adicione vídeos curtos para diferenciar o perfil."));

    const posts = place.postsCount ?? 0;
    checks.push(check("posts", "Postagens recentes", posts >= 1 ? "ok" : "warn", posts >= 1 ? 6 : 0, 6,
      posts > 0 ? `${posts} postagem(ns) visível(is).` : "Sem postagens recentes.",
      "Poste novidades/ofertas toda semana para manter o perfil ativo."));

    const qa = place.qaCount ?? 0;
    const qaOk = qa > 0 && (place.qaAnswered ?? 0) > 0;
    checks.push(check("qa", "Perguntas e respostas", qaOk ? "ok" : "warn", qaOk ? 4 : 0, 4,
      qa > 0 ? `${place.qaAnswered ?? 0}/${qa} respondidas.` : "Sem perguntas e respostas.",
      "Crie e responda perguntas frequentes no perfil."));
  }

  const maxTotal = checks.reduce((s, c) => s + c.maxPoints, 0);
  const rawScore = checks.reduce((s, c) => s + c.points, 0);
  const score = Math.round((rawScore / maxTotal) * 100);

  const strengths = checks.filter((c) => c.status === "ok").map((c) => c.label);
  const priorities = checks
    .filter((c) => c.status !== "ok")
    .sort((a, b) => (b.maxPoints - b.points) - (a.maxPoints - a.points))
    .map((c) => c.tip);

  return { place, score, checks, strengths, priorities };
}
