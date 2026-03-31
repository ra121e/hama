import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans_JP } from "next/font/google";
import { Navbar } from "@/shared/components/Navbar";
import { ThemeProvider } from "@/shared/components/ThemeProvider";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HAMA（ハマ） — Happy Adviser Money Adviser",
  description: "Happy Adviser Money Adviser",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body
        className={`${notoSansJp.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
