# NAVISCOP — Backend Supabase

Schéma multi-tenant + cloisonnement RLS pour passer l'app de `localStorage` à une vraie base.

## Migrations
- `0001_init_schema.sql` — tables, enums, triggers.
- `0002_rls_policies.sql` — Row-Level Security (cloisonnement).

## Modèle de données (miroir de l'app actuelle)

| App (`dossier-context.tsx`) | Base Postgres |
|---|---|
| `DossierEntry` (id, nom, metier) | `dossiers` |
| accès DAF / client | `dossier_membres` (role `daf`/`client`) |
| `EntreesMoteur.parametrage` | `dossier_parametrage` (1 ligne/dossier) |
| `EntreesMoteur.pnl[12]` | `dossier_pnl` (12 lignes, `mois` 0..11) |
| `EntreesMoteur.cash[12]` | `dossier_cash` (12 lignes) |
| `EntreesMoteur.creancesClients` | `dossier_parametrage.creances_clients` |
| `MouvementPrevisionnel[]` | `previsionnels` |
| `ActionItem[]` (plan d'action) | `plan_actions` |

## Cloisonnement (le point critique)
- Un utilisateur ne voit **que** les dossiers dont il est membre (`dossier_membres`).
- Fonctions `est_membre_dossier(uuid)` / `est_daf_dossier(uuid)` en `SECURITY DEFINER`
  (lisent `dossier_membres` sans récursion RLS).
- Lecture = membre ; écriture des accès = DAF. Toutes les tables de données sont
  filtrées par `est_membre_dossier(dossier_id)`.
- À la création d'un dossier, le créateur devient automatiquement membre `daf` (trigger).
- À la création d'un compte auth, un `profiles` est créé (trigger).

## Appliquer (dès qu'un Supabase de dev existe)
```bash
# 1. Lier le projet de dev
supabase link --project-ref <ref-du-projet>
# 2. Pousser les migrations
supabase db push
```
En local (nécessite Docker, absent pour l'instant) : `supabase start` puis `supabase db reset`.

## Reste à faire (côté app, une fois la base en place)
1. `@supabase/supabase-js` + client + provider d'auth (login/logout).
2. Remplacer la persistance `localStorage` de `DossierProvider` par des lectures/écritures Supabase (le moteur de calcul, lui, ne change pas).
3. Migration des données démo -> seed, écran de connexion, invitation d'un client sur son dossier.
