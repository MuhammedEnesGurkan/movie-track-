-- streaming_platforms: platform bazlı abonelik fiyatları (TMDB fiyat vermez, biz yönetiriz)
create table if not exists streaming_platforms (
  id uuid primary key default gen_random_uuid(),
  tmdb_provider_id int not null unique,
  name text not null,
  logo_path text,
  monthly_price numeric,
  currency text not null default 'TRY',
  updated_at timestamptz not null default now()
);

alter table streaming_platforms enable row level security;

create policy "streaming_platforms_select_all" on streaming_platforms
  for select using (true);

-- ponytail: rol tablosu yok; yönetim ekranı şimdilik "girişi olan herkes" ile
-- korunuyor. Gerçek admin rolü gerekirse profiles'a bir is_admin sütunu eklenip
-- bu policy ona göre daraltılabilir.
create policy "streaming_platforms_write_authenticated" on streaming_platforms
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

insert into streaming_platforms (tmdb_provider_id, name, monthly_price, currency) values
  (8, 'Netflix', 229.99, 'TRY'),
  (337, 'Disney+', 164.90, 'TRY'),
  (350, 'Apple TV+', 99.99, 'TRY'),
  (119, 'Amazon Prime Video', 49.90, 'TRY')
on conflict (tmdb_provider_id) do nothing;
