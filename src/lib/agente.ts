/**
 * Acesso server-side ao Agente de FAQ Municipal (repo `agente_inteligente`).
 *
 * O navegador nunca fala direto com o agente: as rotas `/api/chat/*` deste app
 * repassam as chamadas. Assim o endereço interno do agente não fica exposto e
 * não há bloqueio de conteúdo misto (hub em HTTPS, agente em HTTP na VPS).
 */

/** URL base do agente, ex.: `http://faq-cache:8000` (rede interna do Coolify). */
export function agenteBaseUrl(): string | null {
  const url = process.env.AGENTE_API_URL?.trim();
  return url ? url.replace(/\/+$/, "") : null;
}

/**
 * IP real do cidadão, para o rate-limit por IP do agente continuar valendo
 * por pessoa (e não para o hub inteiro, que seria um único IP).
 *
 * Usa a entrada MAIS À DIREITA do `X-Forwarded-For`: é a que o proxy reverso
 * na frente do hub (Traefik/Coolify) acrescentou e o cliente não consegue
 * forjar. As entradas à esquerda vêm do próprio cliente.
 */
export function clientIp(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return headers.get("x-real-ip")?.trim() || null;
}

export function agenteIndisponivel(status = 503) {
  return Response.json(
    { detail: "Assistente indisponível no momento. Tente novamente em instantes." },
    { status },
  );
}
