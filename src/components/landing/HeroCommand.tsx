"use client";

import { useEffect, useState } from "react";

const CHIP_SETS = [
  ["Agendar um post", "Responder avaliações", "Otimizar fotos"],
  ["Pedir avaliações", "Ver meu desempenho", "Checklist do perfil"],
  ["Publicar uma oferta", "Responder com IA", "Auditar um perfil"],
];

export default function HeroCommand() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % CHIP_SETS.length), 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-[2rem] p-6 sm:p-12">
      <div className="mesh" aria-hidden />
      <div className="relative">
        {/* Barra de comando (mockup) */}
        <div className="mx-auto flex max-w-2xl items-center gap-3 rounded-full bg-white px-5 py-4 card-soft">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border text-lg text-muted">
            +
          </span>
          <span className="flex-1 truncate text-left text-sm text-muted sm:text-base">
            O que você quer melhorar hoje no seu Google?
          </span>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-foreground text-white">
            ↑
          </span>
        </div>

        {/* Chips que trocam */}
        <div key={i} className="fadeup mt-5 flex flex-wrap justify-center gap-2.5">
          {CHIP_SETS[i].map((c) => (
            <span
              key={c}
              className="rounded-full bg-white/95 px-4 py-2 text-sm font-medium text-foreground card-soft"
            >
              {c}
            </span>
          ))}
        </div>

        <p className="mt-6 text-center text-xs font-medium text-emerald-900/50">
          Escolha uma ação e veja o sistema trabalhar por você.
        </p>
      </div>
    </div>
  );
}
