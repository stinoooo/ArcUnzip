import type { Metadata } from "next";
import "./globals.css";

const title = "ArcUnzip";
const description = "Inspect ZIP archives, search file contents, and preview JSON, media, and text files.";

export const metadata: Metadata = {
  title,
  description,
  applicationName: "ArcUnzip",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title,
    description,
    url: "https://unzip.arcnode.dev",
    siteName: "ArcUnzip",
    images: [
      {
        url: "/arcnode-wide.png",
        width: 1200,
        height: 630,
        alt: "ArcUnzip",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/arcnode-wide.png"],
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
