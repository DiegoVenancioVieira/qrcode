"use client";

import { Bot, ChevronRight } from "lucide-react";

/** Evento que o ChatWidget escuta para abrir o painel a partir de outro ponto da página. */
export const EVENTO_ABRIR_ASSISTENTE = "assistente:abrir";

/** Cartão de destaque do assistente virtual, logo abaixo da busca. */
export default function BotaoAssistente({ titulo }: { titulo: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(EVENTO_ABRIR_ASSISTENTE))}
      className="group flex w-full items-center gap-4 rounded-3xl bg-white p-4 text-left shadow-lg shadow-slate-900/5 ring-1 ring-slate-200/70 transition-all hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria-500 active:scale-[0.98]"
    >
      <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primaria-500 to-primaria-700 text-white shadow-md shadow-primaria-600/30">
        <Bot className="h-7 w-7" aria-hidden="true" />
        <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-semibold text-slate-800">{titulo}</span>
        <span className="text-sm leading-snug text-slate-500">
          Tire dúvidas a qualquer hora. Se precisar, falamos com um atendente.
        </span>
      </span>
      <ChevronRight
        className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-primaria-600"
        aria-hidden="true"
      />
    </button>
  );
}
