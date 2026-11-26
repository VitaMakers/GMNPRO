/**
 * Palavras-chave em destaque nas avaliações ("standout keywords", como no
 * GBP Check). Conta os termos mais citados nos textos das avaliações e
 * estima o tom (positivo/negativo) pela nota das avaliações em que aparecem.
 * Processamento 100% local — sem IA e sem custo.
 */

export interface ReviewKeyword {
  term: string;
  count: number;
  positive: number; // citações vindas de avaliações 4–5★
  negative: number; // citações vindas de avaliações 1–2★
  sentiment: "positivo" | "negativo" | "neutro";
}

// Palavras muito comuns do português que não agregam significado.
const STOP = new Set(
  (
    "a o e de do da das dos em no na nos nas um uma uns umas que com por para pra " +
    "se ao aos as os eu voce vc ele ela nos eles elas me te lhe meu minha seu sua " +
    "mais muito muita pouco pouca tudo todo toda nada sem sobre entre ja nao sim " +
    "la aqui ali isso isto aquilo este esta esse essa aquele aquela como quando onde " +
    "porque pois mas e ou tambem so apenas ate depois antes agora hoje ontem " +
    "foi era sao ser estar tem tinha ter teve havia ha vai vou fui fomos estava " +
    "muito bem mal otimo otima bom boa super demais toda todos todas qualquer " +
    "lugar vez vezes dia dias ano anos hora horas gente pessoal lugar coisa coisas " +
    "sempre nunca cada pelo pela pelos pelas num numa dele dela deles delas nosso " +
    "estão está estao esta fica ficou ser fiz fez faz fazer dar deu vi ver"
  )
    .split(/\s+/)
    .filter(Boolean),
);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP.has(w) && !/^\d+$/.test(w));
}

/**
 * @param reviews textos com nota (0–5)
 * @param opts.min  ocorrências mínimas para considerar (padrão 3 — evita caso isolado)
 * @param opts.top  quantos termos devolver (padrão 20)
 */
export function reviewKeywords(
  reviews: { rating: number; comment: string }[] | undefined | null,
  opts: { min?: number; top?: number } = {},
): ReviewKeyword[] {
  const min = opts.min ?? 3;
  const top = opts.top ?? 20;
  const map = new Map<string, { count: number; positive: number; negative: number }>();
  for (const r of reviews ?? []) {
    const seen = new Set<string>(); // conta 1x por avaliação
    for (const w of tokenize(r.comment)) {
      if (seen.has(w)) continue;
      seen.add(w);
      const cur = map.get(w) ?? { count: 0, positive: 0, negative: 0 };
      cur.count++;
      if (r.rating >= 4) cur.positive++;
      else if (r.rating > 0 && r.rating <= 2) cur.negative++;
      map.set(w, cur);
    }
  }
  const rows: ReviewKeyword[] = [...map.entries()]
    .filter(([, v]) => v.count >= min)
    .map(([term, v]) => ({
      term,
      count: v.count,
      positive: v.positive,
      negative: v.negative,
      sentiment: v.negative > v.positive ? "negativo" : v.positive > v.negative ? "positivo" : "neutro",
    }));
  return rows.sort((a, b) => b.count - a.count).slice(0, top);
}
