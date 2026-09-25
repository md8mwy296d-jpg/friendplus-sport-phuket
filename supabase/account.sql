-- A player permanently deletes their own account from the Profile page.
-- Deleting auth.users cascades to the profile and all player data
-- (messages keep existing with sender_id = null). The app admin cannot be deleted this way.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from public.app_admins where user_id = v_uid) then raise exception 'not_allowed'; end if;
  delete from auth.users where id = v_uid;
end $$;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
