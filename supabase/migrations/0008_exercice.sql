-- Multi-exercice : date de clôture (bilan) obligatoire + année d'exercice.
-- Permet de créer l'exercice suivant (N+1) et de basculer entre exercices d'un même client.
alter table public.dossiers
  add column if not exists date_bilan text,
  add column if not exists exercice integer;
