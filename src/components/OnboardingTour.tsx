"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const KEY = "gmnpro.tourSeen.v1";

type Step = {
  emoji: string;
  title: string;
  body: string;
  href?: string;
  cta?: string;
};

const STEPS: Step[] = [
  {
    emoji: "👋",
    title: "Bem-vindo ao GMN PRO",
    body: "Aqui você cuida do seu Google Meu Negócio num lugar só: fotos, postagens, avaliações e desempenho. Vou te mostrar o caminho em 1 minuto.",
  },
  {
    emoji: "🏢",
    title: "1. Conecte seus perfis",
    body: "Na aba Agendamentos, clique em conectar o Google e sincronize seus perfis. Depois, use o seletor de perfis lá no topo para trocar de empresa a qualquer momento.",
    href: "/agendamento",
    cta: "Ir para Agendamentos",
  },
  {
    emoji: "📈",
    title: "2. Acompanhe o Desempenho",
    body: "Veja visualizações, ligações, rotas e de onde vêm as pessoas — com comparação por período e os termos que mais buscam seu negócio.",
    href: "/desempenho",
    cta: "Ver Desempenho",
  },
  {
    emoji: "🏷️",
    title: "3. Prepare e publique fotos (Geotag)",
    body: "Otimize as fotos nas medidas ideais do Google, com título, descrição e palavras-chave — e publique ou agende direto na galeria do perfil.",
    href: "/geotag",
    cta: "Abrir Geotag",
  },
  {
    emoji: "🗓️",
    title: "4. Agende postagens",
    body: "Monte novidades, ofertas e eventos, escolha a data e deixe a publicação automática fazer o resto. Dá para conferir a galeria do Google por aqui também.",
    href: "/agendamento",
    cta: "Abrir Agendamentos",
  },
  {
    emoji: "⭐",
    title: "5. Responda avaliações com IA",
    body: "A IA escreve respostas no seu tom, citando o nome da pessoa. Você revisa e envia — ou deixa no automático. As negativas vêm só como sugestão para aprovar.",
    href: "/avaliacoes",
    cta: "Abrir Avaliações",
  },
  {
    emoji: "✅",
    title: "6. Descubra o que melhorar",
    body: "A Análise Completa lê seu perfil do Google em tempo real e dá uma nota com o mapa de locais e as prioridades. A Pré-análise avalia qualquer empresa (mesmo sem acesso) pelos dados públicos do Google Maps.",
    href: "/checklist",
    cta: "Abrir Análise Completa",
  },
  {
    emoji: "📍",
    title: "7. Ranking no Google Maps (Agência)",
    body: "Veja em que posição seu perfil aparece em vários pontos da cidade para cada palavra-chave, compare com concorrentes e acompanhe a evolução — com acompanhamento semanal automático.",
    href: "/ranking",
    cta: "Abrir Análise de Ranking",
  },
  {
    emoji: "🗂️",
    title: "8. Gestão de Locais e relatórios (Agência)",
    body: "Gerencie todos os clientes num painel, gere relatórios PDF com a sua marca e envie por link ou e-mail — com atualização automática. Tudo em Gestão de Locais.",
    href: "/locais",
    cta: "Abrir Gestão de Locais",
  },
  {
    emoji: "💬",
    title: "Precisa de ajuda?",
    body: "Fale com a gente pela aba Suporte, direto no WhatsApp. Estamos aqui para te ajudar a vender mais com o Google.",
    href: "/suporte",
    cta: "Falar com o suporte",
  },
];

export default function OnboardingTour() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(KEY) === "1";
    } catch {
      /* ignora */
    }
    if (!seen) setOpen(true);

    const onOpen = () => {
      setI(0);
      setOpen(true);
    };
    window.addEventListener("gmnpro:open-tour", onOpen);
    return () => window.removeEventListener("gmnpro:open-tour", onOpen);
  }, []);

  function close() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignora */
    }
    setOpen(false);
  }

  function goTo(href?: string) {
    close();
    if (href) router.push(href);
  }

  if (!open) return null;

  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-3xl border border-border bg-white p-6 card-soft">
        <div className="flex items-start justify-between">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-2xl">
            {step.emoji}
          </span>
          <button
            onClick={close}
            className="rounded-full p-1.5 text-muted transition hover:bg-surface-2 hover:text-foreground"
            aria-label="Fechar"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <h2 className="mt-4 font-display text-xl font-bold tracking-tight">{step.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>

        {step.href && (
          <button
            onClick={() => goTo(step.href)}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand/10 px-4 py-2 text-sm font-semibold text-brand-2 transition hover:bg-brand/15"
          >
            {step.cta} →
          </button>
        )}

        {/* Progresso */}
        <div className="mt-6 flex items-center justify-center gap-1.5">
          {STEPS.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === i ? "w-5 bg-brand" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>

        {/* Controles */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <button onClick={close} className="text-sm font-medium text-muted transition hover:text-foreground">
            Pular
          </button>
          <div className="flex items-center gap-2">
            {i > 0 && (
              <button
                onClick={() => setI((x) => x - 1)}
                className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-surface-2"
              >
                Anterior
              </button>
            )}
            {last ? (
              <button
                onClick={() => goTo("/desempenho")}
                className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Começar agora
              </button>
            ) : (
              <button
                onClick={() => setI((x) => x + 1)}
                className="rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Próximo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
