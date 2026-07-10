"use client";

import Image from "next/image";
import { getProviderLink } from "@/lib/providerLinks";
import { markLeftToWatch } from "@/lib/watchReturn";
import type { ProviderInfo, TitleType } from "@/lib/types";

const TMDB_IMG = "https://image.tmdb.org/t/p";

type ProviderButtonProps = {
  provider: ProviderInfo;
  title: string;
  tmdbId: number;
  type: TitleType;
  fallbackWatchLink: string | null;
  trackVisit: boolean;
};

export default function ProviderButton({
  provider,
  title,
  tmdbId,
  type,
  fallbackWatchLink,
  trackVisit,
}: ProviderButtonProps) {
  const href = getProviderLink(provider.provider_id, title, fallbackWatchLink);

  function handleClick() {
    if (trackVisit) {
      markLeftToWatch(tmdbId, type);
    }
  }

  return (
    <a
      href={href ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="relative h-12 w-12 overflow-hidden rounded-full border border-white/5 bg-card"
      title={provider.provider_name}
    >
      <Image
        src={`${TMDB_IMG}/w92${provider.logo_path}`}
        alt={provider.provider_name}
        fill
        sizes="48px"
        className="object-cover"
      />
    </a>
  );
}
