-- Charges fixes mensuelles saisies à la main (loyer, assurance, salaires, abonnements...).
-- Si renseignées, elles priment sur l'estimation dans le calcul du cash réellement disponible.
alter table public.dossiers
  add column if not exists charges_fixes jsonb;
