import * as Lucide from "lucide-react";
import type { LucideIcon } from "lucide-react";
import dados from "../../config/prefeitura.json";

/**
 * Configuração de uma prefeitura (tenant).
 *
 * Tudo o que muda de uma prefeitura para outra fica em
 * `config/prefeitura.json`. Para replicar o hub em outro município, basta
 * editar esse arquivo e trocar os assets em `public/` (logo, favicon etc.).
 */

/** Tons da cor primária usados na interface (escala Tailwind). */
export type PaletaPrimaria = Record<"50" | "100" | "300" | "500" | "600", string>;

/**
 * Estrutura de um link de serviço.
 *
 * Modelada para espelhar a resposta de uma coleção do Directus (CMS Headless).
 * `icone` é o nome de um ícone do lucide-react (ex.: "Landmark", "HeartPulse").
 * Catálogo: https://lucide.dev/icons
 */
export type Servico = {
  id: number;
  titulo: string;
  descricao: string;
  icone: string;
  url: string;
};

export type ConfigPrefeitura = {
  prefeitura: {
    /** Nome curto exibido no cabeçalho. */
    nome: string;
    /** Nome oficial exibido no rodapé (copyright). */
    nomeOficial: string;
    municipio: string;
    uf: string;
  };
  site: {
    /** URL pública do hub (usada em metadados/Open Graph). */
    url: string;
    titulo: string;
    descricao: string;
    idioma: string;
  };
  marca: {
    /** Caminho em `public/` ou URL absoluta. */
    logo: string;
    logoAlt: string;
    favicon: string;
  };
  tema: {
    primaria: PaletaPrimaria;
  };
  textos: {
    subtitulo: string;
    rotuloListaServicos: string;
    seloSeguranca: string;
  };
  servicos: Servico[];
};

const TONS_PRIMARIA = ["50", "100", "300", "500", "600"] as const;
const COR_HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function ehIcone(valor: unknown): valor is LucideIcon {
  return typeof valor === "object" && valor !== null && "render" in valor;
}

/**
 * Valida a configuração no build/inicialização, para que erros de digitação
 * no JSON apareçam com uma mensagem clara em vez de uma página quebrada.
 */
function validar(config: ConfigPrefeitura): ConfigPrefeitura {
  const erros: string[] = [];

  const obrigatorios: [string, unknown][] = [
    ["prefeitura.nome", config.prefeitura?.nome],
    ["prefeitura.nomeOficial", config.prefeitura?.nomeOficial],
    ["site.url", config.site?.url],
    ["site.titulo", config.site?.titulo],
    ["site.descricao", config.site?.descricao],
    ["site.idioma", config.site?.idioma],
    ["marca.logo", config.marca?.logo],
    ["marca.logoAlt", config.marca?.logoAlt],
    ["marca.favicon", config.marca?.favicon],
  ];
  for (const [campo, valor] of obrigatorios) {
    if (typeof valor !== "string" || valor.trim() === "") {
      erros.push(`"${campo}" é obrigatório.`);
    }
  }

  for (const tom of TONS_PRIMARIA) {
    const cor = config.tema?.primaria?.[tom];
    if (typeof cor !== "string" || !COR_HEX.test(cor)) {
      erros.push(`"tema.primaria.${tom}" deve ser uma cor hexadecimal (ex.: #059669).`);
    }
  }

  const ids = new Set<number>();
  (config.servicos ?? []).forEach((servico, i) => {
    const ref = `servicos[${i}]`;
    if (ids.has(servico.id)) erros.push(`${ref}: id ${servico.id} duplicado.`);
    ids.add(servico.id);
    if (!servico.titulo) erros.push(`${ref}: "titulo" é obrigatório.`);
    if (!servico.url) erros.push(`${ref}: "url" é obrigatória.`);
    if (!ehIcone(Lucide[servico.icone as keyof typeof Lucide])) {
      erros.push(`${ref}: ícone "${servico.icone}" não existe no lucide-react.`);
    }
  });

  if (erros.length > 0) {
    throw new Error(
      `Configuração inválida em config/prefeitura.json:\n- ${erros.join("\n- ")}`,
    );
  }
  return config;
}

export const prefeitura = validar(dados as ConfigPrefeitura);

export type ServicoComIcone = Servico & { Icone: LucideIcon };

/** Serviços com o nome do ícone já resolvido para o componente do lucide-react. */
export const servicos: ServicoComIcone[] = prefeitura.servicos.map((servico) => ({
  ...servico,
  Icone: Lucide[servico.icone as keyof typeof Lucide] as LucideIcon,
}));

/** Variáveis CSS da cor primária, consumidas pelo tema em `globals.css`. */
export function variaveisDoTema(): Record<string, string> {
  return Object.fromEntries(
    TONS_PRIMARIA.map((tom) => [`--primaria-${tom}`, prefeitura.tema.primaria[tom]]),
  );
}
