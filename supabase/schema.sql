-- =====================================================================
-- FRIEND+ Sport Phuket — schéma Supabase (Postgres)
-- À exécuter UNE fois dans Supabase > SQL Editor > New query > Run.
-- Ré-exécutable : les objets existants sont remplacés proprement.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------

-- Profil public d'un joueur (1 ligne par compte, créée automatiquement)
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null default '' check (char_length(name) <= 60),
  nationality   text not null default '🌍',
  country_code  text not null default '' check (char_length(country_code) <= 2),
  lang          text not null default 'fr' check (lang in ('fr','en','ru','th')),
  sports        text[] not null default '{}' check (sports <@ array['futsal','padel','golf','dance','gym']),
  level         text not null default 'beginner' check (level in ('beginner','intermediate','advanced')),
  rating        numeric(2,1) not null default 5.0 check (rating between 0 and 5),
  bio           text not null default '' check (char_length(bio) <= 140),
  onboarded     boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Avatar : photo (chemin dans le stockage « avatars », toujours dans le dossier du joueur)
-- ou, à défaut, une couleur choisie parmi les 8 dégradés de l'app.
alter table public.profiles add column if not exists avatar_path text
  check (avatar_path is null or (char_length(avatar_path) <= 200 and avatar_path like id::text || '/%'));
alter table public.profiles add column if not exists avatar_color smallint
  check (avatar_color is null or avatar_color between 0 and 7);
-- Compte certifié (badge ✓) : attribué uniquement par un admin via set_certified() (news.sql)
alter table public.profiles add column if not exists certified boolean not null default false;
-- Fair-play : réponses « oui » / réponses reçues après les matchs (tenus à jour par review_teammate(), social.sql)
alter table public.profiles add column if not exists fairplay_up integer not null default 0;
alter table public.profiles add column if not exists fairplay_total integer not null default 0;

-- Salles partenaires (gérées par toi depuis le tableau Supabase)
create table if not exists public.venues (
  id          text primary key,
  name        text not null,
  area        text not null,
  sports      text[] not null check (sports <@ array['futsal','padel','golf','dance','gym']),
  address     text not null default '',
  rating      numeric(2,1) not null default 4.5,
  price_from  integer not null default 0,
  photo       text not null default '',
  amenities   text[] not null default '{}',
  hours       text not null default '',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.sessions (
  id                     uuid primary key default gen_random_uuid(),
  sport                  text not null check (sport in ('futsal','padel','golf','dance','gym')),
  title                  text not null check (char_length(title) between 3 and 80),
  venue_id               text not null references public.venues(id),
  starts_at              timestamptz not null,
  duration_min           integer not null check (duration_min between 30 and 240),
  quota                  integer not null check (quota between 2 and 30),
  price_per_person       integer not null default 0 check (price_per_person between 0 and 10000),
  level                  text not null default 'all' check (level in ('all','beginner','intermediate','advanced')),
  mixed                  boolean not null default true,
  status                 text not null default 'open' check (status in ('open','full','confirmed','cancelled')),
  confirmation_deadline  timestamptz not null,
  creator_id             uuid not null references public.profiles(id) on delete cascade,
  description            text not null default '' check (char_length(description) <= 600),
  created_at             timestamptz not null default now(),
  check (confirmation_deadline < starts_at)
);
create index if not exists sessions_starts_at_idx on public.sessions (starts_at);
create index if not exists sessions_status_deadline_idx on public.sessions (status, confirmation_deadline);

-- Inscriptions : joueur titulaire ou liste d'attente
create table if not exists public.session_players (
  session_id  uuid not null references public.sessions(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  kind        text not null check (kind in ('player','waitlist')),
  joined_at   timestamptz not null default clock_timestamp(),
  primary key (session_id, user_id)
);
create index if not exists session_players_user_idx on public.session_players (user_id);

create table if not exists public.invitations (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.sessions(id) on delete cascade,
  from_user_id  uuid not null references public.profiles(id) on delete cascade,
  to_user_id    uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending','accepted','declined')),
  message       text not null default '' check (char_length(message) <= 300),
  created_at    timestamptz not null default now(),
  unique (session_id, to_user_id)
);
create index if not exists invitations_to_idx on public.invitations (to_user_id, status);

-- Profils publics + compteurs (joué / organisé)
create or replace view public.public_profiles
with (security_invoker = true) as
select p.id, p.name, p.nationality, p.country_code, p.lang, p.sports, p.level,
       p.rating, p.bio, p.onboarded, p.created_at,
       (select count(*) from public.session_players sp
          where sp.user_id = p.id and sp.kind = 'player')::int as joined_count,
       (select count(*) from public.sessions s where s.creator_id = p.id)::int as organized_count,
       p.avatar_path, p.avatar_color, p.certified,
       -- Note FRIEND+ sur 100 : profil complet 15 + fair-play 60 (avis des coéquipiers) + activité 25 (10 matchs = max)
       case when p.fairplay_total > 0 then round(100.0 * p.fairplay_up / p.fairplay_total)::int end as fairplay_pct,
       least(100, 10 * (select count(*) from public.session_players sp
                          where sp.user_id = p.id and sp.kind = 'player'))::int as activity_pct,
       round(
         0.15 * ( 25 * (char_length(btrim(p.name)) >= 2)::int + 25 * (p.avatar_path is not null)::int
                + 25 * (p.country_code <> '')::int + 25 * (cardinality(p.sports) > 0)::int )
         + 0.60 * coalesce(100.0 * p.fairplay_up / nullif(p.fairplay_total, 0), 0)
         + 0.25 * least(100, 10 * (select count(*) from public.session_players sp
                                     where sp.user_id = p.id and sp.kind = 'player'))
       )::int as score,
       p.fairplay_total / 2 as review_count,
       ( 25 * (char_length(btrim(p.name)) >= 2)::int + 25 * (p.avatar_path is not null)::int
       + 25 * (p.country_code <> '')::int + 25 * (cardinality(p.sports) > 0)::int ) as profile_pct
from public.profiles p;

-- Tarifs fixés par FRIEND+ (les joueurs ne choisissent pas le prix).
--   per = 'player' : montant par joueur et par heure
--   per = 'court'  : prix du terrain par heure, partagé entre les joueurs de la session
-- Pour changer un tarif : Table Editor → sport_rates (s'applique aux nouvelles sessions).
create table if not exists public.sport_rates (
  sport   text primary key check (sport in ('futsal','padel','golf','dance','gym')),
  amount  integer not null check (amount between 0 and 100000),
  per     text not null check (per in ('player','court'))
);
insert into public.sport_rates (sport, amount, per) values
  ('padel', 2200, 'court'),
  ('futsal', 300, 'player'),
  ('golf',   120, 'player'),
  ('dance',  120, 'player'),
  ('gym',    120, 'player')
on conflict (sport) do nothing;

-- Bases créées avant l'arrivée du golf : élargir les contraintes existantes
alter table public.profiles drop constraint if exists profiles_sports_check;
alter table public.profiles add constraint profiles_sports_check
  check (sports <@ array['futsal','padel','golf','dance','gym']);
alter table public.venues drop constraint if exists venues_sports_check;
alter table public.venues add constraint venues_sports_check
  check (sports <@ array['futsal','padel','golf','dance','gym']);
alter table public.sessions drop constraint if exists sessions_sport_check;
alter table public.sessions add constraint sessions_sport_check
  check (sport in ('futsal','padel','golf','dance','gym'));

-- ---------------------------------------------------------------------
-- 2. Création automatique du profil à l'inscription
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), 60))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Fonction de trigger uniquement : pas d'appel direct via l'API
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Sécurité (Row Level Security)
--    Lecture publique des sessions/salles/profils ; toute écriture sensible
--    passe par les fonctions RPC ci-dessous (contrôles côté serveur).
-- ---------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.venues          enable row level security;
alter table public.sessions        enable row level security;
alter table public.session_players enable row level security;
alter table public.invitations     enable row level security;

drop policy if exists "profiles lisibles" on public.profiles;
create policy "profiles lisibles" on public.profiles for select using (true);
drop policy if exists "je modifie mon profil" on public.profiles;
create policy "je modifie mon profil" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- Un joueur ne peut pas modifier sa propre note
revoke update on public.profiles from anon, authenticated;
grant update (name, nationality, country_code, lang, sports, level, bio, onboarded, avatar_path, avatar_color)
  on public.profiles to authenticated;

alter table public.sport_rates enable row level security;
drop policy if exists "tarifs lisibles" on public.sport_rates;
create policy "tarifs lisibles" on public.sport_rates for select using (true);

drop policy if exists "salles lisibles" on public.venues;
create policy "salles lisibles" on public.venues for select using (active);

drop policy if exists "sessions lisibles" on public.sessions;
create policy "sessions lisibles" on public.sessions for select using (true);

drop policy if exists "inscriptions lisibles" on public.session_players;
create policy "inscriptions lisibles" on public.session_players for select using (true);

drop policy if exists "mes invitations" on public.invitations;
create policy "mes invitations" on public.invitations for select
  using (auth.uid() in (from_user_id, to_user_id));

-- ---------------------------------------------------------------------
-- 4. Logique métier (fonctions appelées par l'app)
-- ---------------------------------------------------------------------

-- Recalcule open/full d'une session à partir du nombre de titulaires
create or replace function public._refresh_fill(p_session uuid)
returns void language sql security definer set search_path = public as $$
  update public.sessions s
     set status = case when (select count(*) from public.session_players sp
                              where sp.session_id = s.id and sp.kind = 'player') >= s.quota
                       then 'full' else 'open' end
   where s.id = p_session and s.status in ('open','full');
$$;

-- Confirmation / annulation automatique à la deadline (24–48 h avant)
create or replace function public.evaluate_sessions()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update public.sessions s
     set status = case when (select count(*) from public.session_players sp
                              where sp.session_id = s.id and sp.kind = 'player') >= s.quota
                       then 'confirmed' else 'cancelled' end
   where s.status in ('open','full')
     and s.confirmation_deadline <= now();
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.create_session(
  p_id uuid, p_sport text, p_title text, p_venue_id text, p_starts_at timestamptz,
  p_duration_min integer, p_quota integer, p_price integer, p_level text,
  p_mixed boolean, p_description text, p_confirm_hours integer
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  v_deadline timestamptz;
  v_quota integer := p_quota;
  v_rate public.sport_rates%rowtype;
  v_price integer;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from public.profiles where id = me and onboarded) then
    raise exception 'profile_incomplete';
  end if;
  if p_confirm_hours not in (24, 48) then raise exception 'invalid_input'; end if;
  if not exists (select 1 from public.venues v where v.id = p_venue_id and v.active and p_sport = any(v.sports)) then
    raise exception 'venue_sport_mismatch';
  end if;
  if p_sport = 'futsal' then v_quota := 10; elsif p_sport in ('padel','golf') then v_quota := 4; end if;
  if v_quota is null or v_quota not between 2 and 30 then raise exception 'invalid_input'; end if;
  -- le prix ne vient jamais du joueur : tarif fixe × durée (÷ joueurs si le tarif est celui du terrain)
  select * into v_rate from public.sport_rates where sport = p_sport;
  if not found then raise exception 'invalid_input'; end if;
  v_price := round(v_rate.amount * p_duration_min / 60.0
                   / case when v_rate.per = 'court' then v_quota else 1 end);
  v_deadline := p_starts_at - make_interval(hours => p_confirm_hours);
  if v_deadline <= now() then raise exception 'too_soon'; end if;
  if p_starts_at > now() + interval '90 days' then raise exception 'too_far'; end if;
  if (select count(*) from public.sessions
       where creator_id = me and status in ('open','full') and starts_at > now()) >= 10 then
    raise exception 'too_many_sessions';
  end if;

  insert into public.sessions (id, sport, title, venue_id, starts_at, duration_min, quota,
    price_per_person, level, mixed, confirmation_deadline, creator_id, description)
  values (coalesce(p_id, gen_random_uuid()), p_sport, trim(p_title), p_venue_id, p_starts_at,
    p_duration_min, v_quota, v_price, p_level, p_mixed, v_deadline, me, coalesce(p_description, ''))
  returning id into p_id;

  insert into public.session_players (session_id, user_id, kind) values (p_id, me, 'player');
  perform public._refresh_fill(p_id);
  return p_id;
end $$;

-- Rejoindre : 'joined' | 'lastSpot' | 'waitlist' | 'already'
create or replace function public.join_session(p_session uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  s public.sessions%rowtype;
  n integer;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from public.profiles where id = me and onboarded) then
    raise exception 'profile_incomplete';
  end if;
  select * into s from public.sessions where id = p_session for update;  -- verrou anti-surbooking
  if not found then raise exception 'not_found'; end if;
  if s.status not in ('open','full') or s.confirmation_deadline <= now() then
    raise exception 'session_closed';
  end if;
  if exists (select 1 from public.session_players where session_id = p_session and user_id = me) then
    return 'already';
  end if;

  select count(*) into n from public.session_players where session_id = p_session and kind = 'player';
  update public.invitations set status = 'accepted'
   where session_id = p_session and to_user_id = me and status = 'pending';

  if n < s.quota then
    insert into public.session_players (session_id, user_id, kind) values (p_session, me, 'player');
    perform public._refresh_fill(p_session);
    return case when n + 1 >= s.quota then 'lastSpot' else 'joined' end;
  end if;
  insert into public.session_players (session_id, user_id, kind) values (p_session, me, 'waitlist');
  return 'waitlist';
end $$;

-- Quitter (promotion automatique du 1er de la liste d'attente)
create or replace function public.leave_session(p_session uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  s public.sessions%rowtype;
  was_player boolean;
  next_user uuid;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  select * into s from public.sessions where id = p_session for update;
  if not found then raise exception 'not_found'; end if;
  if s.status not in ('open','full') then raise exception 'session_closed'; end if;

  delete from public.session_players where session_id = p_session and user_id = me
  returning kind = 'player' into was_player;

  if coalesce(was_player, false) then
    select user_id into next_user from public.session_players
     where session_id = p_session and kind = 'waitlist'
     order by joined_at limit 1;
    if next_user is not null then
      update public.session_players set kind = 'player'
       where session_id = p_session and user_id = next_user;
    end if;
  end if;
  perform public._refresh_fill(p_session);
end $$;

-- Annulation par l'organisateur
create or replace function public.cancel_session(p_session uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not_authenticated'; end if;
  update public.sessions set status = 'cancelled'
   where id = p_session and creator_id = me and status in ('open','full');
  if not found then raise exception 'not_allowed'; end if;
end $$;

create or replace function public.send_invitation(p_session uuid, p_to uuid, p_message text)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not_authenticated'; end if;
  if p_to = me then raise exception 'invalid_input'; end if;
  if not exists (select 1 from public.sessions where id = p_session and status in ('open','full')) then
    raise exception 'session_closed';
  end if;
  if not exists (select 1 from public.profiles where id = p_to and onboarded) then
    raise exception 'not_found';
  end if;
  if (select count(*) from public.invitations
       where from_user_id = me and created_at > now() - interval '1 hour') >= 40 then
    raise exception 'rate_limited';
  end if;
  insert into public.invitations (session_id, from_user_id, to_user_id, message)
  values (p_session, me, p_to, left(coalesce(p_message, ''), 300))
  on conflict (session_id, to_user_id) do nothing;
end $$;

create or replace function public.respond_invitation(p_invitation uuid, p_accept boolean)
returns text language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  inv public.invitations%rowtype;
  outcome text := 'declined';
begin
  if me is null then raise exception 'not_authenticated'; end if;
  select * into inv from public.invitations where id = p_invitation and to_user_id = me;
  if not found then raise exception 'not_found'; end if;
  if inv.status <> 'pending' then return inv.status; end if;
  if p_accept then
    outcome := public.join_session(inv.session_id);   -- marque aussi l'invitation acceptée
  else
    update public.invitations set status = 'declined' where id = p_invitation;
  end if;
  return outcome;
end $$;

-- Droits d'exécution
revoke execute on function public._refresh_fill(uuid) from public, anon, authenticated;
revoke execute on function public.create_session(uuid,text,text,text,timestamptz,integer,integer,integer,text,boolean,text,integer) from public, anon;
revoke execute on function public.join_session(uuid) from public, anon;
revoke execute on function public.leave_session(uuid) from public, anon;
revoke execute on function public.cancel_session(uuid) from public, anon;
revoke execute on function public.send_invitation(uuid,uuid,text) from public, anon;
revoke execute on function public.respond_invitation(uuid,boolean) from public, anon;
grant execute on function public.create_session(uuid,text,text,text,timestamptz,integer,integer,integer,text,boolean,text,integer) to authenticated;
grant execute on function public.join_session(uuid) to authenticated;
grant execute on function public.leave_session(uuid) to authenticated;
grant execute on function public.cancel_session(uuid) to authenticated;
grant execute on function public.send_invitation(uuid,uuid,text) to authenticated;
grant execute on function public.respond_invitation(uuid,boolean) to authenticated;
grant execute on function public.evaluate_sessions() to anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

-- Droits de lecture explicites : les projets Supabase récents ne les accordent plus
-- automatiquement aux nouvelles tables. Les règles RLS ci-dessus filtrent les lignes.
grant select on public.venues, public.sessions, public.session_players, public.profiles, public.sport_rates to anon, authenticated;
grant select on public.invitations to authenticated;

-- ---------------------------------------------------------------------
-- 5. Temps réel (mise à jour live du compteur « 7/10 joueurs »)
-- ---------------------------------------------------------------------
do $$
begin
  begin alter publication supabase_realtime add table public.sessions;        exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.session_players; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.invitations;     exception when duplicate_object then null; end;
end $$;

-- ---------------------------------------------------------------------
-- 6. Salles de départ — À REMPLACER par tes vraies salles partenaires
--    (les noms ci-dessous sont ceux du prototype, pas des salles réelles)
-- ---------------------------------------------------------------------
insert into public.venues (id, name, area, sports, address, rating, price_from, photo, amenities, hours) values
 ('v-patong',  'Patong Sports Arena',    'Patong',      array['futsal','padel'], 'Rat-U-Thit 200 Pee Rd, Patong', 4.7, 150, '/venue-patong.jpg',  array['Vestiaires','Douches','Parking','Bar'], '08:00 – 23:00'),
 ('v-kata',    'Kata Beach Padel Club',  'Kata',        array['padel'],          'Kata Rd, Karon',                4.9, 200, '/venue-kata.jpg',    array['Location raquettes','Vue mer','Café'],  '07:00 – 22:00'),
 ('v-chalong', 'Chalong Fit Studio',     'Chalong',     array['gym','dance'],    'Chao Fa West Rd, Chalong',      4.6, 120, '/venue-chalong.jpg', array['Climatisation','Tapis fournis','Coaching'], '06:00 – 21:00'),
 ('v-town',    'Old Town Dance House',   'Phuket Town', array['dance'],          'Thalang Rd, Phuket Town',       4.8, 100, '/venue-town.jpg',    array['Miroirs','Sono pro','Studio climatisé'], '09:00 – 21:00'),
 ('v-rawai',   'Rawai Futsal Dome',      'Rawai',       array['futsal'],         'Wiset Rd, Rawai',               4.5, 130, '/venue-rawai.jpg',   array['Terrain couvert','Éclairage LED','Parking'], '08:00 – 23:00'),
 ('v-bangtao', 'Bang Tao Sports Resort', 'Bang Tao',    array['padel','gym'],    'Laguna Area, Choeng Thale',     4.9, 250, '/venue-bangtao.jpg', array['Resort premium','Yoga deck','Piscine','Spa'], '06:00 – 22:00'),
 ('v-golf',    'Kathu Hills Golf Club',  'Kathu',       array['golf'],           'Vichitsongkram Rd, Kathu',      4.7, 120, '/sport-golf.jpg',    array['Parcours 18 trous','Practice','Location de clubs','Club-house'], '06:00 – 18:00')
on conflict (id) do nothing;

-- « À partir de » affiché sur les salles = tarif horaire par joueur le moins cher de ses sports
update public.venues v set price_from = coalesce((
  select min(case when r.per = 'court' then round(r.amount / case r.sport when 'futsal' then 10.0 else 4.0 end) else r.amount end)
  from public.sport_rates r where r.sport = any(v.sports)), v.price_from);

-- ---------------------------------------------------------------------
-- 7. Tâche planifiée : évaluation des deadlines toutes les 5 minutes
--    Nécessite l'extension pg_cron (Database > Extensions > pg_cron > Enable).
--    Si pg_cron n'est pas activé, cette partie échoue sans rien casser :
--    l'app appelle aussi evaluate_sessions() à chaque visite.
-- ---------------------------------------------------------------------
do $$
begin
  perform cron.schedule('friendplus-evaluate-sessions', '*/5 * * * *', 'select public.evaluate_sessions()');
exception when others then
  raise notice 'pg_cron non activé : active-le puis relance uniquement cette section.';
end $$;

-- ---------------------------------------------------------------------
-- 8. Photos de profil : espace de stockage public « avatars » (2 Mo max)
--    Chaque joueur n'écrit que dans son dossier « <son id>/ ».
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "je vois mes avatars" on storage.objects;
create policy "je vois mes avatars" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "j'envoie mon avatar" on storage.objects;
create policy "j'envoie mon avatar" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "je supprime mon avatar" on storage.objects;
create policy "je supprime mon avatar" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
