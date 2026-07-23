-- watch_events: gerçek bir izleme geçmişi. user_progress sadece "şu an nerede
-- kaldın"ı tutuyor; bu tablo "ne zaman, neyi izledin"i tutar, böylece yıllık
-- özet, ay bazlı istatistik ve yeniden izleme sayısı hesaplanabilir.
create table if not exists watch_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('movie', 'tv')),
  tmdb_id int not null,
  event_type text not null check (event_type in ('movie', 'episode')),
  season_number int,
  episode_number int,
  watched_at timestamptz not null default now(),
  rating smallint check (rating is null or (rating >= 1 and rating <= 5)),
  note text,
  rewatch_number int not null default 1,
  created_at timestamptz not null default now(),
  foreign key (type, tmdb_id) references titles(type, tmdb_id)
);

create index if not exists idx_watch_events_user_watched_at
  on watch_events(user_id, watched_at desc);

create index if not exists idx_watch_events_user_title
  on watch_events(user_id, type, tmdb_id);

alter table watch_events enable row level security;

create policy "watch_events_all_own" on watch_events
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
