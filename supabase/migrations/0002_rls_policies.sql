-- NAVISCOP — Row-Level Security
-- Cloisonnement : un utilisateur ne voit QUE les dossiers dont il est membre.
-- Les fonctions d'accès sont SECURITY DEFINER pour lire dossier_membres sans
-- déclencher la récursion RLS (pattern standard multi-tenant).

set search_path = public;

-- ============================================================================
-- FONCTIONS D'ACCÈS
-- ============================================================================
create or replace function est_membre_dossier(d uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from dossier_membres
    where dossier_id = d and user_id = auth.uid()
  );
$$;

create or replace function est_daf_dossier(d uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from dossier_membres
    where dossier_id = d and user_id = auth.uid() and role = 'daf'
  );
$$;

-- ============================================================================
-- ACTIVATION RLS
-- ============================================================================
alter table profiles enable row level security;
alter table dossiers enable row level security;
alter table dossier_membres enable row level security;
alter table dossier_parametrage enable row level security;
alter table dossier_pnl enable row level security;
alter table dossier_cash enable row level security;
alter table previsionnels enable row level security;
alter table plan_actions enable row level security;

-- ============================================================================
-- PROFILES : chacun voit et modifie son propre profil
-- ============================================================================
create policy profiles_select_self on profiles
  for select using (id = auth.uid());
create policy profiles_update_self on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ============================================================================
-- DOSSIERS : membre = lecture ; création par soi ; DAF = modif/suppression
-- ============================================================================
create policy dossiers_select on dossiers
  for select using (est_membre_dossier(id));
create policy dossiers_insert on dossiers
  for insert with check (created_by = auth.uid());
create policy dossiers_update on dossiers
  for update using (est_daf_dossier(id)) with check (est_daf_dossier(id));
create policy dossiers_delete on dossiers
  for delete using (est_daf_dossier(id));

-- ============================================================================
-- DOSSIER_MEMBRES : membre = lecture ; DAF gère les accès
-- ============================================================================
create policy membres_select on dossier_membres
  for select using (est_membre_dossier(dossier_id));
create policy membres_insert on dossier_membres
  for insert with check (est_daf_dossier(dossier_id));
create policy membres_update on dossier_membres
  for update using (est_daf_dossier(dossier_id)) with check (est_daf_dossier(dossier_id));
create policy membres_delete on dossier_membres
  for delete using (est_daf_dossier(dossier_id));

-- ============================================================================
-- TABLES DE DONNÉES : lecture = membre ; écriture = membre
-- (la distinction fine DAF/client pourra être resserrée plus tard)
-- ============================================================================
do $$
declare
  t text;
begin
  foreach t in array array['dossier_parametrage', 'dossier_pnl', 'dossier_cash', 'previsionnels', 'plan_actions']
  loop
    execute format('create policy %1$s_select on %1$s for select using (est_membre_dossier(dossier_id));', t);
    execute format('create policy %1$s_insert on %1$s for insert with check (est_membre_dossier(dossier_id));', t);
    execute format('create policy %1$s_update on %1$s for update using (est_membre_dossier(dossier_id)) with check (est_membre_dossier(dossier_id));', t);
    execute format('create policy %1$s_delete on %1$s for delete using (est_membre_dossier(dossier_id));', t);
  end loop;
end;
$$;
