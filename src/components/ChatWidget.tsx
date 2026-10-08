"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Bot, Loader2, MessageCircle, SendHorizontal, X } from "lucide-react";

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
};

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

export default function ChatWidget() {
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

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, current]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy, slow]);

  // Esc fecha o painel; trava a rolagem da página por baixo no celular.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    if (window.matchMedia("(max-width: 639px)").matches) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function ask(raw: string) {
    const question = raw.trim();
    if (busy || !current || question.length < 2) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setInput("");
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
        setMessages((m) => [
          ...m,
          msg("error", "Muitas perguntas em pouco tempo. Aguarde um minuto e tente novamente."),
        ]);
        return;
      }
      if (!r.ok) throw new Error(String(r.status));
      const data: { answer: string } = await r.json();
      setMessages((m) => [
        ...m,
        msg("bot", data.answer || "Não consegui responder agora."),
      ]);
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

  const onlyWelcome = messages.length === 1 && messages[0].role === "bot";

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={openChat}
          className="fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-full bg-emerald-600 py-3 pr-5 pl-4 font-semibold text-white shadow-lg shadow-emerald-900/20 transition-all hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-95"
          aria-haspopup="dialog"
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          Tire suas dúvidas
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Assistente virtual da Prefeitura"
          className="fixed inset-0 z-50 flex flex-col bg-slate-50 sm:inset-auto sm:right-4 sm:bottom-4 sm:h-[min(640px,calc(100vh-2rem))] sm:w-[400px] sm:overflow-hidden sm:rounded-2xl sm:border sm:border-slate-200 sm:shadow-2xl"
        >
          {/* Cabeçalho */}
          <header className="flex items-center gap-3 bg-emerald-600 px-4 py-3 text-white">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
              <Bot className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold leading-tight">Assistente virtual</p>
              <p className="truncate text-xs text-emerald-100">
                {busy ? "digitando…" : current ? current.label : "Prefeitura de Aracaju"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Fechar assistente"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </header>

          {/* Seletor de secretaria */}
          {secretarias && secretarias.length > 1 && (
            <div
              role="tablist"
              aria-label="Escolha a secretaria"
              className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 [scrollbar-width:none]"
            >
              {secretarias.map((s) => {
                const active = s.slug === current?.slug;
                return (
                  <button
                    key={s.slug}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => !active && selectSecretaria(s)}
                    className={`shrink-0 rounded-full border px-3 py-1 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                      active
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
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
            className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-4"
          >
            {!secretarias && !loadError && (
              <div className="flex flex-1 items-center justify-center text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin" aria-label="Carregando" />
              </div>
            )}

            {loadError && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-slate-500">
                <p>O assistente está indisponível no momento.</p>
                <button
                  type="button"
                  onClick={loadSecretarias}
                  className="rounded-full border border-emerald-600 px-4 py-1.5 font-medium text-emerald-700 hover:bg-emerald-50"
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
                    ? "self-end rounded-br-md bg-emerald-600 text-white"
                    : m.role === "bot"
                      ? "self-start rounded-bl-md border border-slate-200 bg-white text-slate-800"
                      : "self-start rounded-bl-md border border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {m.role === "bot" ? <RichText text={m.text} /> : m.text}
              </div>
            ))}

            {busy && (
              <div className="self-start rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-500 shadow-sm">
                <span className="inline-flex gap-1" aria-label="Digitando">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                </span>
                {slow && (
                  <p className="mt-1.5">Buscando a resposta… pode levar até 20 segundos.</p>
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
                    className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-left text-sm text-emerald-700 hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
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
            className="border-t border-slate-200 bg-white px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
          >
            <div className="flex items-end gap-2">
              <label htmlFor="chat-input" className="sr-only">
                Digite sua pergunta
              </label>
              <textarea
                id="chat-input"
                ref={inputRef}
                rows={1}
                maxLength={1000}
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
                className="max-h-[110px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-base text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={busy || !current || input.trim().length < 2}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition-colors hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:bg-slate-300"
                aria-label="Enviar pergunta"
              >
                <SendHorizontal className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-1.5 text-center text-[11px] leading-snug text-slate-400">
              Respostas geradas por IA. Não informe dados pessoais — as perguntas
              podem ser registradas para melhorar o atendimento.
            </p>
          </form>
        </div>
      )}
    </>
  );
}
