# Mettre FRIEND+ Sport Phuket en ligne

Compte environ **1 h** la première fois. Tout se fait dans le navigateur, sans ligne de commande.
Les trois services ont une offre gratuite suffisante pour lancer.

| Service | Rôle | Offre gratuite |
|---|---|---|
| **Supabase** | Base de données, comptes joueurs, temps réel | Oui (2 projets) |
| **GitHub** | Stocke le code | Oui |
| **Vercel** | Héberge le site | Oui (usage non commercial ; passer au plan Pro dès que tu monétises) |
| **Resend** (ou Brevo) | Envoi des e-mails de connexion | Oui (3 000 e-mails/mois) |

---

## Étape 1 — Supabase (la base de données)

1. Crée un compte sur **supabase.com**, puis **New project**.
   - Nom : `friendplus`
   - Région : **Southeast Asia (Singapore)**, la plus proche de Phuket
   - Note le mot de passe de la base quelque part.
2. **Database → Extensions** : cherche `pg_cron` et active-le.
3. **SQL Editor → New query** : colle tout le contenu de `supabase/schema.sql`, puis **Run**.
   Tu dois voir « Success ». Les tables apparaissent dans **Table Editor**.
4. **Authentication → Sign In / Providers → Email** : vérifie que c'est activé.
   Laisse les autres réglages par défaut.
   Puis, dans une **nouvelle requête**, colle `supabase/club.sql` (Social Club : groupes, messages, photos) et **Run**.
   Il crée aussi l'espace de stockage privé `chat-images` pour les photos.
5. **Authentication → Emails → Templates** : les modèles ne sont modifiables qu'**après** avoir branché le SMTP
   (point 6). Fais donc le point 6 d'abord, puis remplace le contenu de **« Magic link or OTP »** ET de
   **« Confirm sign up »** (reçu à la toute première connexion) par :

   ```html
   <h2>Ton code FRIEND+</h2>
   <p>Ton code de connexion : <strong style="font-size:24px">{{ .Token }}</strong></p>
   <p>Ou clique ici : <a href="{{ .ConfirmationURL }}">me connecter</a></p>
   ```

   Sans ça, les joueurs reçoivent seulement un lien et pas le code à 6 chiffres.
6. **Authentication → Emails → SMTP Settings** : branche Resend (ou Brevo).
   ⚠️ **Obligatoire avant le lancement** : l'envoi intégré de Supabase est limité à quelques e-mails par heure.
   Sur Resend : crée une clé API, vérifie ton domaine, puis saisis dans Supabase
   hôte `smtp.resend.com`, port `465`, utilisateur `resend`, mot de passe = ta clé API.
7. **Project Settings → API** : copie **Project URL** et la clé **anon public**. Tu en as besoin à l'étape 3.

## Étape 2 — GitHub (le code)

1. Crée un compte sur **github.com**, puis **New repository** → nom `friendplus-sport-phuket`, **Private**.
2. Sur la page du dépôt : **uploading an existing file**, glisse **le contenu** du dossier
   `friendplus-sport-phuket` (pas le dossier lui-même), puis **Commit changes**.

## Étape 3 — Vercel (la mise en ligne)

1. Crée un compte sur **vercel.com** avec ton GitHub.
2. **Add New → Project** → choisis `friendplus-sport-phuket`. Vercel détecte Vite tout seul.
3. Avant de cliquer Deploy, ouvre **Environment Variables** et ajoute :

   | Nom | Valeur |
   |---|---|
   | `VITE_SUPABASE_URL` | la Project URL de Supabase |
   | `VITE_SUPABASE_ANON_KEY` | la clé anon public |
   | `VITE_ENABLE_GOOGLE` | `false` (voir Étape 6) |

4. **Deploy**. Au bout de 1 à 2 minutes, tu as une adresse du type `friendplus-sport-phuket.vercel.app`.
5. Retourne dans Supabase → **Authentication → URL Configuration** :
   - **Site URL** : ton adresse Vercel (ou ton domaine)
   - **Redirect URLs** : ajoute `https://TON-ADRESSE/**`

## Étape 4 — Ton nom de domaine (optionnel)

Vercel → ton projet → **Settings → Domains** → ajoute par exemple `friendplus.app` et suis les instructions DNS.
Pense à mettre à jour la **Site URL** et les **Redirect URLs** dans Supabase avec le nouveau domaine.

## Étape 5 — Tester avant d'annoncer

Fais le test avec 2 ou 3 téléphones (ou navigateurs en navigation privée) :

- [ ] Connexion par e-mail : le code arrive, l'écran « Bienvenue » demande prénom, nationalité et sports
- [ ] Créer une session **padel** (quota 4) avec le compte A
- [ ] Rejoindre avec B : le compteur passe à 2/4 **sur l'écran de A sans recharger**
- [ ] Remplir la session : statut « Complet » ; un 5e joueur part en liste d'attente
- [ ] Un joueur quitte : le premier de la liste d'attente prend sa place
- [ ] Inviter un joueur : l'invitation apparaît dans « Mes sessions » chez lui
- [ ] Deadline passée : la session passe « Confirmée » (quota atteint) ou « Annulée » (dans les 5 min)

## Étape 6 — Connexion Google (optionnel)

1. Google Cloud Console → crée des identifiants OAuth (type « Application Web »),
   avec l'URL de redirection indiquée dans Supabase → **Authentication → Providers → Google**.
2. Colle l'ID client et le secret dans Supabase, active Google.
3. Dans Vercel, passe `VITE_ENABLE_GOOGLE` à `true`, puis **Redeploy**.

---

## Gérer l'app au quotidien

- **Salles partenaires** : Supabase → **Table Editor → venues**. Les 6 salles installées sont celles du prototype
  (noms fictifs) : **remplace-les par tes vraies salles** avant le lancement. Pour masquer une salle sans la supprimer,
  mets `active` à `false`. Pour une photo, mets une adresse d'image (https://…) dans `photo`.
- **Sessions et joueurs** : tables `sessions`, `session_players`, `profiles`.
- **Supprimer un compte** (demande RGPD/PDPA) : **Authentication → Users → Delete user**. Ses données partent avec.
- **Devenir modérateur du Social Club** : copie ton identifiant dans **Authentication → Users** (colonne UID), puis
  SQL Editor : `insert into public.app_admins (user_id) values ('TON-UID');`. Tu peux alors supprimer n'importe quel
  message et exclure un membre de n'importe quel groupe.
- **Signalements** : **Table Editor → reports** (message signalé, auteur, motif). Passe `status` à `reviewed` une fois traité.

## Ce que fait cette version 1

- Comptes joueurs (e-mail sans mot de passe, Google en option), profil public sans e-mail visible
- Sessions partagées entre tous les utilisateurs, compteur mis à jour en direct
- Quota verrouillé côté serveur (pas de surbooking même si 2 personnes cliquent en même temps)
- Liste d'attente avec promotion automatique
- Confirmation ou annulation automatique à la deadline 24/48 h (toutes les 5 min)
- Invitations entre joueurs, annulation par l'organisateur
- Chiffres de la page d'accueil calculés en direct
- **Social Club** : groupes publics ou privés créés par les membres, messages privés, discussion automatique de chaque
  session (réservée aux inscrits), photos, messages en direct, compteur de non-lus
- **Modération** : blocage d'un joueur, signalement, suppression de messages, exclusion d'un groupe, limite de 20 messages/minute
- **Application mobile (PWA)** : installable sur l'écran d'accueil (Android : bouton « Installer » ; iPhone : Partager →
  « Sur l'écran d'accueil »), plein écran, barre d'onglets en bas, fonctionne hors connexion pour l'interface

## Prochaines étapes conseillées

1. **Notifications** hors de l'app (e-mail, LINE ou WhatsApp) quand une session est confirmée ou annulée.
   Aujourd'hui, le joueur le voit en ouvrant l'app.
2. **Mentions légales, CGU et politique de confidentialité** (RGPD si tu vises des Européens, PDPA en Thaïlande).
3. **Paiement** à l'inscription (Stripe ou Omise, qui gère PromptPay en Thaïlande) pour réduire les absences.
4. **Notifications push** sur téléphone pour les nouveaux messages du Club (nécessite une fonction serveur Supabase).
5. **Publication sur l'App Store et Google Play** (Capacitor) une fois la PWA adoptée.
