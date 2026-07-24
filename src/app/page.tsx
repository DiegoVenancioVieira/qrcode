import Image from "next/image";
import {
  ChevronRight,
  FileText,
  HeartHandshake,
  HeartPulse,
  Landmark,
  MapPin,
  Phone,
  Receipt,
  ShieldCheck,
  Siren,
  type LucideIcon,
} from "lucide-react";

/**
 * Estrutura de um link de serviço.
 *
 * Modelada para espelhar a resposta de uma coleção do Directus (CMS Headless).
 * Quando a integração for feita, basta trocar o mock `serviceLinks` por um
 * `fetch` à API e manter este mesmo contrato de dados.
 */
type ServiceLink = {
  id: number;
  title: string;
  description: string;
  icon: LucideIcon;
  url: string;
};

/**
 * Mock temporário dos serviços digitais da Prefeitura.
 * TODO: substituir por dados vindos do Directus (`GET /items/servicos`).
 */
const serviceLinks: ServiceLink[] = [
  {
    id: 1,
    title: "Portal do Cidadão",
    description: "Acesse todos os serviços online",
    icon: Landmark,
    url: "https://www.aracaju.se.gov.br",
  },
  {
    id: 2,
    title: "2ª Via de IPTU",
    description: "Emita e pague seu carnê",
    icon: Receipt,
    url: "https://www.aracaju.se.gov.br",
  },
  {
    id: 3,
    title: "Agendamento de Saúde",
    description: "Marque consultas e exames",
    icon: HeartPulse,
    url: "https://www.aracaju.se.gov.br",
  },
  {
    id: 4,
    title: "Protocolo Digital",
    description: "Abra e acompanhe solicitações",
    icon: FileText,
    url: "https://www.aracaju.se.gov.br",
  },
  {
    id: 5,
    title: "Ouvidoria",
    description: "Registre elogios, dúvidas e denúncias",
    icon: Phone,
    url: "https://www.aracaju.se.gov.br",
  },
  {
    id: 6,
    title: "Mapa de Serviços",
    description: "Encontre unidades próximas de você",
    icon: MapPin,
    url: "https://www.aracaju.se.gov.br",
  },
  {
    id: 7,
    title: "SIGMA · SerMulher",
    description: "Gestão do atendimento à mulher",
    icon: HeartHandshake,
    url: "https://sigma-sermulher.aracaju.se.gov.br",
  },
  {
    id: 8,
    title: "Patrulha Maria da Penha",
    description: "Central de proteção à mulher",
    icon: Siren,
    url: "https://sosmulher-sermulher.aracaju.se.gov.br",
  },
];

/**
 * Botão de serviço em bloco.
 * Ícone à esquerda (com fundo sutil), textos ao centro e seta à direita.
 * Inclui feedback tátil (afundamento ao toque) para uso predominante em mobile.
 */
function ServiceButton({ service }: { service: ServiceLink }) {
  const Icon = service.icon;

  return (
    <a
      href={service.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-150 hover:border-emerald-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.98]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-100">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>

      <span className="flex min-w-0 flex-1 flex-col text-left">
        <span className="truncate font-semibold text-slate-800">
          {service.title}
        </span>
        <span className="truncate text-sm text-slate-500">
          {service.description}
        </span>
      </span>

      <ChevronRight
        className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600"
        aria-hidden="true"
      />
    </a>
  );
}

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center bg-slate-100 px-4 py-10">
      <div className="flex w-full max-w-md flex-1 flex-col">
        {/* Cabeçalho */}
        <header className="flex flex-col items-center text-center">
          <div className="relative h-24 w-24 overflow-hidden rounded-full bg-white shadow-md ring-4 ring-emerald-500/80">
            <Image
              src="/logo.png"
              alt="Brasão da Prefeitura de Aracaju"
              fill
              sizes="96px"
              className="object-cover"
              priority
            />
          </div>

          <h1 className="mt-4 text-xl font-bold text-slate-800">
            Prefeitura de Aracaju
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Toque em um serviço abaixo para acessar rapidamente.
          </p>
        </header>

        {/* Lista de serviços */}
        <nav
          aria-label="Serviços digitais da Prefeitura"
          className="mt-8 flex flex-col gap-3"
        >
          {serviceLinks.map((service) => (
            <ServiceButton key={service.id} service={service} />
          ))}
        </nav>

        {/* Rodapé */}
        <footer className="mt-auto pt-10 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Ambiente oficial e seguro</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            © {new Date().getFullYear()} Prefeitura Municipal de Aracaju
          </p>
        </footer>
      </div>
    </main>
  );
}
