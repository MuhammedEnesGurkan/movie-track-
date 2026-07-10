-- titles: TMDB'den cache'lenen dizi/film verisi
create table if not exists titles (
  tmdb_id int primary key,
  type text not null check (type in ('movie', 'tv')),
  title text not null,
  poster_path text,
  backdrop_path text,
  providers jsonb default '{}',
  seasons jsonb default '[]',
  vote numeric,
  cached_at timestamptz not null default now()
);

-- user_progress: kullanıcının izleme durumu
create table if not exists user_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_id int not null references titles(tmdb_id),
  status text not null check (status in ('watching', 'completed', 'plan')),
  progress jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, tmdb_id)
);

create index if not exists idx_user_progress_user_id on user_progress(user_id);

alter table titles enable row level security;
alter table user_progress enable row level security;

create policy "titles_select_all" on titles
  for select using (true);

create policy "titles_write_service_role" on titles
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "user_progress_all_own" on user_progress
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
