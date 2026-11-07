import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Política de Privacidade — GMN PRO",
  description: "Como o GMN PRO coleta, usa e protege seus dados.",
};

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Política de Privacidade</h1>
        <p className="mt-2 text-sm text-muted">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted">
          <Section title="Quem somos">
            O GMN PRO é uma ferramenta do Grupo Vita (VitaMakers) para ajudar empresas e
            agências a otimizar e gerenciar seus perfis do Google Meu Negócio (Google Business
            Profile). Contato:{" "}
            <a href="mailto:contato@vitamakers.com.br" className="text-brand-2 hover:underline">
              contato@vitamakers.com.br
            </a>.
          </Section>

          <Section title="Dados que coletamos">
            <ul className="list-disc space-y-1 pl-5">
              <li>Dados de conta: e-mail e senha (ou login via Google).</li>
              <li>
                Dados do Google Business Profile que você autoriza: nome dos perfis/locais que você
                gerencia, e o conteúdo das postagens e fotos que você cria ou agenda.
              </li>
              <li>
                Tokens de acesso do Google, usados apenas para publicar em seu nome, guardados de
                forma restrita e nunca compartilhados.
              </li>
            </ul>
          </Section>

          <Section title="Como usamos os dados">
            Usamos seus dados exclusivamente para: autenticar seu acesso; exibir seus perfis;
            e criar, agendar e publicar postagens e fotos nos perfis do Google Meu Negócio que
            você autorizou. Não vendemos nem compartilhamos seus dados com terceiros para fins de
            marketing.
          </Section>

          <Section title="Uso das APIs do Google">
            O uso e a transferência de informações recebidas das APIs do Google pelo GMN PRO
            seguem a{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              className="text-brand-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Política de Dados do Usuário dos Serviços de API do Google
            </a>
            , incluindo os requisitos de Uso Limitado. Solicitamos apenas o escopo
            necessário (business.manage) para gerenciar os perfis que você autoriza.
          </Section>

          <Section title="Armazenamento e segurança">
            Os dados são armazenados em servidores seguros (Supabase) com regras de acesso por
            usuário. Os tokens de acesso são usados somente no servidor, nunca expostos no
            navegador.
          </Section>

          <Section title="Seus direitos">
            Você pode, a qualquer momento, desconectar sua conta do Google, excluir suas
            postagens agendadas e solicitar a exclusão da sua conta e dos seus dados pelo e-mail{" "}
            <a href="mailto:contato@vitamakers.com.br" className="text-brand-2 hover:underline">
              contato@vitamakers.com.br
            </a>.
          </Section>

          <Section title="Alterações">
            Podemos atualizar esta política periodicamente. A data da última atualização é
            indicada no topo desta página.
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
