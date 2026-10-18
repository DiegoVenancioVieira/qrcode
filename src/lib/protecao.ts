/**
 * Proteção do chat contra robôs que drenariam os créditos do LLM.
 *
 * Camadas, da mais barata para a mais cara:
 * 1. Origem: só aceita POST vindo do próprio site (bloqueia scripts que chamam
 *    a API de fora sem forjar cabeçalhos).
 * 2. Limite por IP: poucas perguntas por minuto e por dia, como um cidadão faria.
 * 3. No agente: token compartilhado (só o hub pergunta) e teto diário global.
 *
 * Os contadores ficam em memória: valem por instância do hub e zeram no deploy,
 * o que basta para um único container. Com várias réplicas, mover para Redis.
 */

const POR_MINUTO = Number(process.env.CHAT_LIMITE_MINUTO ?? 5);
const POR_DIA = Number(process.env.CHAT_LIMITE_DIA ?? 40);

const MINUTO = 60_000;
const DIA = 24 * 60 * MINUTO;

type Janela = { minuto: number[]; diaInicio: number; diaTotal: number };
const porIp = new Map<string, Janela>();

/** Limpa IPs inativos de tempos em tempos para o mapa não crescer sem fim. */
let ultimaLimpeza = Date.now();
function limpar(agora: number) {
  if (agora - ultimaLimpeza < 10 * MINUTO) return;
  ultimaLimpeza = agora;
  for (const [ip, j] of porIp) {
    if (agora - j.diaInicio > DIA && j.minuto.every((t) => agora - t > MINUTO)) {
      porIp.delete(ip);
    }
  }
}

/** Registra uma pergunta do IP; devolve a mensagem de bloqueio ou null se liberado. */
export function limiteExcedido(ip: string): string | null {
  const agora = Date.now();
  limpar(agora);
  let j = porIp.get(ip);
  if (!j || agora - j.diaInicio > DIA) {
    j = { minuto: [], diaInicio: agora, diaTotal: 0 };
    porIp.set(ip, j);
  }
  j.minuto = j.minuto.filter((t) => agora - t < MINUTO);
  if (j.diaTotal >= POR_DIA) {
    return "Você atingiu o limite de perguntas de hoje. Se precisar, fale com um atendente.";
  }
  if (j.minuto.length >= POR_MINUTO) {
    return "Muitas perguntas em pouco tempo. Aguarde um minuto e tente novamente.";
  }
  j.minuto.push(agora);
  j.diaTotal++;
  return null;
}

/** A requisição veio de uma página deste mesmo site? */
export function origemPermitida(request: Request): boolean {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const origem = request.headers.get("origin") ?? request.headers.get("referer");
  if (!host || !origem) return false;
  try {
    return new URL(origem).host === host;
  } catch {
    return false;
  }
}
