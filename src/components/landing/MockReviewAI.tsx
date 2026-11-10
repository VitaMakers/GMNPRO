"use client";

import { useEffect, useState } from "react";

const ITEMS = [
  {
    reviewer: "Wendler Santos",
    photo: "/reviews/wendler.jpg",
    stars: 5,
    text: "Lugar muito top, ótimo serviço e profissionais excelentes!",
    reply:
      "Que alegria, Wendler! Muito obrigado pela confiança — nossa equipe se dedica para deixar tudo impecável. Esperamos você de novo em breve!",
  },
  {
    reviewer: "Ana Prado",
    photo: "/reviews/ana.jpg",
    stars: 5,
    text: "Atendimento maravilhoso, super atenciosos do início ao fim.",
    reply:
      "Obrigado, Ana! Ficamos muito felizes que se sentiu bem atendida. Volte sempre, será um prazer te receber de novo!",
  },
];

export default function MockReviewAI() {
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const full = ITEMS[idx].reply;
    setTyped("");
    setDone(false);
    let i = 0;
    const type = setInterval(() => {
      i++;
      setTyped(full.slice(0, i));
      if (i >= full.length) {
        clearInterval(type);
        setDone(true);
        setTimeout(() => setIdx((x) => (x + 1) % ITEMS.length), 2800);
      }
    }, 26);
    return () => clearInterval(type);
  }, [idx]);

  const r = ITEMS[idx];

  return (
    <div className="rounded-3xl border border-border bg-white p-5 card-soft">
      <div className="rounded-2xl bg-surface-2 p-4">
        <div className="flex items-center gap-2.5">
          <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-surface-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={r.photo} alt={r.reviewer} className="h-full w-full object-cover" />
          </span>
          <div>
            <p className="text-sm font-semibold">{r.reviewer}</p>
            <p className="text-sm leading-none text-accent">{"★★★★★".slice(0, r.stars)}</p>
          </div>
          <span className="ml-auto rounded-md bg-white px-2 py-1 text-[10px] font-medium text-muted">
            Google
          </span>
        </div>
        <p className="mt-2.5 text-sm text-muted">{r.text}</p>
      </div>

      <div className="mt-3 rounded-2xl border border-brand/30 bg-brand/5 p-4">
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-brand-2">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-2" />
          Resposta gerada pela IA · no seu tom
        </p>
        <p className={`min-h-[3.5rem] text-sm leading-relaxed ${done ? "" : "caret"}`}>{typed}</p>
      </div>

      <button className="mt-3 w-full rounded-xl bg-foreground py-2.5 text-sm font-semibold text-white">
        Enviar resposta
      </button>
    </div>
  );
}
