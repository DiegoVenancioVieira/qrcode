import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Search } from "lucide-react";
import CabecalhoPagina from "@/components/CabecalhoPagina";
import OcorrenciaForm from "@/components/OcorrenciaForm";
import { categoriasOcorrencia, ocorrencias, prefeitura } from "@/config/prefeitura";
import { LIMITES } from "@/lib/ocorrencias";

export const metadata: Metadata = {
  title: `${ocorrencias.rotuloBotao || "Ocorrências"} | ${prefeitura.prefeitura.nome}`,
};

export default function PaginaOcorrencias() {
  if (!ocorrencias.habilitado) notFound();

  // Os ícones são renderizados aqui (servidor) para o formulário não carregar
  // o pacote inteiro do lucide no navegador.
  const categorias = categoriasOcorrencia.map(({ Icone, ...c }) => ({
    slug: c.slug,
    titulo: c.titulo,
    descricao: c.descricao,
    icone: <Icone className="h-5 w-5" aria-hidden="true" />,
  }));

  return (
    <main className="flex min-h-screen w-full flex-col items-center bg-slate-100 px-4 pt-6 pb-16">
      <div className="w-full max-w-md">
        <CabecalhoPagina
          titulo={ocorrencias.rotuloBotao}
          subtitulo="Escolha o tipo de problema, mostre onde fica e envie. Leva menos de 1 minuto."
        />
        <OcorrenciaForm categorias={categorias} aviso={ocorrencias.aviso} limites={LIMITES} />
        <Link
          href="/ocorrencias/acompanhar"
          className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-primaria-700"
        >
          <Search className="h-4 w-4" aria-hidden="true" /> Já registrou? Acompanhe pelo protocolo
        </Link>
      </div>
    </main>
  );
}
