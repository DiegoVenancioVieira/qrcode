import { adminAutenticado, naoAutorizado } from "@/lib/admin";
import { lerMidia } from "@/lib/ocorrencias";

/** GET -> arquivo de mídia da ocorrência (só para o painel). */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ protocolo: string; nome: string }> },
) {
  if (!(await adminAutenticado())) return naoAutorizado();
  const { protocolo, nome } = await ctx.params;
  const arq = await lerMidia(protocolo, nome);
  if (!arq) return Response.json({ detail: "Arquivo não encontrado." }, { status: 404 });
  return new Response(new Uint8Array(arq.conteudo), {
    headers: {
      "Content-Type": arq.midia.mime,
      "Content-Length": String(arq.conteudo.length),
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
