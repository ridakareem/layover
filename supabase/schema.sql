-- Souvenir site: tables, security rules and storage bucket.
-- Run this once in Supabase: SQL Editor > New query > paste > Run.
-- Only run it if these tables do NOT exist yet. If they do, compare the
-- column names below with yours instead (the code expects exactly these).

-- ---------- TABLES ----------

create table if not exists trips (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title       text not null,
  slug        text not null unique,
  cover_url   text,
  created_at  timestamptz not null default now()
);

create table if not exists photos (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references trips(id) on delete cascade,
  url         text not null,
  caption     text,
  created_at  timestamptz not null default now()
);

create table if not exists posts (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references trips(id) on delete cascade,
  title       text not null,
  body        text not null default '',
  created_at  timestamptz not null default now()
);

create table if not exists postcards (
  id                 uuid primary key default gen_random_uuid(),
  trip_id            uuid not null references trips(id) on delete cascade,
  recipient_name     text,
  recipient_address  text,
  sender_name        text,
  message            text,
  front_image_url    text,
  back_image_url     text,
  stamps             jsonb not null default '[]',
  text_blocks        jsonb not null default '[]',
  created_at         timestamptz not null default now()
);

-- ---------- ROW LEVEL SECURITY ----------
-- Everyone (no login) can READ. Only the trip's owner (the admin) can WRITE.

alter table trips     enable row level security;
alter table photos    enable row level security;
alter table posts     enable row level security;
alter table postcards enable row level security;

create policy "public read trips"     on trips     for select using (true);
create policy "public read photos"    on photos    for select using (true);
create policy "public read posts"     on posts     for select using (true);
create policy "public read postcards" on postcards for select using (true);

create policy "owner writes trips" on trips
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Child tables: allowed when the parent trip belongs to the signed-in user.
create policy "owner writes photos" on photos
  for all to authenticated
  using (exists (select 1 from trips t where t.id = trip_id and t.user_id = auth.uid()))
  with check (exists (select 1 from trips t where t.id = trip_id and t.user_id = auth.uid()));

create policy "owner writes posts" on posts
  for all to authenticated
  using (exists (select 1 from trips t where t.id = trip_id and t.user_id = auth.uid()))
  with check (exists (select 1 from trips t where t.id = trip_id and t.user_id = auth.uid()));

create policy "owner writes postcards" on postcards
  for all to authenticated
  using (exists (select 1 from trips t where t.id = trip_id and t.user_id = auth.uid()))
  with check (exists (select 1 from trips t where t.id = trip_id and t.user_id = auth.uid()));

-- ---------- STORAGE ----------
-- Public bucket (anyone can view files by URL); only signed-in users can change files.
-- Signups are disabled, so "signed in" means just the admin.

insert into storage.buckets (id, name, public)
values ('trip-media', 'trip-media', true)
on conflict (id) do nothing;

create policy "admin uploads trip-media" on storage.objects
  for insert to authenticated with check (bucket_id = 'trip-media');

create policy "admin updates trip-media" on storage.objects
  for update to authenticated using (bucket_id = 'trip-media');

create policy "admin deletes trip-media" on storage.objects
  for delete to authenticated using (bucket_id = 'trip-media');
