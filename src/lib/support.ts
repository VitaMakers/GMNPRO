// Número de WhatsApp do suporte GMN PRO.
// Formato internacional só com dígitos: 55 (Brasil) + DDD + número.
export const SUPPORT_WHATSAPP = "5515991876671";

export const SUPPORT_EMAIL = "contato@vitamakers.com.br";

export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${SUPPORT_WHATSAPP}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

// Número formatado para exibição: +55 (15) 99999-9999
export function supportWhatsappDisplay(): string {
  const d = SUPPORT_WHATSAPP;
  if (d.length < 12) return d;
  const ddd = d.slice(2, 4);
  const rest = d.slice(4);
  const mid = rest.length > 8 ? rest.slice(0, rest.length - 4) : rest.slice(0, 4);
  const end = rest.slice(-4);
  return `+55 (${ddd}) ${mid}-${end}`;
}
