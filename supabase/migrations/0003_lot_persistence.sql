-- Persistance des fonctionnalités V2 (retours appel Michael).
-- 1. Provisions du cash réellement disponible (saisies dans Paramétrage).
-- 2. Détail financier issu du FEC (charges par poste + clients par CA).

alter table public.dossier_parametrage
  add column if not exists tva_a_provisionner numeric not null default 0,
  add column if not exists charges_sociales_a_provisionner numeric not null default 0,
  add column if not exists impots_a_provisionner numeric not null default 0,
  add column if not exists securite_tresorerie_cible numeric not null default 0;

-- Détail par poste de charge et par client, tel que reconstruit à l'import FEC.
-- Stocké en JSON car sa structure (liste de postes / de clients) ne rentre pas dans les 12 lignes agrégées.
alter table public.dossiers
  add column if not exists detail_financier jsonb;
