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
  name: string;
  address?: string;
  primaryType?: string;
  types?: string[];
  phone?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  hasHours?: boolean;
  photoCount?: number;
  businessStatus?: string;
  description?: string;
  googleMapsUri?: string;
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

  const score = Math.round(
    checks.reduce((s, c) => s + c.points, 0),
  );

  const strengths = checks.filter((c) => c.status === "ok").map((c) => c.label);
  const priorities = checks
    .filter((c) => c.status !== "ok")
    .sort((a, b) => (b.maxPoints - b.points) - (a.maxPoints - a.points))
    .map((c) => c.tip);

  return { place, score, checks, strengths, priorities };
}
