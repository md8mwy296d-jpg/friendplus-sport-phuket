-- =====================================================================
-- FRIEND+ Club : Pages des terrains, publications, j'aime, commentaires
-- À exécuter APRÈS schema.sql, club.sql et social.sql. Réexécutable sans risque.
--   • Un admin (app_admins) certifie les patrons de terrain (badge ✓).
--   • Chaque patron certifié crée la Page de son terrain (padel, futsal, golf…) et y publie.
--   • Le créateur / admin d'un groupe publie dans l'espace de son groupe (visible des membres).
--   • L'admin publie au nom de FRIEND+ et peut entrer dans tous les groupes, y compris privés.
--   • Les joueurs aiment, commentent et transfèrent en privé ; ils ne publient pas.
-- =====================================================================

-- Ancienne version (« nouveautés ») remplacée par les publications
drop policy if exists "je vois mes photos de nouveautés" on storage.objects;
drop policy if exists "j'envoie mes photos de nouveautés" on storage.objects;
drop policy if exists "je supprime mes photos de nouveautés" on storage.objects;
drop function if exists public.post_announcement(text, text, text, boolean);
drop function if exists public.set_announcement_pinned(uuid, boolean);
drop table if exists public.announcements;
drop function if exists public.can_post_news();

-- ---------------------------------------------------------------------
-- 1. Certification (admin uniquement)
-- ---------------------------------------------------------------------
create or replace function public.set_certified(p_user uuid, p_value boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_app_admin() then raise exception 'not_allowed'; end if;
  update public.profiles set certified = coalesce(p_value, false) where id = p_user;
  if not found then raise exception 'not_found'; end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. L'admin entre dans tous les groupes (y compris privés)
-- ---------------------------------------------------------------------
drop function if exists public.discover_groups();
create or replace function public.discover_groups()
returns table (
  id uuid, name text, description text, sport text, member_count integer,
  last_message_at timestamptz, created_at timestamptz, is_member boolean, is_private boolean
) language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.description, c.sport,
         (select count(*) from public.conversation_members y where y.conversation_id = c.id)::int,
         c.last_message_at, c.created_at,
         exists (select 1 from public.conversation_members y
                  where y.conversation_id = c.id and y.user_id = auth.uid()),
         c.is_private
    from public.conversations c
   where c.kind = 'group' and (not c.is_private or public.is_app_admin())
   order by c.last_message_at desc
   limit 200;
$$;

create or replace function public.join_group(p_conversation uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := public._require_onboarded();
  v_admin boolean := public.is_app_admin();
begin
  if not exists (select 1 from public.conversations
                  where id = p_conversation and kind = 'group' and (not is_private or v_admin)) then
    raise exception 'not_allowed';
  end if;
  if not v_admin and exists (select 1 from public.group_bans where conversation_id = p_conversation and user_id = me) then
    raise exception 'banned';
  end if;
  if (select count(*) from public.conversation_members where conversation_id = p_conversation) >= 500 then
    raise exception 'group_full';
  end if;
  insert into public.conversation_members (conversation_id, user_id)
  values (p_conversation, me) on conflict do nothing;
end $$;

-- ---------------------------------------------------------------------
-- 3. Tables
-- ---------------------------------------------------------------------
create table if not exists public.club_pages (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  name         text not null check (char_length(btrim(name)) between 2 and 60),
  description  text not null default '' check (char_length(description) <= 500),
  sport        text check (sport is null or sport in ('futsal','padel','golf','dance','gym')),
  venue_id     text references public.venues(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists club_pages_owner on public.club_pages (owner_id);

-- page_id → publication d'une Page ; group_id → publication interne d'un groupe ; aucun des deux → FRIEND+
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles(id) on delete cascade,
  page_id     uuid references public.club_pages(id) on delete cascade,
  group_id    uuid references public.conversations(id) on delete cascade,
  title       text not null default '' check (char_length(title) <= 120),
  body        text not null default '' check (char_length(body) <= 2000),
  image_path  text check (image_path is null or (char_length(image_path) <= 200 and image_path like author_id::text || '/%') or image_path ~ '^/[a-z0-9-]+\.jpg$'),
  pinned      boolean not null default false,
  created_at  timestamptz not null default now(),
  check (page_id is null or group_id is null),
  check (char_length(btrim(title)) > 0 or char_length(btrim(body)) > 0 or image_path is not null)
);
create index if not exists posts_feed on public.posts (pinned desc, created_at desc);
create index if not exists posts_page on public.posts (page_id, created_at desc);
create index if not exists posts_group on public.posts (group_id, created_at desc);

create table if not exists public.post_likes (
  post_id     uuid not null references public.posts(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists post_likes_user on public.post_likes (user_id);

create table if not exists public.post_comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  author_id   uuid not null references public.profiles(id) on delete cascade,
  body        text not null check (char_length(btrim(body)) between 1 and 500),
  created_at  timestamptz not null default now()
);
create index if not exists post_comments_post on public.post_comments (post_id, created_at);

-- ---------------------------------------------------------------------
-- 4. Fonctions d'accès
-- ---------------------------------------------------------------------
-- Publication d'un groupe : visible des membres (et de l'admin) ; les autres sont publiques
create or replace function public.post_visible(p_group uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_group is null
      or public.is_app_admin()
      or exists (select 1 from public.conversation_members
                  where conversation_id = p_group and user_id = auth.uid());
$$;

-- Qui a le droit de publier quelque part (sert aussi au stockage des photos)
create or replace function public.can_publish()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_app_admin()
      or exists (select 1 from public.profiles where id = auth.uid() and certified and onboarded)
      or exists (select 1 from public.conversation_members m join public.conversations c on c.id = m.conversation_id
                  where m.user_id = auth.uid() and m.role = 'admin' and c.kind = 'group');
$$;

-- ---------------------------------------------------------------------
-- 5. Sécurité
-- ---------------------------------------------------------------------
alter table public.club_pages    enable row level security;
alter table public.posts         enable row level security;
alter table public.post_likes    enable row level security;
alter table public.post_comments enable row level security;

drop policy if exists "pages lisibles" on public.club_pages;
create policy "pages lisibles" on public.club_pages for select using (true);
drop policy if exists "je supprime ma page" on public.club_pages;
create policy "je supprime ma page" on public.club_pages for delete to authenticated
  using (owner_id = auth.uid() or public.is_app_admin());

drop policy if exists "publications visibles" on public.posts;
create policy "publications visibles" on public.posts for select using (public.post_visible(group_id));
drop policy if exists "je supprime mes publications" on public.posts;
create policy "je supprime mes publications" on public.posts for delete to authenticated
  using (author_id = auth.uid() or public.is_app_admin());

drop policy if exists "j'aime visibles" on public.post_likes;
create policy "j'aime visibles" on public.post_likes for select
  using (exists (select 1 from public.posts p where p.id = post_id));

drop policy if exists "commentaires visibles" on public.post_comments;
create policy "commentaires visibles" on public.post_comments for select
  using (exists (select 1 from public.posts p where p.id = post_id));
drop policy if exists "je supprime un commentaire" on public.post_comments;
create policy "je supprime un commentaire" on public.post_comments for delete to authenticated
  using (author_id = auth.uid() or public.is_app_admin()
         or exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));

grant select on public.club_pages, public.posts, public.post_likes, public.post_comments to anon, authenticated;
grant delete on public.club_pages, public.posts, public.post_comments to authenticated;

-- ---------------------------------------------------------------------
-- 6. Logique métier
-- ---------------------------------------------------------------------
-- Créer / modifier sa Page (patrons certifiés et admins ; 3 Pages par personne)
create or replace function public.save_page(p_id uuid, p_name text, p_description text, p_sport text, p_venue text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := public._require_onboarded();
  v_id uuid;
begin
  if not (public.is_app_admin() or exists (select 1 from public.profiles where id = me and certified)) then
    raise exception 'not_allowed';
  end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 60 or char_length(coalesce(p_description, '')) > 500 then
    raise exception 'invalid_input';
  end if;
  if nullif(p_venue, '') is not null and not exists (select 1 from public.venues where id = p_venue) then
    raise exception 'invalid_input';
  end if;
  if p_id is null then
    if (select count(*) from public.club_pages where owner_id = me) >= 3 then raise exception 'rate_limited'; end if;
    insert into public.club_pages (owner_id, name, description, sport, venue_id)
    values (me, btrim(p_name), btrim(coalesce(p_description, '')), nullif(p_sport, ''), nullif(p_venue, ''))
    returning id into v_id;
  else
    update public.club_pages
       set name = btrim(p_name), description = btrim(coalesce(p_description, '')),
           sport = nullif(p_sport, ''), venue_id = nullif(p_venue, '')
     where id = p_id and (owner_id = me or public.is_app_admin())
    returning id into v_id;
    if v_id is null then raise exception 'not_allowed'; end if;
  end if;
  return v_id;
end $$;

-- Publier : sur sa Page, dans son groupe (admin du groupe), ou au nom de FRIEND+ (admin)
create or replace function public.publish_post(p_page uuid, p_group uuid, p_title text, p_body text, p_image_path text, p_pinned boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := public._require_onboarded();
  v_admin boolean := public.is_app_admin();
  v_id uuid;
begin
  if p_page is not null and p_group is not null then raise exception 'invalid_input'; end if;
  if p_page is not null then
    if not (v_admin or exists (
         select 1 from public.club_pages pg join public.profiles pr on pr.id = pg.owner_id
          where pg.id = p_page and pg.owner_id = me and pr.certified)) then
      raise exception 'not_allowed';
    end if;
  elsif p_group is not null then
    if not (v_admin or exists (
         select 1 from public.conversation_members m join public.conversations c on c.id = m.conversation_id
          where m.conversation_id = p_group and m.user_id = me and m.role = 'admin' and c.kind = 'group')) then
      raise exception 'not_allowed';
    end if;
  elsif not v_admin then
    raise exception 'not_allowed';
  end if;
  if char_length(coalesce(p_title, '')) > 120 or char_length(coalesce(p_body, '')) > 2000
     or (char_length(btrim(coalesce(p_title, ''))) = 0 and char_length(btrim(coalesce(p_body, ''))) = 0 and p_image_path is null) then
    raise exception 'invalid_input';
  end if;
  if p_image_path is not null and p_image_path not like me::text || '/%' then raise exception 'invalid_input'; end if;
  if (select count(*) from public.posts where author_id = me and created_at > now() - interval '1 day') >= 20 then
    raise exception 'rate_limited';
  end if;
  insert into public.posts (author_id, page_id, group_id, title, body, image_path, pinned)
  values (me, p_page, p_group, btrim(coalesce(p_title, '')), btrim(coalesce(p_body, '')), p_image_path,
          coalesce(p_pinned, false) and (v_admin or p_page is not null or p_group is not null))
  returning id into v_id;
  return v_id;
end $$;

-- Épingler : l'admin partout, le patron sur sa Page, l'admin du groupe dans son groupe
create or replace function public.set_post_pinned(p_post uuid, p_pinned boolean)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  update public.posts p set pinned = coalesce(p_pinned, false)
   where p.id = p_post and (
     public.is_app_admin()
     or (p.page_id is not null and exists (select 1 from public.club_pages pg where pg.id = p.page_id and pg.owner_id = me))
     or (p.group_id is not null and exists (select 1 from public.conversation_members m
                                            where m.conversation_id = p.group_id and m.user_id = me and m.role = 'admin')));
  if not found then raise exception 'not_allowed'; end if;
end $$;

-- J'aime / je n'aime plus : renvoie le nouvel état
create or replace function public.toggle_post_like(p_post uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  me uuid := public._require_onboarded();
  p public.posts%rowtype;
begin
  select * into p from public.posts where id = p_post;
  if not found or not public.post_visible(p.group_id) then raise exception 'not_found'; end if;
  if public._is_blocked_between(me, p.author_id) then raise exception 'blocked'; end if;
  delete from public.post_likes where post_id = p_post and user_id = me;
  if found then return false; end if;
  insert into public.post_likes (post_id, user_id) values (p_post, me);
  return true;
end $$;

create or replace function public.add_post_comment(p_post uuid, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := public._require_onboarded();
  p public.posts%rowtype;
  v_id uuid;
begin
  select * into p from public.posts where id = p_post;
  if not found or not public.post_visible(p.group_id) then raise exception 'not_found'; end if;
  if public._is_blocked_between(me, p.author_id) then raise exception 'blocked'; end if;
  if char_length(btrim(coalesce(p_body, ''))) not between 1 and 500 then raise exception 'invalid_input'; end if;
  if (select count(*) from public.post_comments where author_id = me and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'rate_limited';
  end if;
  insert into public.post_comments (post_id, author_id, body) values (p_post, me, btrim(p_body)) returning id into v_id;
  return v_id;
end $$;

-- Droits d'exécution
revoke execute on function public.post_visible(uuid) from public;
grant execute on function public.post_visible(uuid) to anon, authenticated;
revoke execute on function public.can_publish() from public, anon;
grant execute on function public.can_publish() to authenticated;
do $$
declare f text;
begin
  foreach f in array array[
    'public.set_certified(uuid,boolean)',
    'public.discover_groups()',
    'public.join_group(uuid)',
    'public.save_page(uuid,text,text,text,text)',
    'public.publish_post(uuid,uuid,text,text,text,boolean)',
    'public.set_post_pinned(uuid,boolean)',
    'public.toggle_post_like(uuid)',
    'public.add_post_comment(uuid,text)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- Temps réel : nouvelles publications, j'aime et commentaires sans recharger
do $$
begin
  begin alter publication supabase_realtime add table public.posts; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.post_likes; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.post_comments; exception when duplicate_object then null; end;
end $$;

-- ---------------------------------------------------------------------
-- 7. Photos des publications : stockage public « posts » (5 Mo, noms aléatoires)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('posts', 'posts', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "je vois mes photos de publications" on storage.objects;
create policy "je vois mes photos de publications" on storage.objects for select to authenticated
  using (bucket_id = 'posts' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "j'envoie mes photos de publications" on storage.objects;
create policy "j'envoie mes photos de publications" on storage.objects for insert to authenticated
  with check (bucket_id = 'posts' and (storage.foldername(name))[1] = auth.uid()::text and public.can_publish());
drop policy if exists "je supprime mes photos de publications" on storage.objects;
create policy "je supprime mes photos de publications" on storage.objects for delete to authenticated
  using (bucket_id = 'posts' and (storage.foldername(name))[1] = auth.uid()::text);
