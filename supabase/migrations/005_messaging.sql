-- ============================================================
-- PropUp — Messaging (student <-> landlord inquiries)
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- One conversation per (listing, student). The landlord is the listing owner.
create table if not exists conversations (
  id              uuid        default uuid_generate_v4() primary key,
  listing_id      uuid        references listings(id) on delete cascade not null,
  student_id      uuid        references profiles(id) on delete cascade not null,
  landlord_id     uuid        references profiles(id) on delete cascade not null,
  created_at      timestamptz default now() not null,
  last_message_at timestamptz default now() not null,
  unique (listing_id, student_id)
);

create table if not exists messages (
  id              uuid        default uuid_generate_v4() primary key,
  conversation_id uuid        references conversations(id) on delete cascade not null,
  sender_id       uuid        references profiles(id) on delete cascade not null,
  body            text        not null,
  created_at      timestamptz default now() not null
);

create index if not exists conversations_student_idx  on conversations(student_id);
create index if not exists conversations_landlord_idx on conversations(landlord_id);
create index if not exists messages_conversation_idx  on messages(conversation_id, created_at);

-- Keep conversations sorted by latest activity.
create or replace function bump_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists on_message_insert on messages;
create trigger on_message_insert
  after insert on messages
  for each row execute function bump_conversation();

-- ─── RLS ─────────────────────────────────────────────────────
alter table conversations enable row level security;
alter table messages      enable row level security;

drop policy if exists "participants read conversations" on conversations;
create policy "participants read conversations"
  on conversations for select
  using (auth.uid() = student_id or auth.uid() = landlord_id);

drop policy if exists "students start conversations" on conversations;
create policy "students start conversations"
  on conversations for insert
  with check (auth.uid() = student_id);

drop policy if exists "participants update conversations" on conversations;
create policy "participants update conversations"
  on conversations for update
  using (auth.uid() = student_id or auth.uid() = landlord_id);

drop policy if exists "participants read messages" on messages;
create policy "participants read messages"
  on messages for select
  using (exists (
    select 1 from conversations c
    where c.id = conversation_id
      and (c.student_id = auth.uid() or c.landlord_id = auth.uid())
  ));

drop policy if exists "participants send messages" on messages;
create policy "participants send messages"
  on messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.student_id = auth.uid() or c.landlord_id = auth.uid())
    )
  );

-- ─── Realtime ────────────────────────────────────────────────
-- Stream new messages to connected clients (idempotent).
do $$
begin
  alter publication supabase_realtime add table messages;
exception when others then null;
end $$;
