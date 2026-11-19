/**
 * Envio de WhatsApp — provedor PLUGÁVEL.
 *
 * Enquanto nenhum provedor estiver configurado (sem WHATSAPP_PROVIDER), nada é
 * enviado: sendWhatsapp retorna { sent:false, skipped:true } e o restante do
 * sistema segue funcionando normalmente. Para ligar, defina as variáveis de
 * ambiente do provedor escolhido (ver abaixo). Assim dá para decidir o provedor
 * depois, sem mexer no código que chama esta função.
 *
 * Provedores suportados (WHATSAPP_PROVIDER):
 *  - "meta"  → WhatsApp Cloud API oficial. Requer:
 *        WHATSAPP_META_TOKEN        (token permanente)
 *        WHATSAPP_META_PHONE_ID     (ID do número remetente)
 *        WHATSAPP_META_TEMPLATE     (nome do template aprovado; opcional —
 *                                    sem ele tenta mensagem de texto simples,
 *                                    que só funciona dentro da janela de 24h)
 *        WHATSAPP_META_LANG         (idioma do template; padrão "pt_BR")
 *  - "zapi"  → Z-API (não-oficial, popular no Brasil). Requer:
 *        ZAPI_INSTANCE, ZAPI_TOKEN, ZAPI_CLIENT_TOKEN (opcional)
 */

export type WhatsappResult = { sent: boolean; skipped?: boolean; error?: string };

export function whatsappConfigured(): boolean {
  return !!process.env.WHATSAPP_PROVIDER;
}

/** Normaliza o telefone para só dígitos (com DDI/DDD), ex.: "5515999998888". */
export function normalizePhone(raw: string): string {
  return (raw ?? "").replace(/\D/g, "");
}

export async function sendWhatsapp(opts: { to: string; text: string }): Promise<WhatsappResult> {
  const provider = process.env.WHATSAPP_PROVIDER;
  const to = normalizePhone(opts.to);
  if (!provider) return { sent: false, skipped: true };
  if (!to) return { sent: false, error: "telefone_invalido" };
  try {
    if (provider === "meta") return await sendViaMeta(to, opts.text);
    if (provider === "zapi") return await sendViaZapi(to, opts.text);
    return { sent: false, error: `provedor_desconhecido:${provider}` };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "erro" };
  }
}

async function sendViaMeta(to: string, text: string): Promise<WhatsappResult> {
  const token = process.env.WHATSAPP_META_TOKEN;
  const phoneId = process.env.WHATSAPP_META_PHONE_ID;
  if (!token || !phoneId) return { sent: false, error: "meta_sem_credenciais" };
  const template = process.env.WHATSAPP_META_TEMPLATE;
  const lang = process.env.WHATSAPP_META_LANG || "pt_BR";

  const body = template
    ? {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: template,
          language: { code: lang },
          components: [{ type: "body", parameters: [{ type: "text", text }] }],
        },
      }
    : { messaging_product: "whatsapp", to, type: "text", text: { body: text } };

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return { sent: false, error: `meta_http_${res.status}` };
  return { sent: true };
}

async function sendViaZapi(to: string, text: string): Promise<WhatsappResult> {
  const instance = process.env.ZAPI_INSTANCE;
  const token = process.env.ZAPI_TOKEN;
  if (!instance || !token) return { sent: false, error: "zapi_sem_credenciais" };
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.ZAPI_CLIENT_TOKEN) headers["Client-Token"] = process.env.ZAPI_CLIENT_TOKEN;
  const res = await fetch(`https://api.z-api.io/instances/${instance}/token/${token}/send-text`, {
    method: "POST",
    headers,
    body: JSON.stringify({ phone: to, message: text }),
  });
  if (!res.ok) return { sent: false, error: `zapi_http_${res.status}` };
  return { sent: true };
}
