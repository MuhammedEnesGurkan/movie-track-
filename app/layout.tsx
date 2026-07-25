import type { Metadata, Viewport } from "next";
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

// viewport-fit=cover olmadan iOS'ta env(safe-area-inset-*) hep 0 döner;
// çentik ve ana ekran çubuğu alanları hesaplanamaz.
// maximumScale bilerek kısıtlanmıyor: yakınlaştırmayı engellemek erişilebilirliği
// bozar. iOS'un odakta otomatik yakınlaştırması bunun yerine form alanlarının
// yazı boyutu 16px'e çekilerek çözülüyor (globals.css).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#120f0e",
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
          <div className="pb-tabbar px-safe mx-auto min-h-app max-w-md md:max-w-3xl lg:max-w-6xl lg:pl-56">
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
