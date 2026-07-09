alter table public.caregiver_messages
  add column if not exists delivered_to integer not null default 0,
  add column if not exists delivered_at timestamptz,
  add column if not exists read_by_user_at timestamptz,
  add column if not exists read_by_caregiver_at timestamptz;
