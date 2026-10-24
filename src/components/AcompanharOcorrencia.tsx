"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";

type Publica = {
  protocolo: string;
  criadaEm: string;
  categoria: string;
  status: string;
  historico: { em: string; status: string; nota?: string }[];
};

const data = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export default function AcompanharOcorrencia({
  categorias,
  status,
}: {
  categorias: Record<string, string>;
  status: Record<string, string>;
}) {
  const [protocolo, setProtocolo] = useState("");
  const [meus, setMeus] = useState<string[]>([]);
  const [resultado, setResultado] = useState<Publica | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const consultar = useCallback(async (p: string) => {
    const valor = p.trim().toUpperCase();
    if (!valor) return;
    setProtocolo(valor);
    setCarregando(true);
    setErro(null);
    setResultado(null);
    try {
      const r = await fetch(`/api/ocorrencias/${encodeURIComponent(valor)}`, { cache: "no-store" });
      if (r.ok) setResultado(await r.json());
      else setErro(r.status === 404 ? "Protocolo não encontrado. Confira o número." : "Erro ao consultar. Tente novamente.");
    } catch {
      setErro("Sem conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }, []);

  // Lê dados só do navegador (localStorage e ?protocolo=) depois da hidratação.
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        setMeus(JSON.parse(localStorage.getItem("ocorrencias:protocolos") ?? "[]"));
      } catch {}
      const p = new URLSearchParams(location.search).get("protocolo");
      if (p) consultar(p);
    }, 0);
    return () => clearTimeout(id);
  }, [consultar]);

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          consultar(protocolo);
        }}
        className="flex gap-2"
      >
        <input
          value={protocolo}
          onChange={(e) => setProtocolo(e.target.value)}
          placeholder="Ex.: 20261023-K7Q2MX"
          aria-label="Número do protocolo"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-3 font-mono text-base uppercase text-slate-800 placeholder:normal-case placeholder:text-slate-400 focus:border-primaria-500 focus:outline-none"
        />
        <button type="submit" disabled={carregando} className="flex items-center gap-1.5 rounded-xl bg-primaria-600 px-4 font-semibold text-white hover:bg-primaria-700 disabled:bg-slate-300">
          {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Consultar
        </button>
      </form>

      {meus.length > 0 && !resultado && (
        <div>
          <p className="text-xs font-medium text-slate-500">Registrados neste aparelho:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {meus.map((p) => (
              <button key={p} type="button" onClick={() => consultar(p)} className="rounded-full border border-slate-200 bg-white px-3 py-1 font-mono text-sm text-slate-700 hover:border-primaria-300">
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {erro && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{erro}</p>}

      {resultado && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="font-mono text-sm text-slate-500">{resultado.protocolo}</p>
          <p className="mt-1 font-semibold text-slate-800">{categorias[resultado.categoria] ?? resultado.categoria}</p>
          <span className="mt-2 inline-block rounded-full bg-primaria-50 px-3 py-1 text-sm font-semibold text-primaria-700">
            {status[resultado.status] ?? resultado.status}
          </span>
          <ol className="mt-4 border-l-2 border-slate-200 pl-4">
            {[...resultado.historico].reverse().map((h, i) => (
              <li key={i} className="relative mb-4 last:mb-0">
                <span className="absolute top-1.5 -left-[21px] h-2.5 w-2.5 rounded-full bg-primaria-500" />
                <p className="text-sm font-medium text-slate-700">{status[h.status] ?? h.status}</p>
                <p className="text-xs text-slate-400">{data(h.em)}</p>
                {h.nota && <p className="mt-1 text-sm text-slate-600">{h.nota}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
