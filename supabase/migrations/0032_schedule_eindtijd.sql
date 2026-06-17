-- Add eindtijd (end time) column to schedule_items.
-- Nullable: existing rows have no end time yet.
alter table public.schedule_items
  add column if not exists eindtijd text not null default '';
