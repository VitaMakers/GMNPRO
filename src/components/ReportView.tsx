"use client";

export type ReportBranding = { name?: string | null; logo_url?: string | null; color?: string | null; phone?: string | null; site?: string | null };
export type ReportSnapshot = {
  title: string; score: number; fraco: number; razoavel: number; bom: number; analyzed_at: string;
  items: { id: string; category: string; label: string; tip: string; status: "bom" | "razoavel" | "fraco"; detail?: string }[];
  profile: { title: string; category: string; address: string; phone: string; website: string; rating: number; reviewCount: number; photoUrl: string | null; verified: boolean; description: string } | null;
};

const C = { bom: "#059669", razoavel: "#d97706", fraco: "#dc2626" } as const;
const L = { bom: "Bom", razoavel: "Razoável", fraco: "Fraco" } as const;

export default function ReportView({ snapshot: s, branding, createdAt }: { snapshot: ReportSnapshot; branding: ReportBranding | null; createdAt: string }) {
  const brand = branding?.color || "#059669";
  const label = s.score >= 75 ? "BOM" : s.score >= 50 ? "RAZOÁVEL" : "FRACO";
  const ring = s.score >= 75 ? C.bom : s.score >= 50 ? C.razoavel : C.fraco;
  const cats = [...new Set(s.items.map((i) => i.category))];
  const pend = s.items.filter((i) => i.status !== "bom").sort((a, b) => (a.status === "fraco" ? -1 : 1) - (b.status === "fraco" ? -1 : 1));

  return (
    <div className="min-h-screen bg-[#f6f7f8] text-[#111827] print:bg-white">
      <style>{`
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        @page { size: A4; margin: 10mm; }
        @media print {
          .no-print { display: none !important }
          .page { box-shadow: none !important; margin: 0 !important; max-width: none !important; padding: 8mm !important; border-radius: 0 !important }
          .avoid { break-inside: avoid; page-break-inside: avoid }
          body { background: #fff !important }
        }
      `}</style>
      <div className="page mx-auto my-6 max-w-4xl rounded-3xl bg-white p-8 shadow-sm print:my-0">
        {/* Cabeçalho white-label */}
        <header className="flex items-center justify-between gap-4 border-b pb-5" style={{ borderColor: `${brand}33` }}>
          <div className="flex items-center gap-3">
            {branding?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logo_url} alt="" className="h-12 w-auto max-w-[180px] object-contain" />
            ) : (
              <span className="grid h-12 w-12 place-items-center rounded-xl text-lg font-bold text-white" style={{ background: brand }}>
                {(branding?.name || "R").slice(0, 1).toUpperCase()}
              </span>
            )}
            <div>
              <p className="text-lg font-bold leading-tight">{branding?.name || "Relatório do Perfil Google"}</p>
              <p className="text-xs text-gray-500">{[branding?.phone, branding?.site].filter(Boolean).join(" · ") || "Análise do Perfil da Empresa no Google"}</p>
            </div>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p>Relatório gerado em {new Date(createdAt).toLocaleDateString("pt-BR")}</p>
            <p>Dados do Google de {new Date(s.analyzed_at).toLocaleString("pt-BR")}</p>
          </div>
        </header>

        {/* Empresa + nota */}
        <section className="avoid mt-6 grid gap-6 md:grid-cols-[1fr_auto]">
          <div className="flex gap-4">
            {s.profile?.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.profile.photoUrl} alt="" className="h-20 w-20 rounded-2xl object-cover" />
            )}
            <div>
              <h1 className="text-2xl font-bold leading-tight">{s.title}</h1>
              {s.profile && (
                <>
                  <p className="mt-1 text-sm text-gray-600">
                    {s.profile.rating > 0 && <><strong>{s.profile.rating.toFixed(1)}</strong> ★ ({s.profile.reviewCount} avaliações) · </>}
                    {s.profile.category}
                    {s.profile.verified && <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Verificado</span>}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{[s.profile.address, s.profile.phone, s.profile.website].filter(Boolean).join(" · ")}</p>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col items-center justify-center">
            <div className="grid h-28 w-28 place-items-center rounded-full" style={{ background: `conic-gradient(${ring} ${s.score * 3.6}deg, #e5e7eb 0deg)` }}>
              <div className="grid h-20 w-20 place-items-center rounded-full bg-white">
                <span className="text-3xl font-bold" style={{ color: ring }}>{s.score}</span>
              </div>
            </div>
            <span className="mt-2 rounded-full px-3 py-1 text-xs font-bold" style={{ background: `${ring}1a`, color: ring }}>{label}</span>
          </div>
        </section>

        {/* Resumo */}
        <section className="mt-6 grid grid-cols-3 gap-3">
          {(["fraco", "razoavel", "bom"] as const).map((k) => (
            <div key={k} className="avoid flex items-center gap-3 rounded-2xl border p-3" style={{ borderColor: `${C[k]}55` }}>
              <span className="grid h-10 w-10 place-items-center rounded-full text-base font-bold text-white" style={{ background: C[k] }}>{s[k]}</span>
              <div><p className="text-sm font-semibold" style={{ color: C[k] }}>{L[k]}</p><p className="text-[11px] text-gray-500">{k === "fraco" ? "precisam de atenção" : k === "razoavel" ? "podem melhorar" : "em excelente estado"}</p></div>
            </div>
          ))}
        </section>

        {/* Prioridades */}
        {pend.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 text-base font-bold">O que fazer primeiro</h2>
            <ol className="space-y-2">
              {pend.slice(0, 6).map((i, n) => (
                <li key={i.id} className="avoid flex gap-3 rounded-xl border border-gray-200 p-3 text-sm">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ background: C[i.status] }}>{n + 1}</span>
                  <div><p className="font-medium">{i.label}</p><p className="text-xs text-gray-500">{i.tip}</p></div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Itens por categoria */}
        <section className="mt-6">
          <h2 className="mb-2 text-base font-bold">Análise detalhada</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {cats.map((c) => (
              <div key={c} className="avoid rounded-2xl border border-gray-200 p-3">
                <p className="mb-2 text-sm font-semibold">{c}</p>
                <ul className="space-y-1.5">
                  {s.items.filter((i) => i.category === c).map((i) => (
                    <li key={i.id} className="flex items-start gap-2 text-sm">
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: C[i.status] }} />
                      <span className="min-w-0"><span>{i.label}</span>{i.detail && <span className="block text-[11px] text-gray-500">{i.detail}</span>}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-8 border-t border-gray-200 pt-4 text-center text-[11px] text-gray-400">
          {branding?.name ? `${branding.name} · ` : ""}Relatório baseado em dados públicos e da API oficial do Google Business Profile.
        </footer>
      </div>

      <div className="no-print mx-auto mb-10 flex max-w-4xl justify-center gap-3">
        <button onClick={() => window.print()} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white" style={{ background: brand }}>
          Baixar PDF / Imprimir
        </button>
      </div>
    </div>
  );
}
