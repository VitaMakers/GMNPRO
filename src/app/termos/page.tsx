import type { Metadata } from "next";
import MarketingHeader from "@/components/MarketingHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Termos de Uso — GMN Profile",
  description: "Termos e condições de uso do GMN Profile.",
};

export default function TermosPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Termos de Uso</h1>
        <p className="mt-2 text-sm text-muted">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted">
          <Section title="1. Aceitação">
            Ao usar o GMN Profile, operado pelo Grupo Vita (VitaMakers), você concorda com estes
            Termos de Uso e com a nossa Política de Privacidade.
          </Section>
          <Section title="2. O serviço">
            O GMN Profile oferece ferramentas para otimizar fotos, avaliar e agendar postagens em
            perfis do Google Meu Negócio. Você é responsável pelo conteúdo que publica e por ter
            autorização para gerenciar os perfis conectados.
          </Section>
          <Section title="3. Conta e acesso ao Google">
            Você é responsável por manter a segurança da sua conta. Ao conectar o Google, você
            autoriza o GMN Profile a publicar em seu nome nos perfis que você gerencia. Você pode
            revogar esse acesso a qualquer momento.
          </Section>
          <Section title="4. Uso aceitável">
            Você concorda em não publicar conteúdo ilegal, enganoso ou que viole as políticas do
            Google Business Profile. O descumprimento pode levar à suspensão da conta.
          </Section>
          <Section title="5. Disponibilidade">
            O serviço é fornecido “no estado em que se encontra”. Dependemos de serviços de
            terceiros (Google, Supabase) e não garantimos disponibilidade ininterrupta.
          </Section>
          <Section title="6. Limitação de responsabilidade">
            O Grupo Vita não se responsabiliza por eventuais remoções, penalidades ou alterações
            feitas pelo Google nos perfis, nem por lucros cessantes decorrentes do uso do serviço.
          </Section>
          <Section title="7. Contato">
            Dúvidas sobre estes termos:{" "}
            <a href="mailto:contato@vitamakers.com.br" className="text-brand-2 hover:underline">
              contato@vitamakers.com.br
            </a>.
          </Section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}
