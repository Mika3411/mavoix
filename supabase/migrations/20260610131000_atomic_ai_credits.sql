create or replace function public.reserve_global_ai_credit()
returns table (
  reserved boolean,
  credits integer,
  donor_wall jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.app_state
  set
    credits = public.app_state.credits - 1,
    updated_at = now()
  where public.app_state.id = 'global'
    and public.app_state.credits > 0
  returning
    true,
    public.app_state.credits,
    coalesce(public.app_state.donor_wall, '[]'::jsonb)
  into reserved, credits, donor_wall;

  if found then
    return next;
    return;
  end if;

  select
    false,
    coalesce(public.app_state.credits, 0),
    coalesce(public.app_state.donor_wall, '[]'::jsonb)
  into reserved, credits, donor_wall
  from public.app_state
  where public.app_state.id = 'global';

  if not found then
    reserved := false;
    credits := 0;
    donor_wall := '[]'::jsonb;
  end if;

  return next;
end;
$$;

create or replace function public.refund_global_ai_credit()
returns table (
  credits integer,
  donor_wall jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.app_state
  set
    credits = public.app_state.credits + 1,
    updated_at = now()
  where public.app_state.id = 'global'
  returning
    public.app_state.credits,
    coalesce(public.app_state.donor_wall, '[]'::jsonb)
  into credits, donor_wall;

  if found then
    return next;
    return;
  end if;

  credits := 0;
  donor_wall := '[]'::jsonb;
  return next;
end;
$$;

revoke all on function public.reserve_global_ai_credit() from public;
revoke all on function public.refund_global_ai_credit() from public;

grant execute on function public.reserve_global_ai_credit() to service_role;
grant execute on function public.refund_global_ai_credit() to service_role;
