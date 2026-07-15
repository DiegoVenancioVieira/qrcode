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

## Assets

- `public/logo.png` — brasão/logo da Prefeitura (avatar do cabeçalho)
- `public/favicon.ico` / `src/app/favicon.ico` — favicon
