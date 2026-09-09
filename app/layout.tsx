import type { Metadata } from "next";
import type { ReactNode } from "react";
import Provider from "./provider";
import AppLayout from "./src/components/layout/AppLayout";
import "./globals.css";

export const metadata: Metadata = {
  title: "FullReports",
  description: "Gestión y supervisión de obras",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <Provider>
          <AppLayout>{children}</AppLayout>
        </Provider>
      </body>
    </html>
  );
}