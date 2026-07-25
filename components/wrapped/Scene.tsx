"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Sahne paleti. Her sahne huzmeyi farklı renge boyar; zemin ve doku
// sabit kaldığı için ekranlar birbirinden ayrışır ama aynı sisteme aittir.
export type SceneTint = "amber" | "gece" | "mor" | "bordo" | "mercan";

const TINTS: Record<SceneTint, { beam: string; ink: string; glow: string }> = {
  amber: { beam: "rgb(242 169 59 / 0.20)", ink: "#f2a93b", glow: "rgb(242 169 59 / 0.35)" },
  gece: { beam: "rgb(58 106 168 / 0.22)", ink: "#7fb3ea", glow: "rgb(58 106 168 / 0.4)" },
  mor: { beam: "rgb(124 78 176 / 0.22)", ink: "#b98ce8", glow: "rgb(124 78 176 / 0.4)" },
  // Gerçek bordo (#7c2438) koyu zeminde okunmuyor; şarap tarafında kalan
  // ama kontrastı taşıyan bir gül tonu kullanıyoruz.
  bordo: { beam: "rgb(152 34 62 / 0.26)", ink: "#e05a78", glow: "rgb(152 34 62 / 0.45)" },
  mercan: { beam: "rgb(232 103 79 / 0.22)", ink: "#ff9070", glow: "rgb(232 103 79 / 0.4)" },
};

export function tintInk(tint: SceneTint) {
  return TINTS[tint].ink;
}

export function tintGlow(tint: SceneTint) {
  return TINTS[tint].glow;
}

type SceneProps = {
  tint: SceneTint;
  /** Sahnenin sol üstünde duran tek kelimelik sahne adı. */
  slug?: string;
  children: ReactNode;
  /** Işığın arkasında duran poster kolajı gibi tam kaplayan katman. */
  backdrop?: ReactNode;
};

export default function Scene({ tint, slug, children, backdrop }: SceneProps) {
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setSeen(true);
      },
      { threshold: 0.35 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      style={{ ["--beam" as string]: TINTS[tint].beam }}
      className="beam vignette grain relative flex h-full snap-start flex-col justify-center overflow-hidden px-6 py-14"
    >
      {backdrop}

      {slug && (
        <span className="absolute left-6 top-8 text-[10px] font-semibold uppercase tracking-[0.35em] text-white/25">
          {slug}
        </span>
      )}

      {/* Kısa ekranlarda içerik sahneyi aşarsa kırpılmak yerine kaydırılabilsin */}
      <div
        className={`no-scrollbar reveal relative z-10 mx-auto max-h-full w-full max-w-md overflow-y-auto ${
          seen ? "reveal-in" : ""
        }`}
      >
        {children}
      </div>
    </section>
  );
}
