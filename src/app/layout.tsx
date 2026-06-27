import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ToneLens — Análise de tom e transcrição de voz",
  description:
    "Analise um arquivo de áudio ou vídeo direto no navegador e veja o tom, a transcrição e um risco estimado de voz agressiva antes de tocar.",
  icons: {
    icon: "/audio-editing.gif",
    shortcut: "/audio-editing.gif",
    apple: "/audio-editing.gif",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
