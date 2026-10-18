"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Bot, Headset, Loader2, MessageCircle, RotateCcw, SendHorizontal, X } from "lucide-react";
import type { ConfigAtendimento } from "@/config/prefeitura";
import { EVENTO_ABRIR_ASSISTENTE } from "@/components/BotaoAssistente";

/**
 * Widget do assistente virtual (Agente de FAQ Municipal).
 *
 * Fala só com as rotas `/api/chat/*` deste app, que repassam ao agente.
 * A conversa fica apenas em memória: nada vai para localStorage, porque o
 * assistente da SERMULHER pode ser usado por mulheres em situação de violência
 * em aparelhos compartilhados.
 */

type Secretaria = {
  slug: string;
  label: string;
  welcome: string;
  chips: string[];
};

type Message = {
  id: number;
  role: "user" | "bot" | "error";
  text: string;
  /** Resposta em que o assistente não encontrou a informação: oferece atendimento humano. */
  semResposta?: { pergunta: string };
};

type ChatwootSDK = {
  run: (opts: { websiteToken: string; baseUrl: string }) => void;
};
type Chatwoot = {
  toggle: (state?: "open" | "close") => void;
  setConversationCustomAttributes: (attrs: Record<string, string>) => void;
};
declare global {
  interface Window {
    chatwootSDK?: ChatwootSDK;
    $chatwoot?: Chatwoot;
    chatwootSettings?: Record<string, unknown>;
  }
}

/**
 * Abre o widget do Chatwoot na caixa da secretaria e anexa à conversa a pergunta
 * que o assistente não respondeu, para o atendente não precisar perguntar de novo.
 * O SDK é carregado só no primeiro uso; uma página comporta uma caixa só.
 */
let chatwootToken: string | null = null;
function abrirAtendimento(baseUrl: string, websiteToken: string, contexto: Record<string, string>) {
  const abrir = () => {
    window.$chatwoot?.setConversationCustomAttributes(contexto);
    window.$chatwoot?.toggle("open");
  };
  if (chatwootToken === websiteToken && window.$chatwoot) return abrir();
  if (chatwootToken !== null && chatwootToken !== websiteToken) {
    // Outra secretaria já carregou o widget: recarregar é o jeito suportado de trocar de caixa.
    window.location.reload();
    return;
  }
  chatwootToken = websiteToken;
  window.chatwootSettings = { hideMessageBubble: true, locale: "pt_BR", position: "right" };
  window.addEventListener("chatwoot:ready", abrir, { once: true });
  const script = document.createElement("script");
  script.src = `${baseUrl.replace(/\/+$/, "")}/packs/js/sdk.js`;
  script.async = true;
  script.onload = () => window.chatwootSDK?.run({ websiteToken, baseUrl });
  document.body.appendChild(script);
}

// Depois deste tempo sem resposta, avisa que o LLM pode demorar.
const SLOW_HINT_MS = 6_000;

let nextId = 0;
const msg = (role: Message["role"], text: string): Message => ({
  id: nextId++,
  role,
  text,
});

/** Renderiza **negrito** do markdown do LLM sem injetar HTML. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") && p.length > 4 ? (
          <strong key={i}>{p.slice(2, -2)}</strong>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

type ChatWidgetProps = {
  /** Nome da prefeitura do deploy (`prefeitura.nome` da config). */
  nomePrefeitura: string;
  titulo: string;
  rotuloBotao: string;
  aviso: string;
  atendimento?: ConfigAtendimento;
};

export default function ChatWidget({
  nomePrefeitura,
  titulo,
  rotuloBotao,
  aviso,
  atendimento,
}: ChatWidgetProps) {
  // O botão só aparece depois de confirmar que o servidor tem agente configurado.
  const [disponivel, setDisponivel] = useState(false);
  const [open, setOpen] = useState(false);
  const [secretarias, setSecretarias] = useState<Secretaria[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [current, setCurrent] = useState<Secretaria | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef(false);

  const selectSecretaria = useCallback((s: Secretaria) => {
    abortRef.current?.abort();
    setCurrent(s);
    setMessages([msg("bot", s.welcome)]);
    setBusy(false);
    setSlow(false);
  }, []);

  const loadSecretarias = useCallback(async () => {
    setLoadError(false);
    try {
      const r = await fetch("/api/chat/secretarias");
      if (!r.ok) throw new Error(String(r.status));
      const data: { secretarias: Secretaria[] } = await r.json();
      if (!data.secretarias?.length) throw new Error("vazio");
      setSecretarias(data.secretarias);
      selectSecretaria(data.secretarias[0]);
    } catch {
      setLoadError(true);
    }
  }, [selectSecretaria]);

  // Carrega as secretarias só na primeira abertura: quem não usa o chat não gera tráfego.
  function openChat() {
    setOpen(true);
    if (!secretarias) loadSecretarias();
  }

  // O cartão de destaque da página abre o mesmo painel.
  useEffect(() => {
    if (!disponivel) return;
    const abrir = () => openChat();
    window.addEventListener(EVENTO_ABRIR_ASSISTENTE, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_ASSISTENTE, abrir);
  });

  // Fechar cancela a pergunta em andamento: não faz sentido o agente (em CPU)
  // continuar processando uma resposta que ninguém vai ler.
  const closeChat = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      setMessages((m) => [...m, msg("error", "Pergunta cancelada ao fechar o assistente.")]);
    }
    restoreFocusRef.current = true;
    setOpen(false);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else if (restoreFocusRef.current) {
      restoreFocusRef.current = false;
      launcherRef.current?.focus();
    }
  }, [open, current]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy, slow]);

  // Esc fecha o painel; Tab fica preso dentro dele (aria-modal); trava a rolagem
  // da página por baixo no celular.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return closeChat();
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusables = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex='-1'])",
        ),
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      const inside = dialogRef.current.contains(active);
      if (e.shiftKey && (active === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    if (window.matchMedia("(max-width: 639px)").matches) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, closeChat]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    let ativo = true;
    fetch("/api/chat/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { disponivel?: boolean } | null) => {
        if (ativo && d?.disponivel === true) setDisponivel(true);
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, []);

  async function ask(raw: string) {
    const question = raw.trim();
    if (busy || !current || question.length < 2) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setBusy(true);
    setSlow(false);
    setMessages((m) => [...m, msg("user", question)]);
    const slowTimer = setTimeout(() => setSlow(true), SLOW_HINT_MS);

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, secretaria: current.slug }),
        signal: controller.signal,
      });
      if (r.status === 429) {
        const d: { detail?: string } = await r.json().catch(() => ({}));
        setMessages((m) => [
          ...m,
          msg("error", d.detail || "Muitas perguntas em pouco tempo. Aguarde um minuto e tente novamente."),
        ]);
        return;
      }
      if (r.status === 503) {
        const d: { detail?: string; limite?: boolean } = await r.json().catch(() => ({}));
        if (d.limite) {
          const aviso = msg("bot", d.detail || "O assistente está indisponível agora.");
          aviso.semResposta = { pergunta: question };
          setMessages((m) => [...m, aviso]);
          return;
        }
      }
      if (!r.ok) throw new Error(String(r.status));
      const data: { answer: string; respondida?: boolean } = await r.json();
      const resposta = msg("bot", data.answer || "Não consegui responder agora.");
      if (data.respondida === false) resposta.semResposta = { pergunta: question };
      setMessages((m) => [...m, resposta]);
    } catch {
      if (controller.signal.aborted) return; // trocou de secretaria ou fechou
      setMessages((m) => [
        ...m,
        msg("error", "Não consegui consultar agora. Tente novamente em instantes."),
      ]);
    } finally {
      clearTimeout(slowTimer);
      if (abortRef.current === controller) {
        abortRef.current = null;
        setBusy(false);
        setSlow(false);
      }
    }
  }

  const caixa = current && atendimento?.caixas[current.slug];

  function repetirPergunta(pergunta: string) {
    setInput(pergunta);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function falarComAtendente(pergunta: string, respostaBot: string) {
    if (!atendimento || !caixa || !current) return;
    abrirAtendimento(atendimento.url, caixa, {
      secretaria: current.label,
      pergunta_ao_assistente: pergunta,
      resposta_do_assistente: respostaBot.slice(0, 500),
    });
    closeChat();
  }

  const lastId = messages.length ? messages[messages.length - 1].id : -1;
  const onlyWelcome = messages.length === 1 && messages[0].role === "bot";

  return (
    <>
      {disponivel && !open && (
        <button
          ref={launcherRef}
          type="button"
          onClick={openChat}
          className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primaria-600 text-white shadow-lg shadow-primaria-900/30 transition-all hover:bg-primaria-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria-500 focus-visible:ring-offset-2 active:scale-95"
          aria-haspopup="dialog"
          aria-label={rotuloBotao}
          title={rotuloBotao}
        >
          <MessageCircle className="h-6 w-6" aria-hidden="true" />
        </button>
      )}

      {open && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={`${titulo} — ${nomePrefeitura}`}
          className="fixed inset-0 z-50 flex flex-col bg-slate-50 dark:bg-slate-950 sm:inset-auto sm:right-4 sm:bottom-4 sm:h-[min(640px,calc(100vh-2rem))] sm:w-[400px] sm:overflow-hidden sm:rounded-2xl sm:border sm:border-slate-200 dark:sm:border-slate-700 sm:shadow-2xl"
        >
          {/* Cabeçalho */}
          <header className="flex items-center gap-3 bg-primaria-600 px-4 py-3 text-white">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
              <Bot className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold leading-tight">{titulo}</p>
              <p className="truncate text-xs text-white/80">
                {busy ? "digitando…" : current ? current.label : nomePrefeitura}
              </p>
            </div>
            <button
              type="button"
              onClick={closeChat}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label={`Fechar ${titulo.toLowerCase()}`}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </header>

          {/* Seletor de secretaria */}
          {secretarias && secretarias.length > 1 && (
            <div
              role="group"
              aria-label="Escolha a secretaria"
              className="flex gap-2 overflow-x-auto border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 [scrollbar-width:none]"
            >
              {secretarias.map((s) => {
                const active = s.slug === current?.slug;
                return (
                  <button
                    key={s.slug}
                    type="button"
                    aria-pressed={active}
                    onClick={() => !active && selectSecretaria(s)}
                    className={`shrink-0 rounded-full border px-3 py-1 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria-500 ${
                      active
                        ? "border-primaria-600 bg-primaria-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-primaria-300 hover:text-primaria-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-primaria-300"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Mensagens */}
          <div
            ref={listRef}
            aria-live="polite"
            className="flex flex-1 flex-col gap-2 overflow-y-auto bg-[radial-gradient(circle,rgb(148_163_184/0.18)_1px,transparent_1px)] [background-size:16px_16px] px-3 py-4"
          >
            {!secretarias && !loadError && (
              <div className="flex flex-1 items-center justify-center text-slate-400 dark:text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin" aria-label="Carregando" />
              </div>
            )}

            {loadError && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-slate-500 dark:text-slate-400">
                <p>O assistente está indisponível no momento.</p>
                <button
                  type="button"
                  onClick={loadSecretarias}
                  className="rounded-full border border-primaria-600 px-4 py-1.5 font-medium text-primaria-700 dark:text-primaria-300 hover:bg-primaria-50 dark:hover:bg-primaria-500/15"
                >
                  Tentar novamente
                </button>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed break-words whitespace-pre-wrap shadow-sm ${
                  m.role === "user"
                    ? "self-end rounded-br-md bg-primaria-600 text-white"
                    : m.role === "bot"
                      ? "self-start rounded-bl-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                      : "self-start rounded-bl-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300"
                }`}
              >
                {m.role === "bot" ? <RichText text={m.text} /> : m.text}
              </div>
            )).flatMap((el, i) => {
              const m = messages[i];
              if (!m.semResposta || m.id !== lastId || busy) return [el];
              const { pergunta } = m.semResposta;
              return [
                el,
                <div key={`acoes-${m.id}`} className="flex flex-wrap gap-2 self-start">
                  {caixa && (
                    <button
                      type="button"
                      onClick={() => falarComAtendente(pergunta, m.text)}
                      className="flex items-center gap-1.5 rounded-full bg-primaria-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-primaria-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria-500 focus-visible:ring-offset-2"
                    >
                      <Headset className="h-4 w-4" aria-hidden="true" />
                      Falar com atendente
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => repetirPergunta(pergunta)}
                    className="flex items-center gap-1.5 rounded-full border border-primaria-100 dark:border-primaria-500/30 bg-white dark:bg-slate-900 px-3.5 py-1.5 text-sm font-medium text-primaria-700 dark:text-primaria-300 hover:bg-primaria-50 dark:hover:bg-primaria-500/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria-500"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Repetir a pergunta
                  </button>
                </div>,
              ];
            })}

            {busy && (
              <div className="self-start rounded-2xl rounded-bl-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-500 dark:text-slate-400 shadow-sm">
                <span className="inline-flex gap-1" aria-label="Digitando">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                </span>
                {slow && (
                  <p className="mt-1.5">Buscando a resposta… em horários de movimento pode demorar um pouco mais.</p>
                )}
              </div>
            )}

            {current && onlyWelcome && !busy && current.chips.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-2">
                {current.chips.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => ask(q)}
                    className="rounded-full border border-primaria-100 dark:border-primaria-500/30 bg-white dark:bg-slate-900 px-3 py-1.5 text-left text-sm text-primaria-700 dark:text-primaria-300 hover:bg-primaria-50 dark:hover:bg-primaria-500/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria-500"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Entrada */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
          >
            <div className="flex items-end gap-2">
              <label htmlFor="chat-input" className="sr-only">
                Digite sua pergunta
              </label>
              <textarea
                id="chat-input"
                ref={inputRef}
                rows={1}
                maxLength={500}
                value={input}
                disabled={!current}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 110)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    ask(input);
                  }
                }}
                placeholder="Digite sua pergunta…"
                className="max-h-[110px] flex-1 resize-none rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-base text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:border-primaria-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={busy || !current || input.trim().length < 2}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primaria-600 text-white transition-colors hover:bg-primaria-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria-500 focus-visible:ring-offset-2 disabled:bg-slate-300 dark:disabled:bg-slate-700"
                aria-label="Enviar pergunta"
              >
                <SendHorizontal className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-1.5 text-center text-[11px] leading-snug text-slate-400 dark:text-slate-500">
              {aviso}
            </p>
          </form>
        </div>
      )}
    </>
  );
}
