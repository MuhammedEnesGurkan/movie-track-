import type { Metadata } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import { Suspense } from "react";
import TabBar from "@/components/TabBar";
import Sidebar from "@/components/Sidebar";
import AuthListener from "@/components/AuthListener";
import ToastProvider from "@/components/ToastProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const bebasNeue = Bebas_Neue({ subsets: ["latin"], weight: "400", variable: "--font-display" });

export const metadata: Metadata = {
  title: "WatchList",
  description: "Dizi/film takip ve nereden izlenir",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className={`${inter.className} ${bebasNeue.variable} bg-bg text-white`}>
        <ToastProvider>
          <AuthListener />
          <Suspense fallback={null}>
            <Sidebar />
          </Suspense>
          <div className="mx-auto min-h-screen max-w-md pb-20 md:max-w-3xl lg:max-w-6xl lg:pb-6 lg:pl-56">
            {children}
          </div>
          <Suspense fallback={null}>
            <TabBar />
          </Suspense>
        </ToastProvider>
      </body>
    </html>
  );
}
