-- Anonymous visit counter: one row per day / country / city, just a number.
-- No IP, no user id, nothing that identifies a person.
-- Written by the Vercel function api/hit.js (which reads Vercel's geo headers),
-- read only by app admins.

create table if not exists public.visit_stats (
  day     date not null default current_date,
  country text not null default '',
  city    text not null default '',
  visits  integer not null default 0,
  primary key (day, country, city)
);
alter table public.visit_stats enable row level security;
revoke all on public.visit_stats from anon, authenticated;

-- shared secret between the Vercel function (env VISIT_SECRET) and the database,
-- so only that function can count visits
create table if not exists public.visit_secret (
  id     boolean primary key default true check (id),
  secret text not null
);
alter table public.visit_secret enable row level security;
revoke all on public.visit_secret from anon, authenticated;

create or replace function public.record_visit(p_secret text, p_country text, p_city text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.visit_secret where secret = p_secret) then
    raise exception 'not_allowed';
  end if;
  insert into public.visit_stats (day, country, city, visits)
  values ((now() at time zone 'Asia/Bangkok')::date,
          left(coalesce(p_country, ''), 2), left(coalesce(p_city, ''), 80), 1)
  on conflict (day, country, city) do update set visits = public.visit_stats.visits + 1;
end $$;
revoke all on function public.record_visit(text, text, text) from public;
grant execute on function public.record_visit(text, text, text) to anon;

-- admins only: visits per city over the last p_days days
create or replace function public.admin_visit_stats(p_days integer default 30)
returns table (country text, city text, visits bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_app_admin() then raise exception 'not_allowed'; end if;
  return query
    select v.country, v.city, sum(v.visits)::bigint
      from public.visit_stats v
     where v.day > (now() at time zone 'Asia/Bangkok')::date - greatest(1, least(p_days, 365))
     group by v.country, v.city
     order by 3 desc
     limit 100;
end $$;
revoke all on function public.admin_visit_stats(integer) from public;
grant execute on function public.admin_visit_stats(integer) to authenticated;
