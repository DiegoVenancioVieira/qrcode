import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { prefeitura, urlDoSite, variaveisDoTema } from "@/config/prefeitura";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Sem domínio conhecido no build, a URL e a imagem de prévia ficariam
// relativas ou apontando para localhost; nesse caso elas são omitidas.
const urlSite = urlDoSite();

export const metadata: Metadata = {
  metadataBase: urlSite,
  title: prefeitura.site.titulo,
  description: prefeitura.site.descricao,
  icons: { icon: prefeitura.marca.favicon },
  openGraph: {
    type: "website",
    url: urlSite ? "/" : undefined,
    title: prefeitura.site.titulo,
    description: prefeitura.site.descricao,
    siteName: prefeitura.prefeitura.nome,
    locale: prefeitura.site.idioma.replace("-", "_"),
    images: urlSite
      ? [{ url: prefeitura.marca.logo, alt: prefeitura.marca.logoAlt }]
      : undefined,
  },
};

export const viewport: Viewport = {
  themeColor: prefeitura.tema.primaria["600"],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={prefeitura.site.idioma} style={variaveisDoTema()}>
      <body className={`${geistSans.variable} antialiased`}>{children}</body>
    </html>
  );
}
