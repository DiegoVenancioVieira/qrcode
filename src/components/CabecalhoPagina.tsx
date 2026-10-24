import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Cabeçalho das páginas internas: voltar + título. */
export default function CabecalhoPagina({
  titulo,
  subtitulo,
  voltar = "/",
}: {
  titulo: string;
  subtitulo?: string;
  voltar?: string;
}) {
  return (
    <header className="mb-5">
      <Link href={voltar} className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-primaria-700">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar
      </Link>
      <h1 className="mt-3 text-xl font-bold text-slate-800">{titulo}</h1>
      {subtitulo && <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>}
    </header>
  );
}
