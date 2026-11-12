"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type IconProps = { className?: string };

function IDesempenho({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 3v18h18" />
      <rect x="7" y="11" width="3" height="6" />
      <rect x="12.5" y="7" width="3" height="10" />
      <rect x="18" y="13" width="0.01" height="4" />
      <rect x="17.5" y="9" width="3" height="8" />
    </svg>
  );
}
function IGeotag({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
function IAgenda({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M3 9h18M8 2.5v4M16 2.5v4" />
    </svg>
  );
}
function IAvaliacoes({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5Z" />
    </svg>
  );
}
function IChecklist({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.2l2.3 2.3 4.7-4.7" />
    </svg>
  );
}
function IAuditoria({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}
function ILocais({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="7" height="7" rx="1.5" /><rect x="14" y="4" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function IRanking({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
      <path d="M4.5 16.5c-.9.5-1.5 1.1-1.5 1.8C3 19.8 7 21 12 21s9-1.2 9-2.7c0-.7-.6-1.3-1.5-1.8" />
    </svg>
  );
}
function ISuporte({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 11.5a8.5 8.5 0 1 0-3.4 6.8L21 19l-.9-3a8.4 8.4 0 0 0 .9-4.5Z" />
      <path d="M9 10.5c0-1.4 1.2-2.5 3-2.5s3 1 3 2.4c0 2-2.6 2.1-2.6 3.9M12 17h.01" />
    </svg>
  );
}
function IAdmin({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2.5l8 3.5v5c0 5-3.5 8.5-8 10.5-4.5-2-8-5.5-8-10.5v-5l8-3.5Z" />
      <path d="M9.3 12l1.9 1.9 3.6-3.8" />
    </svg>
  );
}

const ITEMS = [
  { href: "/desempenho", label: "Desempenho", Icon: IDesempenho },
  { href: "/geotag", label: "Geotag", Icon: IGeotag },
  { href: "/agendamento", label: "Agendamentos", Icon: IAgenda },
  { href: "/avaliacoes", label: "Avaliações", Icon: IAvaliacoes },
  { href: "/checklist", label: "Análise Completa", Icon: IChecklist },
  { href: "/auditoria", label: "Auditoria", Icon: IAuditoria },
  { href: "/suporte", label: "Suporte", Icon: ISuporte },
];

export default function AppSidebar({ isAdmin, isAgency = false }: { isAdmin: boolean; isAgency?: boolean }) {
  const pathname = usePathname();
  const items = [
    ...ITEMS,
    ...(isAgency
      ? [
          { href: "/ranking", label: "Análise de Ranking", Icon: IRanking },
          { href: "/locais", label: "Gestão de Locais", Icon: ILocais },
        ]
      : []),
    ...(isAdmin ? [{ href: "/admin", label: "Admin", Icon: IAdmin }] : []),
  ];

  return (
    <nav className="fixed left-5 top-1/2 z-30 hidden -translate-y-1/2 min-[1320px]:block">
      <div className="flex flex-col items-center gap-1.5 rounded-full border border-border bg-white p-2 card-soft">
        {items.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              title={label}
              aria-label={label}
              className={`group relative grid h-12 w-12 place-items-center rounded-full transition ${
                active ? "bg-brand/12 text-brand-2" : "text-muted hover:bg-surface-2 hover:text-foreground"
              }`}
            >
              <Icon className="h-[22px] w-[22px]" />
              <span className="pointer-events-none absolute left-14 z-10 hidden whitespace-nowrap rounded-lg bg-foreground px-2 py-1 text-xs font-medium text-white group-hover:block">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
