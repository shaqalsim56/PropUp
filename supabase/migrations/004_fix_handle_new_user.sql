-- ============================================================
-- PropUp — Fix "Database error saving new user" on signup
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================
--
-- Root cause: handle_new_user() is SECURITY DEFINER but had no fixed
-- search_path. When GoTrue's auth service fires the trigger, `public` is not
-- on the search path, so `profiles` / the `user_role` type can't be resolved
-- and the insert throws — aborting the whole signup.
--
-- Fix: pin `search_path = public`, fully schema-qualify references, default a
-- missing role to 'student', and never let a profile error block signup.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, phone)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'student'),
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      ''
    ),
    new.phone
  )
  on conflict (id) do nothing;
  return new;
exception when others then
  -- Never block auth signup on a profile issue; the client self-heals.
  raise warning 'handle_new_user failed for %: %', new.id, sqlerrm;
  return new;
end;
$$;

-- Make sure the trigger exists and points at the fixed function.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
