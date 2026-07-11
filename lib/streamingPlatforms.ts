import { createAdminClient } from "./supabase/server";
import type { PlatformInfo, PlatformType, Providers } from "./types";

const CATEGORY_TYPE: Record<"flatrate" | "rent" | "buy", PlatformType> = {
  flatrate: "subscription",
  rent: "rent",
  buy: "buy",
};

// TMDB sadece "nerede yayınlanıyor" der; fiyatı kendi streaming_platforms
// tablomuzdan eşleştiriyoruz. Aynı sağlayıcı birden fazla kategoride
// (örn. hem flatrate hem rent) geçebilir, önceliği flatrate > rent > buy alıp
// her sağlayıcıyı tek kart olarak döndürüyoruz.
export async function buildPlatformInfo(providers: Providers): Promise<PlatformInfo[]> {
  const db = createAdminClient();
  const { data: rows } = await db.from("streaming_platforms").select("*");
  const priceByProviderId = new Map((rows ?? []).map((r) => [r.tmdb_provider_id as number, r]));

  const seen = new Set<number>();
  const result: PlatformInfo[] = [];

  for (const category of ["flatrate", "rent", "buy"] as const) {
    for (const p of providers[category] ?? []) {
      if (seen.has(p.provider_id)) continue;
      seen.add(p.provider_id);

      const row = priceByProviderId.get(p.provider_id);
      const type = CATEGORY_TYPE[category];
      const isSubscription = type === "subscription";

      result.push({
        provider_id: p.provider_id,
        name: row?.name ?? p.provider_name,
        logo_path: row?.logo_path || p.logo_path,
        type,
        monthly_price: isSubscription ? (row?.monthly_price ?? null) : null,
        currency: isSubscription ? (row?.currency ?? null) : null,
      });
    }
  }

  return result;
}
