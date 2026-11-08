import type { Metadata } from "next";
import { Inter, Bricolage_Grotesque, Playfair_Display } from "next/font/google";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const serif = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GMN PRO — Ferramentas para o seu Google Meu Negócio",
  description:
    "Geotag de fotos, checklist, auditoria e agendamento de postagens para o seu Google Meu Negócio.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${display.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
