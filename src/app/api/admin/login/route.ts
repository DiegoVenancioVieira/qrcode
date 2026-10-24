import { COOKIE_ADMIN, tokenAdmin, tokenConfere } from "@/lib/ocorrencias";

/** POST {token} -> grava cookie httpOnly do painel. DELETE -> sai. */
export async function POST(request: Request) {
  if (!tokenAdmin()) {
    return Response.json({ detail: "Painel desativado: defina OCORRENCIAS_ADMIN_TOKEN." }, { status: 503 });
  }
  const body = await request.json().catch(() => ({}));
  if (!tokenConfere(typeof body?.token === "string" ? body.token : null)) {
    return Response.json({ detail: "Token inválido." }, { status: 401 });
  }
  const seguro = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return new Response(null, {
    status: 204,
    headers: {
      "Set-Cookie": `${COOKIE_ADMIN}=${encodeURIComponent(body.token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=43200${seguro}`,
    },
  });
}

export async function DELETE() {
  return new Response(null, {
    status: 204,
    headers: { "Set-Cookie": `${COOKIE_ADMIN}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0` },
  });
}
