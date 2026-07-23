"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { LogOut, Search, SlidersHorizontal, Star, TriangleAlert } from "lucide-react";
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

function formatPrice(price: number | null, currency: string | null) {
  if (price == null) return null;
  const amount = price.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === "TRY" || !currency ? `₺${amount}` : `${amount} ${currency}`;
}

function platformLogoSrc(logoPath: string | null) {
  if (!logoPath) return null;
  if (logoPath.startsWith("http")) {
    // next/image yalnızca image.tmdb.org için yapılandırılmış; admin'in
    // girdiği başka bir domain olabileceğinden onu düz <img> ile çiziyoruz.
    return { src: logoPath, plain: !logoPath.startsWith(TMDB_IMG) };
  }
  return { src: `${TMDB_IMG}/w92${logoPath}`, plain: false };
}

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
  const router = useRouter();
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

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

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
  const totalWaste = wastedPlatforms.reduce((sum, p) => sum + (p.monthly_price ?? 0), 0);

  return (
    <div className="px-4 pb-6 pt-6 md:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/5 bg-card text-lg font-semibold text-accent">
              {initials}
            </div>
            <p className="truncate text-sm font-semibold">{email}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/wrapped"
              className="rounded-full border border-accent/30 px-3 py-1.5 text-xs font-semibold text-accent"
            >
              İzleme Özetin
            </Link>
            <button
              onClick={handleLogout}
              aria-label="Çıkış yap"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/50 transition hover:border-red-500/40 hover:text-red-400"
            >
              <LogOut size={15} />
            </button>
          </div>
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
          <div className="mt-4 rounded-2xl border border-white/5 bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-400">
                  <TriangleAlert size={14} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">Boşa giden abonelik</p>
                  <p className="text-xs text-white/40">
                    {wastedPlatforms.length === 1
                      ? "Takip listende karşılığı yok"
                      : `${wastedPlatforms.length} abonelikte takip listende karşılığı yok`}
                  </p>
                </div>
              </div>
              {totalWaste > 0 && (
                <div className="shrink-0 rounded-lg bg-red-500/10 px-2.5 py-1 text-right">
                  <p className="text-xs font-semibold text-red-300">{formatPrice(totalWaste, "TRY")}</p>
                  <p className="text-[10px] text-red-300/60">/ay</p>
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-col gap-1.5">
              {wastedPlatforms.map((p) => {
                const logoSrc = platformLogoSrc(p.logo_path);
                const price = formatPrice(p.monthly_price, p.currency);
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2"
                  >
                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-black/30">
                      {logoSrc?.plain ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoSrc.src} alt={p.name} className="h-full w-full object-cover" />
                      ) : logoSrc ? (
                        <Image src={logoSrc.src} alt={p.name} fill sizes="36px" className="object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] font-semibold text-white/40">
                          {p.name.slice(0, 1)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{p.name}</p>
                      <p className="truncate text-[11px] text-white/40">Takip listende hiçbir şey yok</p>
                    </div>
                    {price && (
                      <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-medium text-white/60">
                        {price}/ay
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex gap-2">
              <Link
                href="/?focus=search"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/25"
              >
                <Search size={12} />
                İçerik bul
              </Link>
              <a
                href="#aboneliklerim"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/25"
              >
                <SlidersHorizontal size={12} />
                Abonelikleri düzenle
              </a>
            </div>
          </div>
        )}

        {platforms.length > 0 && (
          <div id="aboneliklerim" className="mt-4 scroll-mt-6">
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
