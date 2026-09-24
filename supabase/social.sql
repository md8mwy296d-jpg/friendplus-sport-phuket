-- =====================================================================
-- FRIEND+ Social : amis et « moments » partagés sur la page de chaque joueur
-- À exécuter APRÈS schema.sql et club.sql (Supabase → SQL Editor → Run).
-- Réexécutable sans risque.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------
-- Une seule ligne par paire de joueurs, quel que soit le sens de la demande.
create table if not exists public.friendships (
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending','accepted')),
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
create unique index if not exists friendships_pair
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendships_addressee on public.friendships (addressee_id);

-- Moments : un texte et/ou une photo, éventuellement liés à une session jouée.
create table if not exists public.moments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  body        text not null default '' check (char_length(body) <= 500),
  image_path  text check (image_path is null or (char_length(image_path) <= 200 and image_path like user_id::text || '/%')),
  session_id  uuid references public.sessions(id) on delete set null,
  visibility  text not null default 'public' check (visibility in ('public','friends')),
  created_at  timestamptz not null default now(),
  check (char_length(btrim(body)) > 0 or image_path is not null)
);
create index if not exists moments_user_created on public.moments (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- 2. Fonctions d'accès
-- ---------------------------------------------------------------------
create or replace function public.are_friends(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.friendships
                  where status = 'accepted'
                    and ((requester_id = a and addressee_id = b) or (requester_id = b and addressee_id = a)));
$$;

-- Un moment est visible s'il est public (ou à moi, ou d'un ami), et jamais entre joueurs qui se bloquent.
create or replace function public.moment_visible(p_author uuid, p_visibility text)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is null then p_visibility = 'public'
    when p_author = auth.uid() then true
    when public._is_blocked_between(auth.uid(), p_author) then false
    else p_visibility = 'public' or public.are_friends(auth.uid(), p_author)
  end;
$$;

-- Nombre d'amis affiché sur la page publique
create or replace function public.friend_count(p_user uuid)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from public.friendships
   where status = 'accepted' and (requester_id = p_user or addressee_id = p_user);
$$;

-- ---------------------------------------------------------------------
-- 3. Sécurité (lecture seule côté client, écritures par les fonctions ci-dessous)
-- ---------------------------------------------------------------------
alter table public.friendships enable row level security;
alter table public.moments     enable row level security;

drop policy if exists "mes amitiés" on public.friendships;
create policy "mes amitiés" on public.friendships for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

drop policy if exists "moments visibles" on public.moments;
create policy "moments visibles" on public.moments for select
  using (public.moment_visible(user_id, visibility));

drop policy if exists "je supprime mes moments" on public.moments;
create policy "je supprime mes moments" on public.moments for delete to authenticated
  using (user_id = auth.uid() or public.is_app_admin());

grant select on public.friendships to authenticated;
grant select on public.moments to anon, authenticated;
grant delete on public.moments to authenticated;

-- ---------------------------------------------------------------------
-- 4. Logique métier
-- ---------------------------------------------------------------------
-- Demander en ami : 'requested' | 'accepted' (il m'avait déjà demandé) | 'pending' | 'friends'
create or replace function public.send_friend_request(p_user uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  me uuid := public._require_onboarded();
  f public.friendships%rowtype;
begin
  if p_user is null or p_user = me then raise exception 'invalid_input'; end if;
  if not exists (select 1 from public.profiles where id = p_user and onboarded) then raise exception 'not_found'; end if;
  if public._is_blocked_between(me, p_user) then raise exception 'blocked'; end if;

  select * into f from public.friendships
   where (requester_id = me and addressee_id = p_user) or (requester_id = p_user and addressee_id = me)
   for update;
  if found then
    if f.status = 'accepted' then return 'friends'; end if;
    if f.requester_id = p_user then
      update public.friendships set status = 'accepted', accepted_at = now()
       where requester_id = p_user and addressee_id = me;
      return 'accepted';
    end if;
    return 'pending';
  end if;

  if (select count(*) from public.friendships where requester_id = me and created_at > now() - interval '1 day') >= 50 then
    raise exception 'rate_limited';
  end if;
  insert into public.friendships (requester_id, addressee_id) values (me, p_user);
  return 'requested';
end $$;

create or replace function public.respond_friend_request(p_user uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := public._require_onboarded();
begin
  if p_accept then
    update public.friendships set status = 'accepted', accepted_at = now()
     where requester_id = p_user and addressee_id = me and status = 'pending';
  else
    delete from public.friendships
     where requester_id = p_user and addressee_id = me and status = 'pending';
  end if;
  if not found then raise exception 'not_found'; end if;
end $$;

-- Retirer un ami, ou annuler ma demande
create or replace function public.remove_friend(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not_authenticated'; end if;
  delete from public.friendships
   where (requester_id = me and addressee_id = p_user) or (requester_id = p_user and addressee_id = me);
end $$;

-- Publier un moment (20 par jour au plus)
create or replace function public.post_moment(p_body text, p_image_path text, p_session uuid, p_visibility text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := public._require_onboarded();
  v_id uuid;
begin
  if coalesce(p_visibility, '') not in ('public','friends') then raise exception 'invalid_input'; end if;
  if char_length(btrim(coalesce(p_body, ''))) = 0 and p_image_path is null then raise exception 'invalid_input'; end if;
  if p_image_path is not null and p_image_path not like me::text || '/%' then raise exception 'invalid_input'; end if;
  if p_session is not null and not exists (
       select 1 from public.session_players where session_id = p_session and user_id = me) then
    raise exception 'not_allowed';
  end if;
  if (select count(*) from public.moments where user_id = me and created_at > now() - interval '1 day') >= 20 then
    raise exception 'rate_limited';
  end if;
  insert into public.moments (user_id, body, image_path, session_id, visibility)
  values (me, btrim(coalesce(p_body, '')), p_image_path, p_session, p_visibility)
  returning id into v_id;
  return v_id;
end $$;

-- Bloquer quelqu'un met fin à l'amitié
create or replace function public._unfriend_on_block()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.friendships
   where (requester_id = new.blocker_id and addressee_id = new.blocked_id)
      or (requester_id = new.blocked_id and addressee_id = new.blocker_id);
  return new;
end $$;
drop trigger if exists unfriend_on_block on public.user_blocks;
create trigger unfriend_on_block after insert on public.user_blocks
  for each row execute function public._unfriend_on_block();

-- Droits d'exécution
revoke execute on function public._unfriend_on_block() from public, anon, authenticated;
-- are_friends n'est utilisé que par moment_visible (security definer) : pas d'appel direct
revoke execute on function public.are_friends(uuid, uuid) from public, anon, authenticated;
grant execute on function public.moment_visible(uuid, text) to anon, authenticated;
grant execute on function public.friend_count(uuid) to anon, authenticated;
do $$
declare f text;
begin
  foreach f in array array[
    'public.send_friend_request(uuid)',
    'public.respond_friend_request(uuid,boolean)',
    'public.remove_friend(uuid)',
    'public.post_moment(text,text,uuid,text)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 5. Temps réel : une demande d'ami arrive sans recharger
-- ---------------------------------------------------------------------
do $$
begin
  begin alter publication supabase_realtime add table public.friendships; exception when duplicate_object then null; end;
end $$;

-- ---------------------------------------------------------------------
-- 6. Photos des moments : stockage public « moments » (5 Mo max, noms aléatoires)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('moments', 'moments', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "je vois mes photos de moments" on storage.objects;
create policy "je vois mes photos de moments" on storage.objects for select to authenticated
  using (bucket_id = 'moments' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "j'envoie mes photos de moments" on storage.objects;
create policy "j'envoie mes photos de moments" on storage.objects for insert to authenticated
  with check (bucket_id = 'moments' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "je supprime mes photos de moments" on storage.objects;
create policy "je supprime mes photos de moments" on storage.objects for delete to authenticated
  using (bucket_id = 'moments' and (storage.foldername(name))[1] = auth.uid()::text);
