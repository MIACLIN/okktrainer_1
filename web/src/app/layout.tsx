import "./globals.css";
import type { Metadata } from "next";
import AppShell from "./shell";

export const metadata: Metadata = {
  title: "OKK Trainer",
  description: "Тренажёр звонков (LiveKit)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}