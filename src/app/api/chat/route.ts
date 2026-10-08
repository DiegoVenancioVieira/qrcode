import { agenteBaseUrl, agenteIndisponivel, clientIp } from "@/lib/agente";

// O LLM do agente roda em CPU: uma resposta nova leva de 5 a 20 s, e mais sob fila.
const TIMEOUT_MS = 150_000;
const SLUG_RE = /^[a-z0-9_-]{1,40}$/;

/** POST /api/chat  {question, secretaria}  ->  repassa para POST {agente}/ask */
export async function POST(request: Request) {
  const base = agenteBaseUrl();
  if (!base) return agenteIndisponivel();

  let body: { question?: unknown; secretaria?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ detail: "JSON inválido" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return Response.json({ detail: "JSON inválido" }, { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  const secretaria = typeof body.secretaria === "string" ? body.secretaria : "";
  if (question.length < 2 || question.length > 1000) {
    return Response.json(
      { detail: "A pergunta deve ter entre 2 e 1000 caracteres." },
      { status: 422 },
    );
  }
  if (secretaria && !SLUG_RE.test(secretaria)) {
    return Response.json({ detail: "Secretaria inválida" }, { status: 422 });
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const ip = clientIp(request.headers);
  if (ip) headers["X-Forwarded-For"] = ip;

  let r: Response;
  try {
    r = await fetch(`${base}/ask`, {
      method: "POST",
      headers,
      body: JSON.stringify({ question, secretaria: secretaria || null }),
      // Se o cidadão fechar o chat ou trocar de secretaria, cancela também no agente.
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(TIMEOUT_MS)]),
      cache: "no-store",
    });
  } catch {
    return agenteIndisponivel(504);
  }

  // 429 (rate-limit) e 404 (secretaria desconhecida) chegam ao widget como estão;
  // demais falhas viram 502 genérico, sem vazar detalhes internos.
  if (r.status === 429 || r.status === 404) {
    return Response.json(await r.json().catch(() => ({})), { status: r.status });
  }
  if (!r.ok) return agenteIndisponivel(502);

  let data: { answer?: unknown; cached?: unknown };
  try {
    data = await r.json();
  } catch {
    return agenteIndisponivel(502);
  }
  if (typeof data !== "object" || data === null) return agenteIndisponivel(502);
  return Response.json({ answer: String(data.answer ?? ""), cached: Boolean(data.cached) });
}
