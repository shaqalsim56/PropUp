-- ============================================================
-- PropUp — Initial Schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ─── Enums ───────────────────────────────────────────────────
create type user_role as enum ('student', 'landlord', 'promoter');

-- ─── Tables ──────────────────────────────────────────────────

create table profiles (
  id          uuid references auth.users on delete cascade primary key,
  role        user_role       not null,
  full_name   text            not null,
  phone       text,
  university  text,                        -- students only
  campus_lat  double precision,            -- students: saved campus coords
  campus_lng  double precision,
  created_at  timestamptz     default now() not null,
  updated_at  timestamptz     default now() not null
);

create table listings (
  id               uuid            default uuid_generate_v4() primary key,
  landlord_id      uuid            references profiles(id) on delete cascade not null,
  title            text            not null,
  description      text,
  price_per_month  integer         not null,   -- JMD
  bedrooms         integer         not null default 1,
  bathrooms        integer         not null default 1,
  lat              double precision not null,
  lng              double precision not null,
  address          text,
  is_available     boolean         not null default true,
  view_count       integer         not null default 0,
  created_at       timestamptz     default now() not null,
  updated_at       timestamptz     default now() not null
);

create table listing_photos (
  id            uuid        default uuid_generate_v4() primary key,
  listing_id    uuid        references listings(id) on delete cascade not null,
  storage_path  text        not null,
  order_index   integer     not null default 0,
  created_at    timestamptz default now() not null
);

create table saved_listings (
  id          uuid        default uuid_generate_v4() primary key,
  student_id  uuid        references profiles(id) on delete cascade not null,
  listing_id  uuid        references listings(id) on delete cascade not null,
  created_at  timestamptz default now() not null,
  unique(student_id, listing_id)
);

create table listing_views (
  id          uuid        default uuid_generate_v4() primary key,
  listing_id  uuid        references listings(id) on delete cascade not null,
  student_id  uuid        references profiles(id) on delete set null,
  viewed_at   timestamptz default now() not null
);

-- ─── Indexes ─────────────────────────────────────────────────

create index listings_landlord_id_idx  on listings(landlord_id);
create index listings_is_available_idx on listings(is_available);
create index listing_photos_listing_id_idx on listing_photos(listing_id);
create index saved_listings_student_id_idx on saved_listings(student_id);
create index listing_views_listing_id_idx  on listing_views(listing_id);

-- ─── Triggers ────────────────────────────────────────────────

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

create trigger listings_updated_at
  before update on listings
  for each row execute function update_updated_at();

-- Auto-create profile row when a user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, role, full_name, phone)
  values (
    new.id,
    (new.raw_user_meta_data->>'role')::user_role,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.phone
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Increment view_count when a listing_views row is inserted
create or replace function increment_listing_view_count()
returns trigger as $$
begin
  update listings set view_count = view_count + 1 where id = new.listing_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_listing_view_inserted
  after insert on listing_views
  for each row execute function increment_listing_view_count();

-- ─── Row Level Security ───────────────────────────────────────

alter table profiles        enable row level security;
alter table listings        enable row level security;
alter table listing_photos  enable row level security;
alter table saved_listings  enable row level security;
alter table listing_views   enable row level security;

-- profiles
create policy "Anyone can read profiles"
  on profiles for select using (true);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- listings
create policy "Anyone can view available listings"
  on listings for select using (is_available = true);

create policy "Landlords can view all their own listings"
  on listings for select using (auth.uid() = landlord_id);

create policy "Landlords can create listings"
  on listings for insert with check (auth.uid() = landlord_id);

create policy "Landlords can update their listings"
  on listings for update using (auth.uid() = landlord_id);

create policy "Landlords can delete their listings"
  on listings for delete using (auth.uid() = landlord_id);

-- listing_photos
create policy "Anyone can view listing photos"
  on listing_photos for select using (true);

create policy "Landlords can manage photos for their listings"
  on listing_photos for all using (
    exists (
      select 1 from listings
      where listings.id = listing_photos.listing_id
        and listings.landlord_id = auth.uid()
    )
  );

-- saved_listings
create policy "Students can view own saved listings"
  on saved_listings for select using (auth.uid() = student_id);

create policy "Students can save listings"
  on saved_listings for insert with check (auth.uid() = student_id);

create policy "Students can unsave listings"
  on saved_listings for delete using (auth.uid() = student_id);

-- listing_views
create policy "Authenticated users can record views"
  on listing_views for insert with check (auth.uid() is not null);

create policy "Landlords can view analytics for their listings"
  on listing_views for select using (
    exists (
      select 1 from listings
      where listings.id = listing_views.listing_id
        and listings.landlord_id = auth.uid()
    )
  );

-- ─── Storage bucket ──────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict do nothing;

create policy "Public read access for listing photos"
  on storage.objects for select
  using (bucket_id = 'listing-photos');

create policy "Authenticated users can upload listing photos"
  on storage.objects for insert
  with check (bucket_id = 'listing-photos' and auth.role() = 'authenticated');

create policy "Users can delete their own uploaded photos"
  on storage.objects for delete
  using (bucket_id = 'listing-photos' and auth.uid()::text = (storage.foldername(name))[1]);
