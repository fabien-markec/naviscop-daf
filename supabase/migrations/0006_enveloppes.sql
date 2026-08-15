-- Enveloppes de provision supplémentaires (investissements futurs, saisonnalité / périodes creuses).
alter table public.dossier_parametrage
  add column if not exists investissements_a_provisionner numeric not null default 0,
  add column if not exists saisonnalite_a_provisionner numeric not null default 0;
