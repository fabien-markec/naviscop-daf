-- Profil fiscal & social du dossier : statut juridique, régime fiscal,
-- paramètres URSSAF / impôt / TVA (utilisés pour projeter les provisions).
alter table public.dossiers
  add column if not exists profil_fiscal jsonb;
