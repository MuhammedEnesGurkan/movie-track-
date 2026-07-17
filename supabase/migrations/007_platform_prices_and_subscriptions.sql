-- Güncel TR abonelik fiyatları (Temmuz 2026 araştırması)
insert into streaming_platforms (tmdb_provider_id, name, monthly_price, currency)
values
  (8, 'Netflix', 189.99, 'TRY'),
  (337, 'Disney+', 249.90, 'TRY'),
  (119, 'Amazon Prime Video', 69.90, 'TRY'),
  (341, 'BluTV / HBO Max', 229.90, 'TRY'),
  (11, 'MUBI', 129.00, 'TRY')
on conflict (tmdb_provider_id) do update set
  name = excluded.name,
  monthly_price = excluded.monthly_price,
  currency = excluded.currency,
  updated_at = now();

-- Kullanıcının abone olduğu platformlar (tmdb_provider_id listesi).
-- Abonelik israfı uyarısı: takip listesinde içeriği kalmayan abonelik varsa gösterilir.
alter table profiles add column if not exists subscribed_platforms int[] not null default '{}';
