-- Invitations par lien : le DAF génère un lien d'accès pour le dirigeant d'un dossier.
-- Le client ouvre le lien, choisit son mot de passe, et son accès est activé.
-- Aucun email envoyé : le DAF transmet le lien comme il veut. L'acceptation passe
-- par une route serveur (service_role) ; ici on protège création/lecture par le DAF.
create table if not exists public.invitations (
  token uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.dossiers(id) on delete cascade,
  email text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  used_at timestamptz
);

alter table public.invitations enable row level security;

drop policy if exists invitations_insert on public.invitations;
create policy invitations_insert on public.invitations
  for insert with check (est_daf_dossier(dossier_id));

drop policy if exists invitations_select on public.invitations;
create policy invitations_select on public.invitations
  for select using (est_daf_dossier(dossier_id));

drop policy if exists invitations_delete on public.invitations;
create policy invitations_delete on public.invitations
  for delete using (est_daf_dossier(dossier_id));
