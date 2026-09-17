alter table public.caregiver_alerts add column if not exists ended_at timestamptz;
alter table public.caregiver_alerts add constraint caregiver_alert_end_after_start check (ended_at is null or ended_at >= created_at);
create index caregiver_alerts_pending_idx on public.caregiver_alerts (room_key, created_at desc) where ended_at is null;
