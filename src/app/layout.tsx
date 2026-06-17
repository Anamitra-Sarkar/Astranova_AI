import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ChatProvider } from "@/context/ChatContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "AstraNova | Neural Interface",
  description: "Advanced autonomous laboratory for reasoning and creative synthesis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} antialiased bg-[#0d0d0d] text-[#eeeeee] font-sans selection:bg-indigo-500/30`}>
        <ChatProvider>
          {children}
        </ChatProvider>
      </body>
    </html>
  );
}
