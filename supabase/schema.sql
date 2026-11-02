-- =====================================================================
-- Fabio Berta – Supabase Schema
-- Im Supabase-Dashboard unter «SQL Editor» einfügen und ausführen.
-- =====================================================================

-- ---------- Admins ----------
create table if not exists public.admins (
  email text primary key
);
-- WICHTIG: deine Login-E-Mail eintragen
insert into public.admins (email) values ('fabioberta@me.com') on conflict do nothing;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

-- ---------- Fotos ----------
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  category text not null check (category in ('street','landscape','travel','event','portrait')),
  title_de text not null,
  title_en text,
  alt_de text not null,
  alt_en text,
  location text,
  featured boolean not null default false,
  for_sale boolean not null default false,
  published boolean not null default true,
  sort integer not null default 0,
  src text not null,
  thumb text,
  storage_path text,
  width integer not null,
  height integer not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists photos_sort_idx on public.photos (sort);

alter table public.photos enable row level security;
drop policy if exists "Öffentlich: veröffentlichte Fotos lesen" on public.photos;
create policy "Öffentlich: veröffentlichte Fotos lesen" on public.photos for select using (published or public.is_admin());
drop policy if exists "Admin: Fotos verwalten" on public.photos;
create policy "Admin: Fotos verwalten" on public.photos for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists photos_touch on public.photos;
create trigger photos_touch before update on public.photos for each row execute function public.touch_updated_at();

-- ---------- Kontaktanfragen ----------
create table if not exists public.inquiries (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text,
  type text,
  event_date date,
  message text not null,
  lang text,
  handled boolean not null default false
);
alter table public.inquiries enable row level security;
drop policy if exists "Admin: Anfragen" on public.inquiries;
create policy "Admin: Anfragen" on public.inquiries for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Bestellungen ----------
create table if not exists public.orders (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  stripe_session_id text unique not null,
  email text,
  name text,
  amount_total numeric(10,2),
  currency text,
  photo_slug text,
  material text,
  size text,
  quantity integer,
  shipping_address jsonb,
  status text not null default 'paid'
);
alter table public.orders enable row level security;
drop policy if exists "Admin: Bestellungen" on public.orders;
create policy "Admin: Bestellungen" on public.orders for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Storage-Bucket für Bilder ----------
insert into storage.buckets (id, name, public) values ('photos', 'photos', true) on conflict (id) do nothing;
drop policy if exists "Öffentlich: Bilder lesen" on storage.objects;
create policy "Öffentlich: Bilder lesen" on storage.objects for select using (bucket_id = 'photos');
drop policy if exists "Admin: Bilder hochladen" on storage.objects;
create policy "Admin: Bilder hochladen" on storage.objects for insert with check (bucket_id = 'photos' and public.is_admin());
drop policy if exists "Admin: Bilder ändern" on storage.objects;
create policy "Admin: Bilder ändern" on storage.objects for update using (bucket_id = 'photos' and public.is_admin());
drop policy if exists "Admin: Bilder löschen" on storage.objects;
create policy "Admin: Bilder löschen" on storage.objects for delete using (bucket_id = 'photos' and public.is_admin());
