create or replace function public.add_global_ai_credits(
  p_credits_to_add integer,
  p_donor_entry jsonb default null
)
returns table (
  credits integer,
  donor_wall jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_credits_to_add is null or p_credits_to_add <= 0 then
    raise exception 'p_credits_to_add must be greater than 0';
  end if;

  insert into public.app_state (id, credits, donor_wall, updated_at)
  values ('global', 0, '[]'::jsonb, now())
  on conflict (id) do nothing;

  update public.app_state
  set
    credits = coalesce(public.app_state.credits, 0) + p_credits_to_add,
    donor_wall =
      case
        when p_donor_entry is null then coalesce(public.app_state.donor_wall, '[]'::jsonb)
        else (
          select coalesce(jsonb_agg(entries.value order by entries.ordinality), '[]'::jsonb)
          from (
            select value, ordinality
            from jsonb_array_elements(
              jsonb_build_array(p_donor_entry) || coalesce(public.app_state.donor_wall, '[]'::jsonb)
            ) with ordinality
            order by ordinality
            limit 100
          ) as entries
        )
      end,
    updated_at = now()
  where public.app_state.id = 'global'
  returning
    public.app_state.credits,
    coalesce(public.app_state.donor_wall, '[]'::jsonb)
  into credits, donor_wall;

  return next;
end;
$$;

revoke all on function public.add_global_ai_credits(integer, jsonb) from public;
grant execute on function public.add_global_ai_credits(integer, jsonb) to service_role;

create or replace function public.verify_ai_credit_rpc_migrations()
returns table (
  ok boolean,
  missing_functions text[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  required_functions text[] := array[
    'public.reserve_global_ai_credit()',
    'public.refund_global_ai_credit()',
    'public.add_global_ai_credits(integer,jsonb)'
  ];
begin
  select coalesce(array_agg(required_function), '{}'::text[])
  into missing_functions
  from unnest(required_functions) as required_function
  where to_regprocedure(required_function) is null;

  ok := cardinality(missing_functions) = 0;
  return next;
end;
$$;

revoke all on function public.verify_ai_credit_rpc_migrations() from public;
grant execute on function public.verify_ai_credit_rpc_migrations() to service_role;
