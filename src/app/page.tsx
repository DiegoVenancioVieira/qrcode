import Image from "next/image";
import { SearchX, ShieldCheck } from "lucide-react";
import BotaoAssistente from "@/components/BotaoAssistente";
import BuscaServicos from "@/components/BuscaServicos";
import ChatWidget from "@/components/ChatWidget";
import {
  chat,
  prefeitura,
  servicos,
  type ServicoComIcone,
} from "@/config/prefeitura";

const LISTA_ID = "lista-servicos";

/**
 * Cartão de serviço em grade, no estilo de tela inicial de app: ícone em
 * destaque e título curto. A descrição fica como dica e entra na busca.
 */
function ServiceTile({ service }: { service: ServicoComIcone }) {
  const Icon = service.Icone;

  return (
    <li data-busca={`${service.titulo} ${service.descricao}`}>
      <a
        href={service.url}
        target="_blank"
        rel="noopener noreferrer"
        title={service.descricao}
        className="group flex h-full flex-col items-center gap-2 rounded-2xl bg-white px-2 pt-4 pb-3 text-center shadow-sm ring-1 ring-slate-200/70 transition-all duration-150 hover:shadow-md hover:ring-primaria-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primaria-500 active:scale-95"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primaria-50 text-primaria-600 transition-colors group-hover:bg-primaria-600 group-hover:text-white">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <span className="line-clamp-2 text-[13px] leading-tight font-semibold text-slate-700">
          {service.titulo}
        </span>
        <span className="sr-only">{service.descricao}</span>
      </a>
    </li>
  );
}

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center bg-slate-100 pb-28">
      {/* Cabeçalho com a identidade da prefeitura e a busca */}
      <header className="w-full rounded-b-[2rem] bg-gradient-to-br from-primaria-700 via-primaria-600 to-primaria-500 px-4 pt-8 pb-16 text-white">
        <div className="mx-auto flex max-w-md flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-white p-1 shadow-md">
              <Image
                src={prefeitura.marca.logo}
                alt={prefeitura.marca.logoAlt}
                fill
                sizes="56px"
                className="object-contain p-1"
                priority
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-wide text-white/75 uppercase">
                Serviços digitais
              </p>
              <h1 className="truncate text-lg leading-tight font-bold">
                {prefeitura.prefeitura.nome}
              </h1>
            </div>
          </div>

          <div>
            <p className="text-2xl leading-snug font-bold">Olá! Como podemos ajudar?</p>
            <p className="mt-1 text-sm text-white/80">{prefeitura.textos.subtitulo}</p>
          </div>

          <BuscaServicos alvo={LISTA_ID} />
        </div>
      </header>

      <div className="relative z-10 -mt-10 flex w-full max-w-md flex-1 flex-col gap-6 px-4">
        {chat.habilitado && <BotaoAssistente titulo={chat.titulo} />}

        <section aria-labelledby="titulo-servicos">
          <h2
            id="titulo-servicos"
            className={`mb-3 px-1 text-sm font-semibold tracking-wide text-slate-500 uppercase ${
              chat.habilitado ? "" : "mt-14"
            }`}
          >
            Serviços
          </h2>
          <nav aria-label={prefeitura.textos.rotuloListaServicos}>
            <ul id={LISTA_ID} className="grid grid-cols-3 gap-3">
              {servicos.map((service) => (
                <ServiceTile key={service.id} service={service} />
              ))}
            </ul>
          </nav>
          <div
            id={`${LISTA_ID}-vazio`}
            hidden
            className="flex flex-col items-center gap-2 rounded-2xl bg-white px-6 py-8 text-center text-sm text-slate-500 ring-1 ring-slate-200/70"
          >
            <SearchX className="h-6 w-6 text-slate-400" aria-hidden="true" />
            Nenhum serviço encontrado.
            {chat.habilitado && " Pergunte ao assistente virtual."}
          </div>
        </section>

        {/* Rodapé */}
        <footer className="mt-auto pt-6 text-center">
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
          atendimento={chat.atendimento}
        />
      )}
    </main>
  );
}
