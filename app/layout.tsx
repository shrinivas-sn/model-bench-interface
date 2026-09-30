import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppNav } from "@/components/AppNav";
import { DataStatusStrip } from "@/components/DataStatusStrip";

const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Model Bench — choose the right model for the work",
  description:
    "Compare AI models side by side on LiveBench, Terminal-Bench and Artificial Analysis — published scores only, with sources.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body>
        <div className="app-shell">
          <header className="site-header">
            <div className="header-inner">
              <span className="brand">
                Model&nbsp;Bench<span className="brand-mark" aria-hidden />
              </span>
              <AppNav />
            </div>
          </header>
          <DataStatusStrip />
          <main className="site-main">{children}</main>
          <footer className="site-footer">
            <small>
              OpenRouter catalog · LiveBench · Terminal-Bench · Artificial Analysis — ingested with{" "}
              <code>@shrinivas-sn/adapter-ingestion</code>
            </small>
            <small className="dim">
              Prices are USD per million tokens. Per-benchmark scores are never averaged across
              benchmarks.
            </small>
          </footer>
        </div>
      </body>
    </html>
  );
}
