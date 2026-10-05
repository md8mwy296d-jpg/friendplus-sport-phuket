-- =====================================================================
-- Nettoyage de l'ancienne version FRIEND+ Sport (sessions, salles, Club,
-- amis, publications, mentions, e-mails de séance) après le passage à My Phuket Key.
--
-- ⚠️ IRRÉVERSIBLE : supprime définitivement les données sportives et sociales.
-- Conserve : comptes (auth.users, profiles), admins, statistiques de visites,
-- blocage d'IP, modération des comptes, suppression de compte.
-- À exécuter UNE fois, APRÈS myphuketkey.sql, dans Supabase > SQL Editor.
-- =====================================================================

-- tâche planifiée de l'ancienne version
do $$
begin
  perform cron.unschedule('friendplus-evaluate-sessions');
exception when others then null;
end $$;

drop view if exists public.public_profiles cascade;

-- tables (ordre indifférent grâce à cascade)
drop table if exists
  public.mentions, public.post_comments, public.post_likes, public.posts, public.club_pages,
  public.match_reviews, public.moments, public.friendships, public.last_seen,
  public.messages, public.conversation_members, public.group_bans, public.conversations,
  public.user_blocks, public.reports, public.email_log,
  public.invitations, public.session_players, public.sessions, public.sport_rates, public.venues
  cascade;

-- fonctions de l'ancienne version (les déclencheurs associés partent avec)
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

-- colonnes sportives / sociales du profil
alter table public.profiles
  drop column if exists sports,
  drop column if exists level,
  drop column if exists rating,
  drop column if exists bio,
  drop column if exists certified,
  drop column if exists fairplay_up,
  drop column if exists fairplay_total,
  drop column if exists username;

-- règles d'accès des anciens espaces de stockage (photos du Club, moments, publications, avatars)
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
-- Les fichiers eux-mêmes se suppriment depuis Supabase > Storage
-- (buckets « chat-images », « moments », « news », « posts », « avatars » : Empty puis Delete bucket).
