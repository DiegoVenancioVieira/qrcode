import { cookies } from "next/headers";
import { COOKIE_ADMIN, tokenConfere } from "@/lib/ocorrencias";

/** Confere o cookie do painel; usado pelas rotas /api/admin/*. */
export async function adminAutenticado(): Promise<boolean> {
  const valor = (await cookies()).get(COOKIE_ADMIN)?.value;
  return tokenConfere(valor ? decodeURIComponent(valor) : null);
}

export const naoAutorizado = () =>
  Response.json({ detail: "Não autorizado." }, { status: 401 });
