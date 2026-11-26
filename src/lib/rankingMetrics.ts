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
