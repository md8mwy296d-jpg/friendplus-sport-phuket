# FRIEND+ Sport Phuket — historique et état du projet

> Fichier de reprise. À ouvrir en premier dans Claude Code (`claude` puis « lis HISTORIQUE-PROJET.md »).
> Dernière mise à jour : 23 septembre 2026 (version mobile : compte, photo de profil, débordement d'écran).

---

## 1. Le projet en trois phrases

Application web pour organiser des sports collectifs à Phuket entre touristes et locaux : futsal 5v5, padel, cours de danse, fitness.
Une session passe de « En attente » à « Confirmée » automatiquement 24 ou 48 h avant, si le quota de joueurs est atteint ; sinon elle est annulée.
Public visé : voyageurs et résidents, d'où les 4 langues (FR, EN, RU, TH).

---

## 2. Où en est-on exactement

| Élément | État |
|---|---|
| Code de l'application (v1 production) | ✅ Terminé, dans le dépôt |
| Base de données Supabase (`supabase/schema.sql`) | ✅ Exécutée |
| Social Club (`supabase/club.sql`) | ✅ Exécuté (tables, fonctions, stockage photos, 1 admin) |
| Application mobile (PWA) | ✅ Dans le code, active dès le déploiement |
| Dépôt GitHub `friendplus-sport-phuket` | ✅ Arborescence reconstruite (branche `claude/reprise-projet-5kelx0`), build OK |
| Projet Vercel + domaine `friendplussport.center` | ✅ Projet `friendplus-sport-phuket`, relié à Supabase (vérifié en ligne) |
| SMTP (e-mails de connexion) | ✅ Resend branché (domaine vérifié, clé « envoi seul », expéditeur `noreply@friendplussport.center`), codes reçus et connexions OK |
| Photo de profil | ✅ Stockage `avatars` + colonnes `avatar_path` / `avatar_color` (exécuté) |
| Amis, moments, avis après match (`supabase/social.sql`) | ✅ Exécuté |
| Pages, publications, certification (`supabase/pages.sql`) | ✅ Exécuté |
| Vraies salles partenaires | ⬜ À saisir (les 7 lieux installés, dont le golf, sont fictifs) |

### ✅ Corrigé : aucune table n'était lisible (23 septembre 2026, soir)

Les projets Supabase récents n'accordent plus automatiquement le droit de lecture aux rôles `anon` et
`authenticated` sur les nouvelles tables. Résultat : même avec RLS correcte, l'app ne pouvait rien lire
(salles, sessions, profils, discussions) et l'écran « Bienvenue » échouait. Ajout de `grant select`
explicites dans `schema.sql` et `club.sql`, appliqués à la base. Au passage, fermeture des fonctions
internes (`handle_new_user`, `is_app_admin`, `is_conversation_member`, `_chat_image_readable`) aux visiteurs
non connectés. Parcours testé en base (profil, création de session padel, chat de session, message) : OK.

### ✅ Version mobile corrigée (23 septembre 2026, soir)

- **Page plus large que l'écran** : les badges de sports du pied de page (et une animation de l'accueil)
  dépassaient ; le téléphone dézoomait et la barre d'onglets du bas sortait de l'écran. Corrigé, avec
  une sécurité globale `overflow-x: clip` sur `html` et `body`.
- **Compte invisible sur téléphone** : le bouton « Se connecter » / l'avatar étaient masqués sous 640 px.
  Ils sont maintenant toujours affichés (le choix de langue passe dans le menu ☰ sur petit écran).
- **Barre d'onglets** : Explorer · Club · Créer · Mes sessions · **Profil** (avatar du joueur, ou
  « Connexion » si déconnecté). L'accueil reste accessible par le logo.
- **Photo de profil** : composant `AvatarEditor` (écran « Bienvenue » et page Profil). La photo est
  recadrée en carré 320 px côté navigateur puis envoyée dans le stockage public `avatars/<id joueur>/`.
  À défaut, 8 couleurs au choix, enregistrées en base (avant : dans le navigateur seulement).
  Visible partout où `PlayerAvatar` est utilisé (sessions, Club, invitations).

### ✅ Club : Pages des terrains, publications, admin dans tous les groupes (24 septembre 2026)

Nouveau fichier **`supabase/pages.sql`** (exécuté ; remplace `news.sql`, l'ancien onglet « Nouveautés » vide
a été supprimé). Onglet **Pages** du Club :
- **Patron de terrain** (compte **certifié** par l'admin) : crée la Page de son terrain (nom, sport, lieu
  partenaire, présentation ; 3 Pages max) et y publie (titre, texte, photo, épingler).
- **Admin** : publie au nom de FRIEND+, épingle, supprime tout, et **entre dans tous les groupes, y compris
  privés** (visibles dans « Découvrir » avec un cadenas).
- **Joueurs** : ne publient pas ; ils **aiment**, **commentent** et **envoient en privé** une publication
  (message privé avec le lien `/publication/<id>`).
- **Groupes** : onglet « Discussion | Publications » dans chaque groupe ; le créateur / admin du groupe publie,
  les membres aiment et commentent. Invisible hors du groupe (sauf pour l'admin).
- Tables `club_pages`, `posts`, `post_likes`, `post_comments` ; fonctions `save_page`, `publish_post`,
  `set_post_pinned`, `toggle_post_like`, `add_post_comment` ; stockage public `posts` ; temps réel.

### ✅ Grades et médailles façon jeu vidéo (24 septembre 2026)

Calculés dans l'app à partir de la note et des statistiques (`src/lib/rank.ts`, rien en base) :
- **7 grades** selon la note FRIEND+ : Recrue (0 %, 1 chevron bronze), Soldat (15 %, 2 chevrons bronze),
  Caporal (30 %, 3 chevrons argent), Sergent (45 %, 1 étoile argent), Lieutenant (60 %, 2 étoiles or),
  Capitaine (75 %, 3 étoiles or), Légende (90 %, étoile et lauriers). Insigne en SVG (`RankInsignia`) à côté
  du nom : page joueur, équipe d'une session, après-match, amis, menu avatar.
- **8 médailles** : 1er match, Habitué (10 matchs), Vétéran (50), Organisateur (3 sessions), Fair-play
  (90 % avec 5 avis), Profil 100 %, Multisport (3 sports), Certifié. Grisées tant qu'elles ne sont pas gagnées.
- Page joueur : section « Grade » avec progression vers le grade suivant, échelle des grades, médailles.

### ✅ Nouveautés du Club, comptes certifiés et Note FRIEND+ (24 septembre 2026)

**Nouveautés** (`supabase/news.sql`, exécuté) : onglet « Nouveautés » du Club. Seuls les **admins** (table
`app_admins`) et les **comptes certifiés** publient (titre, texte, photo). Un admin peut épingler ; ses
publications sont signées « Équipe FRIEND+ ». Pastille sur l'onglet et aperçu dans « Discussions » quand il y a
du nouveau. Stockage public `news`. 10 publications par jour maximum.

**Comptes certifiés** : colonne `profiles.certified`, badge bleu ✓ à côté du nom (page joueur, équipe d'une
session, après-match, amis, nouveautés). Un admin certifie ou retire la certification depuis la page du joueur
(bouton visible uniquement pour les admins). Personne ne peut se certifier soi-même.

**Note FRIEND+ en %** (remplace les étoiles figées à 5,0) :
- Après un match terminé (pendant 7 jours), chaque joueur note anonymement ses coéquipiers :
  « A respecté les règles du jeu ? » et « A respecté les autres joueurs ? » (oui / non, modifiable).
- **Fair-play** = % de « oui » reçus ; **Activité** = 10 % par match joué (100 % dès 10 matchs).
- **Note sur 100** (mise à jour du 24/09) = **profil complet 15 pts** (nom, photo, pays, sports souhaités :
  3,75 pts chacun) + **fair-play 60 pts** + **activité 25 pts**, calculée par la base (`public_profiles`,
  colonnes `profile_pct`, `fairplay_pct`, `activity_pct`, `score`). Un nouveau joueur au profil complet démarre
  à 15 %. Le joueur voit sur sa page ce qu'il manque à son profil. Table `match_reviews` + fonction `review_teammate()` dans `social.sql` ;
  nul ne voit qui l'a noté, nul ne peut modifier sa propre note.

### ✅ Amis, pages joueurs, moments et « après-match » (23 septembre 2026, soir)

Nouveau fichier **`supabase/social.sql`** (exécuté ; à relancer après `schema.sql` et `club.sql` sur une base neuve).
- **Page publique** `/joueur/<id>` : photo, drapeau, niveau, sports, bio, matchs joués / organisés / amis,
  boutons **Ajouter en ami** et **Message** (conversation privée du Club). Accessible depuis l'équipe d'une
  session, le menu d'une conversation privée, le menu avatar (« Voir ma page publique »).
- **Amis** : demande, acceptation / refus, retrait, en temps réel. Pastille sur l'onglet Profil et l'avatar
  quand une demande arrive. Bloquer un joueur supprime l'amitié. Section « Mes amis » sur la page Profil.
- **Moments** : texte (500 caractères) et/ou photo (stockage public `moments`, noms aléatoires), liés ou non
  à une session jouée, visibles par **tout le monde** ou **amis seulement** (filtré par la base, y compris
  entre joueurs qui se bloquent). 20 par jour maximum. Suppression par l'auteur ou un admin.
- **Après le match** : quand une session où le joueur était inscrit est terminée, une bannière s'affiche
  sous l'en-tête pendant 3 jours (« Match terminé : … », masquable). Sur la page de la session, un bloc
  « Le match est fini, garde le contact » liste les coéquipiers avec Profil / Ajouter en ami / Message,
  plus la discussion d'équipe et « Partager un moment » (pré-rempli avec la session).

### ✅ Tarifs fixes et golf (23 septembre 2026, soir)

Les joueurs ne choisissent plus le prix : table **`sport_rates`** (Supabase → Table Editor, modifiable
sans toucher au code), appliquée par `create_session()` côté serveur (le prix envoyé par l'app est ignoré).

| Sport | Tarif | Par joueur (1 h) |
|---|---|---|
| Padel | 2 200 ฿/h **le terrain**, partagé entre les 4 joueurs | 550 ฿ |
| Futsal | 300 ฿/h par joueur | 300 ฿ |
| Golf, danse, gym | 120 ฿/h par joueur | 120 ฿ |

Prix d'une session = tarif × durée (÷ 4 pour le padel). Les sessions à venir déjà créées ont été recalculées
(« PADLE VENDREDI », 1 h 30 : 250 → 825 ฿). Les « à partir de » des salles sont dérivés des tarifs.

**Golf** ajouté partout (contraintes de la base, Club, filtres, profil, accueil) : 4 joueurs, durées 2 h / 3 h / 4 h,
parcours fictif « Kathu Hills Golf Club » à remplacer, image `public/sport-golf.jpg` = illustration provisoire
(à remplacer par une vraie photo du golf partenaire).

### ✅ Rejoindre une session depuis un téléphone (23 septembre 2026, soir)

Un ami arrivé par le lien d'une session a créé son compte sans jamais s'inscrire : sur téléphone, le bouton
« Rejoindre la session » était ~4 écrans plus bas, et la bannière « Installe FRIEND+ » le recouvrait.
- Barre d'action fixe au-dessus des onglets (prix, places restantes, Rejoindre / Liste d'attente /
  **Accepter l'invitation** si le joueur a une invitation en attente / Discussion si déjà inscrit).
- La bannière d'installation ne s'affiche plus sur les pages session, connexion, Bienvenue, création, chat.
- Pied de page : « Prototype démo — données simulées » remplacé.

### ✅ Référencement Google (24 septembre 2026)

- Ajout de `public/robots.txt` et `public/sitemap.xml` (accueil, explorer, salles, club, connexion ; pages privées exclues).
- `index.html` : titre avec les mots-clés (futsal, padel, golf, Phuket), description, adresse canonique, balises de partage (Open Graph, Twitter), données structurées `WebSite` pour Google, et un petit texte lisible sans JavaScript.
- **À faire par le propriétaire** : déclarer le site dans Google Search Console et envoyer le sitemap. Un site tout neuf met en général quelques jours à quelques semaines à apparaître dans Google.

### ✅ Sécurité renforcée (24 septembre 2026)

- **Contrôle complet** : aucune clé secrète (`service_role`) dans le code ni dans l'historique Git. Toutes les tables ont la sécurité par ligne (RLS) activée, et les fonctions sensibles (certifier, modérer, publier…) vérifient qui appelle.
- **En-têtes de sécurité du site** (`vercel.json`) : `Content-Security-Policy` (bloque les scripts venant d'ailleurs), anti-intégration dans un autre site (`X-Frame-Options`, `frame-ancestors`), `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS renforcé.
- Base : `username_reserved` a maintenant un `search_path` fixe (alerte Supabase corrigée).
- **À faire par le propriétaire** : passer le dépôt GitHub en privé ; activer la double authentification (2FA) sur GitHub, Vercel, Supabase et la boîte mail ; activer « Leaked password protection » dans Supabase (Auth → Settings) si l'offre le permet.

### ✅ Section « Le concept » fluide et photos qui changent chaque semaine (24 septembre 2026)

- **Le concept** (page d'accueil) : plus de blocage du défilement. L'ancienne version « épinglait » la section avec GSAP et coupait l'image. Maintenant la page défile normalement : sur ordinateur, l'image reste entière à l'écran (CSS `sticky`) et change en fondu selon l'étape lue ; sur téléphone, chaque étape a sa propre image.
- Défilement global un peu plus réactif (Lenis `lerp` 0.1 → 0.15).
- **Photos par sport qui tournent chaque semaine** : 18 nouvelles vraies photos (Unsplash, libres de droits) dans `public/sports/`, soit 4 à 6 photos par sport. `src/lib/sportPhotos.ts` choisit la photo selon la semaine (changement le lundi) et varie d'une session à l'autre. Utilisé sur l'accueil, les sessions, les lieux et la création de session.
- Pour ajouter des photos : déposer le fichier dans `public/sports/` et l'ajouter à la liste du sport dans `sportPhotos.ts`.

### ✅ 19 nouvelles langues (24 septembre 2026)

- L'app passe de 4 à **23 langues** : français, anglais, espagnol, portugais (Brésil), allemand, néerlandais,
  suédois, polonais, russe, ukrainien, turc, kurde (kurmandji, alphabet latin), kazakh, ouzbek (latin),
  arabe littéraire, arabe maghrébin (darija), ourdou, hindi, thaï, malais, chinois simplifié, japonais, coréen.
- fr/en/ru/th restent dans le code (`i18n*.ts`). Les 19 autres sont des fichiers `src/locales/<code>.json`
  (813 textes chacun) **chargés seulement quand on choisit la langue** (`loadLocale`, `import.meta.glob`).
  Un texte manquant retombe sur l'anglais, puis le français.
- **Droite à gauche** automatique pour l'arabe, la darija et l'ourdou (`RTL_LANGS`, `<html dir="rtl">`).
  Le logo reste toujours en anglais (« FRIEND+ SPORT PHUKET », `dir="ltr"`, sous-titre écrit en dur) dans toutes les langues.
- **Première visite** : la langue du téléphone est choisie si elle existe (ar-MA/DZ/TN → darija).
- Contrainte `profiles_lang_check` élargie (migration `profiles_more_languages`).
- Pour ajouter un texte : l'ajouter dans les 4 dictionnaires de base **et** dans les 19 JSON (sinon il
  s'affiche en anglais dans ces langues). Les traductions ont été rédigées par Claude : une relecture par des
  locuteurs natifs reste conseillée, surtout pour le kurde, l'ouzbek, le kazakh et la darija.

### ✅ Identifiants @ et mentions (24 septembre 2026)

- **Identifiant unique** `profiles.username` (minuscules, chiffres, `_`, `.`, 3 à 20 caractères, mots réservés
  interdits). Il est créé automatiquement à partir du nom (trigger `profiles_default_username`, fonction
  `suggest_username` qui retire les accents, y compris turcs : « Şükrü Yılmaz » → `sukruyilmaz`, avec des
  chiffres ajoutés si déjà pris) et modifiable dans **Profil → Identifiant** (vérification en direct via
  `username_available()`, enregistrement via `set_username()`). Il n'est pas modifiable en écriture directe.
  Migration `usernames`, exposé dans `public_profiles.username`. Actuellement : admin = `@hakan`, ami = `@hakan4311`.
- **Recherche** : 🔍 dans le menu 👤+ de l'en-tête (« Chercher un joueur ou @identifiant »), et dans
  « Nouveau message » (`searchPlayers` dans `lib/players.ts`). Lien direct : `/joueur/@hakan`.
- **Mentions** : taper `@` dans un message, un commentaire, une publication ou un moment propose les joueurs
  (amis en premier, flèches ↑↓ + Entrée). Les `@identifiants` s'affichent en liens vers le profil (`MentionText`).
- **Notifications 🔔** (`supabase/mentions.sql`, migration `mentions`) : table `mentions` remplie par triggers.
  Le joueur mentionné n'est prévenu que s'il peut voir le contenu (membre de la discussion ou du groupe,
  publication publique, moment public ou ami), jamais en cas de blocage, 10 mentions au plus par texte.
  4e icône de l'en-tête, en temps réel. L'ouverture du menu marque tout comme vu (`mark_mentions_seen`).

### ✅ Barre façon Facebook : messages, groupes, amis (24 septembre 2026)

- `components/social/HeaderHub.tsx`, dans la barre du haut pour un joueur connecté, sur toutes les pages.
  Trois icônes rondes, chacune avec sa pastille rouge :
  - 💬 **Messages privés** (nombre de discussions non lues) : amis en ligne en haut, puis les discussions
    (aperçu, heure, point vert si non lu), « Voir tous les messages » → `/club?f=direct`.
  - 👥 **Groupes et matchs** (groupes et discussions de session non lus) → `/club?f=group`, « + » pour découvrir.
  - 👤+ **Mes amis** (demandes reçues) : accepter ou refuser directement, amis en ligne, « Voir tous mes amis ».
- Sur téléphone, le menu s'ouvre en panneau pleine largeur sous la barre, et le logo perd son texte pour
  faire de la place. Le sélecteur de langue et « Créer » passent au menu ☰ / à la barre du bas sous 1024 px.
- La pastille de l'avatar ne compte plus que les invitations aux sessions (les demandes d'ami ont leur icône).

### ✅ Badge « OWNER » des patrons de salles (24 septembre 2026)

- Étiquette dorée **OWNER** avec une couronne, à côté du nom (`CertifiedBadge owner`) : page joueur, amis,
  coéquipiers, participants d'une session, publications et en-tête des Pages.
- Donnée : colonne `is_owner` de `public_profiles` (fonction `is_page_owner()`, migration `owner_badge`),
  vraie si le compte possède au moins une Page de terrain. Seul un compte **certifié par l'admin** peut
  créer une Page : un joueur ne peut donc pas obtenir le badge. L'admin en est exclu (ses pages sont des démos).
- Le badge apparaît dès la création de la Page (le profil est rechargé), et disparaît si le patron
  supprime toutes ses pages.

### ✅ Profil admin au maximum (24 septembre 2026)

- La vue `public_profiles` passe à 100 % la note, le profil, le fair-play et l'activité des comptes présents
  dans `app_admins` (fonction `is_admin_profile()`, migrations `admin_max_score` et
  `public_profiles_is_admin`). Nouvelle colonne `is_admin` (→ `User.isAdmin`) : toutes les médailles sont
  débloquées (`medalsFor`) et le grade est « Légende ».
- Le compte admin est aussi marqué certifié (badge bleu).

### ✅ Accès rapide, amis en ligne et recherche d'amis (24 septembre 2026)

- **Bannière « Accès rapide »** (`components/social/QuickAccess.tsx`), en haut du Club et d'Explorer pour un
  joueur connecté. Elle regroupe : amis en ligne (un appui ouvre le message privé), messages privés avec
  pastille de non-lus (« Tout voir » → `/club?f=direct`), mes groupes privés, et mes pages
  (→ `/club?tab=pages&page=<id>`).
- **Présence** : canal Realtime `online-players` (clé = id du joueur), géré dans `SocialProvider`
  (`onlineIds`, `isOnline`, `lastSeenOf`). Point vert (`PresenceAvatar`) seulement pour les **amis**, sur
  la liste d'amis, la liste des discussions, l'en-tête d'un message privé et la page joueur.
- **« Vu il y a … »** : table `last_seen` (social.sql §8, migration `friends_presence`) sans aucun accès
  direct. `touch_last_seen()` est appelée toutes les 2 min par l'app ouverte (une écriture par minute au plus).
  `friends_last_seen()` ne renvoie que les amis acceptés. Testé : un inconnu ne voit rien.
- **Mes amis** (Profil, ancre `#amis`) : recherche par nom, filtre « En ligne », tri en ligne d'abord puis
  par dernière visite.
- Note : `supabase.channel()` renvoie un canal du même nom encore en fermeture. L'effet de présence attend
  donc la suppression de l'ancien canal avant d'en recréer un.

### ✅ Pages de démonstration et vraies photos de golf (24 septembre 2026)

- `supabase/demo-posts.sql` (migration `demo_club_pages`) : 3 pages de démo appartenant au compte admin,
  **Kata Beach Padel Club**, **Kathu Hills Golf Club** et **Rawai Futsal Dome**, avec 8 publications
  (tournoi, cours, green fee, ligue du jeudi…). Elles utilisent les photos du site (`image_path` = `/xxx.jpg`).
  La contrainte `posts_check` accepte ces chemins, mais `publish_post()` exige toujours le dossier Storage
  de l'auteur : les joueurs ne peuvent pas s'en servir.
- **Pour tout retirer** : `delete from public.club_pages where id::text like 'dededede-%';`
- Photos réelles (Unsplash, licence libre) : `sport-golf.jpg` (balle près du drapeau), `venue-golf.jpg`
  (vue aérienne, nouvelle photo du terrain `v-golf`) et `golf-swing.jpg`.
- Club : les groupes publics restent ouverts à tous sans invitation (confirmé par le propriétaire). Seuls
  les groupes privés sont réservés aux invités et à l'admin.

### ✅ Corrigé : site en ligne sans clés Supabase

Les variables Vercel avaient été saisies en minuscules (`vite_supabase_url`…). Vite ne lit que les noms
en majuscules préfixés `VITE_` : le site était compilé avec l'adresse de secours `missing-project.supabase.co`.
Ajout de `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (type « plain », la clé anon est publique par
conception) puis redéploiement. Vérifié : le code servi sur `www.friendplussport.center` pointe vers
`fqrlyykadbzaxzjneupm.supabase.co` et l'API renvoie bien les salles.

- **Projet Vercel de production : `friendplus-sport-phuket`** (porte le domaine).
- `friendplus-sport-phuket-wsst` était un test : il peut être supprimé dans Vercel (Settings → Delete).
- Les anciennes variables en minuscules sont inutiles et peuvent être supprimées (Vercel refuse de
  renommer une variable « sensitive »).
- Rappel : Vite intègre les variables **à la compilation**. Toute modification exige un redéploiement.

### ✅ Blocage résolu (23 septembre 2026)

Le déploiement Vercel échouait (`Impossible de résoudre /src/main.tsx`) car le glisser-déposer avait mis
les 132 fichiers à plat à la racine du dépôt. L'arborescence a été reconstruite d'après les imports
(`src/`, `src/pages/`, `src/components/`, `src/components/home/`, `src/components/ui/`, `src/lib/`,
`src/hooks/`, `public/`, `supabase/`). Ajoutés : `.gitignore`, `.env.example`, `package-lock.json`
(registre npm officiel). `npm run build` et `npm run typecheck` passent.

**À faire** : fusionner la branche dans `main` pour que Vercel redéploie.

---

## 3. Historique des décisions

1. **Point de départ** : un prototype sans serveur (React + Vite + Tailwind + shadcn), données simulées dans le navigateur, 7 écrans, 4 langues, direction artistique « tropical moderne ». Chaque visiteur voyait ses propres données : inutilisable en vrai.
2. **Version démo hébergée** : le prototype a été recompilé en un fichier HTML autonome et publié comme artefact claude.ai (images en base64, navigation par `#/…`). Sert de vitrine pour les salles partenaires. Toujours en ligne.
3. **Version 1 production** (le dépôt actuel) : ajout d'un vrai backend Supabase, de comptes joueurs et de règles métier côté serveur. C'est cette version qui doit être mise en ligne.
4. **Choix techniques** : Supabase (Postgres + auth + temps réel + tâche planifiée) plutôt qu'un backend maison ; Vercel pour l'hébergement ; connexion par code e-mail à 6 chiffres plutôt que mot de passe, car le public est majoritairement mobile et de passage.

---

5. **Social Club + app mobile** (23 septembre 2026) : groupes publics/privés créés par les membres, messages privés,
   discussion automatique par session, photos (stockage privé), modération (blocage, signalement, exclusion,
   admins du site). App mobile en PWA (installable, barre d'onglets) plutôt qu'appli native dans un premier temps :
   pas de stores ni de frais, les touristes l'installent en 10 secondes ; Capacitor plus tard si besoin.

## 4. Architecture

**Front** : React 19, TypeScript, Vite, Tailwind, shadcn/ui, framer-motion, GSAP, Lenis.
**Back** : Supabase (Postgres, Auth, Realtime, pg_cron).
**Hébergement** : Vercel, domaine `www.friendplussport.center`.

### Fichiers importants

| Chemin | Rôle |
|---|---|
| `supabase/schema.sql` | Toute la base : tables, RLS, fonctions métier, cron. Source de vérité du modèle de données |
| `src/lib/store.ts` | Pont entre l'interface et Supabase : chargement, temps réel, actions, toasts |
| `src/lib/supabase.ts` | Client Supabase, lit `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` |
| `src/lib/types.ts` | Types métier (Session, User, Venue, Invitation…) |
| `src/lib/i18n.ts` + `src/lib/i18n-auth.ts` | Textes FR / EN / RU / TH (le second ajoute connexion, onboarding, erreurs serveur) |
| `src/lib/countries.ts` | Liste des nationalités proposées |
| `src/pages/` | Home, Explore, CreateSession, SessionDetail, Dashboard, Venues, Profile, Login, Onboarding |
| `src/components/RequireAuth.tsx` | Garde les pages réservées aux membres |
| `supabase/club.sql` | Social Club : tables, sécurité, fonctions, stockage des photos |
| `src/lib/club.ts` | Pont Club ↔ Supabase : discussions, non-lus, temps réel, envoi de photos |
| `src/pages/Club.tsx`, `src/pages/Conversation.tsx` | Liste des discussions / découverte des groupes, écran de discussion |
| `src/components/mobile/` | Barre d'onglets mobile, bannière « Installer l'app » |
| `src/components/AvatarEditor.tsx`, `src/lib/avatar.ts` | Choix de la photo / couleur de profil |
| `supabase/social.sql`, `src/lib/social.ts` | Amis, moments, fin de match, avis entre coéquipiers |
| `supabase/pages.sql`, `src/lib/posts.ts`, `src/components/posts/` | Pages des terrains, publications, j'aime, commentaires, certification |
| `src/lib/score.ts`, `src/components/ScoreBadge.tsx`, `src/components/social/ScorePanel.tsx` | Note FRIEND+ en % |
| `src/lib/rank.ts`, `src/components/rank/` | Grades (insignes) et médailles |
| `src/pages/PlayerProfile.tsx`, `src/components/social/` | Page publique d'un joueur, boutons ami / message, moments, bannière après-match |
| `src/lib/sports.ts` | Liste des sports, joueurs par sport, durées, calcul des prix |
| `DEPLOIEMENT.md` | Guide de mise en ligne pas à pas |

### Modèle de données

- `profiles` — profil public (1 ligne par compte, créée par trigger sur `auth.users`). Pas d'e-mail dedans.
- `venues` — salles partenaires (`active` pour masquer sans supprimer).
- `sessions` — statut `open` | `full` | `confirmed` | `cancelled`, `confirmation_deadline`.
- `session_players` — inscriptions, `kind` = `player` | `waitlist`.
- `invitations` — statut `pending` | `accepted` | `declined`.
- Vue `public_profiles` — profils + compteurs (sessions jouées / organisées).

### Règles appliquées côté serveur (fonctions RPC, `security definer`)

- `create_session` — quota imposé selon le sport (futsal 10, padel 4, golf 4), **prix calculé depuis `sport_rates`**, deadline obligatoirement dans le futur, max 10 sessions ouvertes par organisateur, cohérence sport/salle.
- `join_session` — verrou `FOR UPDATE` : pas de surbooking même sur clics simultanés. Retourne `joined` | `lastSpot` | `waitlist` | `already`.
- `leave_session` — promotion automatique du premier de la liste d'attente.
- `cancel_session` — réservé au créateur.
- `send_invitation` / `respond_invitation` — accepter une invitation inscrit directement.
- `evaluate_sessions` — confirme ou annule les sessions dont la deadline est passée. Appelée par `pg_cron` toutes les 5 min **et** par le client à chaque visite (donc pas bloquant si pg_cron n'est pas activé).

### Sécurité

RLS active partout. Lecture publique pour `venues`, `sessions`, `session_players`, `profiles` (pas d'e-mail exposé). Les invitations ne sont lisibles que par l'expéditeur et le destinataire. Toutes les écritures sensibles passent par les fonctions RPC : un joueur ne peut ni modifier sa note, ni écrire dans une session directement.

---

## 5. Ce qu'il reste à faire

### Avant le lancement (bloquant)

1. ~~Réparer le dépôt GitHub~~ ✅
2. ~~Exécuter `schema.sql` et `club.sql`~~ ✅ (pg_cron actif, tâche toutes les 5 min)
3. ~~Variables d'environnement Vercel~~ ✅ (noms en majuscules, voir section 2) : `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (`VITE_ENABLE_GOOGLE` est facultatif).
4. **Supabase → Authentication → URL Configuration** : Site URL `https://www.friendplussport.center`, Redirect URLs `https://www.friendplussport.center/**`.
5. ~~Modèle d'e-mail Magic Link~~ ✅ : ajouter `{{ .Token }}` pour que le code à 6 chiffres apparaisse, sinon les joueurs ne reçoivent qu'un lien.
6. ~~SMTP Resend~~ ✅ : obligatoire, l'envoi intégré de Supabase est limité à quelques e-mails par heure.
   Enregistrements DNS à ajouter chez le gestionnaire du domaine :
   - TXT `resend._domainkey` → clé DKIM affichée dans Resend → Domains
   - MX `send` → `feedback-smtp.ap-northeast-1.amazonses.com` (priorité 10)
   - TXT `send` → `v=spf1 include:amazonses.com ~all`
   Puis Supabase → Authentication → SMTP : hôte `smtp.resend.com`, port 465, utilisateur `resend`,
   mot de passe = une clé API Resend, expéditeur `noreply@friendplussport.center`.
7. **Remplacer les 6 salles fictives** (Patong Sports Arena, Kata Beach Padel Club, etc.) par les vraies salles partenaires, dans la table `venues`.
8. **Mentions légales, CGU, politique de confidentialité** (RGPD pour les Européens, PDPA en Thaïlande).

### Tests de recette

- Connexion par code e-mail, écran « Bienvenue » (prénom, nationalité, sports, niveau, langue)
- Créer une session padel avec le compte A, la rejoindre avec B : le compteur bouge chez A sans recharger
- Session pleine → 5e joueur en liste d'attente → un joueur part → promotion automatique
- Deadline dépassée → statut « Confirmée » ou « Annulée » dans les 5 minutes
- Invitation reçue visible dans « Mes sessions »

### Ensuite

1. Notifications hors app (e-mail, LINE ou WhatsApp) à la confirmation ou l'annulation : aujourd'hui le joueur doit ouvrir l'app.
2. Paiement à l'inscription (Stripe, ou Omise qui gère PromptPay) pour réduire les absences.
3. ~~Signalement d'un joueur et modération~~ ✅ (Club). Prochaine étape sociale : fil d'actualité des moments de mes amis, « j'aime » et commentaires.
4. ~~PWA~~ ✅ fait.
5. Kit partenariats et fichier de prospection des salles (fournis dans le zip d'origine) à exploiter côté commercial.

---

## 6. Points d'attention

- **Le build Vercel n'exécute pas `tsc`** : le script `build` est volontairement `vite build`, pour éviter qu'une erreur de typage bloque un déploiement. Utiliser `npm run typecheck` en local.
- **`package-lock.json`** régénéré sur le registre npm officiel (l'original pointait vers `npmmirror.com`).
- **Table `public.friendplussport`** : vide, absente du code, sans règle d'accès ; créée à la main dans Supabase. Peut être supprimée.
- **Nouvelle table dans Supabase** : penser au `grant select … to authenticated` (et `anon` si publique) en plus des règles RLS.
- **Le plugin `plugin-inspect-react-code`** (outil de la plateforme qui a généré le prototype) a été retiré de `vite.config.ts`.
- **Chiffres de la page d'accueil** : calculés en direct depuis la base. Ils seront donc petits au lancement. Les valeurs fictives (128 joueurs, etc.) ont été supprimées.
- **Versions non maintenues** signalées par npm (recharts 2.x, eslint 9.x) : sans conséquence, migration possible plus tard.
- **Aucun accès partagé** : ne jamais diffuser la clé `service_role` de Supabase. La clé `anon` dans Vercel est prévue pour être publique.

---

## 7. Commandes utiles

```bash
npm install                 # installer les dépendances
cp .env.example .env        # puis coller l'URL et la clé anon de Supabase
npm run dev                 # http://localhost:3000
npm run build               # compilation de production
npm run typecheck           # vérification des types
```
