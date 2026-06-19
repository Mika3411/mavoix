create table if not exists public.caregiver_push_tokens (
  channel text not null,
  platform text not null check (platform in ('android', 'ios')),
  token text not null,
  package_name text,
  environment text,
  bundle_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (channel, platform, token)
);

create index if not exists caregiver_push_tokens_channel_platform_idx
  on public.caregiver_push_tokens (channel, platform);

alter table public.caregiver_push_tokens enable row level security;

revoke all on table public.caregiver_push_tokens from anon;
revoke all on table public.caregiver_push_tokens from authenticated;
grant select, insert, update, delete on table public.caregiver_push_tokens to service_role;

create table if not exists public.caregiver_alerts (
  id text primary key,
  room_key text not null,
  channel text not null,
  profile_name text,
  message text not null,
  last_unread_message text,
  created_at timestamptz not null default now()
);

create index if not exists caregiver_alerts_room_created_idx
  on public.caregiver_alerts (room_key, created_at desc);

alter table public.caregiver_alerts enable row level security;

revoke all on table public.caregiver_alerts from anon;
revoke all on table public.caregiver_alerts from authenticated;
grant select, insert, update, delete on table public.caregiver_alerts to service_role;

create table if not exists public.caregiver_messages (
  id text primary key,
  room_key text not null,
  channel text not null,
  sender_role text not null check (sender_role in ('user', 'caregiver')),
  sender_name text,
  message text not null,
  message_type text not null default 'text' check (message_type in ('text', 'audio')),
  created_at timestamptz not null default now()
);

create index if not exists caregiver_messages_room_created_idx
  on public.caregiver_messages (room_key, created_at desc);

alter table public.caregiver_messages enable row level security;

revoke all on table public.caregiver_messages from anon;
revoke all on table public.caregiver_messages from authenticated;
grant select, insert, update, delete on table public.caregiver_messages to service_role;
