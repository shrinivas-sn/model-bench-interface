import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppNav } from "@/components/AppNav";
import { FreshnessBadge } from "@/components/FreshnessBadge";

const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Model Bench — choose the right model for the work",
  description:
    "Interactive playground comparing Claude, GPT, Gemini and other frontier models across LiveBench, SWE-bench Verified and OpenRouter pricing. Ingested fresh via adapter-ingestion.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body>
        <div className="app-shell">
          <header className="site-header">
            <div className="header-inner">
              <span className="brand">
                Model&nbsp;Bench<span className="brand-cursor">_</span>
              </span>
              <AppNav />
              <FreshnessBadge />
            </div>
          </header>
          <main className="site-main">{children}</main>
          <footer className="site-footer">
            <span>
              Data: OpenRouter catalog · LiveBench 2026-06-25 · SWE-bench Verified — ingested
              with <code>@shrinivas-sn/adapter-ingestion</code>
            </span>
            <span className="mono dim">terminal-dev · zinc-emerald · Jev tokens</span>
          </footer>
        </div>
      </body>
    </html>
  );
}
