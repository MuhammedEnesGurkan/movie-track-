type LinkBuilder = (title: string) => string;

// TMDB provider_id -> platformun arama sayfası. Burada olmayan
// provider_id'ler için TMDB'nin watch_link'ine (JustWatch sayfası) düşülür.
//
// TOD, Exxen, Tabii, Gain kasıtlı olarak eklenmedi: bu platformların TMDB
// provider_id'lerini güvenilir şekilde doğrulayamadım, uydurma bir ID yanlış
// platforma yönlendirme riski taşır. title.providers verisinden gerçek
// provider_id görülüp doğrulanınca buraya eklenebilir.
const providerLinks: Record<number, LinkBuilder> = {
  8: (title) => `https://www.netflix.com/search?q=${encodeURIComponent(title)}`,
  119: (title) => `https://www.primevideo.com/search?phrase=${encodeURIComponent(title)}`,
  337: (title) => `https://www.disneyplus.com/search?q=${encodeURIComponent(title)}`,
  341: (title) => `https://www.blutv.com/arama?q=${encodeURIComponent(title)}`,
  // Apple TV+ ve Mubi: resmi arama URL formatı doğrulanamadı, ana sayfaya yönlendirilir.
  350: () => `https://tv.apple.com`,
  11: () => `https://mubi.com`,
};

export function getProviderLink(
  providerId: number,
  title: string,
  fallbackWatchLink: string | null
): string | null {
  const build = providerLinks[providerId];
  if (build) return build(title);
  return fallbackWatchLink;
}
