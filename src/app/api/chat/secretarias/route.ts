import { agenteBaseUrl, agenteIndisponivel } from "@/lib/agente";

// Sem isso o Next pré-renderiza a rota no build, quando o agente não está acessível.
export const dynamic = "force-dynamic";

/** GET /api/chat/secretarias  ->  repassa para GET {agente}/secretarias */
export async function GET() {
  const base = agenteBaseUrl();
  if (!base) return agenteIndisponivel();

  try {
    const r = await fetch(`${base}/secretarias`, {
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!r.ok) return agenteIndisponivel(502);
    return Response.json(await r.json());
  } catch {
    return agenteIndisponivel(504);
  }
}
