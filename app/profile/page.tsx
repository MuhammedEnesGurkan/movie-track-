"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ProgressStatus, Providers, StreamingPlatform, TitleType, WatchedProgress } from "@/lib/types";

const TMDB_IMG = "https://image.tmdb.org/t/p";

type LibraryItem = {
  tmdb_id: number;
  type: TitleType;
  status: ProgressStatus;
  progress: WatchedProgress;
  title: string;
  poster_path: string | null;
  providers: Providers;
  rating: number | null;
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
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProgressStatus>("watching");
  const [platforms, setPlatforms] = useState<StreamingPlatform[]>([]);
  const [subscribedIds, setSubscribedIds] = useState<number[]>([]);

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
      setUserId(user.id);

      const { data } = await supabase
        .from("user_progress")
        .select("tmdb_id, status, progress, rating, titles(title, poster_path, type, providers)")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      const rows: LibraryItem[] = (data ?? []).map((row: any) => ({
        tmdb_id: row.tmdb_id,
        status: row.status,
        progress: row.progress ?? {},
        title: row.titles?.title ?? "",
        poster_path: row.titles?.poster_path ?? null,
        type: row.titles?.type ?? "tv",
        providers: row.titles?.providers ?? {},
        rating: row.rating ?? null,
      }));
      setItems(rows);

      const { data: platformRows } = await supabase
        .from("streaming_platforms")
        .select("*")
        .order("name");
      setPlatforms(platformRows ?? []);

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("subscribed_platforms")
        .eq("user_id", user.id)
        .maybeSingle();
      setSubscribedIds(profileRow?.subscribed_platforms ?? []);

      setLoading(false);
    })();
  }, [supabase]);

  async function toggleSubscription(providerId: number) {
    if (!userId) return;
    const next = subscribedIds.includes(providerId)
      ? subscribedIds.filter((id) => id !== providerId)
      : [...subscribedIds, providerId];
    setSubscribedIds(next);
    await supabase.from("profiles").upsert({ user_id: userId, subscribed_platforms: next });
  }

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

  const seriesCount = items.filter((i) => i.type === "tv" && i.status === "completed").length;
  const movieCount = items.filter((i) => i.type === "movie" && i.status === "completed").length;
  const episodeCount = items.reduce(
    (sum, i) => sum + Object.values(i.progress).reduce((s, eps) => s + eps.length, 0),
    0
  );
  const filtered = items.filter((i) => i.status === activeTab);
  const initials = email.slice(0, 2).toUpperCase();

  const activeProviderIds = new Set<number>();
  items
    .filter((i) => i.status === "watching" || i.status === "plan")
    .forEach((i) => {
      (i.providers.flatrate ?? []).forEach((p) => activeProviderIds.add(p.provider_id));
    });

  const wastedPlatforms = platforms.filter(
    (p) => subscribedIds.includes(p.tmdb_provider_id) && !activeProviderIds.has(p.tmdb_provider_id)
  );

  return (
    <div className="px-4 pb-6 pt-6 md:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/5 bg-card text-lg font-semibold text-accent">
            {initials}
          </div>
          <p className="truncate text-sm font-semibold">{email}</p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/5 bg-card p-4 text-center">
            <p className="text-xl font-bold text-accent">{seriesCount}</p>
            <p className="text-xs text-white/50">İzlenen Dizi</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-card p-4 text-center">
            <p className="text-xl font-bold text-accent">{movieCount}</p>
            <p className="text-xs text-white/50">İzlenen Film</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-card p-4 text-center">
            <p className="text-xl font-bold text-accent">{episodeCount}</p>
            <p className="text-xs text-white/50">İzlenen Bölüm</p>
          </div>
        </div>

        {wastedPlatforms.length > 0 && (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm font-semibold text-red-300">Boşa giden abonelik</p>
            <ul className="mt-1 space-y-0.5 text-xs text-red-200/80">
              {wastedPlatforms.map((p) => (
                <li key={p.id}>
                  {p.name} — takip listende hiçbir şey yok
                  {p.monthly_price != null &&
                    ` (₺${Number(p.monthly_price).toFixed(2)}/ay)`}
                </li>
              ))}
            </ul>
          </div>
        )}

        {platforms.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold text-white/50">Aboneliklerim</p>
            <div className="flex flex-wrap gap-2">
              {platforms.map((p) => {
                const active = subscribedIds.includes(p.tmdb_provider_id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleSubscription(p.tmdb_provider_id)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      active
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-white/10 text-white/50"
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div id="library" className="mt-6">
        <div className="mx-auto flex max-w-2xl border-b border-white/5">
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
          <div className="mt-4 grid grid-cols-3 gap-3 md:grid-cols-4 lg:grid-cols-6">
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
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-white/5 bg-card transition lg:hover:scale-105 lg:hover:ring-1 lg:hover:ring-white/10">
        {item.poster_path ? (
          <Image
            src={`${TMDB_IMG}/w342${item.poster_path}`}
            alt={item.title}
            fill
            sizes="(min-width: 1024px) 15vw, (min-width: 768px) 22vw, 30vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-2 text-center text-xs text-white/30">
            {item.title}
          </div>
        )}
        {item.rating != null && (
          <div className="absolute left-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
            <Star size={10} className="fill-accent text-accent" />
            {item.rating}
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
