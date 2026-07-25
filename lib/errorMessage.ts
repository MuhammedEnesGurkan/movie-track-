// Supabase (PostgrestError) hataları Error sınıfından türemiyor, düz nesne
// olarak geliyor. Sadece `err instanceof Error` kontrolü yapılırsa gerçek
// mesaj yutulup yerine jenerik bir metin gösteriliyor; bu da hata ayıklamayı
// imkânsız hâle getiriyor.
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;

  if (typeof err === "object" && err !== null) {
    const maybe = err as { message?: unknown };
    if (typeof maybe.message === "string" && maybe.message.trim()) {
      return maybe.message;
    }
  }

  if (typeof err === "string" && err.trim()) return err;

  return "Beklenmedik bir hata oluştu";
}
