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
