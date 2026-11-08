import Link from "next/link";
import type { ReactNode } from "react";

/* ---------- Visuais (mockups originais, no nosso estilo) ---------- */

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-md rounded-3xl border border-border bg-gradient-to-br from-surface to-background p-5 shadow-2xl ring-glow">
      {children}
    </div>
  );
}

function DesempenhoVisual() {
  const pts = [8, 14, 11, 20, 17, 26, 22, 30, 27, 34];
  const max = Math.max(...pts);
  const d = pts
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i / (pts.length - 1)) * 300},${90 - (v / max) * 76}`)
    .join(" ");
  return (
    <Panel>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-muted">Visualizações (30 dias)</p>
          <p className="font-display text-3xl font-bold">2.132</p>
        </div>
        <span className="rounded-full bg-brand-2/15 px-2 py-0.5 text-xs font-medium text-brand-2">▲ 18%</span>
      </div>
      <svg viewBox="0 0 300 96" className="mt-4 w-full">
        <path d={`${d} L300,96 L0,96 Z`} fill="var(--brand)" fillOpacity="0.12" />
        <path d={d} fill="none" stroke="var(--brand-2)" strokeWidth="2.5" />
      </svg>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[["Ligações", "+24%"], ["Rotas", "+12%"], ["Cliques", "+31%"]].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-border bg-surface-2 p-2">
            <p className="text-[11px] text-muted">{k}</p>
            <p className="text-sm font-semibold text-brand-2">{v}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function AgendaVisual() {
  const cells = Array.from({ length: 28 });
  const marks: Record<number, string> = { 4: "bg-accent", 6: "bg-brand-2", 11: "bg-brand-2", 15: "bg-accent", 19: "bg-brand-2", 25: "bg-accent" };
  return (
    <Panel>
      <p className="mb-3 font-display text-lg font-semibold">Calendário de postagens</p>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((_, i) => (
          <div key={i} className="flex aspect-square flex-col items-center justify-center rounded-lg border border-border bg-surface-2 text-[10px] text-muted">
            {i + 1}
            {marks[i + 1] && <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${marks[i + 1]}`} />}
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-3 text-[11px] text-muted">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-accent" /> Agendada</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-brand-2" /> Publicada</span>
      </div>
    </Panel>
  );
}

function GeotagVisual() {
  return (
    <Panel>
      <div className="overflow-hidden rounded-2xl">
        <div className="h-40 bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-700" />
      </div>
      <div className="mt-3 flex items-center gap-2 text-sm">
        <span className="text-brand-2">📍</span>
        <span className="text-muted">Sorocaba, SP · GPS + EXIF gravados</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {["buffet em sorocaba", "melhor buffet", "google meu negócio"].map((k) => (
          <span key={k} className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[11px] text-muted">{k}</span>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-muted">Otimizada: 2048×1365px · pronta para a galeria</p>
    </Panel>
  );
}

function AvaliacoesVisual() {
  return (
    <Panel>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted">Nota média</p>
          <p className="font-display text-3xl font-bold">4,9 <span className="text-amber-400">★</span></p>
          <p className="text-xs text-muted">128 avaliações · +3 esta semana</p>
        </div>
        <div className="grid h-20 w-20 place-items-center rounded-xl bg-white p-1.5">
          <div className="grid h-full w-full grid-cols-5 grid-rows-5 gap-0.5">
            {Array.from({ length: 25 }).map((_, i) => (
              <div key={i} className={`${[0,1,2,4,5,8,10,12,14,16,18,20,22,24,3,9,15,21].includes(i) ? "bg-neutral-900" : "bg-transparent"} rounded-[1px]`} />
            ))}
          </div>
        </div>
      </div>
      <p className="mt-3 rounded-xl border border-brand/30 bg-brand/5 p-2 text-[11px] text-muted">
        Link e QR code para pedir avaliações aos clientes em segundos.
      </p>
    </Panel>
  );
}

/* ---------- Linha de recurso ---------- */

interface Feature {
  eyebrow: string;
  title: string;
  desc: string;
  bullets: string[];
  href: string;
  visual: ReactNode;
}

const FEATURES: Feature[] = [
  {
    eyebrow: "Desempenho",
    title: "Veja o crescimento, não só os números",
    desc: "Acompanhe visualizações, ligações, rotas e cliques com comparação mês a mês, 3 e 6 meses. Saiba o que está crescendo e onde estão as oportunidades.",
    bullets: ["Comparação de crescimento por período", "Termos de busca e palavras-chave", "Insights automáticos de oportunidade", "Relatório em PDF para o cliente"],
    href: "/desempenho",
    visual: <DesempenhoVisual />,
  },
  {
    eyebrow: "Agendamento",
    title: "Publique no piloto automático",
    desc: "Monte postagens e fotos, programe a data e deixe a publicação automática no perfil. Um calendário mostra tudo o que vai sair — e o que já saiu.",
    bullets: ["Novidades, ofertas e eventos", "Fotos direto na galeria do perfil", "Publicação automática no horário", "Calendário colorido por status"],
    href: "/agendamento",
    visual: <AgendaVisual />,
  },
  {
    eyebrow: "Geotag de fotos",
    title: "Fotos prontas para performar",
    desc: "Otimize as fotos nas specs ideais do Google, com localização, título e palavras-chave — e publique ou agende direto na galeria do perfil.",
    bullets: ["Otimização automática da imagem", "GPS, título e palavras-chave", "Publicar agora ou programar", "Tudo no navegador, privado"],
    href: "/geotag",
    visual: <GeotagVisual />,
  },
  {
    eyebrow: "Avaliações & Reputação",
    title: "Mais avaliações, mais confiança",
    desc: "Acompanhe nota, volume e quando chegou a última avaliação — e peça novas com link e QR code prontos para compartilhar.",
    bullets: ["Total, nota e novas na semana", "Alerta de tempo sem avaliação", "Link e QR code de avaliação", "Checklist completo do perfil"],
    href: "/checklist",
    visual: <AvaliacoesVisual />,
  },
];

export function FeaturesShowcase() {
  return (
    <div className="space-y-24">
      {FEATURES.map((f, i) => (
        <div key={f.title} className="grid items-center gap-10 lg:grid-cols-2">
          <div className={i % 2 === 1 ? "lg:order-2" : ""}>
            <p className="text-sm font-semibold text-brand-2">{f.eyebrow}</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">{f.title}</h2>
            <p className="mt-4 text-muted">{f.desc}</p>
            <ul className="mt-5 space-y-2">
              {f.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 text-brand-2">✓</span>
                  <span className="text-muted">{b}</span>
                </li>
              ))}
            </ul>
            <Link href={f.href} className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">
              Abrir {f.eyebrow.split(" ")[0].toLowerCase()} <span>→</span>
            </Link>
          </div>
          <div className={i % 2 === 1 ? "lg:order-1" : ""}>{f.visual}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Benefícios ---------- */

const BENEFITS = [
  { icon: "🚀", title: "Mais alcance no Google", desc: "Perfil otimizado e ativo aparece mais nas buscas e no Maps." },
  { icon: "⏱️", title: "Economia de tempo", desc: "Agende uma vez e deixe o sistema publicar sozinho, no horário certo." },
  { icon: "📈", title: "Decisões com dados", desc: "Veja o que cresce e o que cai, e aja sobre as oportunidades." },
  { icon: "⭐", title: "Mais avaliações", desc: "Link e QR code prontos para transformar clientes em avaliações." },
  { icon: "🏢", title: "Vários clientes", desc: "Gerencie todos os perfis que você administra num só lugar." },
  { icon: "🔒", title: "Seguro e oficial", desc: "Conexão oficial com o Google, por conta e com sua permissão." },
];

export function BenefitsGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {BENEFITS.map((b) => (
        <div key={b.title} className="rounded-2xl border border-border bg-surface p-5">
          <div className="text-2xl">{b.icon}</div>
          <h3 className="mt-3 font-semibold">{b.title}</h3>
          <p className="mt-1 text-sm text-muted">{b.desc}</p>
        </div>
      ))}
    </div>
  );
}
