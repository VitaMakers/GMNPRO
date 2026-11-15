import type { Metadata } from "next";
import MarketingHeader from "@/components/MarketingHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Política de Privacidade — GMN Profile",
  description: "Como o GMN Profile coleta, usa, compartilha e protege seus dados, conforme a LGPD.",
};

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Política de Privacidade</h1>
        <p className="mt-2 text-sm text-muted">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted">
          <Section title="Quem somos (Controlador)">
            O GMN Profile é uma ferramenta do <strong>Grupo Vita (VitaMakers)</strong> para ajudar
            empresas e agências a otimizar e gerenciar seus perfis do Google Meu Negócio (Google
            Business Profile). Para fins da Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD),
            o Grupo Vita é o <strong>controlador</strong> dos dados tratados na plataforma.
          </Section>

          <Section title="Encarregado pelo tratamento de dados (DPO)">
            Dúvidas, solicitações ou reclamações sobre seus dados pessoais podem ser enviadas ao nosso
            Encarregado (DPO) pelo e-mail{" "}
            <a href="mailto:contato@vitamakers.com.br" className="text-brand-2 hover:underline">
              contato@vitamakers.com.br
            </a>
            . Responderemos no prazo previsto pela LGPD.
          </Section>

          <Section title="Dados que coletamos">
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Dados de conta:</strong> e-mail e senha (a senha é guardada de forma cifrada pelo provedor de autenticação; não temos acesso a ela), ou dados de login via Google.</li>
              <li><strong>Dados do Google Business Profile</strong> que você autoriza: nome dos perfis/locais que você gerencia e o conteúdo das postagens e fotos que você cria ou agenda.</li>
              <li><strong>Tokens de acesso do Google:</strong> usados apenas para publicar e consultar em seu nome, guardados <strong>cifrados</strong> (AES-256) e nunca expostos no navegador.</li>
              <li><strong>Dados de pagamento:</strong> processados diretamente pela Stripe. Não armazenamos números de cartão em nossos servidores.</li>
              <li><strong>Dados de uso:</strong> informações técnicas necessárias ao funcionamento (ex.: registros de acesso e de operações realizadas na sua conta).</li>
            </ul>
          </Section>

          <Section title="Base legal do tratamento">
            Tratamos seus dados com fundamento na <strong>execução do contrato</strong> e nos
            procedimentos preliminares a ele (art. 7º, V da LGPD) — para prestar o serviço que você
            contratou; no <strong>consentimento</strong> que você concede ao conectar sua conta do
            Google (art. 7º, I); no cumprimento de <strong>obrigações legais e regulatórias</strong>
            (art. 7º, II), como as fiscais; e no <strong>legítimo interesse</strong> (art. 7º, IX)
            para segurança, prevenção a fraudes e melhoria do serviço.
          </Section>

          <Section title="Como usamos os dados">
            Usamos seus dados exclusivamente para: autenticar seu acesso; exibir e gerenciar seus
            perfis; criar, agendar e publicar postagens e fotos nos perfis do Google que você
            autorizou; gerar análises, relatórios e sugestões com inteligência artificial; processar
            sua assinatura; e dar suporte. <strong>Não vendemos seus dados</strong> nem os
            compartilhamos com terceiros para marketing.
          </Section>

          <Section title="Com quem compartilhamos (operadores)">
            Para operar o serviço, contamos com prestadores que atuam como <strong>operadores</strong>,
            tratando dados apenas conforme nossas instruções:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li><strong>Supabase</strong> — banco de dados e autenticação.</li>
              <li><strong>Vercel</strong> — hospedagem da aplicação.</li>
              <li><strong>Stripe</strong> — processamento de pagamentos.</li>
              <li><strong>Google</strong> — APIs do Google Business Profile (perfis que você conecta).</li>
              <li><strong>Provedores de IA</strong> (Groq, OpenAI e/ou Google Gemini) — para gerar descrições, respostas a avaliações e sugestões. Os textos enviados podem incluir o conteúdo de avaliações.</li>
              <li><strong>DataForSEO</strong> — consultas de posição/ranking (enviamos palavra-chave e localização, não seus dados de conta).</li>
              <li><strong>Resend</strong> — envio de e-mails e relatórios.</li>
            </ul>
          </Section>

          <Section title="Dados de terceiros (avaliações)">
            Ao gerar respostas automáticas, o conteúdo de avaliações do seu perfil — que pode conter o
            nome de quem avaliou — é enviado ao provedor de IA apenas para produzir a sugestão de
            resposta. Esse tratamento ocorre a seu pedido, para a finalidade de atendimento, e os
            textos não são usados para outros fins por nós.
          </Section>

          <Section title="Transferência internacional">
            Alguns operadores acima (como Supabase, Stripe, Vercel e provedores de IA) podem processar
            dados em servidores fora do Brasil, inclusive nos Estados Unidos. Nesses casos, a
            transferência ocorre com as salvaguardas exigidas pela LGPD (art. 33), por meio de
            fornecedores que adotam padrões adequados de proteção de dados.
          </Section>

          <Section title="Extensão do Chrome (Pré-análise)">
            A extensão do GMN Profile lê apenas a ficha de empresa do Google que você abre (Busca ou
            Maps) para extrair dados públicos do perfil (nome, categoria, avaliações, endereço,
            telefone, site, fotos, horários, atributos). Esses dados são enviados ao GMN Profile,
            associados à sua conta, somente para gerar a pré-análise. A extensão <strong>não</strong>
            coleta histórico de navegação, senhas, nem dados de outras abas, e não vende dados a
            terceiros.
          </Section>

          <Section title="Uso das APIs do Google">
            O uso e a transferência de informações recebidas das APIs do Google pelo GMN Profile
            seguem a{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              className="text-brand-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Política de Dados do Usuário dos Serviços de API do Google
            </a>
            , incluindo os requisitos de Uso Limitado. Solicitamos apenas o escopo necessário
            (business.manage) para gerenciar os perfis que você autoriza.
          </Section>

          <Section title="Armazenamento e segurança">
            Os dados são armazenados em servidores seguros (Supabase), com <strong>isolamento por
            usuário</strong> (cada conta só acessa os próprios dados). Segredos sensíveis, como os
            tokens de acesso do Google e chaves de IA próprias, são guardados <strong>cifrados</strong>
            (AES-256-GCM) e usados somente no servidor, nunca expostos no navegador. O acesso
            administrativo é restrito e as comunicações são feitas por conexão segura (HTTPS).
          </Section>

          <Section title="Por quanto tempo guardamos (retenção)">
            Mantemos seus dados enquanto sua conta estiver ativa. Após o término do período de teste
            ou cancelamento, a conta pode ser mantida por um período de carência de até 90 dias para
            eventual retomada, após o qual os dados são excluídos automaticamente. Você pode solicitar
            a exclusão antecipada a qualquer momento. Alguns registros podem ser mantidos por prazo
            maior quando exigido por obrigação legal.
          </Section>

          <Section title="Seus direitos (LGPD)">
            Você pode, a qualquer momento: confirmar a existência de tratamento; acessar seus dados;
            corrigir dados incompletos ou desatualizados; solicitar anonimização, bloqueio ou
            eliminação; solicitar a portabilidade; obter informação sobre com quem compartilhamos;
            e revogar o consentimento (por exemplo, desconectando sua conta do Google). Para exercer
            esses direitos ou excluir sua conta e seus dados, escreva para{" "}
            <a href="mailto:contato@vitamakers.com.br" className="text-brand-2 hover:underline">
              contato@vitamakers.com.br
            </a>
            . Você também pode apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD).
          </Section>

          <Section title="Cookies">
            Usamos apenas os cookies necessários para manter você conectado e garantir o funcionamento
            e a segurança da plataforma. Não usamos cookies de publicidade de terceiros.
          </Section>

          <Section title="Alterações">
            Podemos atualizar esta política periodicamente. A data da última atualização é indicada no
            topo desta página.
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
