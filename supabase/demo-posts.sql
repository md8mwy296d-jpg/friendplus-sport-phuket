-- ============================================================================
-- FRIEND+ Sport Phuket — Pages et publications de démonstration
-- À exécuter APRÈS pages.sql. Idempotent (ids fixes, "on conflict do nothing").
--
-- Remplit l'onglet Club → Pages en attendant les vrais patrons de terrains.
-- Les pages appartiennent au compte admin et utilisent les photos du site
-- (image_path commençant par "/"), jamais le bucket Storage.
--
-- Pour tout retirer plus tard :
--   delete from public.club_pages where id::text like 'dededede-%';
-- ============================================================================

-- Une image de publication est soit un fichier Storage de l'auteur, soit une
-- photo statique du site ("/xxx.jpg"). publish_post() continue d'exiger le
-- dossier de l'auteur : seules ces données de démo utilisent les photos du site.
alter table public.posts drop constraint if exists posts_check;
alter table public.posts add constraint posts_check check (
  image_path is null
  or (char_length(image_path) <= 200 and image_path like author_id::text || '/%')
  or image_path ~ '^/[a-z0-9-]+\.jpg$'
);

-- Le golf a désormais sa propre photo de terrain
update public.venues set photo = '/venue-golf.jpg' where id = 'v-golf';

do $$
declare
  v_owner uuid := (select user_id from public.app_admins order by created_at limit 1);
begin
  if v_owner is null then
    raise notice 'Aucun admin : pages de démo ignorées';
    return;
  end if;

  insert into public.club_pages (id, owner_id, name, description, sport, venue_id, created_at) values
    ('dededede-0000-4000-8000-000000000001', v_owner, 'Kata Beach Padel Club',
     'Courts panoramiques face à la mer à Kata. Location de raquettes, café et tournois chaque mois.',
     'padel', 'v-kata', now() - interval '20 days'),
    ('dededede-0000-4000-8000-000000000002', v_owner, 'Kathu Hills Golf Club',
     'Parcours 18 trous au cœur des collines de Kathu. Practice, location de clubs et club-house.',
     'golf', 'v-golf', now() - interval '18 days'),
    ('dededede-0000-4000-8000-000000000003', v_owner, 'Rawai Futsal Dome',
     'Terrain couvert éclairé LED à Rawai : on joue même sous la mousson.',
     'futsal', 'v-rawai', now() - interval '15 days')
  on conflict (id) do nothing;

  insert into public.posts (id, author_id, page_id, title, body, image_path, pinned, created_at) values
    -- Padel
    ('dededede-0000-4000-8000-000000000101', v_owner, 'dededede-0000-4000-8000-000000000001',
     'Tournoi Americano du samedi 🎾',
     'Samedi 4 octobre dès 16 h : Americano mixte sur nos 4 courts. 16 places, niveaux mélangés, balles fournies et boissons offertes au coucher du soleil. Inscription au bar du club ou en créant ta session sur FRIEND+ !',
     '/sport-padel.jpg', true, now() - interval '2 days'),
    ('dededede-0000-4000-8000-000000000102', v_owner, 'dededede-0000-4000-8000-000000000001',
     'Nouveaux éclairages sur le court 3',
     'Le court 3 est maintenant éclairé jusqu''à 22 h. Parfait pour les parties après le travail, quand il fait plus frais.',
     '/venue-kata.jpg', false, now() - interval '6 days'),
    ('dededede-0000-4000-8000-000000000103', v_owner, 'dededede-0000-4000-8000-000000000001',
     'Cours découverte gratuit',
     'Jamais joué au padel ? Notre coach propose un cours d''initiation gratuit chaque mercredi à 17 h. Raquettes prêtées.',
     null, false, now() - interval '10 days'),
    -- Golf
    ('dededede-0000-4000-8000-000000000201', v_owner, 'dededede-0000-4000-8000-000000000002',
     'Green fee du lever du soleil ⛳',
     'Départs à 6 h 30 tous les matins : parcours au frais, greens fraîchement tondus et café offert au club-house. Réservez vos parties de 4 joueurs directement sur FRIEND+.',
     '/venue-golf.jpg', true, now() - interval '1 day'),
    ('dededede-0000-4000-8000-000000000202', v_owner, 'dededede-0000-4000-8000-000000000002',
     'Clinic swing avec notre pro',
     'Dimanche 10 h : 1 h de travail sur le swing et le petit jeu avec notre professeur. 8 places maximum, tous niveaux.',
     '/golf-swing.jpg', false, now() - interval '5 days'),
    ('dededede-0000-4000-8000-000000000203', v_owner, 'dededede-0000-4000-8000-000000000002',
     'Parcours rénové',
     'Les bunkers des trous 7 et 12 ont été entièrement refaits. Venez les tester (ou les éviter 😉) !',
     '/sport-golf.jpg', false, now() - interval '12 days'),
    -- Futsal
    ('dededede-0000-4000-8000-000000000301', v_owner, 'dededede-0000-4000-8000-000000000003',
     'Ligue du jeudi soir ⚽',
     'La ligue futsal reprend jeudi à 19 h : 6 équipes, matchs de 2 × 20 min. Il reste des places pour des joueurs seuls, on vous place dans une équipe.',
     '/sport-futsal.jpg', true, now() - interval '3 days'),
    ('dededede-0000-4000-8000-000000000302', v_owner, 'dededede-0000-4000-8000-000000000003',
     'Terrain ouvert même sous la pluie',
     'Saison des pluies ? Aucun problème : le dôme est couvert et ventilé. Les créneaux de 18 h à 21 h partent vite, pensez à réserver.',
     '/venue-rawai.jpg', false, now() - interval '8 days')
  on conflict (id) do nothing;
end $$;
