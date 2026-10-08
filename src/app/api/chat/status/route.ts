import { agenteBaseUrl } from "@/lib/agente";

// Lido a cada requisição: AGENTE_API_URL é configurada em runtime, não no build.
export const dynamic = "force-dynamic";

/**
 * GET /api/chat/status  ->  {disponivel}
 *
 * Diz ao widget se este deploy tem agente configurado, sem chamar o agente
 * (é consultado em toda visita ao hub). Sem agente, o botão do chat não aparece.
 */
export function GET() {
  return Response.json({ disponivel: agenteBaseUrl() !== null });
}
