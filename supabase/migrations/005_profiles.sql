create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles_all_own" on profiles
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
