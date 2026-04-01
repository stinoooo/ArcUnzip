import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ArcUnzip",
  description: "ArcNode-styled ZIP visualiser for JSON, media, documents, and more.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
