import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { prefeitura, variaveisDoTema } from "@/config/prefeitura";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(prefeitura.site.url),
  title: prefeitura.site.titulo,
  description: prefeitura.site.descricao,
  icons: { icon: prefeitura.marca.favicon },
  openGraph: {
    type: "website",
    url: "/",
    title: prefeitura.site.titulo,
    description: prefeitura.site.descricao,
    siteName: prefeitura.prefeitura.nome,
    locale: prefeitura.site.idioma.replace("-", "_"),
    images: [{ url: prefeitura.marca.logo, alt: prefeitura.marca.logoAlt }],
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
