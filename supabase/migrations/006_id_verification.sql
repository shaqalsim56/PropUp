-- ============================================================
-- PropUp — Manual student-ID verification
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================
--
-- Adds a verification_status to profiles. Students can upload an ID (which
-- marks them 'pending'), but ONLY an admin (service role / dashboard) can set
-- 'approved' or 'rejected'. A trigger enforces that so a student can't just
-- flip their own status to approved via the API.

do $$
begin
  create type verification_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

alter table profiles add column if not exists verification_status verification_status;

-- Guard: normal users can never set verification_status. Uploading an ID
-- (changing student_id_url) auto-marks 'pending'; everything else is preserved.
-- The service role / dashboard (no JWT role) bypasses this and may approve/reject.
create or replace function guard_verification_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'authenticated' then
    if new.student_id_url is distinct from old.student_id_url and new.student_id_url is not null then
      new.verification_status := 'pending';
    else
      new.verification_status := old.verification_status;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_verification on profiles;
create trigger profiles_guard_verification
  before update on profiles
  for each row execute function guard_verification_status();

-- Backfill: anyone who already uploaded an ID becomes 'pending' for review.
update profiles
set verification_status = 'pending'
where student_id_url is not null and verification_status is null;
