-- Admin moderation: see a player's recent IP addresses (already kept by Supabase Auth
-- in auth.sessions), suspend an account, and block IP addresses from the website.
-- Everything here is admin-only, except ip_blocked() used by the site's middleware.

create table if not exists public.blocked_ips (
  ip         inet primary key,
  reason     text not null default '',
  user_id    uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.blocked_ips enable row level security;
revoke all on public.blocked_ips from anon, authenticated;

-- used by middleware.js on each page load: is this address blocked?
create or replace function public.ip_blocked(p_ip text)
returns boolean language plpgsql stable security definer set search_path = public as $$
begin
  return exists (select 1 from public.blocked_ips where ip = nullif(p_ip, '')::inet);
exception when others then
  return false;   -- malformed address: never block
end $$;
revoke all on function public.ip_blocked(text) from public;
grant execute on function public.ip_blocked(text) to anon, authenticated;

-- a player's recent connections (IP, device, last activity) + suspension state
create or replace function public.admin_player_moderation(p_user uuid)
returns table (ip text, user_agent text, last_seen timestamptz, blocked boolean, banned_until timestamptz)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_app_admin() then raise exception 'not_allowed'; end if;
  return query
    select host(s.ip), max(s.user_agent), max(coalesce(s.refreshed_at::timestamptz, s.updated_at, s.created_at)),
           exists (select 1 from public.blocked_ips b where b.ip = s.ip),
           (select u.banned_until from auth.users u where u.id = p_user)
      from auth.sessions s
     where s.user_id = p_user and s.ip is not null
     group by s.ip
     order by 3 desc
     limit 20;
  -- no session with an IP: still report the suspension state
  if not found then
    return query select null::text, null::text, null::timestamptz, false,
                        (select u.banned_until from auth.users u where u.id = p_user);
  end if;
end $$;
revoke all on function public.admin_player_moderation(uuid) from public;
grant execute on function public.admin_player_moderation(uuid) to authenticated;

-- suspend (p_days > 0, 36500 = for good) or reactivate (p_days = 0) an account
create or replace function public.admin_suspend_user(p_user uuid, p_days integer)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_app_admin() then raise exception 'not_allowed'; end if;
  if p_user = auth.uid() or public.is_admin_profile(p_user) then raise exception 'not_allowed'; end if;
  if not exists (select 1 from auth.users where id = p_user) then raise exception 'not_found'; end if;
  if coalesce(p_days, 0) <= 0 then
    update auth.users set banned_until = null where id = p_user;
  else
    update auth.users set banned_until = now() + make_interval(days => least(p_days, 36500)) where id = p_user;
    delete from auth.sessions where user_id = p_user;   -- logs the player out everywhere
  end if;
end $$;
revoke all on function public.admin_suspend_user(uuid, integer) from public;
grant execute on function public.admin_suspend_user(uuid, integer) to authenticated;

create or replace function public.admin_block_ip(p_ip text, p_reason text default '', p_user uuid default null)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_app_admin() then raise exception 'not_allowed'; end if;
  -- never let the admin lock themselves out
  if exists (select 1 from auth.sessions where user_id = auth.uid() and ip = p_ip::inet) then
    raise exception 'own_ip';
  end if;
  insert into public.blocked_ips (ip, reason, user_id)
  values (p_ip::inet, left(coalesce(p_reason, ''), 200), p_user)
  on conflict (ip) do update set reason = excluded.reason, user_id = excluded.user_id;
end $$;
revoke all on function public.admin_block_ip(text, text, uuid) from public;
grant execute on function public.admin_block_ip(text, text, uuid) to authenticated;

create or replace function public.admin_unblock_ip(p_ip text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_app_admin() then raise exception 'not_allowed'; end if;
  delete from public.blocked_ips where ip = p_ip::inet;
end $$;
revoke all on function public.admin_unblock_ip(text) from public;
grant execute on function public.admin_unblock_ip(text) to authenticated;

create or replace function public.admin_blocked_ips()
returns table (ip text, reason text, user_id uuid, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_app_admin() then raise exception 'not_allowed'; end if;
  return query select host(b.ip), b.reason, b.user_id, b.created_at from public.blocked_ips b order by b.created_at desc;
end $$;
revoke all on function public.admin_blocked_ips() from public;
grant execute on function public.admin_blocked_ips() to authenticated;
