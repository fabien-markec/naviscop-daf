-- 0012 : retours Michaël (16/10/2026)
-- #3 : date du solde initial de trésorerie (permet de démarrer la saisie en cours d'année).
-- #6 : mouvements bancaires hors compte de résultat (dividendes, épargne, emprunt, investissement…).

alter table public.dossier_parametrage
  add column if not exists date_solde_initial text;

-- Nouveau type de mouvement : opération bancaire pure (touche la trésorerie, pas le résultat).
alter type type_previsionnel add value if not exists 'mouvement_bancaire';

-- Sens du flux pour un mouvement bancaire : 'entree' (encaissement) ou 'sortie' (décaissement).
alter table public.previsionnels
  add column if not exists sens_cash text;
