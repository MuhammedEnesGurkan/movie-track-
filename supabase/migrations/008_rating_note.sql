alter table user_progress add column if not exists rating smallint;
alter table user_progress add column if not exists note text;

alter table user_progress drop constraint if exists user_progress_rating_check;
alter table user_progress add constraint user_progress_rating_check
  check (rating is null or (rating >= 1 and rating <= 5));
