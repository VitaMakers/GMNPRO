import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Proxy da foto do Places: recebe o "name" da foto e redireciona para a
 *  imagem real, sem expor a chave da API no navegador. */
export async function GET(request: Request) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const name = new URL(request.url).searchParams.get("name");
  if (!key || !name || !/^places\/[^/]+\/photos\/[^/]+$/.test(name)) {
    return NextResponse.json({ error: "invalido" }, { status: 400 });
  }
  const res = await fetch(
    `https://places.googleapis.com/v1/${name}/media?maxHeightPx=400&maxWidthPx=600&skipHttpRedirect=true&key=${key}`,
  );
  if (!res.ok) return NextResponse.json({ error: "falha" }, { status: 502 });
  const data = (await res.json()) as { photoUri?: string };
  if (!data.photoUri) return NextResponse.json({ error: "sem_foto" }, { status: 404 });
  return NextResponse.redirect(data.photoUri);
}
