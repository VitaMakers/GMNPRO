/** Mensagens de reengajamento para quem testou o GMN Profile e não assinou. */

const BRAND = "GMN Profile";

function hi(name?: string): string {
  const n = (name ?? "").trim();
  return n ? `Oi, ${n}!` : "Oi!";
}

/** Texto curto para WhatsApp (sem HTML). */
export function winbackWhatsappText(name: string | undefined, assinarUrl: string): string {
  return (
    `${hi(name)} Aqui é do ${BRAND}. 👋\n\n` +
    `Seu período de teste terminou e sua conta ficou *pausada*. ` +
    `Pra voltar a aparecer em 1º no Google, responder avaliações com IA e agendar seus posts no automático, ` +
    `é só reativar:\n\n${assinarUrl}\n\n` +
    `Qualquer dúvida, pode responder por aqui. 💙`
  );
}

/** E-mail (HTML simples e responsivo, sem dependências). */
export function winbackEmailHtml(name: string | undefined, assinarUrl: string): string {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f7fb;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0A2149">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px">
    <div style="background:#fff;border-radius:16px;padding:28px;box-shadow:0 6px 24px rgba(10,33,73,.08)">
      <h1 style="margin:0 0 12px;font-size:22px;color:#0A2149">${hi(name)}</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6">
        Seu período de teste no <strong>${BRAND}</strong> terminou e sua conta ficou <strong>pausada</strong>.
        Seus dados estão guardados — é só reativar para continuar de onde parou.
      </p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6">
        Com a assinatura ativa você volta a:
      </p>
      <ul style="margin:0 0 24px;padding-left:18px;font-size:15px;line-height:1.8">
        <li>Aparecer em <strong>1º no Google</strong> da sua região</li>
        <li>Responder avaliações com <strong>IA</strong>, no automático</li>
        <li>Agendar e publicar <strong>posts</strong> sem esforço</li>
      </ul>
      <a href="${assinarUrl}" style="display:inline-block;background:#22C7B8;color:#04121a;text-decoration:none;font-weight:700;font-size:16px;padding:14px 26px;border-radius:999px">Reativar minha conta</a>
      <p style="margin:22px 0 0;font-size:13px;color:#5b6b85">Se preferir, responda este e-mail que a gente te ajuda. 💙</p>
    </div>
    <p style="text-align:center;color:#9aa7bd;font-size:12px;margin:16px 0 0">${BRAND}</p>
  </div>
</body></html>`;
}

export const WINBACK_EMAIL_SUBJECT = `Seu teste do ${BRAND} terminou — reative e volte ao topo do Google`;
