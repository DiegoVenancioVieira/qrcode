# QR Code — Hub de Serviços da Prefeitura de Aracaju

Landing page no estilo **Linktree** para o subdomínio `qrcode.aracaju.se.gov.br`.
Funciona como um hub de acesso rápido aos serviços digitais da Prefeitura,
otimizada para acesso via celular a partir da leitura de QR Codes (mobile-first).

## Stack

- **Next.js 16** (App Router)
- **React 19**
- **Tailwind CSS v4**
- **lucide-react** (ícones)
- **TypeScript**

## Como rodar

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Configuração por prefeitura

Um único código atende várias prefeituras — **um deploy por prefeitura**. Tudo
o que muda de um município para outro fica em
`config/prefeituras/<slug>.json`, com os assets (logo, favicon) em
`public/prefeituras/<slug>/`. O código em `src/` não contém dados de nenhum
município.

A prefeitura do deploy é escolhida pela variável de ambiente **`PREFEITURA`**
(padrão: `aracaju`). Como a página é gerada no build, a variável precisa
existir **no build**:

```bash
PREFEITURA=araua npm run dev      # desenvolvimento
PREFEITURA=araua npm run build    # produção
docker build --build-arg PREFEITURA=araua -t qrcode-araua .
```

No PowerShell: `$env:PREFEITURA="araua"; npm run dev`.
No Coolify: cadastre `PREFEITURA` nas variáveis de ambiente da aplicação
marcando **Build Variable**.

| Prefeitura | `PREFEITURA` | Arquivo |
| --- | --- | --- |
| Aracaju | `aracaju` | [`config/prefeituras/aracaju.json`](config/prefeituras/aracaju.json) |
| Arauá | `araua` | [`config/prefeituras/araua.json`](config/prefeituras/araua.json) |

### Campos

| Campo | O que controla |
| --- | --- |
| `prefeitura.nome` | Nome exibido no cabeçalho (ex.: "Prefeitura de Aracaju") |
| `prefeitura.nomeOficial` | Nome no rodapé/copyright (ex.: "Prefeitura Municipal de Aracaju") |
| `prefeitura.municipio` / `prefeitura.uf` | Município e estado (informativo) |
| `site.url` | URL pública do hub (base dos metadados Open Graph) |
| `site.titulo` / `site.descricao` | `<title>`, meta description e prévia ao compartilhar o link |
| `site.idioma` | Atributo `lang` do HTML e locale do Open Graph |
| `marca.logo` / `marca.logoAlt` | Brasão/logo do cabeçalho (caminho em `public/` ou URL) e texto alternativo |
| `marca.favicon` | Ícone da aba do navegador |
| `tema.primaria` | Cor da prefeitura nos tons `50`, `100`, `300`, `500` e `600` (hex) — também define a `theme-color` do navegador no celular (tom `600`) |
| `textos.*` | Subtítulo do cabeçalho, rótulo de acessibilidade da lista e selo do rodapé |
| `servicos[]` | Botões do hub: `id`, `titulo`, `descricao`, `icone` e `url` |

O campo `icone` aceita o nome de qualquer ícone do
[lucide](https://lucide.dev/icons) em PascalCase (ex.: `Landmark`,
`HeartPulse`, `Bus`). Para gerar a escala de tons da cor primária, uma
ferramenta como [uicolors.app](https://uicolors.app) ajuda.

A configuração é validada durante o build: campos obrigatórios vazios, cores
inválidas, ícones inexistentes, `id`s duplicados ou um `PREFEITURA`
desconhecido interrompem o `npm run build` com uma mensagem indicando o
problema.

### Como adicionar uma nova prefeitura

1. Copie `config/prefeituras/araua.json` para `config/prefeituras/<slug>.json`
   e preencha os dados do município.
2. Coloque o brasão/favicon em `public/prefeituras/<slug>/` e aponte
   `marca.logo` / `marca.favicon` para eles.
3. Registre o JSON no mapa `PREFEITURAS` em
   [`src/config/prefeitura.ts`](src/config/prefeitura.ts).
4. Rode `PREFEITURA=<slug> npm run build` para validar e crie no Coolify uma
   aplicação com `PREFEITURA=<slug>`.

As apresentações em `public/*.html|pdf` (Observatório, PGD-AJU, Patrulha
Maria da Penha, BusAju, MIA, hub) são conteúdo de Aracaju e só são
referenciadas pela configuração de Aracaju.

## Estrutura de dados

O contrato dos serviços (`id`, `titulo`, `descricao`, `icone`, `url`) foi
modelado para ser substituído futuramente por uma coleção do **Directus**
(CMS Headless). O carregamento e a validação ficam em
[`src/config/prefeitura.ts`](src/config/prefeitura.ts) — basta trocar a
leitura do JSON por uma chamada `fetch` à API mantendo o mesmo formato.

## Assets

- `public/logo.png`, `public/favicon.ico` — brasão e favicon de Aracaju
- `public/prefeituras/<slug>/` — assets das demais prefeituras
