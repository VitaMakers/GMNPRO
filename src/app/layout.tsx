import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GMN PRO — Ferramentas para o seu Google Meu Negócio",
  description:
    "Geotag de fotos, auditoria de perfil e agendamento de postagens para o seu Google Meu Negócio.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
