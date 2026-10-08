import Image from "next/image";
import { ChevronRight, ShieldCheck } from "lucide-react";
import ChatWidget from "@/components/ChatWidget";
import {
  chat,
  prefeitura,
  servicos,
  type ServicoComIcone,
} from "@/config/prefeitura";

/**
 * Botão de serviço em bloco.
 * Ícone à esquerda (com fundo sutil), textos ao centro e seta à direita.
 * Inclui feedback tátil (afundamento ao toque) para uso predominante em mobile.
 */
function ServiceButton({ service }: { service: ServicoComIcone }) {
  const Icon = service.Icone;

  return (
    <a
      href={service.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-150 hover:border-primaria-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria-500 focus-visible:ring-offset-2 active:scale-[0.98]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primaria-50 text-primaria-600 transition-colors group-hover:bg-primaria-100">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>

      <span className="flex min-w-0 flex-1 flex-col text-left">
        <span className="truncate font-semibold text-slate-800">
          {service.titulo}
        </span>
        <span className="truncate text-sm text-slate-500">
          {service.descricao}
        </span>
      </span>

      <ChevronRight
        className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-primaria-600"
        aria-hidden="true"
      />
    </a>
  );
}

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center bg-slate-100 px-4 pt-10 pb-24">
      <div className="flex w-full max-w-md flex-1 flex-col">
        {/* Cabeçalho */}
        <header className="flex flex-col items-center text-center">
          <div className="relative h-24 w-24 overflow-hidden rounded-full bg-white shadow-md ring-4 ring-primaria-500/80">
            <Image
              src={prefeitura.marca.logo}
              alt={prefeitura.marca.logoAlt}
              fill
              sizes="96px"
              className="object-cover"
              priority
            />
          </div>

          <h1 className="mt-4 text-xl font-bold text-slate-800">
            {prefeitura.prefeitura.nome}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {prefeitura.textos.subtitulo}
          </p>
        </header>

        {/* Lista de serviços */}
        <nav
          aria-label={prefeitura.textos.rotuloListaServicos}
          className="mt-8 flex flex-col gap-3"
        >
          {servicos.map((service) => (
            <ServiceButton key={service.id} service={service} />
          ))}
        </nav>

        {/* Rodapé */}
        <footer className="mt-auto pt-10 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{prefeitura.textos.seloSeguranca}</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            © {new Date().getFullYear()} {prefeitura.prefeitura.nomeOficial}
          </p>
        </footer>
      </div>

      {chat.habilitado && (
        <ChatWidget
          nomePrefeitura={prefeitura.prefeitura.nome}
          titulo={chat.titulo}
          rotuloBotao={chat.rotuloBotao}
          aviso={chat.aviso}
        />
      )}
    </main>
  );
}
