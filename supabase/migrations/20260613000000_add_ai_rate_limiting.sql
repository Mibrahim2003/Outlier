-- ============================================================
-- AI usage rate limiting
-- Protects the gemini-proxy edge function from cost-draining abuse
-- with a per-user daily quota plus a global daily backstop.
-- ============================================================

-- Per-user, per-UTC-day request counter.
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  count integer not null default 0,
  primary key (user_id, day)
);

-- App-wide, per-UTC-day request counter (budget backstop against signup floods).
create table if not exists public.ai_usage_global (
  day date primary key,
  count integer not null default 0
);

alter table public.ai_usage enable row level security;
alter table public.ai_usage_global enable row level security;

-- Users may read their own usage (e.g. to render "X / Y used today").
-- All writes go through consume_ai_quota() below; the absence of any
-- insert/update/delete policy means direct writes are denied.
drop policy if exists "Users can read own AI usage" on public.ai_usage;
create policy "Users can read own AI usage"
  on public.ai_usage for select
  using (auth.uid() = user_id);

-- ai_usage_global has RLS enabled and NO policies: it is unreachable from
-- the anon/authenticated roles except via the SECURITY DEFINER function.

-- ------------------------------------------------------------
-- consume_ai_quota: atomically reserve one AI call for the caller.
-- Returns jsonb { allowed, reason?, limit?, used?, remaining? }.
-- Runs as the caller (auth.uid()) so user identity cannot be spoofed.
-- ------------------------------------------------------------
create or replace function public.consume_ai_quota(
  p_user_limit integer,
  p_global_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'utc')::date;
  v_user_count integer;
  v_global_count integer;
begin
  if v_uid is null then
    return jsonb_build_object('allowed', false, 'reason', 'unauthenticated');
  end if;

  if p_user_limit < 1 or p_global_limit < 1 then
    return jsonb_build_object('allowed', false, 'reason', 'misconfigured');
  end if;

  -- Atomically reserve a per-user slot, but only while under the daily limit.
  -- On conflict the guarded UPDATE returns no row once the cap is reached,
  -- leaving v_user_count NULL.
  insert into public.ai_usage (user_id, day, count)
  values (v_uid, v_today, 1)
  on conflict (user_id, day)
  do update set count = public.ai_usage.count + 1
  where public.ai_usage.count < p_user_limit
  returning count into v_user_count;

  if v_user_count is null then
    select count into v_user_count
      from public.ai_usage where user_id = v_uid and day = v_today;
    return jsonb_build_object(
      'allowed', false,
      'reason', 'user_daily_limit',
      'limit', p_user_limit,
      'used', coalesce(v_user_count, p_user_limit),
      'remaining', 0
    );
  end if;

  -- Atomically reserve a global slot under the app-wide cap.
  insert into public.ai_usage_global (day, count)
  values (v_today, 1)
  on conflict (day)
  do update set count = public.ai_usage_global.count + 1
  where public.ai_usage_global.count < p_global_limit
  returning count into v_global_count;

  if v_global_count is null then
    -- Global cap hit: release the per-user slot we just reserved.
    update public.ai_usage set count = greatest(count - 1, 0)
      where user_id = v_uid and day = v_today;
    return jsonb_build_object(
      'allowed', false,
      'reason', 'global_daily_limit',
      'limit', p_global_limit,
      'remaining', 0
    );
  end if;

  return jsonb_build_object(
    'allowed', true,
    'limit', p_user_limit,
    'used', v_user_count,
    'remaining', greatest(p_user_limit - v_user_count, 0)
  );
end;
$$;

revoke all on function public.consume_ai_quota(integer, integer) from public, anon;
grant execute on function public.consume_ai_quota(integer, integer) to authenticated;

-- Note: rows are tiny and keyed by day; if you ever want to reclaim space,
-- schedule `delete from public.ai_usage where day < current_date - 30;`
-- (and likewise for ai_usage_global) via pg_cron.
