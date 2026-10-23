import { randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Armazenamento das ocorrências registradas pelos cidadãos.
 *
 * Cada ocorrência vira uma pasta em `$DATA_DIR/ocorrencias/<protocolo>/`, com
 * `registro.json` e os arquivos de mídia. Sem banco de dados: basta um volume
 * persistente no Coolify montado em `/app/data` (ou em `DATA_DIR`).
 */

export const STATUS = {
  recebida: "Recebida",
  em_analise: "Em análise",
  encaminhada: "Encaminhada à equipe",
  resolvida: "Resolvida",
  nao_procede: "Não procede",
} as const;
export type Status = keyof typeof STATUS;

export type Midia = {
  nome: string;
  tipo: "foto" | "video" | "audio";
  mime: string;
  bytes: number;
};

export type Evento = {
  em: string;
  status: Status;
  /** Nota visível ao cidadão na consulta do protocolo. */
  nota?: string;
};

export type Ocorrencia = {
  protocolo: string;
  criadaEm: string;
  categoria: string;
  descricao: string;
  localizacao: {
    lat: number | null;
    lng: number | null;
    precisao: number | null;
    referencia: string;
  };
  contato: { nome: string; telefone: string; email: string } | null;
  midias: Midia[];
  status: Status;
  historico: Evento[];
};

/** Limites de envio (também usados pelo formulário para avisar antes). */
export const LIMITES = {
  fotos: 6,
  fotoBytes: 8 * 1024 * 1024,
  videoBytes: 60 * 1024 * 1024,
  audioBytes: 10 * 1024 * 1024,
  descricao: 2000,
};

const MIME_EXT: Record<string, { tipo: Midia["tipo"]; ext: string }> = {
  "image/jpeg": { tipo: "foto", ext: "jpg" },
  "image/png": { tipo: "foto", ext: "png" },
  "image/webp": { tipo: "foto", ext: "webp" },
  "image/heic": { tipo: "foto", ext: "heic" },
  "image/heif": { tipo: "foto", ext: "heif" },
  "video/mp4": { tipo: "video", ext: "mp4" },
  "video/quicktime": { tipo: "video", ext: "mov" },
  "video/webm": { tipo: "video", ext: "webm" },
  "video/3gpp": { tipo: "video", ext: "3gp" },
  "audio/webm": { tipo: "audio", ext: "webm" },
  "audio/ogg": { tipo: "audio", ext: "ogg" },
  "audio/mp4": { tipo: "audio", ext: "m4a" },
  "audio/mpeg": { tipo: "audio", ext: "mp3" },
  "audio/aac": { tipo: "audio", ext: "aac" },
  "audio/wav": { tipo: "audio", ext: "wav" },
};

/** Classifica o MIME enviado (ignora parâmetros como `;codecs=opus`). */
export function classificarMidia(mime: string) {
  return MIME_EXT[mime.split(";")[0].trim().toLowerCase()] ?? null;
}

function raiz(): string {
  return path.join(process.env.DATA_DIR?.trim() || path.join(process.cwd(), "data"), "ocorrencias");
}

const PROTOCOLO_RE = /^\d{8}-[A-Z2-9]{6}$/;
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O/1/I, fácil de ditar

export function protocoloValido(p: string): boolean {
  return PROTOCOLO_RE.test(p);
}

/** Protocolo legível, ex.: 20261023-K7Q2MX. */
export function novoProtocolo(agora = new Date()): string {
  const data = agora.toISOString().slice(0, 10).replace(/-/g, "");
  const bytes = randomBytes(6);
  const sufixo = Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join("");
  return `${data}-${sufixo}`;
}

function pasta(protocolo: string): string {
  if (!protocoloValido(protocolo)) throw new Error("protocolo inválido");
  return path.join(raiz(), protocolo);
}

/** Grava de forma atômica para não deixar JSON pela metade. */
async function gravarRegistro(oc: Ocorrencia) {
  const destino = path.join(pasta(oc.protocolo), "registro.json");
  const tmp = `${destino}.tmp`;
  await writeFile(tmp, JSON.stringify(oc, null, 2));
  await rename(tmp, destino);
}

export async function criarOcorrencia(
  dados: Omit<Ocorrencia, "protocolo" | "criadaEm" | "midias" | "status" | "historico">,
  arquivos: { mime: string; conteudo: Buffer }[],
): Promise<Ocorrencia> {
  const agora = new Date();
  const protocolo = novoProtocolo(agora);
  const dir = pasta(protocolo);
  await mkdir(dir, { recursive: true });

  const midias: Midia[] = [];
  for (const [i, arq] of arquivos.entries()) {
    const info = classificarMidia(arq.mime);
    if (!info) continue;
    const nome = `${info.tipo}-${i + 1}.${info.ext}`;
    await writeFile(path.join(dir, nome), arq.conteudo);
    midias.push({ nome, tipo: info.tipo, mime: arq.mime.split(";")[0], bytes: arq.conteudo.length });
  }

  const oc: Ocorrencia = {
    ...dados,
    protocolo,
    criadaEm: agora.toISOString(),
    midias,
    status: "recebida",
    historico: [{ em: agora.toISOString(), status: "recebida" }],
  };
  await gravarRegistro(oc);
  return oc;
}

export async function lerOcorrencia(protocolo: string): Promise<Ocorrencia | null> {
  if (!protocoloValido(protocolo)) return null;
  try {
    return JSON.parse(await readFile(path.join(pasta(protocolo), "registro.json"), "utf8"));
  } catch {
    return null;
  }
}

export async function listarOcorrencias(): Promise<Ocorrencia[]> {
  let nomes: string[];
  try {
    nomes = await readdir(raiz());
  } catch {
    return [];
  }
  const lidas = await Promise.all(nomes.filter(protocoloValido).map(lerOcorrencia));
  return lidas
    .filter((o): o is Ocorrencia => o !== null)
    .sort((a, b) => b.criadaEm.localeCompare(a.criadaEm));
}

export async function atualizarStatus(
  protocolo: string,
  status: Status,
  nota?: string,
): Promise<Ocorrencia | null> {
  const oc = await lerOcorrencia(protocolo);
  if (!oc) return null;
  oc.status = status;
  oc.historico.push({ em: new Date().toISOString(), status, ...(nota ? { nota } : {}) });
  await gravarRegistro(oc);
  return oc;
}

export async function lerMidia(protocolo: string, nome: string) {
  const oc = await lerOcorrencia(protocolo);
  const midia = oc?.midias.find((m) => m.nome === nome);
  if (!midia) return null;
  return { midia, conteudo: await readFile(path.join(pasta(protocolo), midia.nome)) };
}

/** Visão pública do protocolo: sem contato, sem mídia, sem GPS exato. */
export function visaoPublica(oc: Ocorrencia) {
  return {
    protocolo: oc.protocolo,
    criadaEm: oc.criadaEm,
    categoria: oc.categoria,
    status: oc.status,
    historico: oc.historico,
  };
}

// --- Acesso do painel da Prefeitura -----------------------------------------

export const COOKIE_ADMIN = "ocorrencias_admin";

/** Painel habilitado só com `OCORRENCIAS_ADMIN_TOKEN` (mín. 16 caracteres). */
export function tokenAdmin(): string | null {
  const t = process.env.OCORRENCIAS_ADMIN_TOKEN?.trim();
  return t && t.length >= 16 ? t : null;
}

export function tokenConfere(recebido: string | undefined | null): boolean {
  const esperado = tokenAdmin();
  if (!esperado || !recebido) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

// --- Limite de envios por IP (memória do processo) --------------------------

const JANELA_MS = 60 * 60 * 1000;
const MAX_POR_JANELA = 10;
const envios = new Map<string, number[]>();

export function excedeuLimite(ip: string | null): boolean {
  const chave = ip ?? "desconhecido";
  const agora = Date.now();
  const recentes = (envios.get(chave) ?? []).filter((t) => agora - t < JANELA_MS);
  if (recentes.length >= MAX_POR_JANELA) {
    envios.set(chave, recentes);
    return true;
  }
  recentes.push(agora);
  envios.set(chave, recentes);
  if (envios.size > 10_000) envios.clear(); // evita crescer sem limite
  return false;
}
