import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CabecalhoPagina from "@/components/CabecalhoPagina";
import AcompanharOcorrencia from "@/components/AcompanharOcorrencia";
import { ocorrencias, prefeitura } from "@/config/prefeitura";
import { STATUS } from "@/lib/ocorrencias";

export const metadata: Metadata = {
  title: `Acompanhar ocorrência | ${prefeitura.prefeitura.nome}`,
};

export default function PaginaAcompanhar() {
  if (!ocorrencias.habilitado) notFound();
  const categorias = Object.fromEntries(ocorrencias.categorias.map((c) => [c.slug, c.titulo]));
  return (
    <main className="flex min-h-screen w-full flex-col items-center bg-slate-100 px-4 pt-6 pb-16">
      <div className="w-full max-w-md">
        <CabecalhoPagina titulo="Acompanhar ocorrência" voltar="/ocorrencias" />
        <AcompanharOcorrencia categorias={categorias} status={STATUS} />
      </div>
    </main>
  );
}
