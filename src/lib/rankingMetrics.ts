/**
 * Métricas de ranqueamento local (padrão do setor, iguais às usadas por
 * ferramentas como Local Falcon / GBP Check), calculadas a partir dos
 * pontos de uma rodada de geo-grid. Tudo derivado de `points` já salvos
 * em `ranking_runs` — não precisa de nova coluna nem nova chamada de API.
 *
 *  • ARP  (Average Rank Position): posição média SÓ onde o perfil foi
 *    encontrado no top 20. Quanto menor, melhor. É a "posição média"
 *    que já mostrávamos.
 *  • ATRP (Average Total Rank Position): posição média considerando
 *    TODOS os pontos da grade — pontos onde o perfil não apareceu contam
 *    como 21 (fora do top 20). Penaliza buracos de cobertura, então é
 *    sempre ≥ ARP e mostra a realidade "no mapa inteiro".
 *  • SoLV (Share of Local Voice): % dos pontos em que o perfil está no
 *    top 3 (aparece no "pacote local" do Google). Quanto maior, melhor.
 */

/** Rank atribuído a um ponto onde o perfil não apareceu no top 20. */
export const NOT_FOUND_RANK = 21;

export interface RankingMetrics {
  arp: number | null; // posição média (só encontrados)
  atrp: number | null; // posição média total (não-encontrado = 21)
  solv: number; // % no top 3
  foundPct: number; // % dos pontos em que apareceu no top 20
  found: number;
  total: number;
}

type P = { rank: number | null };

export function rankingMetrics(points: P[] | undefined | null): RankingMetrics {
  const pts = Array.isArray(points) ? points : [];
  const total = pts.length;
  const found = pts.filter((p) => p.rank != null) as { rank: number }[];
  const arp = found.length
    ? Math.round((found.reduce((s, p) => s + p.rank, 0) / found.length) * 10) / 10
    : null;
  const atrp = total
    ? Math.round(
        (pts.reduce((s, p) => s + (p.rank != null ? p.rank : NOT_FOUND_RANK), 0) / total) * 10,
      ) / 10
    : null;
  const solv = total ? Math.round((found.filter((p) => p.rank <= 3).length / total) * 100) : 0;
  const foundPct = total ? Math.round((found.length / total) * 100) : 0;
  return { arp, atrp, solv, foundPct, found: found.length, total };
}

// ────────────────────────────────────────────────────────────────────────
// Comparação de concorrentes ao longo da grade
// ────────────────────────────────────────────────────────────────────────

interface TopEntry {
  title: string;
  rank: number;
  rating?: number | null;
  reviews?: number | null;
  me?: boolean;
  placeId?: string | null;
}
interface PointWithTop {
  rank: number | null;
  top?: TopEntry[];
}

export interface CompetitorRow {
  key: string;
  title: string;
  isMe: boolean;
  appearances: number; // pontos em que aparece no top capturado
  coverage: number; // % dos pontos da grade em que aparece
  arp: number | null; // posição média onde aparece
  solv: number; // % dos pontos da grade em que está no top 3
  best: number; // melhor posição vista
  rating: number | null;
  reviews: number | null;
  atrp: number; // posição média na grade inteira (onde não aparece conta 21)
  rank: number; // posição geral entre as empresas da busca (1 = melhor ATRP)
}

function keyNorm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Agrega os concorrentes que aparecem no top de cada ponto e calcula, para
 * cada um, as mesmas métricas do perfil (ARP, SoLV, cobertura) ao longo da
 * grade inteira. Inclui o próprio perfil (isMe) para comparação direta.
 * Ordenado por SoLV desc. Só reflete negócios capturados no top de cada
 * ponto (top 20; rodadas antigas, top 10) — rivais que nunca entram no top não aparecem.
 */
export function competitorTable(points: PointWithTop[] | undefined | null): CompetitorRow[] {
  const pts = Array.isArray(points) ? points : [];
  const total = pts.length || 1;
  const agg = new Map<
    string,
    { title: string; isMe: boolean; appearances: number; sum: number; best: number; top3: number; rating: number | null; reviews: number | null }
  >();
  for (const p of pts) {
    // Um negócio pode aparecer em vários pontos; no mesmo ponto, uma vez.
    const seen = new Set<string>();
    for (const t of p.top ?? []) {
      const k = (t.placeId && t.placeId.trim()) || keyNorm(t.title);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      const cur = agg.get(k) ?? { title: t.title, isMe: !!t.me, appearances: 0, sum: 0, best: 99, top3: 0, rating: t.rating ?? null, reviews: t.reviews ?? null };
      cur.appearances++;
      cur.sum += t.rank;
      cur.best = Math.min(cur.best, t.rank);
      if (t.rank <= 3) cur.top3++;
      if (t.me) cur.isMe = true;
      if ((t.reviews ?? 0) > (cur.reviews ?? 0)) { cur.reviews = t.reviews ?? cur.reviews; cur.rating = t.rating ?? cur.rating; }
      if (!cur.title && t.title) cur.title = t.title;
      agg.set(k, cur);
    }
  }
  const rows: CompetitorRow[] = [...agg.entries()].map(([key, v]) => ({
    key,
    title: v.title,
    isMe: v.isMe,
    appearances: v.appearances,
    coverage: Math.round((v.appearances / total) * 100),
    arp: v.appearances ? Math.round((v.sum / v.appearances) * 10) / 10 : null,
    solv: Math.round((v.top3 / total) * 100),
    best: v.best === 99 ? 0 : v.best,
    rating: v.rating,
    reviews: v.reviews,
    atrp: Math.round(((v.sum + (total - v.appearances) * NOT_FOUND_RANK) / total) * 10) / 10,
    rank: 0,
  }));
  // Posição geral: ordena pela posição média na grade inteira (ATRP).
  [...rows].sort((a, b) => a.atrp - b.atrp || b.solv - a.solv).forEach((r, i) => { r.rank = i + 1; });
  return rows.sort((a, b) => b.solv - a.solv || b.appearances - a.appearances || (a.arp ?? 99) - (b.arp ?? 99));
}

export interface OverallPosition {
  position: number; // posição geral da empresa analisada
  total: number; // quantas empresas entraram na comparação
  centerRank: number | null; // posição no ponto da própria empresa (centro da grade)
  outside: number; // pontos em que ficou fora do top 20
  points: number;
  approx: boolean; // rodada antiga (só top 10 dos concorrentes): posição aproximada
}

/**
 * "De um modo geral, em que posição a empresa aparece?" — compara a posição
 * média na grade inteira (ATRP) da empresa analisada com a de todas as
 * empresas vistas nos resultados. Rodadas antigas guardavam menos
 * concorrentes por ponto, então nelas a posição é uma aproximação.
 */
export function overallPosition(points: PointWithTop[] | undefined | null): OverallPosition | null {
  const pts = Array.isArray(points) ? points : [];
  if (pts.length === 0) return null;
  const mine = rankingMetrics(pts).atrp;
  if (mine == null) return null;
  const rivals = competitorTable(pts).filter((r) => !r.isMe);
  const better = rivals.filter((r) => r.atrp < mine).length;
  const side = Math.round(Math.sqrt(pts.length));
  const center = side * side === pts.length && side % 2 === 1 ? pts[Math.floor(pts.length / 2)] : null;
  return {
    position: better + 1,
    total: rivals.length + 1,
    centerRank: center ? center.rank : null,
    outside: pts.filter((p) => p.rank == null).length,
    points: pts.length,
    approx: pts.every((p) => (p.top?.length ?? 0) <= 10),
  };
}

/** Textos do glossário, reusados na página de ranking e no relatório. */
export const RANKING_GLOSSARY: { sigla: string; nome: string; desc: string }[] = [
  {
    sigla: "ARP",
    nome: "Posição média",
    desc: "Média da sua posição apenas nos pontos onde você aparece no top 20. Quanto menor, melhor.",
  },
  {
    sigla: "ATRP",
    nome: "Posição média total",
    desc: "Média da posição considerando a grade inteira — pontos onde você não aparece contam como 21. Mostra a cobertura real no mapa.",
  },
  {
    sigla: "SoLV",
    nome: "Presença no top 3",
    desc: "Percentual dos pontos em que você está no top 3 do Google (o “pacote local”). Quanto maior, mais gente vê seu perfil.",
  },
];
