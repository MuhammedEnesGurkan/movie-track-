import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import TabBar from "@/components/TabBar";
import AuthListener from "@/components/AuthListener";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WatchList",
  description: "Dizi/film takip ve nereden izlenir",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className={`${inter.className} bg-bg text-white`}>
        <AuthListener />
        <div className="mx-auto min-h-screen max-w-md pb-20">{children}</div>
        <Suspense fallback={null}>
          <TabBar />
        </Suspense>
      </body>
    </html>
  );
}
