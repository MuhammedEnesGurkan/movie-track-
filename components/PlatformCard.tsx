"use client";

import Image from "next/image";
import { getProviderLink } from "@/lib/providerLinks";
import { markLeftToWatch } from "@/lib/watchReturn";
import type { PlatformInfo, TitleType } from "@/lib/types";

const TMDB_IMG = "https://image.tmdb.org/t/p";

const TYPE_LABEL: Record<PlatformInfo["type"], string> = {
  subscription: "Abonelik",
  rent: "Kiralama Mevcut",
  buy: "Satın Alma Mevcut",
};

function formatPrice(price: number, currency: string) {
  const symbol = currency === "TRY" ? "₺" : currency;
  return `${symbol}${price.toFixed(2)} / ay`;
}

export default function PlatformCard({
  platform,
  title,
  tmdbId,
  type,
  fallbackWatchLink,
  trackVisit,
}: {
  platform: PlatformInfo;
  title: string;
  tmdbId: number;
  type: TitleType;
  fallbackWatchLink: string | null;
  trackVisit: boolean;
}) {
  const href = getProviderLink(platform.provider_id, title, fallbackWatchLink);
  const isSubscription = platform.type === "subscription";

  return (
    <a
      href={href ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackVisit && markLeftToWatch(tmdbId, type)}
      className="flex items-center gap-3 rounded-2xl border border-white/5 bg-card px-3 py-2.5 transition hover:border-accent/40"
    >
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
        {platform.logo_path && (
          <Image
            src={
              platform.logo_path.startsWith("http")
                ? platform.logo_path
                : `${TMDB_IMG}/w92${platform.logo_path}`
            }
            alt={platform.name}
            fill
            sizes="40px"
            className="object-cover"
          />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{platform.name}</p>
        <p className="text-xs text-white/50">{TYPE_LABEL[platform.type]}</p>
        {isSubscription && (
          <p className="text-xs text-accent">
            {platform.monthly_price != null && platform.currency
              ? formatPrice(platform.monthly_price, platform.currency)
              : "Fiyat bilgisi bulunmuyor."}
          </p>
        )}
      </div>
    </a>
  );
}
