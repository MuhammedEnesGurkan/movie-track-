"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import type { ProgressStatus, TitleType, WatchedProgress } from "@/lib/types";

const TMDB_IMG = "https://image.tmdb.org/t/p";

type LibraryItem = {
  tmdb_id: number;
  type: TitleType;
  status: ProgressStatus;
  progress: WatchedProgress;
  title: string;
  poster_path: string | null;
};

const TABS: { value: ProgressStatus; label: string }[] = [
  { value: "watching", label: "İzliyorum" },
  { value: "plan", label: "İzleyecek" },
  { value: "completed", label: "Bitirdi" },
];

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfileContent />
    </Suspense>
  );
}

function ProfileContent() {
  const searchParams = useSearchParams();

  const [email, setEmail] = useState<string | null>(null);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProgressStatus>("watching");

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }
      setEmail(user.email ?? null);

      const { data } = await supabase
        .from("user_progress")
        .select("tmdb_id, status, progress, titles(title, poster_path, type)")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      const rows: LibraryItem[] = (data ?? []).map((row: any) => ({
        tmdb_id: row.tmdb_id,
        status: row.status,
        progress: row.progress ?? {},
        title: row.titles?.title ?? "",
        poster_path: row.titles?.poster_path ?? null,
        type: row.titles?.type ?? "tv",
      }));
      setItems(rows);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (searchParams.get("view") === "library") {
      document.getElementById("library")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [searchParams, loading]);

  if (loading) {
    return <p className="p-6 text-center text-sm text-white/40">Yükleniyor...</p>;
  }

  if (!email) {
    return (
      <div className="flex flex-col items-center gap-3 p-10 text-center">
        <p className="text-sm text-white/50">Kütüphaneni görmek için giriş yap.</p>
        <Link
          href="/login"
          className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-black"
        >
          Giriş Yap
        </Link>
      </div>
    );
  }

  const seriesCount = items.filter((i) => i.type === "tv").length;
  const episodeCount = items.reduce(
    (sum, i) => sum + Object.values(i.progress).reduce((s, eps) => s + eps.length, 0),
    0
  );
  const filtered = items.filter((i) => i.status === activeTab);
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <div className="px-4 pb-6 pt-6">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/5 bg-card text-lg font-semibold text-accent">
          {initials}
        </div>
        <p className="truncate text-sm font-semibold">{email}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/5 bg-card p-4 text-center">
          <p className="text-xl font-bold text-accent">{seriesCount}</p>
          <p className="text-xs text-white/50">İzlenen Dizi</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-card p-4 text-center">
          <p className="text-xl font-bold text-accent">{episodeCount}</p>
          <p className="text-xs text-white/50">İzlenen Bölüm</p>
        </div>
      </div>

      <div id="library" className="mt-6">
        <div className="flex border-b border-white/5">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex-1 pb-2.5 text-sm font-medium transition ${
                activeTab === tab.value ? "border-b-2 border-accent text-accent" : "text-white/40"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-white/40">Bu listede henüz içerik yok</p>
        ) : (
          <div className="mt-4 grid grid-cols-3 gap-3">
            {filtered.map((item) => (
              <LibraryCard key={`${item.type}-${item.tmdb_id}`} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LibraryCard({ item }: { item: LibraryItem }) {
  const summary = getProgressSummary(item);
  return (
    <Link href={`/title/${item.type}/${item.tmdb_id}`} className="flex flex-col gap-1.5">
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-white/5 bg-card">
        {item.poster_path ? (
          <Image
            src={`${TMDB_IMG}/w342${item.poster_path}`}
            alt={item.title}
            fill
            sizes="120px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-2 text-center text-xs text-white/30">
            {item.title}
          </div>
        )}
      </div>
      {summary && <p className="truncate text-[11px] text-white/40">{summary}</p>}
    </Link>
  );
}

function getProgressSummary(item: LibraryItem): string | null {
  if (item.type !== "tv") return null;
  const seasonNumbers = Object.keys(item.progress)
    .map(Number)
    .filter((s) => (item.progress[String(s)]?.length ?? 0) > 0);
  if (seasonNumbers.length === 0) return null;
  const lastSeason = Math.max(...seasonNumbers);
  const episodes = item.progress[String(lastSeason)] ?? [];
  const lastEpisode = Math.max(...episodes);
  return `S${lastSeason}B${lastEpisode}'te kaldın`;
}
