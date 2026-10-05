# My Phuket Key

Conciergerie en ligne à Phuket : scooters et motos, excursions avec assurance, bateaux et voiliers,
hôtels et villas, clubs, nounou, ménage et laverie, taxi beauté, hélicoptère.
Réservation et **paiement par carte** (Stripe) ; la réservation est confirmée une fois la carte débitée.

- Front : React 19, TypeScript, Vite, Tailwind, application mobile installable (PWA), 23 langues
- Back : Supabase (Postgres + RLS, connexion par code e-mail, stockage photos, fonctions Edge, tâches planifiées)
- Paiement : Stripe Checkout · E-mails : Resend · Hébergement : Vercel

➡️ **Mise en ligne et gestion : [DEPLOIEMENT.md](./DEPLOIEMENT.md)** · Historique : [HISTORIQUE-PROJET.md](./HISTORIQUE-PROJET.md)

## Lancer en local

```bash
npm install
cp .env.example .env      # URL et clé « anon » du projet Supabase
npm run dev               # http://localhost:3000
npm run typecheck && npm run lint && npm run build
```
