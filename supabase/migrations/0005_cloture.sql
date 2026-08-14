-- Dernier mois clôturé (réalisé connu). -1 = aucun mois clôturé.
-- Les prévisions portant sur un mois clôturé sont ignorées (le réalisé remplace la prévision).
alter table public.dossiers
  add column if not exists mois_cloture_index smallint not null default -1;
