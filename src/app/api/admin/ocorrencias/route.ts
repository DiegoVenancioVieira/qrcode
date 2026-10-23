import { adminAutenticado, naoAutorizado } from "@/lib/admin";
import { listarOcorrencias } from "@/lib/ocorrencias";

/** GET -> todas as ocorrências (mais recentes primeiro), com contato e GPS. */
export async function GET() {
  if (!(await adminAutenticado())) return naoAutorizado();
  return Response.json({ ocorrencias: await listarOcorrencias() });
}
