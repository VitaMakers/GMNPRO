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
    "- Varie a abertura e as palavras; nunca use um texto padrão igual para todos.",
    "- Escreva de 2 a 4 frases.",
    c.keywords
      ? `- As palavras-chave a seguir são do NEGÓCIO (NÃO são o que a pessoa disse): ${c.keywords}. Use no máximo UMA, e só se couber com total naturalidade e verdade (por exemplo, numa despedida). É PROIBIDO atribuir à pessoa algo que ela não escreveu. Se não encaixar com verdade, não use nenhuma palavra-chave.`
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
  const key = apiKey?.trim() || undefined;
  if (provider === "openai") return openaiReply(system, user, key);
  if (provider === "gemini") return geminiReply(system, user, key);
  if (provider === "groq") return groqReply(system, user, key);
  return claudeReply(system, user, key);
}

async function claudeReply(system: string, user: string, apiKey?: string): Promise<string> {
  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error("A chave do Claude (ANTHROPIC_API_KEY) não está configurada.");
  }
  const client = new Anthropic({ apiKey: key });
  const res = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 800,
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
    generationConfig: { temperature: 0.9, maxOutputTokens: 400 },
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
      max_tokens: 400,
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
      max_tokens: 400,
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
