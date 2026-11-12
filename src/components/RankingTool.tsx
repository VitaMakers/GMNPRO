"use client";

import { useEffect, useState } from "react";
import { useActiveProfile, initActiveProfile } from "@/lib/profileStore";

type LocationOption = { location_name: string; title: string | null };

// Custo em créditos por tamanho de grade (1 crédito = 1 ponto).
const GRIDS = [
  { size: 3, label: "3×3", credits: 9 },
  { size: 5, label: "5×5", credits: 25 },
  { size: 7, label: "7×7", credits: 49 },
];

// Cores de exemplo (posição no ranking por ponto).
function rankColor(rank: number) {
  if (rank <= 3) return "#059669"; // verde — top 3
  if (rank <= 10) return "#d97706"; // amarelo — 4 a 10
  return "#ef4444"; // vermelho — 11+
}

// Grade de exemplo (só visual), posições fictícias.
const SAMPLE = [2, 1, 3, 4, 2, 1, 5, 8, 3, 1, 2, 6, 11, 7, 4, 2, 1, 9, 12, 6, 3, 2, 1, 4, 7];

export default function RankingTool({
  locations,
  trial,
  credits,
}: {
  locations: LocationOption[];
  trial: boolean;
  credits: number;
}) {
  const active = useActiveProfile();
  const selected = active ?? locations[0]?.location_name ?? "";
  const selectedTitle = locations.find((l) => l.location_name === selected)?.title ?? "perfil";
  const [keyword, setKeyword] = useState("");
  const [grid, setGrid] = useState(7);

  useEffect(() => {
    if (locations[0]) initActiveProfile(locations[0].location_name);
  }, [locations]);

  const chosen = GRIDS.find((g) => g.size === grid) ?? GRIDS[2];
  const canRun = credits >= chosen.credits && keyword.trim().length > 0;

  return (
    <div className="space-y-5">
      {/* Saldo de créditos */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4 card-soft">
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/5 px-3 py-1.5 font-medium text-brand-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            {selectedTitle}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted">Créditos:</span>
          <span className="rounded-full bg-surface-2 px-3 py-1 font-semibold">{credits.toLocaleString("pt-BR")}</span>
        </div>
      </div>

      {trial && (
        <p className="rounded-2xl border border-accent/40 bg-accent/10 p-3 text-sm text-muted">
          🔓 Este recurso faz parte do seu plano. Você pode <strong>ver tudo agora no teste</strong> —
          os <strong>créditos para rodar as análises são liberados quando você assinar</strong> (no
          teste grátis não há créditos).
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        {/* Controles */}
        <div className="rounded-3xl border border-border bg-white p-6 card-soft">
          <p className="text-sm font-semibold">Nova análise</p>
          <p className="mb-4 text-xs text-muted">Escolha a palavra-chave e o tamanho da grade.</p>

          <label className="block">
            <span className="mb-1 block text-xs text-muted">Palavra-chave</span>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Ex.: segurança para eventos"
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-brand"
            />
          </label>

          <div className="mt-4">
            <span className="mb-1 block text-xs text-muted">Tamanho da grade</span>
            <div className="flex gap-2">
              {GRIDS.map((g) => (
                <button
                  key={g.size}
                  onClick={() => setGrid(g.size)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm transition ${
                    grid === g.size ? "border-brand bg-brand/10 text-brand-2" : "border-border hover:bg-surface-2"
                  }`}
                >
                  <span className="block font-semibold">{g.label}</span>
                  <span className="block text-[11px] text-muted">{g.credits} créditos</span>
                </button>
              ))}
            </div>
          </div>

          <button
            disabled={!canRun}
            title={canRun ? "" : "Sem créditos — assine para liberar"}
            className="mt-5 w-full rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            Analisar ({chosen.credits} créditos)
          </button>
          {!canRun && (
            <p className="mt-2 text-center text-xs text-muted">
              {keyword.trim().length === 0
                ? "Digite uma palavra-chave."
                : "Você ainda não tem créditos. Assine para liberar."}
            </p>
          )}
        </div>

        {/* Mapa de exemplo */}
        <div className="rounded-3xl border border-border bg-white p-6 card-soft">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">Mapa de ranqueamento</p>
            <div className="flex items-center gap-3 text-[11px] text-muted">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: "#059669" }} /> 1–3</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: "#d97706" }} /> 4–10</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: "#ef4444" }} /> 11+</span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-border" style={{ background: "linear-gradient(135deg,#eef2f1,#e6efe9)" }}>
            {/* retículas tipo mapa */}
            <div
              className="pointer-events-none absolute inset-0 opacity-50"
              style={{
                backgroundImage:
                  "linear-gradient(#cfd8d6 1px, transparent 1px), linear-gradient(90deg,#cfd8d6 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
            <div className="relative grid gap-3 p-6" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
              {SAMPLE.map((rank, i) => (
                <div key={i} className="flex items-center justify-center">
                  <span
                    className="grid h-9 w-9 place-items-center rounded-full text-xs font-bold text-white shadow"
                    style={{ background: rankColor(rank) }}
                  >
                    {rank}
                  </span>
                </div>
              ))}
            </div>
            <div className="absolute inset-0 grid place-items-center bg-white/30 backdrop-blur-[1px]">
              <span className="rounded-full bg-foreground/80 px-4 py-2 text-xs font-medium text-white">
                Exemplo · rode uma análise para ver os dados reais
              </span>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">
            Cada ponto mostra em que posição seu perfil aparece naquela região para a palavra-chave.
          </p>
        </div>
      </div>
    </div>
  );
}
