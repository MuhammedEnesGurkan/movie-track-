-- Gerçek admin rolü: platform yönetimi artık "girişi olan herkes" değil,
-- yalnızca is_admin=true olan profiller tarafından yazılabilir.
alter table profiles add column if not exists is_admin boolean not null default false;

drop policy if exists "streaming_platforms_write_authenticated" on streaming_platforms;

create policy "streaming_platforms_write_admin" on streaming_platforms
  for all using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid() and profiles.is_admin = true
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid() and profiles.is_admin = true
    )
  );
