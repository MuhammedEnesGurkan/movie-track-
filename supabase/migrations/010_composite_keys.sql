-- Film ve dizi kimlikleri TMDB'de ayrı ad alanlarıdır: aynı sayısal id
-- hem bir filme hem bir diziye ait olabilir. tmdb_id tek başına anahtar
-- olduğunda film/dizi verisi birbirinin üzerine yazılabiliyordu.
-- Anahtarları (type, tmdb_id) / (user_id, type, tmdb_id) yapıyoruz.

alter table user_progress add column if not exists type text check (type in ('movie', 'tv'));

update user_progress up
set type = t.type
from titles t
where up.tmdb_id = t.tmdb_id and up.type is null;

-- Titles tablosunda tmdb_id zaten benzersizdi (tek tür kaydediliyordu),
-- bu yüzden geriye dönük eşleşmeyen satır kalmamalı; kalırsa güvenli
-- tarafta kalmak için 'movie' varsayılır.
update user_progress set type = 'movie' where type is null;

alter table user_progress alter column type set not null;

alter table user_progress drop constraint if exists user_progress_tmdb_id_fkey;
alter table user_progress drop constraint user_progress_pkey;
alter table titles drop constraint titles_pkey;

alter table titles add constraint titles_pkey primary key (type, tmdb_id);

alter table user_progress
  add constraint user_progress_pkey primary key (user_id, type, tmdb_id);

alter table user_progress
  add constraint user_progress_titles_fkey
  foreign key (type, tmdb_id) references titles(type, tmdb_id);
