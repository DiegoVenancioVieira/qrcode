import * as Lucide from "lucide-react";
import type { LucideIcon } from "lucide-react";
import aracaju from "../../config/prefeituras/aracaju.json";
import araua from "../../config/prefeituras/araua.json";

/**
 * Configuração de uma prefeitura (tenant).
 *
 * Cada prefeitura tem um arquivo em `config/prefeituras/<slug>.json` e seus
 * assets em `public/prefeituras/<slug>/`. A prefeitura do deploy é escolhida
 * pela variável de ambiente `PREFEITURA` (padrão: "aracaju"), lida no build.
 */

/** Tons da cor primária usados na interface (escala Tailwind). */
export type PaletaPrimaria = Record<"50" | "100" | "300" | "500" | "600" | "700", string>;

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

/**
 * Assistente virtual (chat com o Agente de FAQ Municipal). Opcional: sem esta
 * seção, ou com `habilitado: false`, o botão do chat não aparece. Mesmo
 * habilitado, o botão só aparece se o servidor tiver `AGENTE_API_URL`.
 */
export type ConfigChat = {
  habilitado: boolean;
  /** Título do painel (ex.: "Assistente virtual"). */
  titulo: string;
  /** Texto do botão flutuante (ex.: "Tire suas dúvidas"). */
  rotuloBotao: string;
  /** Aviso de IA/privacidade exibido abaixo do campo de digitação. */
  aviso: string;
};

/** Tipo de problema que o cidadão pode registrar (ex.: poste apagado). */
export type CategoriaOcorrencia = {
  /** Identificador estável, gravado no registro (ex.: "iluminacao"). */
  slug: string;
  titulo: string;
  descricao: string;
  /** Nome de um ícone do lucide-react. */
  icone: string;
};

/**
 * Registro de ocorrências pelo cidadão (zeladoria). Opcional: sem esta seção,
 * ou com `habilitado: false`, o botão e as páginas de ocorrência não aparecem.
 */
export type ConfigOcorrencias = {
  habilitado: boolean;
  /** Texto do botão de destaque no hub. */
  rotuloBotao: string;
  /** Linha de apoio do botão (ex.: exemplos de problemas). */
  descricaoBotao: string;
  /** Aviso de privacidade exibido no formulário. */
  aviso: string;
  categorias: CategoriaOcorrencia[];
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
    /**
     * URL pública do hub (metadados/Open Graph). Opcional: no deploy vale o
     * domínio do Coolify (`SITE_URL` ou `COOLIFY_URL`), ver `urlDoSite()`.
     */
    url?: string;
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
  chat?: ConfigChat;
  ocorrencias?: ConfigOcorrencias;
};

const TONS_PRIMARIA = ["50", "100", "300", "500", "600", "700"] as const;
const COR_HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function ehIcone(valor: unknown): valor is LucideIcon {
  return typeof valor === "object" && valor !== null && "render" in valor;
}

/**
 * Valida a configuração no build/inicialização, para que erros de digitação
 * no JSON apareçam com uma mensagem clara em vez de uma página quebrada.
 */
function validar(slug: string, config: ConfigPrefeitura): ConfigPrefeitura {
  const erros: string[] = [];

  const obrigatorios: [string, unknown][] = [
    ["prefeitura.nome", config.prefeitura?.nome],
    ["prefeitura.nomeOficial", config.prefeitura?.nomeOficial],
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

  if (config.chat !== undefined) {
    if (typeof config.chat.habilitado !== "boolean") {
      erros.push(`"chat.habilitado" deve ser true ou false.`);
    }
    if (config.chat.habilitado) {
      for (const campo of ["titulo", "rotuloBotao", "aviso"] as const) {
        const valor = config.chat[campo];
        if (typeof valor !== "string" || valor.trim() === "") {
          erros.push(`"chat.${campo}" é obrigatório quando o chat está habilitado.`);
        }
      }
    }
  }

  if (config.ocorrencias !== undefined) {
    const oc = config.ocorrencias;
    if (typeof oc.habilitado !== "boolean") {
      erros.push(`"ocorrencias.habilitado" deve ser true ou false.`);
    }
    if (oc.habilitado) {
      for (const campo of ["rotuloBotao", "descricaoBotao", "aviso"] as const) {
        if (typeof oc[campo] !== "string" || oc[campo].trim() === "") {
          erros.push(`"ocorrencias.${campo}" é obrigatório quando habilitado.`);
        }
      }
      if (!Array.isArray(oc.categorias) || oc.categorias.length === 0) {
        erros.push(`"ocorrencias.categorias" precisa de ao menos uma categoria.`);
      }
      const slugs = new Set<string>();
      (oc.categorias ?? []).forEach((cat, i) => {
        const ref = `ocorrencias.categorias[${i}]`;
        if (!/^[a-z0-9-]{1,40}$/.test(cat.slug ?? "")) {
          erros.push(`${ref}: "slug" deve ter letras minúsculas, números ou hífen.`);
        }
        if (slugs.has(cat.slug)) erros.push(`${ref}: slug "${cat.slug}" duplicado.`);
        slugs.add(cat.slug);
        if (!cat.titulo) erros.push(`${ref}: "titulo" é obrigatório.`);
        if (!ehIcone(Lucide[cat.icone as keyof typeof Lucide])) {
          erros.push(`${ref}: ícone "${cat.icone}" não existe no lucide-react.`);
        }
      });
    }
  }

  if (erros.length > 0) {
    throw new Error(
      `Configuração inválida em config/prefeituras/${slug}.json:\n- ${erros.join("\n- ")}`,
    );
  }
  return config;
}

/**
 * Prefeituras disponíveis. Para adicionar uma nova, crie o JSON em
 * `config/prefeituras/` e registre-o aqui.
 */
const PREFEITURAS: Record<string, ConfigPrefeitura> = {
  aracaju,
  araua,
};

const PREFEITURA_PADRAO = "aracaju";

function carregar(): ConfigPrefeitura {
  const slug = process.env.PREFEITURA?.trim().toLowerCase() || PREFEITURA_PADRAO;
  const config = PREFEITURAS[slug];
  if (!config) {
    throw new Error(
      `PREFEITURA="${slug}" não encontrada. Opções: ${Object.keys(PREFEITURAS).join(", ")}.`,
    );
  }
  return validar(slug, config);
}

export const prefeitura = carregar();

export type ServicoComIcone = Servico & { Icone: LucideIcon };

/** Serviços com o nome do ícone já resolvido para o componente do lucide-react. */
export const servicos: ServicoComIcone[] = prefeitura.servicos.map((servico) => ({
  ...servico,
  Icone: Lucide[servico.icone as keyof typeof Lucide] as LucideIcon,
}));

/**
 * URL pública do hub, na ordem: `SITE_URL` (definida à mão), `COOLIFY_URL`
 * (injetada pelo Coolify com o domínio configurado na aplicação; se houver
 * vários, vale o primeiro) e por fim `site.url` do JSON. Sem nenhuma, os
 * metadados saem com caminhos relativos.
 */
export function urlDoSite(): URL | undefined {
  const candidatos = [
    process.env.SITE_URL,
    process.env.COOLIFY_URL?.split(",")[0],
    prefeitura.site.url,
  ];
  for (const valor of candidatos) {
    const url = valor?.trim();
    if (!url) continue;
    try {
      return new URL(url);
    } catch {
      throw new Error(`URL do site inválida: "${url}".`);
    }
  }
  return undefined;
}

/** Configuração do chat; ausente no JSON equivale a desabilitado. */
export const chat: ConfigChat = prefeitura.chat ?? {
  habilitado: false,
  titulo: "",
  rotuloBotao: "",
  aviso: "",
};

/** Variáveis CSS da cor primária, consumidas pelo tema em `globals.css`. */
export function variaveisDoTema(): Record<string, string> {
  return Object.fromEntries(
    TONS_PRIMARIA.map((tom) => [`--primaria-${tom}`, prefeitura.tema.primaria[tom]]),
  );
}

/** Configuração de ocorrências; ausente no JSON equivale a desabilitado. */
export const ocorrencias: ConfigOcorrencias = prefeitura.ocorrencias ?? {
  habilitado: false,
  rotuloBotao: "",
  descricaoBotao: "",
  aviso: "",
  categorias: [],
};

export type CategoriaComIcone = CategoriaOcorrencia & { Icone: LucideIcon };

/** Categorias com o ícone já resolvido (uso em server components). */
export const categoriasOcorrencia: CategoriaComIcone[] = ocorrencias.categorias.map(
  (cat) => ({ ...cat, Icone: Lucide[cat.icone as keyof typeof Lucide] as LucideIcon }),
);
