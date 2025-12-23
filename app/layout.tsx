import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import AuthProvider from "@/components/AuthProvider";
import { ConfigurationProvider } from "@/contexts/ConfigurationContext";
import { DataManagerProvider } from "@/contexts/DataManagerContext";
import PersistentDevTools from "@/components/PersistentDevTools";
import ConsoleFilter from "@/components/ConsoleFilter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gestor :: Sistema de Recibos",
  description: "Sistema integral de gestión de recibos con procesamiento PDF y exportación CSV",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ConsoleFilter />
        <AuthProvider>
          <ConfigurationProvider>
            <DataManagerProvider>
              <PersistentDevTools />
              <div className="pb-20">
                {children}
              </div>
            </DataManagerProvider>
          </ConfigurationProvider>
        </AuthProvider>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
