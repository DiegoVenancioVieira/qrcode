import { lerOcorrencia, visaoPublica } from "@/lib/ocorrencias";

/** GET /api/ocorrencias/:protocolo -> situação pública do registro. */
export async function GET(_req: Request, ctx: { params: Promise<{ protocolo: string }> }) {
  const { protocolo } = await ctx.params;
  const oc = await lerOcorrencia(protocolo.trim().toUpperCase());
  if (!oc) return Response.json({ detail: "Protocolo não encontrado." }, { status: 404 });
  return Response.json(visaoPublica(oc));
}
