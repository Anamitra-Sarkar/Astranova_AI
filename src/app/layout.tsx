import type { Metadata } from "next";
import "./globals.css";
import { ChatProvider } from "@/context/ChatContext";

export const metadata: Metadata = {
  title: "AstraNova AI",
  description: "Autonomous AI interface from ASTRANOVA AI LABS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`antialiased bg-white dark:bg-[#0a0a0a] text-black dark:text-white font-sans`}>
        <ChatProvider>
          {children}
        </ChatProvider>
      </body>
    </html>
  );
}
