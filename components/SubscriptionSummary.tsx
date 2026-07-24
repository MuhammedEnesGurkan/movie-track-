import Link from "next/link";
import { Search, SlidersHorizontal, TriangleAlert } from "lucide-react";
import SubscriptionUsageRow from "@/components/SubscriptionUsageRow";
import type { StreamingPlatform } from "@/lib/types";

function formatPrice(price: number | null, currency: string | null) {
  if (price == null) return null;
  const amount = price.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === "TRY" || !currency ? `₺${amount}` : `${amount} ${currency}`;
}

type SubscriptionSummaryProps = {
  loading: boolean;
  error: string | null;
  subscribedPlatforms: StreamingPlatform[];
  usageCountByProvider: Map<number, number>;
};

export default function SubscriptionSummary({
  loading,
  error,
  subscribedPlatforms,
  usageCountByProvider,
}: SubscriptionSummaryProps) {
  if (loading) {
    return (
      <div className="mt-4 rounded-2xl border border-white/5 bg-card p-4">
        <p className="text-sm font-semibold text-white">Abonelik Özeti</p>
        <p className="mt-2 text-xs text-white/40">Yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 rounded-2xl border border-white/5 bg-card p-4">
        <p className="text-sm font-semibold text-white">Abonelik Özeti</p>
        <p className="mt-2 text-xs text-red-400">Abonelik bilgisi yüklenemedi. {error}</p>
      </div>
    );
  }

  if (subscribedPlatforms.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-white/5 bg-card p-4">
        <p className="text-sm font-semibold text-white">Abonelik Özeti</p>
        <p className="mt-2 text-xs text-white/40">
          Henüz abonelik seçmedin. Aşağıdan işaretle, hangisinin karşılığını aldığını burada göreceksin.
        </p>
      </div>
    );
  }

  const wasted = subscribedPlatforms.filter(
    (p) => !(usageCountByProvider.get(p.tmdb_provider_id) ?? 0)
  );
  const totalWaste = wasted.reduce((sum, p) => sum + (p.monthly_price ?? 0), 0);
  const totalMonthly = subscribedPlatforms.reduce((sum, p) => sum + (p.monthly_price ?? 0), 0);

  return (
    <div className="mt-4 rounded-2xl border border-white/5 bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Abonelik Özeti</p>
          <p className="text-xs text-white/40">
            {subscribedPlatforms.length} abonelik
            {totalMonthly > 0 && ` · ${formatPrice(totalMonthly, "TRY")}/ay`}
          </p>
        </div>
        {totalWaste > 0 && (
          <div className="flex shrink-0 items-center gap-1.5 rounded-lg bg-red-500/10 px-2.5 py-1 text-red-300">
            <TriangleAlert size={12} />
            <div className="text-right">
              <p className="text-xs font-semibold">{formatPrice(totalWaste, "TRY")}</p>
              <p className="text-[10px] text-red-300/60">boşa/ay</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        {subscribedPlatforms.map((p) => (
          <SubscriptionUsageRow
            key={p.id}
            platform={p}
            activeCount={usageCountByProvider.get(p.tmdb_provider_id) ?? 0}
            price={formatPrice(p.monthly_price, p.currency)}
          />
        ))}
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
  );
}
