# My Phuket Key — mise en ligne et gestion

Plateforme de réservation de services à Phuket : scooters et motos, excursions avec assurance,
bateaux et voiliers, hôtels et villas, conciergerie clubs, nounou, ménage et laverie, taxi beauté,
hélicoptère. **Une réservation n'est valide qu'une fois la carte débitée** (Stripe).

| Service | Rôle |
|---|---|
| **Supabase** (projet `fqrlyykadbzaxzjneupm`, Tokyo) | Base de données, comptes clients, fonctions de paiement |
| **Vercel** (projet `friendplus-sport-phuket`) | Héberge le site |
| **Stripe** | Paiement par carte (et PromptPay si activé) |
| **Resend** | E-mails : code de connexion, reçu de paiement, confirmation, alerte admin |

---

## 1. Base de données (Supabase → SQL Editor)

Dans cet ordre, une requête à la fois :

1. **`supabase/myphuketkey.sql`** : offres, réservations, paiement, e-mails, photos, 9 offres d'exemple.
   Ré-exécutable sans risque.
2. **`supabase/moderation.sql`** et **`supabase/visits.sql`** : déjà en place sur le projet actuel
   (blocage d'IP, statistiques de visites). À exécuter seulement sur un nouveau projet.
3. **`supabase/cleanup-friendplus.sql`** : ⚠️ supprime définitivement les tables de l'ancienne version
   sport (sessions, salles, Club, amis, publications). Les comptes sont conservés.
   Ensuite, dans **Storage**, vider puis supprimer les buckets `chat-images`, `moments`, `news`, `posts`, `avatars`.

**Devenir administrateur** (accès à la page `/admin`) : Authentication → Users → copier ton UID, puis :

```sql
insert into public.app_admins (user_id) values ('TON-UID') on conflict do nothing;
```

L'admin reçoit par e-mail une alerte à chaque réservation payée.

## 2. Paiement Stripe

1. Crée un compte sur **stripe.com** (entreprise en Thaïlande ou dans ton pays). Reste en **mode test**
   tant que tout n'est pas vérifié.
2. **Clé secrète** : Developers → API keys → *Secret key* (`sk_test_…`, puis `sk_live_…`).
3. **Fonctions Edge** (Supabase → Edge Functions) : déployer `create-checkout` et `stripe-webhook`
   (dossier `supabase/functions/`). `stripe-webhook` doit être déployée **sans vérification JWT**
   (`supabase/config.toml` le précise ; en CLI : `supabase functions deploy stripe-webhook --no-verify-jwt`).
4. **Webhook Stripe** : Developers → Webhooks → *Add endpoint*
   - URL : `https://fqrlyykadbzaxzjneupm.supabase.co/functions/v1/stripe-webhook`
   - Événements : `checkout.session.completed` et `checkout.session.async_payment_succeeded`
   - Copier le *Signing secret* (`whsec_…`).
5. **Secrets** (Supabase → Edge Functions → Secrets) :

   | Nom | Valeur |
   |---|---|
   | `STRIPE_SECRET_KEY` | `sk_test_…` (puis `sk_live_…` au lancement) |
   | `STRIPE_WEBHOOK_SECRET` | `whsec_…` |
   | `SITE_URL` | `https://www.friendplussport.center` (puis le nouveau domaine) |

6. **Test** : réserve une offre et paie avec la carte `4242 4242 4242 4242` (date future, CVC quelconque).
   La réservation passe « Payée », tu reçois l'alerte admin, le client son reçu.

Le prix est **toujours recalculé par la base** (`create_booking`) : modifier la page ne change pas le montant débité.
Seul le webhook signé par Stripe peut marquer une réservation « payée ». Une réservation non payée expire au bout de 2 h.

## 3. Vercel

Variables d'environnement (Settings → Environment Variables), puis **Redeploy** :

| Nom | Valeur |
|---|---|
| `VITE_SUPABASE_URL` | déjà en place |
| `VITE_SUPABASE_ANON_KEY` | déjà en place |
| `VITE_CONTACT_EMAIL` | adresse de contact affichée (par défaut contact01friendplussport@gmail.com) |
| `VITE_CONTACT_WHATSAPP` | numéro WhatsApp de la conciergerie, format international (ex. `66812345678`) — active les boutons WhatsApp |

## 4. Nouveau domaine (myphuketkey.com)

1. Acheter le domaine (Vercel → Domains → Buy), l'ajouter au projet `friendplus-sport-phuket`.
2. Supabase → Authentication → URL Configuration : Site URL + Redirect URLs avec le nouveau domaine.
3. Resend : ajouter et vérifier le domaine (Auto configure avec Vercel), puis mettre à jour
   l'expéditeur dans `_mpk_sender()` et le site dans `_mpk_site()` (fin de `myphuketkey.sql`), et ré-exécuter.
4. Secret `SITE_URL` des fonctions Edge, `index.html` (balises canonical / og), `public/robots.txt`, `public/sitemap.xml`.

## 5. Gérer au quotidien (page /admin)

- **Réservations** : « À confirmer » = payées. Contacte le prestataire, puis **Confirmer** (le client reçoit
  un e-mail). Après la prestation : **Terminée**. Annulation : **Annuler**, puis rembourse dans Stripe
  (Payments → Refund) et passe en **Remboursée**. Bouton WhatsApp pour joindre le client.
- **Offres** : créer, modifier, masquer, mettre en avant ; photos (5 Mo max, JPEG/PNG/WebP) ;
  options au format `Libellé | prix | unit` (multiplié comme le prix) ou `| booking` (une fois par réservation).
  **Remplacer les 9 offres d'exemple** par tes vraies offres et tes vrais prix avant le lancement.
- **Programme d'arrivée** (page `/mon-arrivee`) : le client enregistre son vol et son hébergement ; ses
  réservations sont préremplies et s'affichent jour par jour. Dans chaque offre : « Remise à l'aéroport » et
  « Livraison à l'adresse » (vide = non proposé, 0 = offert) et « Règle pour l'arrivée » (accueil, véhicule,
  bagages) pour la checklist d'atterrissage. Dans la liste des réservations, l'admin voit le vol, la livraison
  et l'hébergement du client.
- **Visites et sécurité** : visites par ville, journal des connexions, IP bloquées.

## 6. Avant d'ouvrir au public

- [ ] Vraies offres, vrais prix, vraies photos (droits d'utilisation)
- [ ] Conditions de réservation (`/conditions`) relues par un juriste : raison sociale, adresse, numéro d'entreprise
- [ ] Nouvelle politique de confidentialité (Termly) : l'actuelle (`public/privacy-policy.html`) décrit encore FRIEND+ Sport
- [ ] Contrats avec les prestataires (assurance des excursions, licences pour les bateaux et l'hélicoptère, nounous vérifiées)
- [ ] Stripe en mode live, webhook live, test d'un vrai paiement puis remboursement
