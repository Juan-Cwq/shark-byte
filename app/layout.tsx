import type { Metadata } from "next";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
import { Disclaimer } from "@/components/Disclaimer";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { SiteHeader } from "@/components/SiteHeader";
import { WaveFooter } from "@/components/WaveFooter";
import { getAllCareers } from "@/lib/pathways";
import "./globals.css";

const body = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const display = Source_Serif_4({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Cone of Uncertainty — Miami Dade College",
  description: "Your MDC student companion for a smarter future.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-white font-sans text-mdc-ink">
        <SiteHeader />
        <Disclaimer />
        {children}
        <WaveFooter />
        <ServiceWorkerRegister precacheUrls={getAllCareers().map((c) => `/career/${c.id}`)} />
      </body>
    </html>
  );
}
