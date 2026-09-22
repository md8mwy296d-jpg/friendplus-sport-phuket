# FRIEND+ Sport Phuket

Application web pour organiser des sports collectifs à Phuket (futsal 5v5, padel, danse, fitness).
Une session est **confirmée automatiquement 24 ou 48 h avant** si le quota de joueurs est atteint, sinon elle est annulée.

- Front : React 19, TypeScript, Vite, Tailwind, 4 langues (FR, EN, RU, TH)
- Back : Supabase (base Postgres, connexion par e-mail, temps réel, tâche planifiée)
- Hébergement : Vercel

➡️ **Mise en ligne pas à pas : voir [DEPLOIEMENT.md](./DEPLOIEMENT.md)**

## Lancer en local

```bash
npm install
cp .env.example .env      # puis colle l'URL et la clé "anon" de ton projet Supabase
npm run dev               # http://localhost:3000
```

## Où est quoi

| Dossier / fichier | Rôle |
|---|---|
| `supabase/schema.sql` | Toute la base : tables, sécurité, règles métier (quota, liste d'attente, confirmation 24–48 h) |
| `src/lib/store.ts` | Lien entre l'interface et Supabase (chargement, temps réel, actions) |
| `src/lib/i18n.ts`, `src/lib/i18n-auth.ts` | Textes dans les 4 langues |
| `src/pages/` | Écrans : Explorer, Créer, Détail, Mes sessions, Salles, Profil, Connexion, Bienvenue |
| `public/` | Images (salles, sports, hero) |
