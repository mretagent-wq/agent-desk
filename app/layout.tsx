import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Desk",
  description: "Internal desk for the MRET 1 agents in n8n",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
