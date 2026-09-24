import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

// Nunito, as on tako.id — one family for everything keeps the page light
const nunito = Nunito({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-nunito",
});

const title = "DoubleWatch - Multi-Screen YouTube Live";
const description = "Tonton 2 sampai 4 siaran YouTube live sekaligus, lengkap dengan crossfader audio dan live chat.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title,
  description,
  applicationName: "DoubleWatch",
  openGraph: {
    type: "website",
    siteName: "DoubleWatch",
    title,
    description,
    locale: "id_ID",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#0f191e",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={nunito.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
