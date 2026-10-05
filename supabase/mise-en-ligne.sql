-- Mise en ligne My Phuket Key (une seule fois, sur la base actuelle) : profils privés, programme d'arrivée,
-- sécurité des paiements, suppression de l'ancienne version sport. Supabase > SQL Editor > coller > Run.
begin;
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

alter table public.offers add column if not exists delivery_airport_thb integer check (delivery_airport_thb between 0 and 100000);
alter table public.offers add column if not exists delivery_address_thb integer check (delivery_address_thb between 0 and 100000);
alter table public.offers add column if not exists arrival_covers text[] not null default '{}'
  check (arrival_covers <@ array['welcome','ride','bags']::text[]);
alter table public.offers drop constraint if exists offers_category_check;
alter table public.offers add constraint offers_category_check check (category in
  ('arrival','scooter','excursion','boat','stay','nightlife','nanny','cleaning','beauty','helicopter'));
alter table public.offers drop constraint if exists offers_price_unit_check;
alter table public.offers add constraint offers_price_unit_check check (price_unit in
  ('person','group','day','night','hour','item'));

alter table public.bookings add column if not exists delivery text not null default 'none'
  check (delivery in ('none','airport','address'));
alter table public.bookings add column if not exists delivery_fee_thb integer not null default 0 check (delivery_fee_thb >= 0);
alter table public.bookings add column if not exists delivery_address text not null default ''
  check (char_length(delivery_address) <= 300);
alter table public.bookings add column if not exists flight_number text not null default ''
  check (char_length(flight_number) <= 12);

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
  if (select count(*) from public.bookings
       where user_id = me and status = 'pending_payment' and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'rate_limited';
  end if;

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
revoke execute on function public.mark_booking_paid(uuid, text, text, integer) from public, anon, authenticated;
revoke execute on function public.attach_checkout_session(uuid, text) from public, anon, authenticated;
revoke execute on function public.expire_unpaid_bookings() from public, anon, authenticated;
grant  execute on function public.mark_booking_paid(uuid, text, text, integer) to service_role;
grant  execute on function public.attach_checkout_session(uuid, text) to service_role;
grant  execute on function public.expire_unpaid_bookings() to service_role;
revoke execute on function public._require_server() from public, anon, authenticated;
grant  execute on function public._require_server() to service_role;
grant all on public.bookings to service_role;

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

revoke all on public.booking_emails from anon, authenticated;
revoke all on function public._send_booking_email(public.bookings, text, text, text) from public, anon, authenticated;
revoke all on function public._notify_booking_status() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_app_admin() from public;
grant execute on function public.is_app_admin() to anon, authenticated;

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

update public.offers set delivery_airport_thb = 300, delivery_address_thb = 0, arrival_covers = array['ride']
 where slug = 'scooter-honda-click-125' and delivery_airport_thb is null and delivery_address_thb is null;

do $$
begin
  perform cron.unschedule('friendplus-evaluate-sessions');
exception when others then null;
end $$;

drop view if exists public.public_profiles cascade;

drop table if exists
  public.mentions, public.post_comments, public.post_likes, public.posts, public.club_pages,
  public.match_reviews, public.moments, public.friendships, public.last_seen,
  public.messages, public.conversation_members, public.group_bans, public.conversations,
  public.user_blocks, public.reports, public.email_log,
  public.invitations, public.session_players, public.sessions, public.sport_rates, public.venues
  cascade;

drop function if exists
  public._chat_image_readable(text), public._is_blocked_between(uuid, uuid), public._notify_session_status(),
  public._refresh_fill(uuid), public._require_onboarded(), public._sync_session_chat(), public._unfriend_on_block(),
  public._session_email_text(text, text, text, text, text, text, text),
  public.add_group_member(uuid, uuid), public.add_post_comment(uuid, text), public.are_friends(uuid, uuid),
  public.block_user(uuid), public.can_publish(), public.cancel_session(uuid),
  public.create_group(text, text, text, boolean),
  public.create_session(uuid, text, text, text, timestamptz, integer, integer, integer, text, boolean, text, integer),
  public.delete_message(uuid), public.discover_groups(), public.evaluate_sessions(), public.friend_count(uuid),
  public.friends_last_seen(), public.is_admin_profile(uuid), public.is_conversation_member(uuid),
  public.is_page_owner(uuid), public.join_group(uuid), public.join_session(uuid), public.leave_group(uuid),
  public.leave_session(uuid), public.mark_conversation_read(uuid), public.mark_mentions_seen(),
  public.mentioned_users(text, uuid), public.mentions_from_comment(), public.mentions_from_message(),
  public.mentions_from_moment(), public.mentions_from_post(), public.moment_visible(uuid, text),
  public.my_conversations(), public.open_session_chat(uuid), public.post_moment(text, text, uuid, text),
  public.post_visible(uuid), public.profiles_default_username(),
  public.publish_post(uuid, uuid, text, text, text, boolean), public.remove_friend(uuid),
  public.remove_group_member(uuid, uuid), public.report_content(uuid, uuid, text),
  public.respond_friend_request(uuid, boolean), public.respond_invitation(uuid, boolean),
  public.review_teammate(uuid, uuid, boolean, boolean), public.save_page(uuid, text, text, text, text),
  public.send_friend_request(uuid), public.send_invitation(uuid, uuid, text),
  public.send_message(uuid, text, text), public.set_certified(uuid, boolean),
  public.set_group_role(uuid, uuid, text), public.set_post_pinned(uuid, boolean), public.set_username(text),
  public.start_direct(uuid), public.suggest_username(text, uuid), public.toggle_post_like(uuid),
  public.touch_last_seen(), public.unblock_user(uuid),
  public.update_group(uuid, text, text, text, boolean), public.username_available(text),
  public.username_reserved(text)
  cascade;

alter table public.profiles
  drop column if exists sports,
  drop column if exists level,
  drop column if exists rating,
  drop column if exists bio,
  drop column if exists certified,
  drop column if exists fairplay_up,
  drop column if exists fairplay_total,
  drop column if exists username;

do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and policyname not like 'photos offres%'
  loop
    execute format('drop policy if exists %I on storage.objects', p.policyname);
  end loop;
end $$;
commit;
