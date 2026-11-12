import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import ReportView, { type ReportBranding, type ReportSnapshot } from "@/components/ReportView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Relatório do Perfil Google", robots: { index: false } };

export default async function RelatorioPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data } = await admin.from("shared_reports").select("snapshot, branding, created_at").eq("token", token).maybeSingle();
  if (!data) notFound();
  return (
    <ReportView
      snapshot={data.snapshot as ReportSnapshot}
      branding={(data.branding as ReportBranding | null) ?? null}
      createdAt={data.created_at as string}
    />
  );
}
