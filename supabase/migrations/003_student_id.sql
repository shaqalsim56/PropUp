-- ============================================================
-- PropUp — Student ID upload support
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- Store a reference (storage path) to the student's uploaded ID.
alter table profiles add column if not exists student_id_url text;

-- Private bucket for student ID images.
insert into storage.buckets (id, name, public)
values ('student-ids', 'student-ids', false)
on conflict do nothing;

-- A user may upload / replace / read ONLY files under their own folder
-- (path is `<user-id>/...`).
drop policy if exists "Users can upload own student id" on storage.objects;
create policy "Users can upload own student id"
  on storage.objects for insert
  with check (bucket_id = 'student-ids' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can update own student id" on storage.objects;
create policy "Users can update own student id"
  on storage.objects for update
  using (bucket_id = 'student-ids' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can read own student id" on storage.objects;
create policy "Users can read own student id"
  on storage.objects for select
  using (bucket_id = 'student-ids' and auth.uid()::text = (storage.foldername(name))[1]);
