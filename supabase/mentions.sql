-- =====================================================================
-- FRIEND+ Sport Phuket — Mentions @ (après schema.sql, club.sql, social.sql, pages.sql)
--
-- Un « @hakan » dans un message, un commentaire, une publication ou un moment prévient
-- le joueur (icône 🔔 de l'en-tête), seulement s'il peut voir ce contenu :
--   - message : il est membre de la discussion ;
--   - publication / commentaire : publication publique, ou il est membre du groupe ;
--   - moment : moment public, ou il est ami de l'auteur.
-- Jamais entre joueurs qui se bloquent, jamais soi-même, 10 mentions au plus par texte.
-- =====================================================================

create table if not exists public.mentions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,  -- joueur mentionné
  author_id        uuid not null references public.profiles(id) on delete cascade,
  kind             text not null check (kind in ('message','comment','post','moment')),
  conversation_id  uuid references public.conversations(id) on delete cascade,
  post_id          uuid references public.posts(id) on delete cascade,
  moment_id        uuid references public.moments(id) on delete cascade,
  excerpt          text not null default '' check (char_length(excerpt) <= 140),
  created_at       timestamptz not null default now(),
  seen_at          timestamptz
);
create index if not exists mentions_user_idx on public.mentions (user_id, created_at desc);

alter table public.mentions enable row level security;
drop policy if exists "mes mentions" on public.mentions;
create policy "mes mentions" on public.mentions for select using (user_id = auth.uid());
revoke all on public.mentions from anon;
grant select on public.mentions to authenticated;

-- Joueurs réellement mentionnés dans un texte (identifiants existants, sans l'auteur ni les blocages)
create or replace function public.mentioned_users(p_text text, p_author uuid)
returns setof uuid language sql stable security definer set search_path = public as $$
  select distinct p.id
  from (select rtrim(m[1], '.') as handle
        from regexp_matches(lower(coalesce(p_text, '')), '(?:^|[^a-z0-9_.@])@([a-z0-9_.]{3,20})', 'g') m
        limit 10) h
  join public.profiles p on p.username = h.handle
  where p.id <> p_author
    and not exists (select 1 from public.user_blocks b
                    where (b.blocker_id = p.id and b.blocked_id = p_author)
                       or (b.blocker_id = p_author and b.blocked_id = p.id));
$$;

create or replace function public.mentions_from_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.sender_id is null or position('@' in new.body) = 0 then return new; end if;
  insert into public.mentions (user_id, author_id, kind, conversation_id, excerpt)
  select u, new.sender_id, 'message', new.conversation_id, left(new.body, 140)
  from public.mentioned_users(new.body, new.sender_id) u
  where exists (select 1 from public.conversation_members cm
                where cm.conversation_id = new.conversation_id and cm.user_id = u);
  return new;
end $$;
drop trigger if exists mentions_from_message on public.messages;
create trigger mentions_from_message after insert on public.messages
  for each row execute function public.mentions_from_message();

create or replace function public.mentions_from_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_group uuid;
begin
  if position('@' in new.body) = 0 then return new; end if;
  select group_id into v_group from public.posts where id = new.post_id;
  insert into public.mentions (user_id, author_id, kind, post_id, excerpt)
  select u, new.author_id, 'comment', new.post_id, left(new.body, 140)
  from public.mentioned_users(new.body, new.author_id) u
  where v_group is null
     or exists (select 1 from public.conversation_members cm where cm.conversation_id = v_group and cm.user_id = u);
  return new;
end $$;
drop trigger if exists mentions_from_comment on public.post_comments;
create trigger mentions_from_comment after insert on public.post_comments
  for each row execute function public.mentions_from_comment();

create or replace function public.mentions_from_post()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_text text := new.title || ' ' || new.body;
begin
  if position('@' in v_text) = 0 then return new; end if;
  insert into public.mentions (user_id, author_id, kind, post_id, excerpt)
  select u, new.author_id, 'post', new.id, left(btrim(coalesce(nullif(new.title, ''), new.body)), 140)
  from public.mentioned_users(v_text, new.author_id) u
  where new.group_id is null
     or exists (select 1 from public.conversation_members cm where cm.conversation_id = new.group_id and cm.user_id = u);
  return new;
end $$;
drop trigger if exists mentions_from_post on public.posts;
create trigger mentions_from_post after insert on public.posts
  for each row execute function public.mentions_from_post();

create or replace function public.mentions_from_moment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if position('@' in new.body) = 0 then return new; end if;
  insert into public.mentions (user_id, author_id, kind, moment_id, excerpt)
  select u, new.user_id, 'moment', new.id, left(new.body, 140)
  from public.mentioned_users(new.body, new.user_id) u
  where new.visibility = 'public' or public.are_friends(new.user_id, u);
  return new;
end $$;
drop trigger if exists mentions_from_moment on public.moments;
create trigger mentions_from_moment after insert on public.moments
  for each row execute function public.mentions_from_moment();

-- Tout marquer comme vu (à l'ouverture du menu 🔔)
create or replace function public.mark_mentions_seen()
returns void language sql volatile security definer set search_path = public as $$
  update public.mentions set seen_at = now() where user_id = auth.uid() and seen_at is null;
$$;

revoke execute on function public.mentioned_users(text, uuid) from public, anon, authenticated;
revoke execute on function public.mentions_from_message() from public, anon, authenticated;
revoke execute on function public.mentions_from_comment() from public, anon, authenticated;
revoke execute on function public.mentions_from_post() from public, anon, authenticated;
revoke execute on function public.mentions_from_moment() from public, anon, authenticated;
revoke execute on function public.mark_mentions_seen() from public, anon;
grant execute on function public.mark_mentions_seen() to authenticated;

-- Temps réel : la pastille 🔔 s'allume sans recharger
do $$ begin
  begin alter publication supabase_realtime add table public.mentions; exception when duplicate_object then null; end;
end $$;
