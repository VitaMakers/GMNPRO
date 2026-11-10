/**
 * Geração de respostas de avaliações com IA — Claude (Anthropic) ou ChatGPT (OpenAI).
 * As chaves ficam em variáveis de ambiente (ANTHROPIC_API_KEY / OPENAI_API_KEY).
 * O modelo pode ser trocado por env (CLAUDE_MODEL / OPENAI_MODEL) sem mexer no código.
 */

import Anthropic from "@anthropic-ai/sdk";

export type Provider = "claude" | "openai" | "gemini";

export interface ReplyContext {
  businessName: string;
  keywords: string;
  tone: string;
  signature: string;
  reviewerName: string;
  rating: number; // 1 a 5
  reviewText: string;
}

const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const GEMINI_MODELS = process.env.GEMINI_MODEL
  ? [process.env.GEMINI_MODEL]
  : ["gemini-2.5-flash", "gemini-flash-latest", "gemini-3.8-flash-lite", "gemini-3.8-flash"];

function firstName(name: string): string {
  return (name || "").trim().split(/\s+/)[0] || "";
}

function buildPrompt(c: ReplyContext): { system: string; user: string } {
  const negativa = c.rating > 0 && c.rating <= 3;
  const nome = firstName(c.reviewerName);

  const system = [
    `Você escreve respostas públicas para avaliações do Google Meu Negócio da empresa "${c.businessName}", em português do Brasil.`,
    "Regras importantes:",
    `- Cite o nome de quem avaliou${nome ? ` (${nome})` : ""} de forma natural.`,
    "- VARIE o estilo, a abertura e as palavras a cada resposta; nunca escreva um texto padrão igual para todos.",
    "- Soe humano, próximo e sincero (não robótico, sem exageros de marketing).",
    c.keywords
      ? `- Inclua de forma NATURAL 1 ou 2 destas palavras-chave do negócio, para ajudar na busca, sem forçar: ${c.keywords}.`
      : "- Se fizer sentido, mencione naturalmente o tipo de serviço do negócio.",
    "- Escreva de 2 a 4 frases, direto ao ponto.",
    c.tone ? `- Tom/estilo desejado pelo cliente: ${c.tone}` : "",
    negativa
      ? "- Esta avaliação é NEGATIVA: demonstre empatia, peça desculpas sem ser defensivo, assuma o compromisso de melhorar e convide a pessoa a falar em particular para resolver."
      : "- Esta avaliação é POSITIVA: agradeça com sinceridade e convide a pessoa a voltar.",
    c.signature ? `- Finalize assinando como: ${c.signature}.` : "",
    "Responda APENAS com o texto da resposta, sem aspas e sem explicações.",
  ]
    .filter(Boolean)
    .join("\n");

  const user = `Avaliação de ${c.reviewerName || "um cliente"} — ${c.rating || "?"} de 5 estrelas:\n"${
    c.reviewText || "(sem comentário escrito)"
  }"\n\nEscreva a resposta.`;

  return { system, user };
}

export async function generateReply(provider: Provider, c: ReplyContext): Promise<string> {
  const { system, user } = buildPrompt(c);
  if (provider === "openai") return openaiReply(system, user);
  if (provider === "gemini") return geminiReply(system, user);
  return claudeReply(system, user);
}

async function claudeReply(system: string, user: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("A chave do Claude (ANTHROPIC_API_KEY) não está configurada no ambiente.");
  }
  const client = new Anthropic();
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

async function geminiReply(system: string, user: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("A chave do Gemini (GEMINI_API_KEY) não está configurada no ambiente.");
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

async function openaiReply(system: string, user: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("A chave do ChatGPT (OPENAI_API_KEY) não está configurada no ambiente.");
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
