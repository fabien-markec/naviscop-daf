-- Saisie enrichie : une charge peut être fixe (répétée chaque mois) et avoir un délai
-- de paiement (0, 30, 45, 60 jours) qui décale le décaissement dans le plan de trésorerie.
alter table public.previsionnels
  add column if not exists est_fixe boolean,
  add column if not exists delai_paiement_jours integer;
