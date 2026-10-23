import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PainelOcorrencias from "@/components/PainelOcorrencias";
import { ocorrencias, prefeitura } from "@/config/prefeitura";
import { STATUS } from "@/lib/ocorrencias";

export const metadata: Metadata = {
  title: `Painel de ocorrências | ${prefeitura.prefeitura.nome}`,
  robots: { index: false, follow: false },
};

export default function PaginaPainel() {
  if (!ocorrencias.habilitado) notFound();
  const categorias = Object.fromEntries(ocorrencias.categorias.map((c) => [c.slug, c.titulo]));
  return (
    <main className="min-h-screen w-full bg-slate-100 px-4 py-6">
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="text-xl font-bold text-slate-800">Painel de ocorrências</h1>
        <p className="text-sm text-slate-500">{prefeitura.prefeitura.nomeOficial}</p>
        <PainelOcorrencias categorias={categorias} status={STATUS} />
      </div>
    </main>
  );
}
