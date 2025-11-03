import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "./providers";

export const metadata: Metadata = {
  title: "文白翻译语料库",
  description:
    "支持资料库管理、文白词元标注与对齐的标注平台。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`antialiased`}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
