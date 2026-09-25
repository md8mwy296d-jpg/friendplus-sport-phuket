-- E-mails automatiques quand une séance est confirmée ou annulée.
-- Envoi via l'API Resend (pg_net, asynchrone). La clé est dans Supabase Vault sous le nom
-- 'resend_api_key' (clé « sending access » limitée au domaine friendplussport.center) :
--   select vault.create_secret('re_...', 'resend_api_key');
-- Sans clé, rien n'est envoyé et la séance change de statut normalement.

create extension if not exists pg_net with schema extensions;

-- Un e-mail par joueur et par événement, jamais deux fois
create table if not exists public.email_log (
  session_id  uuid not null references public.sessions(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('confirmed','cancelled')),
  request_id  bigint,
  created_at  timestamptz not null default now(),
  primary key (session_id, user_id, kind)
);
alter table public.email_log enable row level security;
revoke all on public.email_log from anon, authenticated;

create or replace function public._session_email_text(p_lang text, p_kind text, p_name text,
  p_title text, p_when text, p_place text, p_url text)
returns table (subject text, body text)
language plpgsql immutable set search_path = '' as $$
declare l text := case when p_lang in ('fr','en','ru','th') then p_lang else 'en' end;
begin
  if p_kind = 'confirmed' then
    subject := case l
      when 'fr' then '✅ Séance confirmée : ' || p_title
      when 'ru' then '✅ Игра подтверждена: ' || p_title
      when 'th' then '✅ ยืนยันเซสชันแล้ว: ' || p_title
      else '✅ Session confirmed: ' || p_title end;
    body := case l
      when 'fr' then 'Bonjour ' || p_name || E',\n\nBonne nouvelle : le groupe est complet, la séance « ' || p_title || E' » est confirmée.\n\n📅 ' || p_when || E'\n📍 ' || p_place || E'\n\nPense à arriver 10 minutes avant. Les détails et la discussion du groupe sont ici :\n' || p_url
      when 'ru' then 'Привет, ' || p_name || E'!\n\nГруппа собрана, игра «' || p_title || E'» подтверждена.\n\n📅 ' || p_when || E'\n📍 ' || p_place || E'\n\nПриходи за 10 минут до начала. Подробности и чат группы:\n' || p_url
      when 'th' then 'สวัสดี ' || p_name || E'\n\nกลุ่มครบแล้ว เซสชัน "' || p_title || E'" ได้รับการยืนยัน\n\n📅 ' || p_when || E'\n📍 ' || p_place || E'\n\nกรุณามาก่อนเวลา 10 นาที รายละเอียดและแชทกลุ่ม:\n' || p_url
      else 'Hi ' || p_name || E',\n\nGood news: the group is full and "' || p_title || E'" is confirmed.\n\n📅 ' || p_when || E'\n📍 ' || p_place || E'\n\nPlease arrive 10 minutes early. Details and the group chat are here:\n' || p_url end;
  else
    subject := case l
      when 'fr' then 'Séance annulée : ' || p_title
      when 'ru' then 'Игра отменена: ' || p_title
      when 'th' then 'เซสชันถูกยกเลิก: ' || p_title
      else 'Session cancelled: ' || p_title end;
    body := case l
      when 'fr' then 'Bonjour ' || p_name || E',\n\nLa séance « ' || p_title || E' » du ' || p_when || ' (' || p_place || E') est annulée : le groupe n''était pas complet ou l''organisateur l''a annulée. Tu n''as rien à faire.\n\nD''autres séances t''attendent :\nhttps://www.friendplussport.center/explorer'
      when 'ru' then 'Привет, ' || p_name || E'!\n\nИгра «' || p_title || '» ' || p_when || ' (' || p_place || E') отменена: группа не собралась или организатор её отменил. Ничего делать не нужно.\n\nДругие игры:\nhttps://www.friendplussport.center/explorer'
      when 'th' then 'สวัสดี ' || p_name || E'\n\nเซสชัน "' || p_title || '" วันที่ ' || p_when || ' (' || p_place || E') ถูกยกเลิก เพราะผู้เล่นไม่ครบหรือผู้จัดยกเลิก คุณไม่ต้องทำอะไร\n\nดูเซสชันอื่น:\nhttps://www.friendplussport.center/explorer'
      else 'Hi ' || p_name || E',\n\n"' || p_title || '" on ' || p_when || ' (' || p_place || E') has been cancelled: the group wasn''t full or the organiser cancelled it. You don''t need to do anything.\n\nFind another session:\nhttps://www.friendplussport.center/explorer' end;
  end if;
  body := body || E'\n\n— FRIEND+ Sport Phuket';
  return next;
end $$;
revoke all on function public._session_email_text(text, text, text, text, text, text, text) from public, anon, authenticated;

create or replace function public._notify_session_status()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  v_key   text;
  v_place text;
  v_when  text := to_char(new.starts_at at time zone 'Asia/Bangkok', 'DD/MM/YYYY HH24:MI');
  v_url   text := 'https://www.friendplussport.center/session/' || new.id;
  r       record;
  m       record;
  v_req   bigint;
begin
  if new.status not in ('confirmed','cancelled') or new.status = old.status or new.starts_at < now() then
    return new;
  end if;
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  if v_key is null then return new; end if;
  select coalesce(nullif(v.name, ''), v.area) into v_place from public.venues v where v.id = new.venue_id;

  for r in
    select u.id, u.email, coalesce(nullif(split_part(p.name, ' ', 1), ''), 'there') as first_name, p.lang
      from public.session_players sp
      join auth.users u on u.id = sp.user_id
      join public.profiles p on p.id = sp.user_id
     where sp.session_id = new.id
       and (sp.kind = 'player' or new.status = 'cancelled')
       and u.email is not null and u.email_confirmed_at is not null
       and u.banned_until is null
  loop
    if exists (select 1 from public.email_log where session_id = new.id and user_id = r.id and kind = new.status) then
      continue;
    end if;
    select * into m from public._session_email_text(r.lang, new.status, r.first_name, new.title, v_when, coalesce(v_place, ''), v_url);
    select net.http_post(
      url     := 'https://api.resend.com/emails',
      headers := jsonb_build_object('Authorization', 'Bearer ' || v_key, 'Content-Type', 'application/json'),
      body    := jsonb_build_object(
                   'from', 'FRIEND+ Sport Phuket <noreply@friendplussport.center>',
                   'to', jsonb_build_array(r.email),
                   'subject', m.subject,
                   'text', m.body,
                   'tags', jsonb_build_array(jsonb_build_object('name', 'type', 'value', 'session_' || new.status)))
    ) into v_req;
    insert into public.email_log (session_id, user_id, kind, request_id) values (new.id, r.id, new.status, v_req);
  end loop;
  return new;
exception when others then
  -- un souci d'e-mail ne doit jamais bloquer la confirmation / l'annulation
  raise warning 'session email failed: %', sqlerrm;
  return new;
end $$;
revoke all on function public._notify_session_status() from public, anon, authenticated;

drop trigger if exists sessions_notify_status on public.sessions;
create trigger sessions_notify_status
  after update of status on public.sessions
  for each row execute function public._notify_session_status();
