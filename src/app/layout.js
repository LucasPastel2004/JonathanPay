import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata = {
  title: "Jonathan Pay - Dividir Conta",
  description: "O app definitivo para dividir a conta com os amigos.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
