import { adminAutenticado, naoAutorizado } from "@/lib/admin";
import { atualizarStatus, STATUS, type Status } from "@/lib/ocorrencias";

/** PATCH {status, nota?} -> muda a situação e registra no histórico. */
export async function PATCH(request: Request, ctx: { params: Promise<{ protocolo: string }> }) {
  if (!(await adminAutenticado())) return naoAutorizado();
  const { protocolo } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  if (!(body?.status in STATUS)) {
    return Response.json({ detail: "Status inválido." }, { status: 422 });
  }
  const nota = typeof body.nota === "string" ? body.nota.trim().slice(0, 500) : undefined;
  const oc = await atualizarStatus(protocolo, body.status as Status, nota || undefined);
  if (!oc) return Response.json({ detail: "Protocolo não encontrado." }, { status: 404 });
  return Response.json(oc);
}
