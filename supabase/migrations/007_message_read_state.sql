-- ============================================================
-- PropUp — Messaging: read receipts, unread counts, last-message preview
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- Per-participant "last read" timestamps.
alter table conversations add column if not exists student_last_read_at  timestamptz;
alter table conversations add column if not exists landlord_last_read_at timestamptz;

-- Conversation list for the current user: other party, listing title,
-- last message preview, and how many unread messages they have.
create or replace function get_conversations()
returns table (
  id uuid,
  listing_id uuid,
  listing_title text,
  other_name text,
  is_landlord boolean,
  last_message text,
  last_message_at timestamptz,
  unread_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    c.id,
    c.listing_id,
    l.title as listing_title,
    case when c.landlord_id = auth.uid() then sp.full_name else lp.full_name end as other_name,
    (c.landlord_id = auth.uid()) as is_landlord,
    lm.body as last_message,
    c.last_message_at,
    (
      select count(*) from messages m
      where m.conversation_id = c.id
        and m.sender_id <> auth.uid()
        and m.created_at > coalesce(
          case when c.landlord_id = auth.uid() then c.landlord_last_read_at else c.student_last_read_at end,
          'epoch'::timestamptz
        )
    ) as unread_count
  from conversations c
  join listings l on l.id = c.listing_id
  join profiles sp on sp.id = c.student_id
  join profiles lp on lp.id = c.landlord_id
  left join lateral (
    select body from messages m where m.conversation_id = c.id order by created_at desc limit 1
  ) lm on true
  where c.student_id = auth.uid() or c.landlord_id = auth.uid()
  order by c.last_message_at desc;
$$;

-- Mark a conversation read for whichever participant is calling.
create or replace function mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update conversations
  set
    student_last_read_at  = case when student_id  = auth.uid() then now() else student_last_read_at  end,
    landlord_last_read_at = case when landlord_id = auth.uid() then now() else landlord_last_read_at end
  where id = p_conversation_id and (student_id = auth.uid() or landlord_id = auth.uid());
end;
$$;

grant execute on function get_conversations() to authenticated;
grant execute on function mark_conversation_read(uuid) to authenticated;

-- Stream conversation updates (so "Seen" updates live when the other reads).
do $$
begin
  alter publication supabase_realtime add table conversations;
exception when others then null;
end $$;
