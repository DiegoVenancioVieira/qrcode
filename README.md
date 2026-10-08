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

O domínio do hub é o que estiver configurado na aplicação do Coolify (o
domínio coringa permite qualquer subdomínio, ex.: `araua.<dominio-coringa>`).
O Coolify repassa esse endereço em `COOLIFY_URL`, usado nos metadados de
compartilhamento. Para forçar outro endereço, defina `SITE_URL` (também como
**Build Variable**).

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
| `site.url` | Opcional. URL pública do hub, base dos metadados Open Graph. No deploy vale o domínio configurado no Coolify (`COOLIFY_URL`) ou a variável `SITE_URL`, que têm prioridade sobre este campo |
| `site.titulo` / `site.descricao` | `<title>`, meta description e prévia ao compartilhar o link |
| `site.idioma` | Atributo `lang` do HTML e locale do Open Graph |
| `marca.logo` / `marca.logoAlt` | Brasão/logo do cabeçalho (caminho em `public/` ou URL) e texto alternativo |
| `marca.favicon` | Ícone da aba do navegador |
| `tema.primaria` | Cor da prefeitura nos tons `50`, `100`, `300`, `500`, `600` e `700` (hex) — também define a `theme-color` do navegador no celular (tom `600`) |
| `textos.*` | Subtítulo do cabeçalho, rótulo de acessibilidade da lista e selo do rodapé |
| `servicos[]` | Botões do hub: `id`, `titulo`, `descricao`, `icone` e `url` |
| `chat.habilitado` | Liga o assistente virtual (opcional; seção ausente = desligado). O botão só aparece se o servidor também tiver `AGENTE_API_URL` |
| `chat.titulo` / `chat.rotuloBotao` | Título do painel do chat e texto do botão flutuante |
| `chat.aviso` | Aviso de IA/privacidade abaixo do campo de digitação |

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

## Assistente virtual (chat)

O botão flutuante (`chat.rotuloBotao`) abre um chat com o Agente de FAQ
Municipal (repo `agente_inteligente`), com seletor de secretaria — a lista vem
do próprio agente. Textos e cor vêm da configuração da prefeitura.

O botão só aparece quando as duas condições valem:

1. `chat.habilitado: true` no JSON da prefeitura (lido no **build**);
2. `AGENTE_API_URL` definida no servidor (lida em **runtime**, consultada pelo
   widget em `GET /api/chat/status`, que não chama o agente).

- `src/components/ChatWidget.tsx` — widget (client component). A conversa fica
  só em memória, sem `localStorage`.
- `src/app/api/chat/route.ts` — repassa `POST /api/chat` para `POST {agente}/ask`.
- `src/app/api/chat/secretarias/route.ts` — repassa para `GET {agente}/secretarias`.
- `src/app/api/chat/status/route.ts` — informa se este deploy tem agente.

O navegador nunca fala direto com o agente: o endereço dele fica oculto e não há
bloqueio de conteúdo misto (hub em HTTPS, agente em HTTP).

Configure a variável de ambiente (veja `.env.example`):

```bash
AGENTE_API_URL=http://faq-cache:8000   # endereço interno do agente
```

Cada prefeitura aponta para o seu próprio agente. Sem a variável, o botão do
chat não aparece. O IP do cidadão é repassado
no `X-Forwarded-For` para o rate-limit do agente valer por pessoa; no agente,
defina `TRUSTED_PROXIES` com as redes Docker do Traefik e do hub
(ex.: `172.16.0.0/12,10.0.0.0/8`).

## Assets

- `public/logo.png`, `public/favicon.ico` — brasão e favicon de Aracaju
- `public/prefeituras/<slug>/` — assets das demais prefeituras
