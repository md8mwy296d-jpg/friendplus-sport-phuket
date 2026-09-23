# FRIEND+ Sport Phuket — historique et état du projet

> Fichier de reprise. À ouvrir en premier dans Claude Code (`claude` puis « lis HISTORIQUE-PROJET.md »).
> Dernière mise à jour : 23 septembre 2026.

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
| Base de données Supabase (`supabase/schema.sql`) | ⬜ À exécuter dans Supabase |
| Dépôt GitHub `friendplus-sport-phuket` | ✅ Arborescence reconstruite (branche `claude/reprise-projet-5kelx0`), build OK |
| Projet Vercel + domaine `friendplussport.center` | ⚠️ Domaine configuré, déploiement en échec |
| SMTP (e-mails de connexion) | ⬜ À brancher (Resend) |
| Vraies salles partenaires | ⬜ À saisir (les 6 salles installées sont fictives) |

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
| `DEPLOIEMENT.md` | Guide de mise en ligne pas à pas |

### Modèle de données

- `profiles` — profil public (1 ligne par compte, créée par trigger sur `auth.users`). Pas d'e-mail dedans.
- `venues` — salles partenaires (`active` pour masquer sans supprimer).
- `sessions` — statut `open` | `full` | `confirmed` | `cancelled`, `confirmation_deadline`.
- `session_players` — inscriptions, `kind` = `player` | `waitlist`.
- `invitations` — statut `pending` | `accepted` | `declined`.
- Vue `public_profiles` — profils + compteurs (sessions jouées / organisées).

### Règles appliquées côté serveur (fonctions RPC, `security definer`)

- `create_session` — quota imposé selon le sport (futsal 10, padel 4), deadline obligatoirement dans le futur, max 10 sessions ouvertes par organisateur, cohérence sport/salle.
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

1. **Réparer le dépôt GitHub** (voir section 2) et obtenir un déploiement Vercel vert.
2. **Exécuter `supabase/schema.sql`** dans Supabase → SQL Editor. Activer l'extension `pg_cron` avant (Database → Extensions).
3. **Variables d'environnement Vercel** : `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (`VITE_ENABLE_GOOGLE` est facultatif).
4. **Supabase → Authentication → URL Configuration** : Site URL `https://www.friendplussport.center`, Redirect URLs `https://www.friendplussport.center/**`.
5. **Modèle d'e-mail Magic Link** : ajouter `{{ .Token }}` pour que le code à 6 chiffres apparaisse, sinon les joueurs ne reçoivent qu'un lien.
6. **SMTP Resend** : obligatoire, l'envoi intégré de Supabase est limité à quelques e-mails par heure.
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
3. Signalement d'un joueur et modération.
4. PWA : installation sur l'écran d'accueil sans passer par les stores.
5. Kit partenariats et fichier de prospection des salles (fournis dans le zip d'origine) à exploiter côté commercial.

---

## 6. Points d'attention

- **Le build Vercel n'exécute pas `tsc`** : le script `build` est volontairement `vite build`, pour éviter qu'une erreur de typage bloque un déploiement. Utiliser `npm run typecheck` en local.
- **`package-lock.json` a été supprimé** : le fichier d'origine pointait vers un miroir npm chinois (`npmmirror.com`). Un nouveau lock sera généré au premier `npm install`, il faudra le committer.
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
