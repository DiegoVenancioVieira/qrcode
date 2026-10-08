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

Este projeto é a base para replicar o hub em outras prefeituras. **Tudo o que
muda de um município para outro fica em um único arquivo:
[`config/prefeitura.json`](config/prefeitura.json).** O código em `src/` não
contém nenhuma informação específica de Aracaju.

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
inválidas, ícones inexistentes ou `id`s duplicados interrompem o `npm run build`
com uma mensagem indicando o campo com problema.

### Como replicar para outra prefeitura

1. Edite `config/prefeitura.json` com os dados do novo município.
2. Substitua `public/logo.png` e `public/favicon.ico` (ou aponte `marca.logo` /
   `marca.favicon` para os novos arquivos).
3. Remova de `public/` as apresentações exclusivas de Aracaju que não se
   aplicam (`observatorio`, `painel-pgd-aju`, `patrulha-maria-da-penha`,
   `busaju`, `mia`, `qrcode-hub` — `.html`/`.pdf` — além de `aju.png` e
   `comite.png`) e os serviços que apontam para elas.
4. Rode `npm run build` para validar e gere a imagem Docker normalmente.

## Estrutura de dados

O contrato dos serviços (`id`, `titulo`, `descricao`, `icone`, `url`) foi
modelado para ser substituído futuramente por uma coleção do **Directus**
(CMS Headless). O carregamento e a validação ficam em
[`src/config/prefeitura.ts`](src/config/prefeitura.ts) — basta trocar a
leitura do JSON por uma chamada `fetch` à API mantendo o mesmo formato.

## Assets

- `public/logo.png` — brasão/logo da Prefeitura (avatar do cabeçalho)
- `public/favicon.ico` — favicon
