import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ChatProvider } from "@/context/ChatContext";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Aura | Intelligent Workspace",
  description: "Smooth, minimalist AI workspace for focus and creativity.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased bg-background text-foreground font-sans selection:bg-indigo-500/30`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <ChatProvider>
            {children}
          </ChatProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
