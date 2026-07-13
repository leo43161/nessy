import type { Metadata } from "next";
import { Sora, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { StoreProvider } from "@/components/providers/store-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const sora = Sora({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GestorCobros",
  description: "Control de clientes y cobros de financiación",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${sora.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <StoreProvider>
            {children}
            <Toaster position="top-center" richColors />
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
