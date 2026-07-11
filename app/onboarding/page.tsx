import Link from "next/link";
import { Clapperboard } from "lucide-react";

export default function OnboardingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/5 bg-card text-accent">
        <Clapperboard size={28} />
      </div>
      <h1 className="mt-4 text-lg font-bold">Hoş geldin!</h1>
      <p className="mt-2 text-sm text-white/60">
        Hesabın hazır. Dizi ve filmleri takip etmeye başlayabilirsin.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-black"
      >
        Başla
      </Link>
    </div>
  );
}
