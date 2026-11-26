import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import ReportView, { type ReportBranding, type ReportSnapshot } from "@/components/ReportView";
import RelatorioBuilder, { type ShareConfig } from "@/components/RelatorioBuilder";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Relatório do Perfil Google", robots: { index: false } };

export default async function RelatorioPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ code?: string }>;
}) {
  const { token } = await params;
  const { code } = await searchParams;
  const admin = createAdminClient();
  const { data } = await admin
    .from("shared_reports")
    .select("snapshot, branding, created_at, access_code, config, location_name")
    .eq("token", token)
    .maybeSingle();
  if (!data) notFound();

  const needCode = !!(data.access_code && String(data.access_code).trim());
  if (needCode && (code ?? "").trim() !== String(data.access_code).trim()) {
    return <CodeGate token={token} wrong={code != null} />;
  }

  // Link novo (com a configuração do construtor): monta o MESMO relatório da
  // agência, buscando os dados atuais do Google a cada abertura.
  if (data.config && data.location_name) {
    const snap = data.snapshot as { title?: string } | null;
    const b = data.branding as { name?: string | null; logo_url?: string | null; color?: string | null; phone?: string | null; site?: string | null } | null;
    return (
      <main className="mx-auto max-w-5xl px-4 py-6 print:max-w-none print:px-0 print:py-0">
        <RelatorioBuilder
          locations={[{ location_name: data.location_name as string, title: snap?.title ?? null }]}
          initialBranding={b ? { name: b.name ?? undefined, logo_url: b.logo_url ?? undefined, color: b.color ?? undefined, phone: b.phone ?? undefined, site: b.site ?? undefined } : null}
          share={{ token, code: needCode ? (code ?? "").trim() : undefined, config: data.config as ShareConfig }}
        />
      </main>
    );
  }

  // Link antigo (sem configuração): mostra a cópia salva.
  return (
    <ReportView
      snapshot={data.snapshot as ReportSnapshot}
      branding={(data.branding as ReportBranding | null) ?? null}
      createdAt={data.created_at as string}
    />
  );
}

/** Tela simples de código de acesso (sem JS): recarrega com ?code=. */
function CodeGate({ token, wrong }: { token: string; wrong: boolean }) {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f6f7f8", fontFamily: "system-ui, Segoe UI, Arial, sans-serif", padding: 16 }}>
      <form
        method="GET"
        action={`/relatorio/${token}`}
        style={{ width: "100%", maxWidth: 360, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 24, textAlign: "center" }}
      >
        <div style={{ fontSize: 28, marginBottom: 8 }}>🔒</div>
        <h1 style={{ fontSize: 18, margin: "0 0 4px", color: "#111827" }}>Relatório protegido</h1>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 16px" }}>Digite o código de acesso enviado pela agência.</p>
        <input
          name="code"
          autoFocus
          placeholder="Código de acesso"
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 14, marginBottom: 10 }}
        />
        {wrong && <p style={{ color: "#dc2626", fontSize: 12, margin: "0 0 10px" }}>Código incorreto. Tente novamente.</p>}
        <button type="submit" style={{ width: "100%", padding: "10px 12px", border: 0, borderRadius: 10, background: "#059669", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
          Ver relatório
        </button>
      </form>
    </div>
  );
}
