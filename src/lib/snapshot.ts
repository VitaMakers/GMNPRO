/**
 * Snapshot da Análise Completa (nota, itens com status, card do perfil).
 * Calculado no servidor com a mesma regra da tela.
 */
import { AUTO_ITEM_IDS, CHECKLIST, classify, type ItemStatus } from "./checklist";
import type { AutoResult, AuditProfile } from "./google/audit";

export interface SnapshotItem {
  id: string;
  category: string;
  label: string;
  tip: string;
  weight: number;
  status: ItemStatus;
  detail?: string;
}

export interface Snapshot {
  title: string;
  score: number;
  fraco: number;
  razoavel: number;
  bom: number;
  items: SnapshotItem[];
  profile: AuditProfile;
  analyzed_at: string;
}

export function buildSnapshot(auto: AutoResult, profile: AuditProfile, fallbackTitle = ""): Snapshot {
  const items: SnapshotItem[] = [];
  let total = 0;
  let got = 0;
  const counts = { bom: 0, razoavel: 0, fraco: 0 };
  for (const cat of CHECKLIST) {
    for (const it of cat.items) {
      if (!AUTO_ITEM_IDS.has(it.id)) continue;
      const a = auto[it.id];
      const done = a?.done ?? false;
      const status = classify(it, done, a?.status);
      total += it.weight;
      if (done) got += it.weight;
      counts[status]++;
      items.push({ id: it.id, category: cat.title, label: it.label, tip: it.tip, weight: it.weight, status, detail: a?.detail });
    }
  }
  return {
    title: profile.title || fallbackTitle,
    score: total ? Math.round((got / total) * 100) : 0,
    ...counts,
    items,
    profile,
    analyzed_at: new Date().toISOString(),
  };
}
