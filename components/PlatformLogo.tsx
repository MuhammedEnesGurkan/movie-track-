import Image from "next/image";

const TMDB_IMG = "https://image.tmdb.org/t/p";

type PlatformLogoProps = {
  name: string;
  logoPath: string | null;
  size?: number;
};

function resolveLogoSrc(logoPath: string | null) {
  if (!logoPath) return null;
  if (logoPath.startsWith("http")) {
    // next/image yalnızca image.tmdb.org için yapılandırılmış; admin'in
    // girdiği başka bir domain olabileceğinden onu düz <img> ile çiziyoruz.
    return { src: logoPath, plain: !logoPath.startsWith(TMDB_IMG) };
  }
  return { src: `${TMDB_IMG}/w92${logoPath}`, plain: false };
}

export default function PlatformLogo({ name, logoPath, size = 36 }: PlatformLogoProps) {
  const resolved = resolveLogoSrc(logoPath);

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-lg bg-black/30"
      style={{ height: size, width: size }}
    >
      {resolved?.plain ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={resolved.src} alt={name} className="h-full w-full object-cover" />
      ) : resolved ? (
        <Image src={resolved.src} alt={name} fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-[10px] font-semibold text-white/40">
          {name.slice(0, 1)}
        </div>
      )}
    </div>
  );
}
