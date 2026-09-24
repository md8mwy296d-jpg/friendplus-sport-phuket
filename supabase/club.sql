-- =====================================================================
-- FRIEND+ Sport Phuket — Social Club (groupes, messages privés,
-- discussion de chaque session, photos, modération)
-- À exécuter APRÈS schema.sql, dans Supabase > SQL Editor > New query > Run.
-- Ré-exécutable : les objets existants sont remplacés proprement.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------

-- Une discussion : groupe créé par un membre, message privé à deux,
-- ou fil automatique d'une session (réservé à ses inscrits)
create table if not exists public.conversations (
  id               uuid primary key default gen_random_uuid(),
  kind             text not null check (kind in ('group','direct','session')),
  name             text not null default '' check (char_length(name) <= 60),
  description      text not null default '' check (char_length(description) <= 300),
  sport            text check (sport is null or sport in ('futsal','padel','golf','dance','gym')),
  is_private       boolean not null default false,
  session_id       uuid unique references public.sessions(id) on delete cascade,
  direct_key       text unique,   -- « uuidA:uuidB » trié, pour ne créer qu'un fil par paire
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  last_message_at  timestamptz not null default now(),
  check (kind <> 'group'   or char_length(name) >= 3),
  check (kind <> 'session' or session_id is not null),
  check (kind <> 'direct'  or direct_key is not null)
);
create index if not exists conversations_public_idx
  on public.conversations (last_message_at desc) where kind = 'group' and not is_private;

create table if not exists public.conversation_members (
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  role             text not null default 'member' check (role in ('admin','member')),
  joined_at        timestamptz not null default now(),
  last_read_at     timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists conversation_members_user_idx on public.conversation_members (user_id);

create table if not exists public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  sender_id        uuid references public.profiles(id) on delete set null,
  body             text not null default '' check (char_length(body) <= 2000),
  image_path       text,
  created_at       timestamptz not null default clock_timestamp(),
  deleted_at       timestamptz,
  check (deleted_at is not null or char_length(body) > 0 or image_path is not null)
);
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at desc);
create index if not exists messages_sender_idx on public.messages (sender_id, created_at desc);

-- Membres exclus d'un groupe (ne peuvent plus le rejoindre seuls)
create table if not exists public.group_bans (
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  banned_by        uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

-- Blocage entre membres : plus de message privé, messages masqués dans les groupes
create table if not exists public.user_blocks (
  blocker_id  uuid not null references public.profiles(id) on delete cascade,
  blocked_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- Signalements, à traiter depuis Supabase > Table Editor > reports
create table if not exists public.reports (
  id                uuid primary key default gen_random_uuid(),
  reporter_id       uuid references public.profiles(id) on delete set null,
  message_id        uuid references public.messages(id) on delete set null,
  reported_user_id  uuid references public.profiles(id) on delete set null,
  conversation_id   uuid references public.conversations(id) on delete set null,
  message_excerpt   text not null default '',
  reason            text not null default '' check (char_length(reason) <= 500),
  status            text not null default 'open' check (status in ('open','reviewed','dismissed')),
  created_at        timestamptz not null default now()
);

-- Administrateurs du site (modération) : à remplir à la main, voir DEPLOIEMENT.md
create table if not exists public.app_admins (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- Bases créées avant l'arrivée du golf
alter table public.conversations drop constraint if exists conversations_sport_check;
alter table public.conversations add constraint conversations_sport_check
  check (sport is null or sport in ('futsal','padel','golf','dance','gym'));

-- ---------------------------------------------------------------------
-- 2. Fonctions d'accès (utilisées par la sécurité ci-dessous)
-- ---------------------------------------------------------------------
create or replace function public.is_conversation_member(p_conversation uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversation_members
                  where conversation_id = p_conversation and user_id = auth.uid());
$$;

create or replace function public.is_app_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid());
$$;

-- Chemin d'une photo : « <conversation>/<expéditeur>/<fichier> »
create or replace function public._chat_image_readable(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.is_conversation_member(split_part(p_name, '/', 1)::uuid)
    else false end;
$$;

-- ---------------------------------------------------------------------
-- 3. Sécurité (Row Level Security) — lecture seule côté client,
--    toutes les écritures passent par les fonctions de la section 4.
-- ---------------------------------------------------------------------
alter table public.conversations        enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages             enable row level security;
alter table public.group_bans           enable row level security;
alter table public.user_blocks          enable row level security;
alter table public.reports              enable row level security;
alter table public.app_admins           enable row level security;

drop policy if exists "discussions visibles" on public.conversations;
create policy "discussions visibles" on public.conversations for select to authenticated
  using ((kind = 'group' and not is_private) or public.is_conversation_member(id));

drop policy if exists "membres visibles" on public.conversation_members;
create policy "membres visibles" on public.conversation_members for select to authenticated
  using (public.is_conversation_member(conversation_id)
         or exists (select 1 from public.conversations c
                     where c.id = conversation_id and c.kind = 'group' and not c.is_private));

drop policy if exists "messages des membres" on public.messages;
create policy "messages des membres" on public.messages for select to authenticated
  using (public.is_conversation_member(conversation_id));

drop policy if exists "mes blocages" on public.user_blocks;
create policy "mes blocages" on public.user_blocks for select to authenticated
  using (blocker_id = auth.uid());

drop policy if exists "je sais si je suis admin" on public.app_admins;
create policy "je sais si je suis admin" on public.app_admins for select to authenticated
  using (user_id = auth.uid());

-- group_bans et reports : aucune lecture côté app (tableau Supabase uniquement)

-- ---------------------------------------------------------------------
-- 4. Logique métier
-- ---------------------------------------------------------------------

create or replace function public._require_onboarded()
returns uuid language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from public.profiles where id = me and onboarded) then
    raise exception 'profile_incomplete';
  end if;
  return me;
end $$;

create or replace function public._is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_blocks
                  where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;

-- Liste de mes discussions, avec dernier message et nombre de non-lus
create or replace function public.my_conversations()
returns table (
  id uuid, kind text, name text, description text, sport text, is_private boolean,
  session_id uuid, role text, last_message_at timestamptz,
  last_body text, last_sender_id uuid, last_has_image boolean, last_deleted boolean,
  unread integer, member_count integer, other_user_id uuid
) language sql stable security definer set search_path = public as $$
  select c.id, c.kind,
         case when c.kind = 'session' then coalesce(s.title, '') else c.name end,
         c.description, coalesce(c.sport, s.sport), c.is_private, c.session_id, m.role,
         c.last_message_at,
         lm.body, lm.sender_id, lm.image_path is not null, lm.deleted_at is not null,
         (select count(*) from public.messages x
           where x.conversation_id = c.id and x.created_at > m.last_read_at
             and x.sender_id is distinct from auth.uid() and x.deleted_at is null
             and not exists (select 1 from public.user_blocks b
                              where b.blocker_id = auth.uid() and b.blocked_id = x.sender_id))::int,
         (select count(*) from public.conversation_members y where y.conversation_id = c.id)::int,
         case when c.kind = 'direct' then
           (select y.user_id from public.conversation_members y
             where y.conversation_id = c.id and y.user_id <> auth.uid() limit 1)
         end
    from public.conversation_members m
    join public.conversations c on c.id = m.conversation_id
    left join public.sessions s on s.id = c.session_id
    left join lateral (
      select x.body, x.sender_id, x.image_path, x.deleted_at from public.messages x
       where x.conversation_id = c.id order by x.created_at desc limit 1
    ) lm on true
   where m.user_id = auth.uid()
   order by c.last_message_at desc;
$$;

-- Groupes publics à découvrir
-- L'admin du site voit aussi les groupes privés
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

create or replace function public.create_group(
  p_name text, p_description text, p_sport text, p_private boolean
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := public._require_onboarded();
  v_id uuid;
begin
  if char_length(trim(coalesce(p_name, ''))) not between 3 and 60 then raise exception 'invalid_input'; end if;
  if (select count(*) from public.conversations where kind = 'group' and created_by = me) >= 20 then
    raise exception 'too_many_groups';
  end if;
  insert into public.conversations (kind, name, description, sport, is_private, created_by)
  values ('group', trim(p_name), left(trim(coalesce(p_description, '')), 300),
          nullif(p_sport, ''), coalesce(p_private, false), me)
  returning id into v_id;
  insert into public.conversation_members (conversation_id, user_id, role) values (v_id, me, 'admin');
  return v_id;
end $$;

create or replace function public.update_group(
  p_conversation uuid, p_name text, p_description text, p_sport text, p_private boolean
) returns void language plpgsql security definer set search_path = public as $$
declare me uuid := public._require_onboarded();
begin
  if char_length(trim(coalesce(p_name, ''))) not between 3 and 60 then raise exception 'invalid_input'; end if;
  if not exists (select 1 from public.conversation_members
                  where conversation_id = p_conversation and user_id = me and role = 'admin')
     and not public.is_app_admin() then
    raise exception 'not_allowed';
  end if;
  update public.conversations
     set name = trim(p_name), description = left(trim(coalesce(p_description, '')), 300),
         sport = nullif(p_sport, ''), is_private = coalesce(p_private, false)
   where id = p_conversation and kind = 'group';
  if not found then raise exception 'not_found'; end if;
end $$;

-- L'admin du site peut rejoindre aussi les groupes privés (modération)
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

-- Ajouter quelqu'un : tout membre d'un groupe public, seulement un admin pour un groupe privé
create or replace function public.add_group_member(p_conversation uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := public._require_onboarded();
  c public.conversations%rowtype;
  my_role text;
begin
  select * into c from public.conversations where id = p_conversation and kind = 'group';
  if not found then raise exception 'not_found'; end if;
  select role into my_role from public.conversation_members where conversation_id = p_conversation and user_id = me;
  if my_role is null or (c.is_private and my_role <> 'admin') then raise exception 'not_allowed'; end if;
  if not exists (select 1 from public.profiles where id = p_user and onboarded) then raise exception 'not_found'; end if;
  if public._is_blocked_between(me, p_user) then raise exception 'blocked'; end if;
  if exists (select 1 from public.group_bans where conversation_id = p_conversation and user_id = p_user) then
    if my_role <> 'admin' then raise exception 'banned'; end if;
    delete from public.group_bans where conversation_id = p_conversation and user_id = p_user;
  end if;
  if (select count(*) from public.conversation_members where conversation_id = p_conversation) >= 500 then
    raise exception 'group_full';
  end if;
  insert into public.conversation_members (conversation_id, user_id)
  values (p_conversation, p_user) on conflict do nothing;
end $$;

-- Exclure un membre (admin du groupe ou du site) : il ne pourra plus revenir seul
create or replace function public.remove_group_member(p_conversation uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := public._require_onboarded();
begin
  if p_user = me then raise exception 'invalid_input'; end if;
  if not exists (select 1 from public.conversation_members
                  where conversation_id = p_conversation and user_id = me and role = 'admin')
     and not public.is_app_admin() then
    raise exception 'not_allowed';
  end if;
  if not exists (select 1 from public.conversations where id = p_conversation and kind = 'group') then
    raise exception 'not_found';
  end if;
  delete from public.conversation_members where conversation_id = p_conversation and user_id = p_user;
  insert into public.group_bans (conversation_id, user_id, banned_by)
  values (p_conversation, p_user, me) on conflict do nothing;
end $$;

create or replace function public.set_group_role(p_conversation uuid, p_user uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := public._require_onboarded();
begin
  if p_role not in ('admin','member') then raise exception 'invalid_input'; end if;
  if not exists (select 1 from public.conversation_members
                  where conversation_id = p_conversation and user_id = me and role = 'admin')
     and not public.is_app_admin() then
    raise exception 'not_allowed';
  end if;
  update public.conversation_members set role = p_role
   where conversation_id = p_conversation and user_id = p_user
     and exists (select 1 from public.conversations where id = p_conversation and kind = 'group');
  if not found then raise exception 'not_found'; end if;
end $$;

-- Quitter un groupe (le plus ancien membre devient admin s'il n'en reste aucun)
create or replace function public.leave_group(p_conversation uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  next_admin uuid;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from public.conversations where id = p_conversation and kind = 'group') then
    raise exception 'not_allowed';
  end if;
  delete from public.conversation_members where conversation_id = p_conversation and user_id = me;
  if not exists (select 1 from public.conversation_members where conversation_id = p_conversation) then
    delete from public.conversations where id = p_conversation;
  elsif not exists (select 1 from public.conversation_members
                     where conversation_id = p_conversation and role = 'admin') then
    select user_id into next_admin from public.conversation_members
     where conversation_id = p_conversation order by joined_at limit 1;
    update public.conversation_members set role = 'admin'
     where conversation_id = p_conversation and user_id = next_admin;
  end if;
end $$;

-- Ouvrir (ou créer) la discussion privée avec un membre
create or replace function public.start_direct(p_user uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := public._require_onboarded();
  v_key text;
  v_id uuid;
begin
  if p_user is null or p_user = me then raise exception 'invalid_input'; end if;
  if not exists (select 1 from public.profiles where id = p_user and onboarded) then raise exception 'not_found'; end if;
  if public._is_blocked_between(me, p_user) then raise exception 'blocked'; end if;
  v_key := least(me::text, p_user::text) || ':' || greatest(me::text, p_user::text);
  select id into v_id from public.conversations where direct_key = v_key;
  if v_id is null then
    if (select count(*) from public.conversations
         where kind = 'direct' and created_by = me and created_at > now() - interval '1 hour') >= 30 then
      raise exception 'rate_limited';
    end if;
    insert into public.conversations (kind, direct_key, created_by)
    values ('direct', v_key, me)
    on conflict (direct_key) do nothing
    returning id into v_id;
    if v_id is null then select id into v_id from public.conversations where direct_key = v_key; end if;
  end if;
  insert into public.conversation_members (conversation_id, user_id)
  values (v_id, me), (v_id, p_user) on conflict do nothing;
  return v_id;
end $$;

-- Discussion d'une session : créée à la première ouverture, réservée aux inscrits
create or replace function public.open_session_chat(p_session uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  s public.sessions%rowtype;
  v_id uuid;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  select * into s from public.sessions where id = p_session;
  if not found then raise exception 'not_found'; end if;
  if s.creator_id <> me
     and not exists (select 1 from public.session_players where session_id = p_session and user_id = me) then
    raise exception 'not_member';
  end if;
  insert into public.conversations (kind, session_id, sport, created_by)
  values ('session', p_session, s.sport, s.creator_id)
  on conflict (session_id) do nothing
  returning id into v_id;
  if v_id is null then select id into v_id from public.conversations where session_id = p_session; end if;
  insert into public.conversation_members (conversation_id, user_id, role)
  select v_id, x.uid, case when x.uid = s.creator_id then 'admin' else 'member' end
    from (select sp.user_id as uid from public.session_players sp where sp.session_id = p_session
          union select s.creator_id) x
  on conflict do nothing;
  return v_id;
end $$;

-- Garde les membres de la discussion alignés sur les inscrits de la session
create or replace function public._sync_session_chat()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if tg_op = 'INSERT' then
    select id into v_id from public.conversations where session_id = new.session_id;
    if v_id is not null then
      insert into public.conversation_members (conversation_id, user_id)
      values (v_id, new.user_id) on conflict do nothing;
    end if;
    return new;
  end if;
  select id into v_id from public.conversations where session_id = old.session_id;
  if v_id is not null and not exists (select 1 from public.sessions
                                       where id = old.session_id and creator_id = old.user_id) then
    delete from public.conversation_members where conversation_id = v_id and user_id = old.user_id;
  end if;
  return old;
end $$;

drop trigger if exists session_players_sync_chat on public.session_players;
create trigger session_players_sync_chat
  after insert or delete on public.session_players
  for each row execute function public._sync_session_chat();

create or replace function public.send_message(p_conversation uuid, p_body text, p_image_path text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := public._require_onboarded();
  c public.conversations%rowtype;
  v_body text := trim(coalesce(p_body, ''));
  v_other uuid;
  v_id uuid;
begin
  select * into c from public.conversations where id = p_conversation;
  if not found then raise exception 'not_found'; end if;
  if not exists (select 1 from public.conversation_members
                  where conversation_id = p_conversation and user_id = me) then
    raise exception 'not_member';
  end if;
  if char_length(v_body) > 2000 then raise exception 'invalid_input'; end if;
  if p_image_path is not null
     and p_image_path not like p_conversation::text || '/' || me::text || '/%' then
    raise exception 'invalid_input';
  end if;
  if v_body = '' and p_image_path is null then raise exception 'invalid_input'; end if;
  if c.kind = 'direct' then
    select user_id into v_other from public.conversation_members
     where conversation_id = p_conversation and user_id <> me limit 1;
    if v_other is not null and public._is_blocked_between(me, v_other) then raise exception 'blocked'; end if;
  end if;
  if (select count(*) from public.messages
       where sender_id = me and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'rate_limited';
  end if;

  insert into public.messages (conversation_id, sender_id, body, image_path)
  values (p_conversation, me, v_body, p_image_path)
  returning id into v_id;
  update public.conversations set last_message_at = now() where id = p_conversation;
  update public.conversation_members set last_read_at = now()
   where conversation_id = p_conversation and user_id = me;
  return v_id;
end $$;

-- Supprimer un message : son auteur, un admin du groupe ou un admin du site.
-- Renvoie le chemin de la photo éventuelle pour que l'app la supprime du stockage.
create or replace function public.delete_message(p_message uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  m public.messages%rowtype;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  select * into m from public.messages where id = p_message;
  if not found then raise exception 'not_found'; end if;
  if m.sender_id is distinct from me
     and not exists (select 1 from public.conversation_members
                      where conversation_id = m.conversation_id and user_id = me and role = 'admin')
     and not public.is_app_admin() then
    raise exception 'not_allowed';
  end if;
  update public.messages set deleted_at = now(), body = '', image_path = null where id = p_message;
  return m.image_path;
end $$;

create or replace function public.mark_conversation_read(p_conversation uuid)
returns void language sql security definer set search_path = public as $$
  update public.conversation_members set last_read_at = now()
   where conversation_id = p_conversation and user_id = auth.uid();
$$;

create or replace function public.block_user(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not_authenticated'; end if;
  if p_user is null or p_user = me then raise exception 'invalid_input'; end if;
  insert into public.user_blocks (blocker_id, blocked_id) values (me, p_user) on conflict do nothing;
end $$;

create or replace function public.unblock_user(p_user uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.user_blocks where blocker_id = auth.uid() and blocked_id = p_user;
$$;

create or replace function public.report_content(p_message uuid, p_user uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  m public.messages%rowtype;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  if (select count(*) from public.reports
       where reporter_id = me and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'rate_limited';
  end if;
  if p_message is not null then
    select * into m from public.messages where id = p_message;
    if not found or not public.is_conversation_member(m.conversation_id) then raise exception 'not_found'; end if;
  elsif p_user is null then
    raise exception 'invalid_input';
  end if;
  insert into public.reports (reporter_id, message_id, reported_user_id, conversation_id, message_excerpt, reason)
  values (me, p_message, coalesce(m.sender_id, p_user), m.conversation_id,
          left(coalesce(m.body, ''), 500), left(coalesce(p_reason, ''), 500));
end $$;

-- Droits d'exécution
revoke execute on function public._require_onboarded() from public, anon, authenticated;
revoke execute on function public._is_blocked_between(uuid, uuid) from public, anon, authenticated;
revoke execute on function public._sync_session_chat() from public, anon, authenticated;

do $$
declare f text;
begin
  foreach f in array array[
    'public.my_conversations()',
    'public.discover_groups()',
    'public.create_group(text,text,text,boolean)',
    'public.update_group(uuid,text,text,text,boolean)',
    'public.join_group(uuid)',
    'public.add_group_member(uuid,uuid)',
    'public.remove_group_member(uuid,uuid)',
    'public.set_group_role(uuid,uuid,text)',
    'public.leave_group(uuid)',
    'public.start_direct(uuid)',
    'public.open_session_chat(uuid)',
    'public.send_message(uuid,text,text)',
    'public.delete_message(uuid)',
    'public.mark_conversation_read(uuid)',
    'public.block_user(uuid)',
    'public.unblock_user(uuid)',
    'public.report_content(uuid,uuid,text)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- Lecture des discussions (filtrée par les règles RLS de la section 3).
-- group_bans et reports restent inaccessibles depuis l'app.
grant select on public.conversations, public.conversation_members, public.messages,
               public.user_blocks, public.app_admins to authenticated;

-- Utilisées par les règles de sécurité (toutes réservées aux membres connectés) :
-- exécutables par les comptes connectés uniquement
revoke execute on function public.is_conversation_member(uuid) from public, anon;
revoke execute on function public.is_app_admin() from public, anon;
revoke execute on function public._chat_image_readable(text) from public, anon;
grant execute on function public.is_conversation_member(uuid) to authenticated;
grant execute on function public.is_app_admin() to authenticated;
grant execute on function public._chat_image_readable(text) to authenticated;

-- ---------------------------------------------------------------------
-- 5. Temps réel : les nouveaux messages arrivent sans recharger
-- ---------------------------------------------------------------------
do $$
begin
  begin alter publication supabase_realtime add table public.messages; exception when duplicate_object then null; end;
end $$;

-- ---------------------------------------------------------------------
-- 6. Photos : espace de stockage privé « chat-images » (5 Mo max par image)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-images', 'chat-images', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "photos lisibles par les membres" on storage.objects;
create policy "photos lisibles par les membres" on storage.objects for select to authenticated
  using (bucket_id = 'chat-images' and public._chat_image_readable(name));

drop policy if exists "j'envoie mes photos" on storage.objects;
create policy "j'envoie mes photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-images'
              and split_part(name, '/', 2) = auth.uid()::text
              and public._chat_image_readable(name));

drop policy if exists "je supprime mes photos" on storage.objects;
create policy "je supprime mes photos" on storage.objects for delete to authenticated
  using (bucket_id = 'chat-images' and split_part(name, '/', 2) = auth.uid()::text);
