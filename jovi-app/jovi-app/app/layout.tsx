import "./globals.css";

export const metadata = {
  title: "JOVI — Registro de Vendas",
  description: "Registro de vendas e estoque para promotores",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
