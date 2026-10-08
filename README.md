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

## Estrutura de dados

Os serviços são definidos no array `serviceLinks` em
[`src/app/page.tsx`](src/app/page.tsx). O contrato de dados
(`id`, `title`, `description`, `icon`, `url`) foi modelado para ser
substituído futuramente por uma coleção do **Directus** (CMS Headless),
bastando trocar o mock por uma chamada `fetch` à API.

## Assistente virtual (chat)

O botão **"Tire suas dúvidas"** abre um chat com o Agente de FAQ Municipal
(repo `agente_inteligente`), com seletor de secretaria (SEMDE, PROCON,
SERMULHER, IntegrAju — a lista vem do próprio agente).

- `src/components/ChatWidget.tsx` — widget (client component). A conversa fica
  só em memória, sem `localStorage`.
- `src/app/api/chat/route.ts` — repassa `POST /api/chat` para `POST {agente}/ask`.
- `src/app/api/chat/secretarias/route.ts` — repassa para `GET {agente}/secretarias`.

O navegador nunca fala direto com o agente: o endereço dele fica oculto e não há
bloqueio de conteúdo misto (hub em HTTPS, agente em HTTP).

Configure a variável de ambiente (veja `.env.example`):

```bash
AGENTE_API_URL=http://faq-cache:8000   # endereço interno do agente
```

Sem ela, o widget mostra "assistente indisponível". O IP do cidadão é repassado
no `X-Forwarded-For` para o rate-limit do agente valer por pessoa; no agente,
use `TRUSTED_PROXY_HOPS=1`.

## Assets

- `public/logo.png` — brasão/logo da Prefeitura (avatar do cabeçalho)
- `public/favicon.ico` / `src/app/favicon.ico` — favicon
