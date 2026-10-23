import { ocorrencias } from "@/config/prefeitura";
import { clientIp } from "@/lib/agente";
import {
  classificarMidia,
  criarOcorrencia,
  excedeuLimite,
  LIMITE_REQUISICAO,
  LIMITES,
  visaoPublica,
} from "@/lib/ocorrencias";

const erro = (detail: string, status = 422) => Response.json({ detail }, { status });

function texto(form: FormData, campo: string, max: number): string {
  const v = form.get(campo);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function numero(form: FormData, campo: string, min: number, max: number): number | null {
  const n = Number(texto(form, campo, 32));
  return texto(form, campo, 32) !== "" && Number.isFinite(n) && n >= min && n <= max ? n : null;
}

/** POST /api/ocorrencias (multipart/form-data) -> { protocolo, ... } */
export async function POST(request: Request) {
  if (!ocorrencias.habilitado) return erro("Registro de ocorrências desativado.", 404);
  if (excedeuLimite(clientIp(request.headers))) {
    return erro("Muitos registros em pouco tempo. Tente novamente mais tarde.", 429);
  }

  // Recusa corpos grandes antes de o formData() ler tudo para a memória.
  const tamanho = Number(request.headers.get("content-length"));
  if (!Number.isFinite(tamanho) || tamanho <= 0) {
    return erro("Envio sem tamanho declarado.", 411);
  }
  if (tamanho > LIMITE_REQUISICAO) return erro("Envio grande demais.", 413);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return erro("Envio inválido ou grande demais.", 400);
  }

  const categoria = texto(form, "categoria", 40);
  if (!ocorrencias.categorias.some((c) => c.slug === categoria)) {
    return erro("Escolha uma categoria válida.");
  }
  const descricao = texto(form, "descricao", LIMITES.descricao);
  const referencia = texto(form, "referencia", 300);
  const lat = numero(form, "lat", -90, 90);
  const lng = numero(form, "lng", -180, 180);
  if (descricao.length < 5 && !referencia && lat === null) {
    return erro("Descreva o problema ou informe o local.");
  }
  if (lat === null && referencia.length < 5) {
    return erro("Informe o local: use o GPS ou escreva um ponto de referência.");
  }

  const nome = texto(form, "nome", 120);
  const telefone = texto(form, "telefone", 30);
  const email = texto(form, "email", 160);

  // Mídias: até N fotos, 1 vídeo e 1 áudio, com tamanho máximo por tipo.
  const arquivos: { mime: string; conteudo: Buffer }[] = [];
  const contagem = { foto: 0, video: 0, audio: 0 };
  for (const item of form.getAll("midias")) {
    if (!(item instanceof File) || item.size === 0) continue;
    const info = classificarMidia(item.type);
    if (!info) return erro(`Formato de arquivo não aceito: ${item.type || "desconhecido"}.`);
    const max = { foto: LIMITES.fotoBytes, video: LIMITES.videoBytes, audio: LIMITES.audioBytes }[info.tipo];
    if (item.size > max) return erro(`Arquivo grande demais (${info.tipo}).`, 413);
    contagem[info.tipo]++;
    if (contagem.foto > LIMITES.fotos || contagem.video > 1 || contagem.audio > 1) {
      return erro(`Envie até ${LIMITES.fotos} fotos, 1 vídeo e 1 áudio.`);
    }
    arquivos.push({ mime: item.type, conteudo: Buffer.from(await item.arrayBuffer()) });
  }

  const oc = await criarOcorrencia(
    {
      categoria,
      descricao,
      localizacao: { lat, lng, precisao: numero(form, "precisao", 0, 100_000), referencia },
      contato: nome || telefone || email ? { nome, telefone, email } : null,
    },
    arquivos,
  );
  return Response.json(visaoPublica(oc), { status: 201 });
}
