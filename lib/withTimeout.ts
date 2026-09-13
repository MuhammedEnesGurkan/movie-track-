// Middleware'de kullanılan süre sınırı. Ayrı dosyada çünkü middleware'in
// dönmemesi tüm siteyi düşürüyor; bu yüzden davranışının tek başına test
// edilebilir olması gerekiyor.
export async function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number
): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } finally {
    // Zamanlayıcı kalırsa çağrı gereksiz yere açık kalabilir.
    if (timer) clearTimeout(timer);
  }
}
