"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";

/** Remove acentos e caixa para a busca casar "saude" com "Saúde". */
const normalizar = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/**
 * Campo de busca dos serviços. Os cartões são renderizados no servidor (com os
 * ícones); aqui só escondemos os que não casam, pelo atributo `data-busca`.
 */
export default function BuscaServicos({ alvo }: { alvo: string }) {
  const [termo, setTermo] = useState("");

  function filtrar(valor: string) {
    setTermo(valor);
    const lista = document.getElementById(alvo);
    if (!lista) return;
    const q = normalizar(valor);
    let visiveis = 0;
    lista.querySelectorAll<HTMLElement>("[data-busca]").forEach((el) => {
      const casa = !q || normalizar(el.dataset.busca ?? "").includes(q);
      el.hidden = !casa;
      if (casa) visiveis++;
    });
    const vazio = document.getElementById(`${alvo}-vazio`);
    if (vazio) vazio.hidden = visiveis > 0;
  }

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
      <label htmlFor="busca-servicos" className="sr-only">
        Buscar serviço
      </label>
      <input
        id="busca-servicos"
        type="search"
        value={termo}
        onChange={(e) => filtrar(e.target.value)}
        placeholder="Buscar serviço…"
        autoComplete="off"
        className="h-12 w-full rounded-2xl border-0 bg-white pr-11 pl-12 text-base text-slate-800 shadow-lg shadow-slate-900/10 placeholder:text-slate-400 focus:ring-2 focus:ring-white/70 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {termo && (
        <button
          type="button"
          onClick={() => filtrar("")}
          className="absolute top-1/2 right-3 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Limpar busca"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
