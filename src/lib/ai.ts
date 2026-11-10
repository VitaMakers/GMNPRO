/**
 * Geração de respostas de avaliações com IA — Claude (Anthropic) ou ChatGPT (OpenAI).
 * As chaves ficam em variáveis de ambiente (ANTHROPIC_API_KEY / OPENAI_API_KEY).
 * O modelo pode ser trocado por env (CLAUDE_MODEL / OPENAI_MODEL) sem mexer no código.
 */

import Anthropic from "@anthropic-ai/sdk";

export type Provider = "claude" | "openai" | "gemini" | "groq";

export interface ReplyExample {
  review: string;
  reply: string;
}

export interface ReplyContext {
  businessName: string;
  keywords: string;
  tone: string;
  signature: string;
  reviewerName: string;
  rating: number; // 1 a 5
  reviewText: string;
  examples?: ReplyExample[];
  bannedWords?: string;
  avoid?: string[]; // respostas recentes já publicadas, para não repetir
}

const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const GEMINI_MODELS = process.env.GEMINI_MODEL
  ? [process.env.GEMINI_MODEL]
  : ["gemini-2.5-flash", "gemini-flash-latest", "gemini-3.8-flash-lite", "gemini-3.8-flash"];
const GROQ_MODELS = process.env.GROQ_MODEL
  ? [process.env.GROQ_MODEL]
  : ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"];

function firstName(name: string): string {
  return (name || "").trim().split(/\s+/)[0] || "";
}

function buildPrompt(c: ReplyContext): { system: string; user: string } {
  const negativa = c.rating > 0 && c.rating <= 3;
  const nome = firstName(c.reviewerName);
  const temTexto = (c.reviewText ?? "").trim().length > 0;

  const lines = [
    `Você escreve a resposta pública do DONO da empresa "${c.businessName}" a uma avaliação no Google, em português do Brasil.`,
    "",
    "COMO RESPONDER:",
    "- Leia a avaliação e responda ao que a pessoa REALMENTE escreveu. Nunca invente nem diga que ela elogiou/comentou algo que ela não falou.",
    nome ? `- Chame a pessoa pelo nome (${nome}) de forma natural.` : "- Se não souber o nome, não invente um.",
    temTexto
      ? "- Comente de forma específica algo que a pessoa mencionou no texto, mostrando que leu de verdade."
      : "- A pessoa NÃO escreveu texto (só deu a nota). Agradeça de forma simples e calorosa, SEM supor o motivo nem dizer o que ela teria gostado.",
    "- Soe humano e sincero; evite clichês e frases de marketing genéricas.",
    "- Varie MUITO de uma resposta para outra: abertura, estrutura e vocabulário diferentes. Nunca comece sempre do mesmo jeito (ex.: não abrir toda resposta com 'Obrigado, [nome]!'). Duas respostas NÃO podem ficar parecidas (nada de 90% igual).",
    "- Escreva de 2 a 4 frases.",
    c.keywords
      ? `- As palavras-chave a seguir são do NEGÓCIO (NÃO são o que a pessoa disse): ${c.keywords}. Use no máximo UMA, e só se couber com total naturalidade e verdade (por exemplo, numa despedida). É PROIBIDO atribuir à pessoa algo que ela não escreveu. Se não encaixar com verdade, não use nenhuma palavra-chave.`
      : "",
    c.bannedWords
      ? `- PROIBIDO usar estas palavras ou expressões (o cliente não quer): ${c.bannedWords}. Use sinônimos ou reescreva a frase sem elas.`
      : "",
    c.tone ? `- Tom/estilo desejado pelo cliente: ${c.tone}` : "",
    negativa
      ? "- Avaliação NEGATIVA: demonstre empatia, peça desculpas com sinceridade (sem ser defensivo), assuma o compromisso de melhorar e convide a pessoa a falar em particular para resolver."
      : "- Avaliação POSITIVA: agradeça com sinceridade.",
    c.signature ? `- Finalize assinando como: ${c.signature}.` : "",
  ];

  const examples = (c.examples ?? []).filter((e) => e.review?.trim() && e.reply?.trim());
  if (examples.length) {
    lines.push(
      "",
      "EXEMPLOS DE COMO O CLIENTE COSTUMA RESPONDER — imite ESTE tom, estilo e vocabulário (não copie o conteúdo, só o jeito de falar):",
    );
    examples.forEach((e, i) => {
      lines.push(`Exemplo ${i + 1}:\n  Avaliação: "${e.review.trim()}"\n  Resposta do cliente: "${e.reply.trim()}"`);
    });
  }

  const avoid = (c.avoid ?? []).map((a) => (a ?? "").trim()).filter(Boolean).slice(0, 6);
  if (avoid.length) {
    lines.push(
      "",
      "RESPOSTAS RECENTES JÁ PUBLICADAS — escreva algo CLARAMENTE diferente destas (outra abertura, outra estrutura, outras palavras); não repita as mesmas frases:",
    );
    avoid.forEach((a) => lines.push(`- "${a}"`));
  }

  lines.push("", "Responda APENAS com o texto da resposta, sem aspas e sem comentários.");

  const system = lines.filter((l) => l !== null && l !== undefined).join("\n");
  const user = `Avaliação de ${c.reviewerName || "um cliente"} — ${c.rating || "?"} de 5 estrelas:\n"${
    c.reviewText || "(sem comentário escrito)"
  }"\n\nEscreva a resposta.`;

  return { system, user };
}

export async function generateReply(
  provider: Provider,
  c: ReplyContext,
  apiKey?: string,
): Promise<string> {
  const { system, user } = buildPrompt(c);
  return complete(provider, system, user, apiKey?.trim() || undefined);
}

async function complete(
  provider: Provider,
  system: string,
  user: string,
  apiKey?: string,
): Promise<string> {
  if (provider === "openai") return openaiReply(system, user, apiKey);
  if (provider === "gemini") return geminiReply(system, user, apiKey);
  if (provider === "groq") return groqReply(system, user, apiKey);
  return claudeReply(system, user, apiKey);
}

export interface GeotagMeta {
  title: string;
  description: string;
  keywords: string;
}

/** Gera metadados fortes (SEO local) para fotos do Google Meu Negócio. */
export async function generateGeotagMeta(
  provider: Provider,
  input: { city: string; niche: string; keywords: string; count: number },
  apiKey?: string,
): Promise<GeotagMeta[]> {
  const count = Math.max(1, Math.min(input.count || 1, 8));
  const system =
    "Você é especialista em SEO local para o Google Meu Negócio (Google Business Profile). Cria metadados de fotos que ajudam o perfil a ranquear e a atrair mais clientes.";
  const user = [
    `Gere ${count} conjuntos DIFERENTES de metadados para ${count} foto(s) de uma empresa.`,
    input.niche ? `Segmento/negócio: ${input.niche}.` : "",
    input.city ? `Cidade: ${input.city}.` : "",
    input.keywords ? `Palavras-chave que o cliente quer aparecer: ${input.keywords}.` : "",
    "Para CADA foto, escreva:",
    "- title: curto (até ~60 caracteres), com a palavra-chave principal e a cidade.",
    "- description: 2 a 3 frases naturais e envolventes, destacando o serviço, um benefício real e a localização; use as palavras-chave de forma fluida, sem encher de repetição.",
    "- keywords: 6 a 8 termos de busca local reais, separados por vírgula (variações do serviço + cidade + 'perto de mim', etc.).",
    "VARIE bastante entre as fotos (aberturas e termos diferentes). Escreva em português do Brasil.",
    'Responda APENAS com um array JSON válido, sem nada fora dele: [{"title":"...","description":"...","keywords":"..."}]',
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await complete(provider, system, user, apiKey);
  return extractJsonArray(raw)
    .map((x) => ({
      title: String(x?.title ?? "").trim(),
      description: String(x?.description ?? "").trim(),
      keywords: String(x?.keywords ?? "").trim(),
    }))
    .filter((x) => x.title || x.description);
}

function extractJsonArray(text: string): Record<string, unknown>[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(text.slice(start, end + 1));
      if (Array.isArray(parsed)) return parsed as Record<string, unknown>[];
    } catch {
      /* ignora JSON malformado */
    }
  }
  return [];
}

async function claudeReply(system: string, user: string, apiKey?: string): Promise<string> {
  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error("A chave do Claude (ANTHROPIC_API_KEY) não está configurada.");
  }
  const client = new Anthropic({ apiKey: key });
  const res = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system,
    messages: [{ role: "user", content: user }],
  });
  let text = "";
  for (const block of res.content) {
    if (block.type === "text") text += block.text;
  }
  text = text.trim();
  if (!text) throw new Error("A IA (Claude) não retornou texto.");
  return text;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function geminiReply(system: string, user: string, apiKey?: string): Promise<string> {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("A chave do Gemini (GEMINI_API_KEY) não está configurada.");
  }
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: { temperature: 0.9, maxOutputTokens: 1024 },
  });

  let overloaded = false;
  let lastErr = "";

  // Tenta vários modelos do Gemini em sequência: se um estiver indisponível
  // (404) ou sobrecarregado (503/429/500), passa para o próximo — os modelos
  // estáveis/"lite" costumam ter mais capacidade no plano gratuito.
  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (res.ok) {
        const data = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const text = (data.candidates?.[0]?.content?.parts ?? [])
          .map((p) => p.text ?? "")
          .join("")
          .trim();
        if (text) return text;
        lastErr = `${model}: resposta vazia`;
        break;
      }
      lastErr = `${model} ${res.status}: ${await res.text()}`;
      if (res.status === 404) break; // modelo não existe aqui — tenta o próximo
      if ([429, 500, 503].includes(res.status)) {
        overloaded = true;
        if (attempt < 1) {
          await sleep(1000);
          continue; // tenta o mesmo modelo mais uma vez
        }
        break; // passa para o próximo modelo
      }
      break; // outro erro — tenta o próximo modelo
    }
  }

  throw new Error(
    overloaded
      ? "O Gemini (grátis) está sobrecarregado agora. Tente de novo em instantes — ou configure o perfil para usar Claude/ChatGPT."
      : `Gemini: ${lastErr}`,
  );
}

async function groqReply(system: string, user: string, apiKey?: string): Promise<string> {
  const key = apiKey || process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error("A chave do Groq (GROQ_API_KEY) não está configurada.");
  }
  const payload = (model: string) =>
    JSON.stringify({
      model,
      temperature: 0.9,
      max_tokens: 1024,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

  let lastErr = "";
  for (const model of GROQ_MODELS) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: payload(model),
    });
    if (res.ok) {
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content?.trim();
      if (text) return text;
      lastErr = `${model}: resposta vazia`;
      continue;
    }
    lastErr = `${model} ${res.status}: ${await res.text()}`;
    if ([404, 429, 500, 503].includes(res.status)) continue; // tenta o próximo modelo
    break;
  }
  throw new Error(`Groq: ${lastErr}`);
}

async function openaiReply(system: string, user: string, apiKey?: string): Promise<string> {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("A chave do ChatGPT (OPENAI_API_KEY) não está configurada.");
  }
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.9,
      max_tokens: 1024,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("A IA (ChatGPT) não retornou texto.");
  return text;
}
