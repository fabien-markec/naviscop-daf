-- Carnet de commandes : une facture à venir peut être encaissée un autre mois que sa facturation,
-- et porter un statut (commande signée ou seulement prévue).
alter table public.previsionnels
  add column if not exists mois_encaissement smallint,
  add column if not exists statut text;
