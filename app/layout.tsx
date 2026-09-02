import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "JOVI — Registro de Vendas",
  description: "Registro de vendas e estoque para promotores",
  themeColor: "#1E46E6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
