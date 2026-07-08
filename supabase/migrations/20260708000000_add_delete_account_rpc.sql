-- ============================================================
-- Self-serve account deletion
-- Lets a signed-in user permanently delete their own account from
-- Settings. Every public table references auth.users(id) ON DELETE
-- CASCADE, so removing the auth row wipes all of the user's data
-- (profile, courses, deadlines, todos, deliverables, calendars,
-- onboarding state, ai_usage) in one shot.
-- ============================================================

create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Cascades to every public.* table keyed on user_id.
  delete from auth.users where id = v_uid;
end;
$$;

-- Only a logged-in user can invoke it, and it only ever deletes auth.uid()
-- (the caller) — never an arbitrary account.
revoke all on function public.delete_user_account() from public, anon;
grant execute on function public.delete_user_account() to authenticated;
