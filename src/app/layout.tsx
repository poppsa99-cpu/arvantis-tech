import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.arvantistech.com'

export const metadata: Metadata = {
  title: "Arvantis Tech — AI Agents That Automate Your Entire Business",
  description: "Custom AI agent workflows for any industry. From lead gen to fulfillment, built for you in under a week.",
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Arvantis Tech — AI Agents That Automate Your Entire Business",
    description: "Custom AI agent workflows for any industry. Done-for-you automation — built in under a week.",
    url: appUrl,
    siteName: "Arvantis Tech",
    images: [{ url: `${appUrl}/arvantis-logo.png`, width: 512, height: 512 }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Arvantis Tech — AI Agents That Automate Your Entire Business",
    description: "Custom AI agent workflows for any industry. Done-for-you automation — built in under a week.",
    images: [`${appUrl}/arvantis-logo.png`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
