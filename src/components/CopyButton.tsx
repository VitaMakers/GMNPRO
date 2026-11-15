"use client";

import { useState } from "react";

export default function CopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          /* ignora */
        }
      }}
      className="shrink-0 rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
    >
      {done ? "Copiado ✓" : label}
    </button>
  );
}
