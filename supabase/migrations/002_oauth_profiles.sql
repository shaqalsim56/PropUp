-- ============================================================
-- PropUp — Fix profile creation for OAuth (Google) sign-ins
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- 1) Let authenticated users create THEIR OWN profile row.
--    Needed so the client-side self-heal can insert a profile when the
--    trigger couldn't (e.g. Google sign-in, which has no role in metadata).
drop policy if exists "Users can insert own profile" on profiles;
create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- 2) Make the signup trigger resilient: default role to 'student' when the
--    provider didn't supply one, and fall back to Google's 'name' field.
--    `on conflict do nothing` keeps it idempotent if a row already exists.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, role, full_name, phone)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student'),
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      ''
    ),
    new.phone
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- 3) Backfill any existing auth users that are missing a profile
--    (e.g. the Google account you just tested with).
insert into profiles (id, role, full_name, phone)
select
  u.id,
  coalesce((u.raw_user_meta_data->>'role')::user_role, 'student'),
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''),
  u.phone
from auth.users u
left join profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;
