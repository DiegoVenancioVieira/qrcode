"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Loader2, LogOut, MapPin, RefreshCw } from "lucide-react";
import type { Ocorrencia } from "@/lib/ocorrencias";

const data = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

const CORES: Record<string, string> = {
  recebida: "bg-sky-100 text-sky-800",
  em_analise: "bg-amber-100 text-amber-800",
  encaminhada: "bg-violet-100 text-violet-800",
  resolvida: "bg-emerald-100 text-emerald-800",
  nao_procede: "bg-slate-200 text-slate-700",
};

/** Neutraliza fórmulas (=, +, -, @) vindas do cidadão ao abrir no Excel. */
const celula = (c: string) => `"${(/^[=+\-@\t\r]/.test(c) ? `'${c}` : c).replace(/"/g, '""')}"`;

function csv(linhas: string[][]) {
  return linhas.map((l) => l.map(celula).join(";")).join("\n");
}

export default function PainelOcorrencias({
  categorias,
  status,
}: {
  categorias: Record<string, string>;
  status: Record<string, string>;
}) {
  const [lista, setLista] = useState<Ocorrencia[] | null>(null);
  const [autenticado, setAutenticado] = useState<boolean | null>(null);
  const [token, setToken] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState("abertas");
  const [filtroCat, setFiltroCat] = useState("");
  const [aberta, setAberta] = useState<string | null>(null);
  const [novoStatus, setNovoStatus] = useState("");
  const [nota, setNota] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const r = await fetch("/api/admin/ocorrencias", { cache: "no-store" });
    setErro(null);
    if (r.status === 401) return setAutenticado(false);
    if (!r.ok) return setErro("Erro ao carregar as ocorrências.");
    setAutenticado(true);
    setLista((await r.json()).ocorrencias);
  }, []);

  useEffect(() => {
    const id = setTimeout(carregar, 0);
    return () => clearTimeout(id);
  }, [carregar]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (r.ok) {
      setToken("");
      carregar();
    } else {
      setErro((await r.json().catch(() => ({}))).detail ?? "Falha ao entrar.");
    }
  }

  async function sair() {
    await fetch("/api/admin/login", { method: "DELETE" });
    setLista(null);
    setAutenticado(false);
  }

  async function salvarStatus(protocolo: string) {
    if (!novoStatus) return;
    setSalvando(true);
    const r = await fetch(`/api/admin/ocorrencias/${protocolo}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: novoStatus, nota }),
    });
    setSalvando(false);
    if (!r.ok) return setErro("Não foi possível atualizar.");
    const atual: Ocorrencia = await r.json();
    setLista((l) => l?.map((o) => (o.protocolo === protocolo ? atual : o)) ?? null);
    setNota("");
    setNovoStatus("");
  }

  const filtradas = useMemo(
    () =>
      (lista ?? []).filter(
        (o) =>
          (filtroStatus === "" ||
            (filtroStatus === "abertas" ? !["resolvida", "nao_procede"].includes(o.status) : o.status === filtroStatus)) &&
          (filtroCat === "" || o.categoria === filtroCat),
      ),
    [lista, filtroStatus, filtroCat],
  );

  function exportar() {
    const linhas = [
      ["protocolo", "data", "categoria", "status", "descricao", "referencia", "lat", "lng", "nome", "telefone", "email", "midias"],
      ...filtradas.map((o) => [
        o.protocolo,
        data(o.criadaEm),
        categorias[o.categoria] ?? o.categoria,
        status[o.status] ?? o.status,
        o.descricao,
        o.localizacao.referencia,
        String(o.localizacao.lat ?? ""),
        String(o.localizacao.lng ?? ""),
        o.contato?.nome ?? "",
        o.contato?.telefone ?? "",
        o.contato?.email ?? "",
        String(o.midias.length),
      ]),
    ];
    const url = URL.createObjectURL(new Blob(["﻿" + csv(linhas)], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "ocorrencias.csv" });
    a.click();
    URL.revokeObjectURL(url);
  }

  if (autenticado === false) {
    return (
      <form onSubmit={entrar} className="mt-6 max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="text-sm font-medium text-slate-700" htmlFor="token">Token de acesso</label>
        <input id="token" type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="current-password" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 focus:border-primaria-500 focus:outline-none" />
        {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
        <button type="submit" className="mt-3 w-full rounded-xl bg-primaria-600 py-2.5 font-semibold text-white hover:bg-primaria-700">Entrar</button>
      </form>
    );
  }

  if (!lista) {
    return <Loader2 className="mt-8 h-6 w-6 animate-spin text-slate-400" aria-label="Carregando" />;
  }

  const contagem = (s: string) => lista.filter((o) => o.status === s).length;

  return (
    <div className="mt-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {Object.entries(status).map(([s, rotulo]) => (
          <button key={s} type="button" onClick={() => setFiltroStatus(s)} className={`rounded-xl border p-3 text-left ${filtroStatus === s ? "border-primaria-500 bg-white" : "border-slate-200 bg-white/60"}`}>
            <span className="block text-2xl font-bold text-slate-800">{contagem(s)}</span>
            <span className="text-xs text-slate-500">{rotulo}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          <option value="abertas">Em aberto</option>
          <option value="">Todas</option>
          {Object.entries(status).map(([s, r]) => <option key={s} value={s}>{r}</option>)}
        </select>
        <select value={filtroCat} onChange={(e) => setFiltroCat(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          <option value="">Todas as categorias</option>
          {Object.entries(categorias).map(([s, r]) => <option key={s} value={s}>{r}</option>)}
        </select>
        <span className="text-sm text-slate-500">{filtradas.length} ocorrência(s)</span>
        <span className="flex-1" />
        <button type="button" onClick={carregar} className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><RefreshCw className="h-4 w-4" /> Atualizar</button>
        <button type="button" onClick={exportar} className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><Download className="h-4 w-4" /> CSV</button>
        <button type="button" onClick={sair} className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><LogOut className="h-4 w-4" /> Sair</button>
      </div>
      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}

      <ul className="mt-4 flex flex-col gap-2">
        {filtradas.map((o) => {
          const expandida = aberta === o.protocolo;
          const { lat, lng, precisao, referencia } = o.localizacao;
          return (
            <li key={o.protocolo} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <button type="button" onClick={() => { setAberta(expandida ? null : o.protocolo); setNovoStatus(""); setNota(""); }} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 p-3 text-left">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${CORES[o.status] ?? ""}`}>{status[o.status]}</span>
                <span className="font-semibold text-slate-800">{categorias[o.categoria] ?? o.categoria}</span>
                <span className="font-mono text-xs text-slate-400">{o.protocolo}</span>
                <span className="ml-auto text-xs text-slate-500">{data(o.criadaEm)}</span>
                <span className="w-full truncate text-sm text-slate-600">{o.descricao || referencia || "(sem descrição)"}</span>
              </button>
              {expandida && (
                <div className="border-t border-slate-100 p-3 text-sm">
                  {o.descricao && <p className="whitespace-pre-wrap text-slate-700">{o.descricao}</p>}
                  <p className="mt-2 flex items-start gap-1.5 text-slate-600">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primaria-600" />
                    <span>
                      {referencia || "Sem ponto de referência"}
                      {lat !== null && lng !== null && (
                        <>
                          {" · "}
                          <a className="text-primaria-700 underline" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps?q=${lat},${lng}`}>abrir no mapa</a>
                          {precisao !== null && ` (±${precisao} m)`}
                        </>
                      )}
                    </span>
                  </p>
                  {o.contato && (
                    <p className="mt-2 text-slate-600">
                      Contato: {[o.contato.nome, o.contato.telefone, o.contato.email].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {o.midias.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {o.midias.map((m) => {
                        const src = `/api/admin/ocorrencias/${o.protocolo}/midia/${m.nome}`;
                        if (m.tipo === "foto") {
                          return (
                            <a key={m.nome} href={src} target="_blank" rel="noopener noreferrer">
                              {/* eslint-disable-next-line @next/next/no-img-element -- rota autenticada por cookie */}
                              <img src={src} alt={`Foto da ocorrência ${o.protocolo}`} loading="lazy" className="aspect-square w-full rounded-xl object-cover" />
                            </a>
                          );
                        }
                        if (m.tipo === "video") return <video key={m.nome} src={src} controls preload="metadata" className="col-span-2 w-full rounded-xl bg-black" />;
                        return <audio key={m.nome} src={src} controls preload="none" className="col-span-2 w-full" />;
                      })}
                    </div>
                  )}
                  <ol className="mt-3 text-xs text-slate-500">
                    {o.historico.map((h, i) => (
                      <li key={i}>{data(h.em)} — {status[h.status]}{h.nota ? `: ${h.nota}` : ""}</li>
                    ))}
                  </ol>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <select value={novoStatus} onChange={(e) => setNovoStatus(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2">
                      <option value="">Mudar situação…</option>
                      {Object.entries(status).map(([s, r]) => <option key={s} value={s}>{r}</option>)}
                    </select>
                    <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={500} placeholder="Nota para o cidadão (opcional)" className="flex-1 rounded-xl border border-slate-200 px-3 py-2" />
                    <button type="button" disabled={!novoStatus || salvando} onClick={() => salvarStatus(o.protocolo)} className="rounded-xl bg-primaria-600 px-4 py-2 font-semibold text-white disabled:bg-slate-300">
                      {salvando ? "Salvando…" : "Salvar"}
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
        {filtradas.length === 0 && <li className="rounded-2xl bg-white p-6 text-center text-slate-500">Nenhuma ocorrência neste filtro.</li>}
      </ul>
    </div>
  );
}
