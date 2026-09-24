-- =====================================================================
-- FRIEND+ Nouveautés du Club et comptes certifiés
-- À exécuter APRÈS schema.sql, club.sql et social.sql. Réexécutable sans risque.
--   • Un admin (table app_admins) certifie des comptes (badge ✓) : salles partenaires, coachs…
--   • Les admins et les comptes certifiés publient des nouveautés, visibles par tous.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Qui peut publier / certifier
-- ---------------------------------------------------------------------
create or replace function public.can_post_news()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_app_admin()
      or exists (select 1 from public.profiles where id = auth.uid() and certified and onboarded);
$$;

create or replace function public.set_certified(p_user uuid, p_value boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_app_admin() then raise exception 'not_allowed'; end if;
  update public.profiles set certified = coalesce(p_value, false) where id = p_user;
  if not found then raise exception 'not_found'; end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. Nouveautés
-- ---------------------------------------------------------------------
create table if not exists public.announcements (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles(id) on delete cascade,
  title       text not null check (char_length(btrim(title)) between 1 and 120),
  body        text not null default '' check (char_length(body) <= 2000),
  image_path  text check (image_path is null or (char_length(image_path) <= 200 and image_path like author_id::text || '/%')),
  official    boolean not null default false,  -- publiée par l'équipe FRIEND+ (admin)
  pinned      boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists announcements_feed on public.announcements (pinned desc, created_at desc);

alter table public.announcements enable row level security;

drop policy if exists "nouveautés lisibles" on public.announcements;
create policy "nouveautés lisibles" on public.announcements for select using (true);

drop policy if exists "je supprime mes nouveautés" on public.announcements;
create policy "je supprime mes nouveautés" on public.announcements for delete to authenticated
  using (author_id = auth.uid() or public.is_app_admin());

grant select on public.announcements to anon, authenticated;
grant delete on public.announcements to authenticated;

-- Publier (10 par jour) ; seul un admin peut épingler
create or replace function public.post_announcement(p_title text, p_body text, p_image_path text, p_pinned boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := public._require_onboarded();
  v_admin boolean := public.is_app_admin();
  v_id uuid;
begin
  if not public.can_post_news() then raise exception 'not_allowed'; end if;
  if char_length(btrim(coalesce(p_title, ''))) not between 1 and 120
     or char_length(coalesce(p_body, '')) > 2000 then
    raise exception 'invalid_input';
  end if;
  if p_image_path is not null and p_image_path not like me::text || '/%' then raise exception 'invalid_input'; end if;
  if (select count(*) from public.announcements where author_id = me and created_at > now() - interval '1 day') >= 10 then
    raise exception 'rate_limited';
  end if;
  insert into public.announcements (author_id, title, body, image_path, official, pinned)
  values (me, btrim(p_title), btrim(coalesce(p_body, '')), p_image_path, v_admin, v_admin and coalesce(p_pinned, false))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.set_announcement_pinned(p_id uuid, p_pinned boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_app_admin() then raise exception 'not_allowed'; end if;
  update public.announcements set pinned = coalesce(p_pinned, false) where id = p_id;
  if not found then raise exception 'not_found'; end if;
end $$;

-- Droits d'exécution
revoke execute on function public.can_post_news() from public, anon;
grant execute on function public.can_post_news() to authenticated;
do $$
declare f text;
begin
  foreach f in array array[
    'public.set_certified(uuid,boolean)',
    'public.post_announcement(text,text,text,boolean)',
    'public.set_announcement_pinned(uuid,boolean)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- Temps réel : une nouveauté apparaît sans recharger
do $$
begin
  begin alter publication supabase_realtime add table public.announcements; exception when duplicate_object then null; end;
end $$;

-- ---------------------------------------------------------------------
-- 3. Photos des nouveautés : stockage public « news » (5 Mo max)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('news', 'news', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "je vois mes photos de nouveautés" on storage.objects;
create policy "je vois mes photos de nouveautés" on storage.objects for select to authenticated
  using (bucket_id = 'news' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "j'envoie mes photos de nouveautés" on storage.objects;
create policy "j'envoie mes photos de nouveautés" on storage.objects for insert to authenticated
  with check (bucket_id = 'news' and (storage.foldername(name))[1] = auth.uid()::text and public.can_post_news());
drop policy if exists "je supprime mes photos de nouveautés" on storage.objects;
create policy "je supprime mes photos de nouveautés" on storage.objects for delete to authenticated
  using (bucket_id = 'news' and (storage.foldername(name))[1] = auth.uid()::text);
