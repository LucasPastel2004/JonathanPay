import "./globals.css";

export const metadata = {
  title: "SplitBill - Dividir Conta",
  description: "O app definitivo para dividir a conta com os amigos.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
