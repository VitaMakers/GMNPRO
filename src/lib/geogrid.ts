/**
 * Geração da grade (geo-grid) ao redor de um ponto central.
 * Grade NxN com espaçamento em km; o ponto central é a própria empresa.
 */

export interface GridPoint {
  row: number;
  col: number;
  lat: number;
  lng: number;
}

export const GRID_SIZES = [3, 5, 7, 9, 11, 13, 15] as const;
export type GridSize = (typeof GRID_SIZES)[number];

/** Créditos = número de pontos (1 crédito por ponto). */
export function gridCredits(size: number): number {
  return size * size;
}

export function buildGrid(centerLat: number, centerLng: number, size: number, spacingKm: number): GridPoint[] {
  const half = Math.floor(size / 2);
  const dLat = spacingKm / 111.32;
  const dLng = spacingKm / (111.32 * Math.cos((centerLat * Math.PI) / 180));
  const points: GridPoint[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      points.push({
        row: r,
        col: c,
        lat: centerLat + (half - r) * dLat,
        lng: centerLng + (c - half) * dLng,
      });
    }
  }
  return points;
}

export interface RankedPoint extends GridPoint {
  rank: number | null; // null = não encontrado no top 20
  top?: { title: string; rank: number; rating: number | null; reviews: number | null; me: boolean }[];
}

export function summarize(points: RankedPoint[]) {
  const found = points.filter((p) => p.rank != null) as (RankedPoint & { rank: number })[];
  const n = points.length || 1;
  const avg = found.length ? found.reduce((s, p) => s + p.rank, 0) / found.length : null;
  return {
    avgRank: avg != null ? Math.round(avg * 10) / 10 : null,
    top3Pct: Math.round((found.filter((p) => p.rank <= 3).length / n) * 100),
    top10Pct: Math.round((found.filter((p) => p.rank <= 10).length / n) * 100),
    foundPct: Math.round((found.length / n) * 100),
  };
}
