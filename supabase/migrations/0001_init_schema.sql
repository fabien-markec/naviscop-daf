-- NAVISCOP — schéma de base (multi-tenant)
-- Un « dossier » = le fichier financier d'une entreprise cliente.
-- Accès cloisonné par appartenance (dossier_membres), rôle DAF ou client.
-- Le cloisonnement lui-même est appliqué par les policies RLS (voir 0002).

set search_path = public;

-- ============================================================================
-- PROFILS (extension de auth.users)
-- ============================================================================
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nom_complet text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- DOSSIERS
-- ============================================================================
create table if not exists dossiers (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  metier text not null default '',
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Qui a accès à un dossier, et avec quel rôle.
create type role_dossier as enum ('daf', 'client');

create table if not exists dossier_membres (
  dossier_id uuid not null references dossiers (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role role_dossier not null default 'client',
  created_at timestamptz not null default now(),
  primary key (dossier_id, user_id)
);
create index if not exists idx_dossier_membres_user on dossier_membres (user_id);

-- ============================================================================
-- PARAMÉTRAGE FINANCIER (1 ligne par dossier) — cf. ParametrageFinancier
-- ============================================================================
create table if not exists dossier_parametrage (
  dossier_id uuid primary key references dossiers (id) on delete cascade,
  solde_initial_tresorerie numeric(14, 2) not null default 0,
  objectif_ca_annuel numeric(14, 2) not null default 0,
  objectif_remuneration_mensuelle numeric(14, 2) not null default 0,
  mois_securite_tresorerie numeric(6, 2) not null default 2,
  objectif_taux_marque numeric(6, 4) not null default 0,
  seuil_charges_fixes_pct_ca numeric(6, 4) not null default 0.3,
  objectif_resultat_net_annuel numeric(14, 2) not null default 0,
  creances_clients numeric(14, 2) not null default 0
);

-- ============================================================================
-- COMPTE DE RÉSULTAT mensuel (HT) — 12 lignes / dossier (mois 0..11)
-- ============================================================================
create table if not exists dossier_pnl (
  dossier_id uuid not null references dossiers (id) on delete cascade,
  mois smallint not null check (mois between 0 and 11),
  ca_ht numeric(14, 2) not null default 0,
  achats_marchandises_mp numeric(14, 2) not null default 0,
  autres_achats_charges_externes numeric(14, 2) not null default 0,
  salaires_et_charges numeric(14, 2) not null default 0,
  impots_et_taxes numeric(14, 2) not null default 0,
  charges_financieres numeric(14, 2) not null default 0,
  charges_exceptionnelles numeric(14, 2) not null default 0,
  amortissements numeric(14, 2) not null default 0,
  primary key (dossier_id, mois)
);

-- ============================================================================
-- FLUX DE TRÉSORERIE mensuel (TTC) — 12 lignes / dossier (mois 0..11)
-- ============================================================================
create table if not exists dossier_cash (
  dossier_id uuid not null references dossiers (id) on delete cascade,
  mois smallint not null check (mois between 0 and 11),
  encaissements numeric(14, 2) not null default 0,
  decaissements numeric(14, 2) not null default 0,
  primary key (dossier_id, mois)
);

-- ============================================================================
-- SAISIE PRÉVISIONNELLE — cf. MouvementPrevisionnel
-- ============================================================================
create type type_previsionnel as enum ('facture_a_venir', 'charge_prevue', 'investissement');

create table if not exists previsionnels (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references dossiers (id) on delete cascade,
  type type_previsionnel not null,
  libelle text not null,
  montant_ht numeric(14, 2) not null,
  taux_tva numeric(5, 2) not null default 20,
  mois_index smallint not null check (mois_index between 0 and 11),
  categorie text,
  created_at timestamptz not null default now()
);
create index if not exists idx_previsionnels_dossier on previsionnels (dossier_id);

-- ============================================================================
-- PLAN D'ACTION — cf. ActionItem
-- ============================================================================
create type statut_action as enum ('a_faire', 'en_cours', 'fait');

create table if not exists plan_actions (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references dossiers (id) on delete cascade,
  action text not null,
  responsable text not null default '',
  echeance text not null default '',
  impact text not null default '',
  statut statut_action not null default 'a_faire',
  created_at timestamptz not null default now()
);
create index if not exists idx_plan_actions_dossier on plan_actions (dossier_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- À la création d'un utilisateur auth -> créer son profil.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nom_complet)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nom_complet', new.raw_user_meta_data ->> 'full_name'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- À la création d'un dossier -> le créateur en devient membre DAF.
create or replace function handle_new_dossier()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.dossier_membres (dossier_id, user_id, role)
  values (new.id, new.created_by, 'daf')
  on conflict (dossier_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_dossier_created on dossiers;
create trigger on_dossier_created
  after insert on dossiers
  for each row execute function handle_new_dossier();

-- Maintien de updated_at sur dossiers.
create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_dossier_updated on dossiers;
create trigger on_dossier_updated
  before update on dossiers
  for each row execute function touch_updated_at();
