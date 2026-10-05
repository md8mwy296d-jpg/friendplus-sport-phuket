-- =====================================================================
-- My Phuket Key — base de données (Supabase / Postgres)
-- Réservation de services à Phuket : scooters, excursions, bateaux, hôtels
-- et villas, conciergerie clubs, nounou, ménage, beauté, hélicoptère.
--
-- À exécuter dans Supabase > SQL Editor (ré-exécutable sans risque).
-- Complète moderation.sql et visits.sql (blocage d'IP, statistiques de visites).
--
-- Principe : une réservation n'est valide qu'une fois la carte débitée.
--   1. le client crée sa réservation   → statut « pending_payment » (prix calculé ici, jamais par l'app)
--   2. il paie sur Stripe Checkout      → fonction Edge `create-checkout`
--   3. Stripe confirme le paiement      → fonction Edge `stripe-webhook` → statut « paid »
--   4. tu confirmes avec le prestataire → « confirmed », puis « completed »
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Comptes clients
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null default '' check (char_length(name) <= 60),
  nationality   text not null default '🌍',
  country_code  text not null default '' check (char_length(country_code) <= 2),
  lang          text not null default 'en',
  onboarded     boolean not null default false,
  created_at    timestamptz not null default now()
);
alter table public.profiles add column if not exists phone text not null default '';
alter table public.profiles add column if not exists avatar_path text not null default '';
alter table public.profiles add column if not exists avatar_color smallint;
alter table public.profiles drop constraint if exists profiles_phone_check;
alter table public.profiles add constraint profiles_phone_check check (char_length(phone) <= 30);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), 60))
  on conflict (id) do nothing;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Administrateurs (toi) : à remplir à la main, voir DEPLOIEMENT.md
create table if not exists public.app_admins (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create or replace function public.is_app_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid());
$$;
-- utilisée par les règles de lecture des offres : doit rester exécutable par les visiteurs (renvoie false)
revoke execute on function public.is_app_admin() from public;
grant execute on function public.is_app_admin() to anon, authenticated;

alter table public.profiles   enable row level security;
alter table public.app_admins enable row level security;

-- Un client ne voit que son propre profil (le numéro de téléphone est privé)
drop policy if exists "profiles lisibles" on public.profiles;
drop policy if exists "mon profil" on public.profiles;
create policy "mon profil" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_app_admin());
drop policy if exists "je modifie mon profil" on public.profiles;
create policy "je modifie mon profil" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

revoke all on public.profiles from anon;
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (name, nationality, country_code, lang, phone, onboarded, avatar_path, avatar_color)
  on public.profiles to authenticated;

drop policy if exists "je sais si je suis admin" on public.app_admins;
create policy "je sais si je suis admin" on public.app_admins for select to authenticated
  using (user_id = auth.uid());
revoke all on public.app_admins from anon;
grant select on public.app_admins to authenticated;

-- Suppression de compte par le client (page Profil). Ses réservations restent pour
-- la comptabilité, sans lien vers le compte.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from public.app_admins where user_id = v_uid) then raise exception 'not_allowed'; end if;
  delete from auth.users where id = v_uid;
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------------
-- 2. Offres (gérées par toi depuis la page Admin)
-- ---------------------------------------------------------------------
-- price_unit : comment le prix se multiplie
--   person : prix × nombre de personnes         (excursion, entrée en club)
--   group  : prix fixe par réservation          (bateau privatisé, hélicoptère)
--   day    : prix × jours × quantité (véhicules) (scooter, moto)
--   night  : prix × nuits                       (hôtel, villa)
--   hour   : prix × heures                      (nounou, ménage, beauté)
--   item   : prix × quantité                    (bagages livrés)
-- options : [{ "id": "insurance", "label": "Assurance premium", "price_thb": 300, "per": "booking" | "unit" }]
--   « unit » se multiplie comme le prix de base, « booking » est compté une fois.
create table if not exists public.offers (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 80),
  category        text not null check (category in
                    ('arrival','scooter','excursion','boat','stay','nightlife','nanny','cleaning','beauty','helicopter')),
  title           text not null check (char_length(title) between 3 and 120),
  summary         text not null default '' check (char_length(summary) <= 300),
  description     text not null default '' check (char_length(description) <= 5000),
  highlights      text[] not null default '{}',
  included        text[] not null default '{}',
  not_included    text[] not null default '{}',
  area            text not null default '' check (char_length(area) <= 80),
  meeting_point   text not null default '' check (char_length(meeting_point) <= 300),
  duration_label  text not null default '' check (char_length(duration_label) <= 60),
  price_thb       integer not null check (price_thb between 1 and 5000000),
  price_unit      text not null check (price_unit in ('person','group','day','night','hour','item')),
  min_qty         integer not null default 1 check (min_qty between 1 and 100),
  max_qty         integer not null default 10 check (max_qty between 1 and 200),
  options         jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  photos          text[] not null default '{}',
  rating          numeric(2,1) not null default 5.0 check (rating between 0 and 5),
  review_count    integer not null default 0 check (review_count >= 0),
  cancellation    text not null default '' check (char_length(cancellation) <= 1000),
  featured        boolean not null default false,
  active          boolean not null default true,
  sort            integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (min_qty <= max_qty)
);
create index if not exists offers_category_idx on public.offers (category, sort) where active;

-- Programme d'arrivée : livraison à l'aéroport ou à l'adresse du client (frais en THB, vide = non proposé)
alter table public.offers add column if not exists delivery_airport_thb integer check (delivery_airport_thb between 0 and 100000);
alter table public.offers add column if not exists delivery_address_thb integer check (delivery_address_thb between 0 and 100000);
-- ce que l'offre règle pour l'atterrissage (checklist « Mon arrivée ») : welcome = accueil/transfert, ride = véhicule, bags = bagages
alter table public.offers add column if not exists arrival_covers text[] not null default '{}'
  check (arrival_covers <@ array['welcome','ride','bags']::text[]);
-- catégorie « arrival » et unité « item » ajoutées après la première version
alter table public.offers drop constraint if exists offers_category_check;
alter table public.offers add constraint offers_category_check check (category in
  ('arrival','scooter','excursion','boat','stay','nightlife','nanny','cleaning','beauty','helicopter'));
alter table public.offers drop constraint if exists offers_price_unit_check;
alter table public.offers add constraint offers_price_unit_check check (price_unit in
  ('person','group','day','night','hour','item'));

alter table public.offers enable row level security;
drop policy if exists "offres visibles" on public.offers;
create policy "offres visibles" on public.offers for select
  using (active or public.is_app_admin());
grant select on public.offers to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Réservations
-- ---------------------------------------------------------------------
create table if not exists public.bookings (
  id                     uuid primary key default gen_random_uuid(),
  ref                    text not null unique default ('MPK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))),
  user_id                uuid references public.profiles(id) on delete set null,
  offer_id               uuid references public.offers(id) on delete set null,
  offer_title            text not null,
  category               text not null,
  start_date             date not null,
  end_date               date,
  start_time             text not null default '' check (start_time = '' or start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  qty                    integer not null check (qty between 1 and 200),
  units                  integer not null default 1 check (units between 1 and 60),
  options                jsonb not null default '[]'::jsonb,
  amount_thb             integer not null check (amount_thb > 0),
  status                 text not null default 'pending_payment' check (status in
                           ('pending_payment','paid','confirmed','completed','cancelled','refunded','expired')),
  contact_name           text not null check (char_length(contact_name) between 2 and 80),
  contact_phone          text not null check (char_length(contact_phone) between 6 and 30),
  pickup                 text not null default '' check (char_length(pickup) <= 300),
  notes                  text not null default '' check (char_length(notes) <= 1000),
  admin_note             text not null default '' check (char_length(admin_note) <= 1000),
  stripe_session_id      text unique,
  stripe_payment_intent  text,
  paid_at                timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists bookings_user_idx on public.bookings (user_id, created_at desc);
-- livraison : none = le client vient chercher / est pris en charge, airport = remis à l'arrivée, address = livré à son hôtel/villa
alter table public.bookings add column if not exists delivery text not null default 'none'
  check (delivery in ('none','airport','address'));
alter table public.bookings add column if not exists delivery_fee_thb integer not null default 0 check (delivery_fee_thb >= 0);
alter table public.bookings add column if not exists delivery_address text not null default ''
  check (char_length(delivery_address) <= 300);
alter table public.bookings add column if not exists flight_number text not null default ''
  check (char_length(flight_number) <= 12);
create index if not exists bookings_status_idx on public.bookings (status, start_date);

alter table public.bookings enable row level security;
drop policy if exists "mes reservations" on public.bookings;
create policy "mes reservations" on public.bookings for select to authenticated
  using (user_id = auth.uid() or public.is_app_admin());
revoke all on public.bookings from anon;
revoke insert, update, delete on public.bookings from authenticated;
grant select on public.bookings to authenticated;

-- Mon voyage : arrivée, vol, hébergement. La conciergerie prépare tout pour l'atterrissage
-- (scooter remis à l'aéroport, bagages livrés à l'hôtel ou la villa…). Une fiche par client.
create table if not exists public.trips (
  user_id        uuid primary key references public.profiles(id) on delete cascade,
  arrival_date   date,
  arrival_time   text not null default '' check (arrival_time = '' or arrival_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  flight_number  text not null default '' check (flight_number ~ '^[A-Z0-9]{0,8}$'),
  departure_date date,
  stay_type      text not null default 'hotel' check (stay_type in ('hotel','villa','condo','other')),
  stay_name      text not null default '' check (char_length(stay_name) <= 120),
  stay_address   text not null default '' check (char_length(stay_address) <= 300),
  travelers      integer not null default 2 check (travelers between 1 and 30),
  bags           integer not null default 2 check (bags between 0 and 40),
  notes          text not null default '' check (char_length(notes) <= 1000),
  updated_at     timestamptz not null default now(),
  check (departure_date is null or arrival_date is null or departure_date >= arrival_date)
);
alter table public.trips enable row level security;
drop policy if exists "mon voyage" on public.trips;
create policy "mon voyage" on public.trips for select to authenticated
  using (user_id = auth.uid() or public.is_app_admin());
drop policy if exists "je crée mon voyage" on public.trips;
create policy "je crée mon voyage" on public.trips for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "je modifie mon voyage" on public.trips;
create policy "je modifie mon voyage" on public.trips for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "je supprime mon voyage" on public.trips;
create policy "je supprime mon voyage" on public.trips for delete to authenticated
  using (user_id = auth.uid());
revoke all on public.trips from anon;
grant select, insert, update, delete on public.trips to authenticated;

-- Prix calculé côté serveur à partir de l'offre (l'app ne fait qu'afficher une estimation)
create or replace function public._booking_amount(o public.offers, p_qty integer, p_units integer, p_option_ids text[])
returns table (amount integer, chosen jsonb)
language plpgsql immutable set search_path = public as $$
declare
  v_mult integer;
  v_total bigint;
  opt jsonb;
begin
  v_mult := case o.price_unit
    when 'person' then p_qty
    when 'group'  then 1
    when 'day'    then p_units * p_qty
    when 'night'  then p_units
    when 'hour'   then p_qty
    when 'item'   then p_qty
  end;
  v_total := o.price_thb::bigint * v_mult;
  chosen := '[]'::jsonb;
  for opt in select value from jsonb_array_elements(o.options) loop
    if opt->>'id' = any(coalesce(p_option_ids, '{}')) then
      v_total := v_total + (opt->>'price_thb')::bigint
                 * case when opt->>'per' = 'unit' then v_mult else 1 end;
      chosen := chosen || jsonb_build_array(opt);
    end if;
  end loop;
  if v_total > 50000000 then raise exception 'invalid_input'; end if;
  amount := v_total::integer;
  return next;
end $$;
revoke execute on function public._booking_amount(public.offers, integer, integer, text[]) from public, anon, authenticated;

-- ancienne version sans livraison
drop function if exists public.create_booking(uuid, date, date, text, integer, text[], text, text, text, text);

create or replace function public.create_booking(
  p_offer uuid, p_start date, p_end date, p_time text, p_qty integer, p_options text[],
  p_contact_name text, p_contact_phone text, p_pickup text, p_notes text,
  p_delivery text, p_delivery_address text, p_flight text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  o public.offers%rowtype;
  v_today date := (now() at time zone 'Asia/Bangkok')::date;
  v_units integer := 1;
  v_price record;
  v_delivery text := coalesce(nullif(p_delivery, ''), 'none');
  v_fee integer := 0;
  v_flight text := upper(regexp_replace(coalesce(p_flight, ''), '\s', '', 'g'));
  v_address text := left(trim(coalesce(p_delivery_address, '')), 300);
  v_id uuid;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  select * into o from public.offers where id = p_offer and active;
  if not found then raise exception 'not_found'; end if;
  if p_start is null or p_start < v_today or p_start > v_today + 365 then raise exception 'invalid_date'; end if;
  if o.price_unit in ('day','night') then
    if p_end is null or p_end <= p_start or p_end - p_start > 60 then raise exception 'invalid_date'; end if;
    v_units := p_end - p_start;
  else
    p_end := null;
  end if;
  if p_qty is null or p_qty < o.min_qty or p_qty > o.max_qty then raise exception 'invalid_quantity'; end if;
  if char_length(trim(coalesce(p_contact_name, ''))) < 2 or char_length(trim(coalesce(p_contact_phone, ''))) < 6 then
    raise exception 'invalid_contact';
  end if;
  -- anti-abus : 10 réservations non payées par heure
  if (select count(*) from public.bookings
       where user_id = me and status = 'pending_payment' and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'rate_limited';
  end if;

  -- livraison : seulement si l'offre la propose ; aéroport = numéro de vol, adresse = hôtel/villa
  if v_delivery = 'airport' then
    if o.delivery_airport_thb is null or v_flight !~ '^[A-Z0-9]{3,8}$' then raise exception 'invalid_delivery'; end if;
    v_fee := o.delivery_airport_thb;
    v_address := 'Aéroport de Phuket (HKT)';
  elsif v_delivery = 'address' then
    if o.delivery_address_thb is null or char_length(v_address) < 5 then raise exception 'invalid_delivery'; end if;
    v_fee := o.delivery_address_thb;
    v_flight := '';
  elsif v_delivery = 'none' then
    v_address := '';
    v_flight := left(v_flight, 12);
  else
    raise exception 'invalid_delivery';
  end if;

  select * into v_price from public._booking_amount(o, p_qty, v_units, p_options);

  insert into public.bookings (user_id, offer_id, offer_title, category, start_date, end_date, start_time, qty, units,
                               options, amount_thb, contact_name, contact_phone, pickup, notes,
                               delivery, delivery_fee_thb, delivery_address, flight_number)
  values (me, o.id, o.title, o.category, p_start, p_end, coalesce(nullif(trim(p_time), ''), ''), p_qty, v_units,
          v_price.chosen, v_price.amount + v_fee, trim(p_contact_name), trim(p_contact_phone),
          left(trim(coalesce(p_pickup, '')), 300), left(trim(coalesce(p_notes, '')), 1000),
          v_delivery, v_fee, v_address, v_flight)
  returning id into v_id;
  return v_id;
end $$;

-- Le client abandonne une réservation pas encore payée
create or replace function public.cancel_unpaid_booking(p_booking uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.bookings set status = 'cancelled', updated_at = now()
   where id = p_booking and user_id = auth.uid() and status = 'pending_payment';
  if not found then raise exception 'not_allowed'; end if;
end $$;

-- Garde « serveur uniquement » : fonctions Edge (rôle service) ou tâches planifiées (postgres).
-- En plus des droits d'exécution retirés plus bas : double sécurité.
create or replace function public._require_server()
returns void language plpgsql stable set search_path = public as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'not_allowed';
  end if;
end $$;

-- Paiement reçu : appelée UNIQUEMENT par la fonction Edge stripe-webhook (rôle service)
create or replace function public.mark_booking_paid(p_booking uuid, p_session text, p_intent text, p_amount_thb integer)
returns text language plpgsql security invoker set search_path = public as $$
declare b public.bookings%rowtype;
begin
  perform public._require_server();
  select * into b from public.bookings where id = p_booking for update;
  if not found then return 'not_found'; end if;
  if b.status in ('paid','confirmed','completed') then return 'already'; end if;
  if b.amount_thb <> p_amount_thb then
    update public.bookings set admin_note = left('Montant payé différent : ' || p_amount_thb || ' THB. ' || admin_note, 1000)
     where id = p_booking;
  end if;
  -- payée même si elle avait expiré entre-temps : l'argent est là, on honore la réservation
  update public.bookings
     set status = 'paid', paid_at = now(), stripe_session_id = coalesce(p_session, stripe_session_id),
         stripe_payment_intent = p_intent, updated_at = now()
   where id = p_booking;
  return 'paid';
end $$;

-- Session de paiement créée : appelée par la fonction Edge create-checkout (rôle service)
create or replace function public.attach_checkout_session(p_booking uuid, p_session text)
returns void language plpgsql security invoker set search_path = public as $$
begin
  perform public._require_server();
  update public.bookings set stripe_session_id = p_session, updated_at = now()
   where id = p_booking and status = 'pending_payment';
end $$;

-- Réservations non payées au bout de 2 h : expirées (appelé aussi par pg_cron)
create or replace function public.expire_unpaid_bookings()
returns integer language plpgsql security invoker set search_path = public as $$
declare n integer;
begin
  perform public._require_server();
  update public.bookings set status = 'expired', updated_at = now()
   where status = 'pending_payment' and created_at < now() - interval '2 hours';
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------------
-- 4. Admin : offres, réservations
-- ---------------------------------------------------------------------
create or replace function public.admin_save_offer(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid := nullif(p->>'id', '')::uuid;
begin
  if not public.is_app_admin() then raise exception 'not_allowed'; end if;
  if v_id is null then
    insert into public.offers (slug, category, title, price_thb, price_unit)
    values (p->>'slug', p->>'category', p->>'title', (p->>'price_thb')::int, p->>'price_unit')
    returning id into v_id;
  end if;
  update public.offers set
    slug           = p->>'slug',
    category       = p->>'category',
    title          = p->>'title',
    summary        = coalesce(p->>'summary', ''),
    description    = coalesce(p->>'description', ''),
    highlights     = coalesce(array(select jsonb_array_elements_text(p->'highlights')), '{}'),
    included       = coalesce(array(select jsonb_array_elements_text(p->'included')), '{}'),
    not_included   = coalesce(array(select jsonb_array_elements_text(p->'not_included')), '{}'),
    area           = coalesce(p->>'area', ''),
    meeting_point  = coalesce(p->>'meeting_point', ''),
    duration_label = coalesce(p->>'duration_label', ''),
    price_thb      = (p->>'price_thb')::int,
    price_unit     = p->>'price_unit',
    min_qty        = coalesce((p->>'min_qty')::int, 1),
    max_qty        = coalesce((p->>'max_qty')::int, 10),
    options        = coalesce(p->'options', '[]'::jsonb),
    photos         = coalesce(array(select jsonb_array_elements_text(p->'photos')), '{}'),
    rating         = coalesce((p->>'rating')::numeric, 5.0),
    review_count   = coalesce((p->>'review_count')::int, 0),
    cancellation   = coalesce(p->>'cancellation', ''),
    featured       = coalesce((p->>'featured')::boolean, false),
    active         = coalesce((p->>'active')::boolean, true),
    sort           = coalesce((p->>'sort')::int, 0),
    delivery_airport_thb = nullif(p->>'delivery_airport_thb', '')::int,
    delivery_address_thb = nullif(p->>'delivery_address_thb', '')::int,
    arrival_covers = coalesce(array(select jsonb_array_elements_text(p->'arrival_covers')), '{}'),
    updated_at     = now()
  where id = v_id;
  return v_id;
end $$;

create or replace function public.admin_set_booking_status(p_booking uuid, p_status text, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_app_admin() then raise exception 'not_allowed'; end if;
  if p_status not in ('paid','confirmed','completed','cancelled','refunded') then raise exception 'invalid_input'; end if;
  update public.bookings
     set status = p_status, admin_note = left(coalesce(p_note, admin_note), 1000), updated_at = now()
   where id = p_booking;
  if not found then raise exception 'not_found'; end if;
end $$;

-- Liste des réservations pour l'admin, avec l'e-mail du client, la livraison et son arrivée
drop function if exists public.admin_bookings(integer);
create or replace function public.admin_bookings(p_limit integer default 300)
returns table (
  id uuid, ref text, status text, offer_title text, category text, start_date date, end_date date,
  start_time text, qty integer, units integer, options jsonb, amount_thb integer,
  contact_name text, contact_phone text, pickup text, notes text, admin_note text,
  email text, paid_at timestamptz, created_at timestamptz,
  delivery text, delivery_fee_thb integer, delivery_address text, flight_number text,
  trip jsonb
) language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_app_admin() then raise exception 'not_allowed'; end if;
  return query
    select b.id, b.ref, b.status, b.offer_title, b.category, b.start_date, b.end_date, b.start_time,
           b.qty, b.units, b.options, b.amount_thb, b.contact_name, b.contact_phone, b.pickup, b.notes,
           b.admin_note, u.email::text, b.paid_at, b.created_at,
           b.delivery, b.delivery_fee_thb, b.delivery_address, b.flight_number,
           case when t.user_id is null then null else to_jsonb(t) - 'user_id' end
      from public.bookings b
      left join auth.users u on u.id = b.user_id
      left join public.trips t on t.user_id = b.user_id
     where b.status <> 'expired' or b.created_at > now() - interval '3 days'
     order by b.created_at desc
     limit least(greatest(p_limit, 1), 1000);
end $$;

-- Droits d'exécution
revoke execute on function public.create_booking(uuid, date, date, text, integer, text[], text, text, text, text, text, text, text) from public, anon;
grant  execute on function public.create_booking(uuid, date, date, text, integer, text[], text, text, text, text, text, text, text) to authenticated;
revoke execute on function public.cancel_unpaid_booking(uuid) from public, anon;
grant  execute on function public.cancel_unpaid_booking(uuid) to authenticated;
revoke execute on function public.admin_save_offer(jsonb) from public, anon;
grant  execute on function public.admin_save_offer(jsonb) to authenticated;
revoke execute on function public.admin_set_booking_status(uuid, text, text) from public, anon;
grant  execute on function public.admin_set_booking_status(uuid, text, text) to authenticated;
revoke execute on function public.admin_bookings(integer) from public, anon;
grant  execute on function public.admin_bookings(integer) to authenticated;
-- réservées au serveur (fonctions Edge avec la clé service_role)
revoke execute on function public.mark_booking_paid(uuid, text, text, integer) from public, anon, authenticated;
revoke execute on function public.attach_checkout_session(uuid, text) from public, anon, authenticated;
revoke execute on function public.expire_unpaid_bookings() from public, anon, authenticated;
grant  execute on function public.mark_booking_paid(uuid, text, text, integer) to service_role;
grant  execute on function public.attach_checkout_session(uuid, text) to service_role;
grant  execute on function public.expire_unpaid_bookings() to service_role;
revoke execute on function public._require_server() from public, anon, authenticated;
grant  execute on function public._require_server() to service_role;
grant all on public.bookings to service_role;

-- ---------------------------------------------------------------------
-- 5. Photos des offres : stockage public « offer-photos », écriture réservée à l'admin
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('offer-photos', 'offer-photos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "photos offres : admin ajoute" on storage.objects;
create policy "photos offres : admin ajoute" on storage.objects for insert to authenticated
  with check (bucket_id = 'offer-photos' and public.is_app_admin());
drop policy if exists "photos offres : admin supprime" on storage.objects;
create policy "photos offres : admin supprime" on storage.objects for delete to authenticated
  using (bucket_id = 'offer-photos' and public.is_app_admin());

-- ---------------------------------------------------------------------
-- 6. E-mails automatiques au paiement (Resend, via pg_net)
--    Clé dans Supabase Vault sous le nom 'resend_api_key'. Sans clé : rien n'est envoyé.
--    Le client reçoit son reçu ; chaque admin reçoit une alerte « nouvelle réservation payée ».
-- ---------------------------------------------------------------------
create extension if not exists pg_net with schema extensions;

create table if not exists public.booking_emails (
  booking_id  uuid not null references public.bookings(id) on delete cascade,
  kind        text not null check (kind in ('receipt','admin_alert','confirmed','cancelled')),
  request_id  bigint,
  created_at  timestamptz not null default now(),
  primary key (booking_id, kind)
);
alter table public.booking_emails enable row level security;
revoke all on public.booking_emails from anon, authenticated;

-- Expéditeur : domaine vérifié dans Resend (à remplacer par myphuketkey.com une fois vérifié)
create or replace function public._mpk_sender()
returns text language sql immutable as $$ select 'My Phuket Key <noreply@friendplussport.center>' $$;
create or replace function public._mpk_site()
returns text language sql immutable as $$ select 'https://www.friendplussport.center' $$;

create or replace function public._booking_email_text(p_lang text, p_kind text, b public.bookings)
returns table (subject text, body text)
language plpgsql stable set search_path = public as $$
declare
  l text := case when p_lang in ('fr','en','ru','th') then p_lang else 'en' end;
  v_when text := to_char(b.start_date, 'DD/MM/YYYY')
                 || case when b.end_date is not null then ' → ' || to_char(b.end_date, 'DD/MM/YYYY') else '' end
                 || case when b.start_time <> '' then ' · ' || b.start_time else '' end;
  v_amount text := to_char(b.amount_thb, 'FM999G999G999') || ' THB';
  v_url text := public._mpk_site() || '/reservations/' || b.id;
  v_name text := coalesce(nullif(split_part(b.contact_name, ' ', 1), ''), '');
  v_dlv text := '';
begin
  if b.delivery = 'airport' then
    v_dlv := E'\n✈️ ' || case l
      when 'fr' then 'Remis à ton arrivée à l''aéroport de Phuket · vol '
      when 'ru' then 'Встреча в аэропорту Пхукета · рейс '
      when 'th' then 'ส่งมอบที่สนามบินภูเก็ตเมื่อคุณมาถึง · เที่ยวบิน '
      else 'Handed over on arrival at Phuket Airport · flight ' end || b.flight_number;
  elsif b.delivery = 'address' then
    v_dlv := E'\n📍 ' || case l
      when 'fr' then 'Livré à : '
      when 'ru' then 'Доставка: '
      when 'th' then 'จัดส่งที่: '
      else 'Delivered to: ' end || b.delivery_address;
  end if;
  if p_kind = 'receipt' then
    subject := case l
      when 'fr' then '✅ Paiement reçu · ' || b.offer_title || ' (' || b.ref || ')'
      when 'ru' then '✅ Оплата получена · ' || b.offer_title || ' (' || b.ref || ')'
      when 'th' then '✅ ได้รับการชำระเงินแล้ว · ' || b.offer_title || ' (' || b.ref || ')'
      else '✅ Payment received · ' || b.offer_title || ' (' || b.ref || ')' end;
    body := case l
      when 'fr' then 'Bonjour ' || v_name || E',\n\nMerci ! Ton paiement de ' || v_amount || ' est bien reçu pour « ' || b.offer_title || E' ».\n\n📅 ' || v_when || v_dlv || E'\n🔖 Référence : ' || b.ref || E'\n\nNotre conciergerie confirme maintenant avec le prestataire et te contacte sur le ' || b.contact_phone || E' si besoin.\nSuivi de ta réservation :\n' || v_url
      when 'ru' then 'Здравствуйте, ' || v_name || E'!\n\nСпасибо! Оплата ' || v_amount || ' за «' || b.offer_title || E'» получена.\n\n📅 ' || v_when || v_dlv || E'\n🔖 Номер: ' || b.ref || E'\n\nНаш консьерж подтвердит детали с исполнителем и при необходимости свяжется с вами по номеру ' || b.contact_phone || E'.\nВаше бронирование:\n' || v_url
      when 'th' then 'สวัสดี ' || v_name || E'\n\nขอบคุณ! เราได้รับการชำระเงิน ' || v_amount || ' สำหรับ "' || b.offer_title || E'" แล้ว\n\n📅 ' || v_when || v_dlv || E'\n🔖 หมายเลขการจอง: ' || b.ref || E'\n\nทีมคอนเซียร์จจะยืนยันกับผู้ให้บริการ และจะติดต่อคุณที่ ' || b.contact_phone || E' หากจำเป็น\nติดตามการจอง:\n' || v_url
      else 'Hi ' || v_name || E',\n\nThank you! Your payment of ' || v_amount || ' for "' || b.offer_title || E'" has been received.\n\n📅 ' || v_when || v_dlv || E'\n🔖 Reference: ' || b.ref || E'\n\nOur concierge is now confirming with the provider and will contact you on ' || b.contact_phone || E' if needed.\nTrack your booking:\n' || v_url end;
  elsif p_kind = 'confirmed' then
    subject := case l
      when 'fr' then '🔑 Réservation confirmée · ' || b.offer_title
      when 'ru' then '🔑 Бронирование подтверждено · ' || b.offer_title
      when 'th' then '🔑 ยืนยันการจองแล้ว · ' || b.offer_title
      else '🔑 Booking confirmed · ' || b.offer_title end;
    body := case l
      when 'fr' then 'Bonjour ' || v_name || E',\n\nC''est confirmé avec le prestataire : « ' || b.offer_title || E' ».\n\n📅 ' || v_when || v_dlv || E'\n🔖 ' || b.ref || E'\n\nTous les détails :\n' || v_url
      when 'ru' then 'Здравствуйте, ' || v_name || E'!\n\nИсполнитель подтвердил: «' || b.offer_title || E'».\n\n📅 ' || v_when || v_dlv || E'\n🔖 ' || b.ref || E'\n\nВсе детали:\n' || v_url
      when 'th' then 'สวัสดี ' || v_name || E'\n\nผู้ให้บริการยืนยันแล้ว: "' || b.offer_title || E'"\n\n📅 ' || v_when || v_dlv || E'\n🔖 ' || b.ref || E'\n\nรายละเอียดทั้งหมด:\n' || v_url
      else 'Hi ' || v_name || E',\n\nIt''s confirmed with the provider: "' || b.offer_title || E'".\n\n📅 ' || v_when || v_dlv || E'\n🔖 ' || b.ref || E'\n\nAll the details:\n' || v_url end;
  elsif p_kind = 'cancelled' then
    subject := case l
      when 'fr' then 'Réservation annulée · ' || b.offer_title || ' (' || b.ref || ')'
      when 'ru' then 'Бронирование отменено · ' || b.offer_title || ' (' || b.ref || ')'
      when 'th' then 'การจองถูกยกเลิก · ' || b.offer_title || ' (' || b.ref || ')'
      else 'Booking cancelled · ' || b.offer_title || ' (' || b.ref || ')' end;
    body := case l
      when 'fr' then 'Bonjour ' || v_name || E',\n\nTa réservation « ' || b.offer_title || '» (' || b.ref || E') est annulée. Si tu avais payé, le remboursement suit les conditions d''annulation de l''offre ; notre équipe te recontacte.\n\n' || v_url
      when 'ru' then 'Здравствуйте, ' || v_name || E'!\n\nБронирование «' || b.offer_title || '» (' || b.ref || E') отменено. Если оплата была внесена, возврат производится по условиям отмены; мы свяжемся с вами.\n\n' || v_url
      when 'th' then 'สวัสดี ' || v_name || E'\n\nการจอง "' || b.offer_title || '" (' || b.ref || E') ถูกยกเลิก หากชำระเงินแล้ว การคืนเงินเป็นไปตามเงื่อนไขการยกเลิก ทีมงานจะติดต่อกลับ\n\n' || v_url
      else 'Hi ' || v_name || E',\n\nYour booking "' || b.offer_title || '" (' || b.ref || E') has been cancelled. If you had paid, the refund follows the offer''s cancellation terms; our team will get back to you.\n\n' || v_url end;
  else -- admin_alert, toujours en français
    subject := '💳 Nouvelle réservation payée · ' || b.ref || ' · ' || v_amount;
    body := 'Offre : ' || b.offer_title || E'\nDate : ' || v_when || E'\nQuantité : ' || b.qty
            || E'\nMontant : ' || v_amount || E'\nClient : ' || b.contact_name || ' · ' || b.contact_phone
            || E'\nPrise en charge : ' || coalesce(nullif(b.pickup, ''), '—')
            || case b.delivery when 'airport' then E'\n✈️ LIVRAISON AÉROPORT · vol ' || b.flight_number
                               when 'address' then E'\n📍 LIVRAISON : ' || b.delivery_address else '' end || E'\nNotes : ' || coalesce(nullif(b.notes, ''), '—')
            || E'\n\nÀ confirmer avec le prestataire, puis passer en « Confirmée » :\n' || public._mpk_site() || '/admin';
  end if;
  body := body || E'\n\n— My Phuket Key';
  return next;
end $$;
revoke all on function public._booking_email_text(text, text, public.bookings) from public, anon, authenticated;

create or replace function public._send_booking_email(b public.bookings, p_kind text, p_to text, p_lang text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  v_key text;
  m record;
  v_req bigint;
begin
  -- jamais appelable directement par un visiteur (anti-spam) : uniquement depuis le serveur / les déclencheurs
  if coalesce(auth.role(), '') <> 'service_role' and session_user not in ('postgres', 'supabase_admin')
     and current_setting('mpk.in_trigger', true) is distinct from 'on' then
    raise exception 'not_allowed';
  end if;
  if p_to is null or exists (select 1 from public.booking_emails where booking_id = b.id and kind = p_kind) then
    return;
  end if;
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  if v_key is null then return; end if;
  select * into m from public._booking_email_text(p_lang, p_kind, b);
  select net.http_post(
    url     := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_key, 'Content-Type', 'application/json'),
    body    := jsonb_build_object('from', public._mpk_sender(), 'to', jsonb_build_array(p_to),
                                  'subject', m.subject, 'text', m.body,
                                  'tags', jsonb_build_array(jsonb_build_object('name', 'type', 'value', 'booking_' || p_kind)))
  ) into v_req;
  insert into public.booking_emails (booking_id, kind, request_id) values (b.id, p_kind, v_req)
  on conflict do nothing;
end $$;
revoke all on function public._send_booking_email(public.bookings, text, text, text) from public, anon, authenticated;

create or replace function public._notify_booking_status()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare
  v_email text;
  v_lang text;
  a record;
begin
  if new.status = old.status then return new; end if;
  perform set_config('mpk.in_trigger', 'on', true);
  select u.email, p.lang into v_email, v_lang
    from auth.users u left join public.profiles p on p.id = u.id where u.id = new.user_id;
  if new.status = 'paid' then
    perform public._send_booking_email(new, 'receipt', v_email, v_lang);
    for a in select u.email from public.app_admins ad join auth.users u on u.id = ad.user_id where u.email is not null loop
      perform public._send_booking_email(new, 'admin_alert', a.email, 'fr');
      exit; -- une alerte par réservation (premier admin) ; ajoute des admins = même boîte
    end loop;
  elsif new.status = 'confirmed' then
    perform public._send_booking_email(new, 'confirmed', v_email, v_lang);
  elsif new.status = 'cancelled' and old.status <> 'pending_payment' then
    perform public._send_booking_email(new, 'cancelled', v_email, v_lang);
  end if;
  perform set_config('mpk.in_trigger', 'off', true);
  return new;
exception when others then
  -- un souci d'e-mail ne doit jamais bloquer un paiement
  raise warning 'booking email failed: %', sqlerrm;
  return new;
end $$;
revoke all on function public._notify_booking_status() from public, anon, authenticated;

drop trigger if exists bookings_notify_status on public.bookings;
create trigger bookings_notify_status
  after update of status on public.bookings
  for each row execute function public._notify_booking_status();

-- ---------------------------------------------------------------------
-- 7. Tâche planifiée : expiration des réservations non payées (toutes les 15 min)
-- ---------------------------------------------------------------------
do $$
begin
  perform cron.schedule('mpk-expire-unpaid', '*/15 * * * *', 'select public.expire_unpaid_bookings()');
exception when others then
  raise notice 'pg_cron non activé : les réservations non payées ne seront pas expirées automatiquement.';
end $$;

-- ---------------------------------------------------------------------
-- 8. Offres d'exemple (une par catégorie) — À REMPLACER par tes vraies offres
--    avant le lancement (page Admin). Prix indicatifs en bahts.
-- ---------------------------------------------------------------------
insert into public.offers (slug, category, title, summary, description, highlights, included, not_included, area,
                           meeting_point, duration_label, price_thb, price_unit, min_qty, max_qty, options,
                           cancellation, featured, sort)
values
 ('scooter-honda-click-125', 'scooter', 'Scooter Honda Click 125 livré à ton hôtel',
  'Scooter récent, 2 casques, livré et récupéré gratuitement à Patong, Kata et Karon.',
  'Profite de Phuket en toute liberté. Le scooter est livré à ton hôtel avec 2 casques et le plein. Permis moto international obligatoire (contrôles fréquents).',
  array['Livraison et reprise gratuites','2 casques inclus','Assistance 7j/7'],
  array['Scooter Honda Click 125','2 casques','Plein d''essence au départ'],
  array['Carburant','Amendes'],
  'Patong · Kata · Karon', 'Livré à ton hôtel', 'Par jour', 350, 'day', 1, 5,
  '[{"id":"insurance","label":"Assurance tous risques","price_thb":150,"per":"unit"},{"id":"phone_holder","label":"Support téléphone + chargeur","price_thb":50,"per":"booking"}]',
  'Annulation gratuite jusqu''à 24 h avant la livraison.', true, 10),
 ('phi-phi-speedboat', 'excursion', 'Îles Phi Phi et Maya Bay en speedboat',
  'Journée complète : Maya Bay, Pileh Lagoon, snorkeling et déjeuner. Assurance incluse.',
  'Départ en speedboat vers les plus belles îles de la mer d''Andaman. Guide anglophone, équipement de snorkeling, déjeuner buffet et assurance voyage inclus.',
  array['Maya Bay et Pileh Lagoon','Snorkeling avec les poissons tropicaux','Assurance incluse'],
  array['Transfert hôtel aller-retour','Déjeuner buffet','Équipement de snorkeling','Assurance','Guide anglophone'],
  array['Taxe du parc national (400 THB, sur place)'],
  'Phi Phi', 'Prise en charge à ton hôtel', 'Journée (8 h)', 1900, 'person', 1, 20, '[]',
  'Annulation gratuite jusqu''à 24 h avant le départ.', true, 20),
 ('sunset-sailing-catamaran', 'boat', 'Catamaran privé au coucher du soleil, dîner et DJ',
  'Croisière privée de 4 h : dîner thaï préparé à bord, open bar softs, musique et baignade.',
  'Privatise un catamaran pour ton groupe jusqu''à 12 personnes. Le chef prépare un dîner thaï à bord pendant que le soleil se couche sur Phang Nga. Playlist ou DJ selon ton choix.',
  array['Bateau privatisé pour ton groupe','Dîner thaï préparé à bord','Musique / DJ'],
  array['Équipage et skipper','Dîner et boissons non alcoolisées','Serviettes et paddle'],
  array['Alcool (possible en option)'],
  'Chalong / Ao Po', 'Marina d''Ao Po', '4 heures', 32000, 'group', 2, 12,
  '[{"id":"dj","label":"DJ à bord","price_thb":6000,"per":"booking"},{"id":"open_bar","label":"Open bar alcool (par personne)","price_thb":900,"per":"unit"}]',
  'Annulation gratuite jusqu''à 72 h avant. Report gratuit en cas de météo défavorable.', true, 30),
 ('villa-kamala-pool', 'stay', 'Villa 3 chambres avec piscine privée à Kamala',
  'Vue mer, piscine à débordement, ménage quotidien, à 5 min de la plage.',
  'Villa moderne de 3 chambres et 3 salles de bain avec piscine privée et vue sur la mer d''Andaman. Ménage quotidien, Wi-Fi rapide, cuisine équipée.',
  array['Piscine privée vue mer','Ménage quotidien','Jusqu''à 6 personnes'],
  array['Ménage quotidien','Wi-Fi','Linge de maison'],
  array['Électricité au-delà de 30 kWh/jour'],
  'Kamala', 'Remise des clés sur place', 'Par nuit', 9500, 'night', 1, 6,
  '[{"id":"airport","label":"Transfert aéroport","price_thb":1200,"per":"booking"},{"id":"chef","label":"Chef privé pour un dîner","price_thb":4500,"per":"booking"}]',
  'Annulation gratuite jusqu''à 14 jours avant l''arrivée.', true, 40),
 ('vip-table-patong', 'nightlife', 'Table VIP en club à Patong avec bouteille',
  'Entrée coupe-file, table réservée et bouteille incluse dans l''un des meilleurs clubs de Bangla Road.',
  'Notre conciergerie réserve ta table dans un club partenaire de Patong. Entrée prioritaire, hôte dédié, bouteille et mixers inclus.',
  array['Entrée coupe-file','Table réservée','Bouteille incluse'],
  array['Table pour la soirée','1 bouteille + mixers','Hôte dédié'],
  array['Consommations supplémentaires'],
  'Patong', 'Accueil à l''entrée du club', 'Soirée', 1500, 'person', 2, 10, '[]',
  'Annulation gratuite jusqu''à 24 h avant.', false, 50),
 ('nanny-english-speaking', 'nanny', 'Nounou anglophone à ton hôtel ou ta villa',
  'Nounou expérimentée et vérifiée, pour bébés et enfants, de jour comme de soir.',
  'Profite de ta soirée pendant qu''une nounou expérimentée s''occupe de tes enfants à ton hôtel ou ta villa. Références vérifiées, premiers secours.',
  array['Nounous vérifiées','Anglais parlé','Minimum 3 heures'],
  array['Garde à domicile','Jeux et coucher'],
  array['Transport de la nounou après minuit (200 THB)'],
  'Tout Phuket', 'À ton hôtel ou ta villa', 'Par heure', 450, 'hour', 3, 12, '[]',
  'Annulation gratuite jusqu''à 12 h avant.', false, 60),
 ('villa-cleaning-laundry', 'cleaning', 'Ménage et blanchisserie à domicile',
  'Ménage complet de ta villa ou appartement, linge lavé, séché et plié.',
  'Une équipe professionnelle nettoie ton logement et prend en charge ton linge. Produits inclus.',
  array['Produits inclus','Linge lavé, séché, plié','Équipe professionnelle'],
  array['Ménage complet','Produits d''entretien'],
  array['Repassage (option)'],
  'Tout Phuket', 'À ton logement', 'Par heure', 400, 'hour', 2, 10,
  '[{"id":"laundry","label":"Blanchisserie (jusqu''à 5 kg)","price_thb":350,"per":"booking"},{"id":"ironing","label":"Repassage","price_thb":250,"per":"booking"}]',
  'Annulation gratuite jusqu''à 12 h avant.', false, 70),
 ('beauty-at-home', 'beauty', 'Taxi beauté : massage, ongles et coiffure à domicile',
  'Une esthéticienne vient à ton hôtel ou ta villa avec tout son matériel.',
  'Massage thaï, manucure, pédicure ou brushing : choisis ton soin, l''esthéticienne se déplace avec tout le nécessaire.',
  array['Se déplace chez toi','Matériel professionnel','Massage thaï traditionnel'],
  array['Déplacement','Matériel et produits'],
  array['Pourboire'],
  'Tout Phuket', 'À ton hôtel ou ta villa', 'Par heure', 900, 'hour', 1, 6, '[]',
  'Annulation gratuite jusqu''à 6 h avant.', false, 80),
 ('helicopter-transfer-island-tour', 'helicopter', 'Hélicoptère : transfert ou survol des îles',
  'Vol privé de 30 min au-dessus de Phang Nga et James Bond Island, ou transfert aéroport.',
  'Vole au-dessus des pains de sucre de la baie de Phang Nga ou rejoins ton hôtel depuis l''aéroport en quelques minutes. Jusqu''à 4 passagers.',
  array['Vol privé jusqu''à 4 passagers','Vue sur Phang Nga','Pilote expérimenté'],
  array['Vol privé','Assurance passagers'],
  array['Transfert vers l''héliport'],
  'Phuket', 'Héliport (adresse envoyée après réservation)', '30 minutes', 85000, 'group', 1, 4, '[]',
  'Annulation gratuite jusqu''à 72 h avant. Report gratuit en cas de météo défavorable.', true, 90)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- 9. Programme d'arrivée : le client atterrit, tout est prêt
--    (accueil et transfert, bagages livrés à l'hôtel ou la villa, scooter remis à l'aéroport)
-- ---------------------------------------------------------------------
insert into public.offers (slug, category, title, summary, description, highlights, included, not_included, area,
                           meeting_point, duration_label, price_thb, price_unit, min_qty, max_qty, options,
                           cancellation, featured, sort, delivery_airport_thb, delivery_address_thb, arrival_covers)
values
 ('airport-welcome-private-transfer', 'arrival', 'Accueil VIP à l''aéroport et transfert privé',
  'Ton chauffeur t''attend à la sortie avec ton nom, eau fraîche et serviette, puis direction ton hôtel ou ta villa.',
  'Dès la sortie de l''avion, notre équipe suit ton vol en temps réel et t''attend dans le hall des arrivées de l''aéroport de Phuket (HKT), même en cas de retard. Van privé climatisé jusqu''à 9 passagers, sièges enfants sur demande.',
  array['Suivi du vol en temps réel','Attente gratuite en cas de retard','Van privé jusqu''à 9 passagers'],
  array['Accueil avec pancarte à ton nom','Transfert privé jusqu''à ton hébergement','Eau fraîche et serviettes'],
  array['Péages éventuels'],
  'Aéroport de Phuket (HKT)', 'Hall des arrivées, porte 3', '30 à 75 min selon la plage', 1400, 'group', 1, 9,
  '[{"id":"fast_track","label":"Fast track à l''immigration","price_thb":2500,"per":"booking"},{"id":"sim","label":"2 cartes SIM 4G touriste (15 jours)","price_thb":700,"per":"booking"},{"id":"child_seat","label":"Siège enfant","price_thb":200,"per":"booking"}]',
  'Annulation gratuite jusqu''à 24 h avant l''atterrissage.', true, 1, null, null, array['welcome']),
 ('luggage-delivery-to-your-stay', 'arrival', 'Bagages livrés à ton hôtel ou ta villa',
  'Pars directement en scooter ou à la plage : on récupère tes bagages à l''aéroport et on les dépose à ton hébergement.',
  'Tu atterris, tu nous confies tes bagages au hall des arrivées et tu es libre. Nos coursiers les livrent à la réception de ton hôtel ou à ta villa dans les 3 heures. Bagages scellés et assurés.',
  array['Livraison sous 3 h','Bagages scellés et assurés','Idéal avec un scooter remis à l''aéroport'],
  array['Prise en charge au hall des arrivées','Livraison à la réception ou à ta villa','Assurance jusqu''à 20 000 THB par bagage'],
  array['Objets de valeur (à garder sur toi)'],
  'Aéroport → tout Phuket', 'Hall des arrivées de l''aéroport (HKT)', 'Livraison sous 3 h', 250, 'item', 1, 20,
  '[{"id":"oversize","label":"Bagage hors format (surf, golf, poussette)","price_thb":300,"per":"booking"}]',
  'Annulation gratuite jusqu''à 12 h avant l''atterrissage.', true, 2, null, null, array['bags']),
 ('arrival-pack-ready-on-landing', 'arrival', 'Pack Arrivée clé en main',
  'Accueil à l''aéroport, scooter remis sur place, bagages livrés à ton hébergement et cartes SIM : tu atterris, tout est prêt.',
  'Le pack préféré de nos clients. À la sortie de l''avion : accueil avec pancarte, 2 cartes SIM 4G, ton scooter (Honda Click 125, 2 casques, plein fait) remis sur le parking de l''aéroport, et tes bagages livrés à ton hôtel ou ta villa pendant que tu prends la route. Scooter inclus pour la première journée ; prolonge-le ensuite depuis l''app.',
  array['Scooter remis à l''aéroport','Bagages livrés à ton hébergement','2 cartes SIM 4G incluses'],
  array['Accueil avec pancarte','Scooter Honda Click 125 + 2 casques (24 h)','Livraison de 2 bagages','2 cartes SIM 4G'],
  array['Bagage supplémentaire (250 THB)','Carburant'],
  'Aéroport de Phuket (HKT)', 'Hall des arrivées, porte 3', 'À l''atterrissage', 2900, 'group', 1, 2,
  '[{"id":"extra_bags","label":"Jusqu''à 3 bagages en plus","price_thb":600,"per":"booking"},{"id":"insurance","label":"Assurance tous risques scooter","price_thb":150,"per":"booking"}]',
  'Annulation gratuite jusqu''à 24 h avant l''atterrissage.', true, 3, null, null, array['welcome','ride','bags'])
on conflict (slug) do nothing;

-- Le scooter peut être remis à l'aéroport ou livré à l'adresse du client
update public.offers set delivery_airport_thb = 300, delivery_address_thb = 0, arrival_covers = array['ride']
 where slug = 'scooter-honda-click-125' and delivery_airport_thb is null and delivery_address_thb is null;
