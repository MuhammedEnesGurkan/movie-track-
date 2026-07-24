import PlatformLogo from "@/components/PlatformLogo";
import type { StreamingPlatform } from "@/lib/types";

type SubscriptionUsageRowProps = {
  platform: StreamingPlatform;
  activeCount: number;
  price: string | null;
};

export default function SubscriptionUsageRow({ platform, activeCount, price }: SubscriptionUsageRowProps) {
  const isUsed = activeCount > 0;

  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2">
      <PlatformLogo name={platform.name} logoPath={platform.logo_path} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{platform.name}</p>
        <p className={`truncate text-[11px] ${isUsed ? "text-white/40" : "text-red-300/70"}`}>
          {isUsed
            ? `${activeCount} içerik takip listende`
            : "Takip listende hiçbir şey yok"}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {price && (
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-medium text-white/60">
            {price}/ay
          </span>
        )}
        <span className={`text-[10px] font-medium ${isUsed ? "text-accent" : "text-red-400"}`}>
          {isUsed ? "Kullanılıyor" : "Kullanılmıyor"}
        </span>
      </div>
    </div>
  );
}
