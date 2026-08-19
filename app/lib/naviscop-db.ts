'use client';

import type {
  EntreesMoteur,
  ParametrageFinancier,
  LignePnlMensuelle,
  LigneCashMensuelle,
  MouvementPrevisionnel,
  DetailFinancier,
} from '@naviscop/finance-engine';
import { supabase } from './supabase';
import type { ActionItem, StatutAction } from './use-plan-action';

export interface DossierRow {
  id: string;
  nom: string;
  metier: string;
  entreesBase: EntreesMoteur;
  previsionnels: MouvementPrevisionnel[];
  planActions: ActionItem[];
  moisClotureIndex: number;
  dateBilan: string;
  exercice: number;
}

const n = (v: unknown) => Number(v ?? 0);
function db() {
  if (!supabase) throw new Error('Supabase non configuré');
  return supabase;
}

// ---------- mapping base -> moteur ----------
function mapParametrage(row: Record<string, unknown>): { parametrage: ParametrageFinancier; creancesClients: number } {
  return {
    parametrage: {
      soldeInitialTresorerie: n(row.solde_initial_tresorerie),
      objectifCaAnnuel: n(row.objectif_ca_annuel),
      objectifRemunerationMensuelle: n(row.objectif_remuneration_mensuelle),
      moisSecuriteTresorerie: n(row.mois_securite_tresorerie),
      objectifTauxMarque: n(row.objectif_taux_marque),
      seuilChargesFixesPctCa: n(row.seuil_charges_fixes_pct_ca),
      objectifResultatNetAnnuel: n(row.objectif_resultat_net_annuel),
      tvaAProvisionner: n(row.tva_a_provisionner),
      chargesSocialesAProvisionner: n(row.charges_sociales_a_provisionner),
      impotsAProvisionner: n(row.impots_a_provisionner),
      securiteTresorerieCible: n(row.securite_tresorerie_cible),
      investissementsAProvisionner: n(row.investissements_a_provisionner),
      saisonnaliteAProvisionner: n(row.saisonnalite_a_provisionner),
    },
    creancesClients: n(row.creances_clients),
  };
}

function mapPnl(rows: Record<string, unknown>[]): LignePnlMensuelle[] {
  const out: LignePnlMensuelle[] = Array.from({ length: 12 }, () => ({
    caHt: 0, achatsMarchandisesMp: 0, autresAchatsChargesExternes: 0, salairesEtCharges: 0,
    impotsEtTaxes: 0, chargesFinancieres: 0, chargesExceptionnelles: 0, amortissements: 0,
  }));
  for (const r of rows) {
    const i = n(r.mois);
    if (i < 0 || i > 11) continue;
    out[i] = {
      caHt: n(r.ca_ht),
      achatsMarchandisesMp: n(r.achats_marchandises_mp),
      autresAchatsChargesExternes: n(r.autres_achats_charges_externes),
      salairesEtCharges: n(r.salaires_et_charges),
      impotsEtTaxes: n(r.impots_et_taxes),
      chargesFinancieres: n(r.charges_financieres),
      chargesExceptionnelles: n(r.charges_exceptionnelles),
      amortissements: n(r.amortissements),
    };
  }
  return out;
}

function mapCash(rows: Record<string, unknown>[]): LigneCashMensuelle[] {
  const out: LigneCashMensuelle[] = Array.from({ length: 12 }, () => ({ encaissements: 0, decaissements: 0 }));
  for (const r of rows) {
    const i = n(r.mois);
    if (i < 0 || i > 11) continue;
    out[i] = { encaissements: n(r.encaissements), decaissements: n(r.decaissements) };
  }
  return out;
}

function mapPrevisionnel(r: Record<string, unknown>): MouvementPrevisionnel {
  return {
    id: String(r.id),
    type: r.type as MouvementPrevisionnel['type'],
    libelle: String(r.libelle ?? ''),
    montantHt: n(r.montant_ht),
    tauxTva: n(r.taux_tva),
    moisIndex: n(r.mois_index),
    categorie: (r.categorie ?? undefined) as MouvementPrevisionnel['categorie'],
    moisEncaissement: r.mois_encaissement == null ? undefined : n(r.mois_encaissement),
    statut: (r.statut ?? undefined) as MouvementPrevisionnel['statut'],
  };
}

function mapAction(r: Record<string, unknown>): ActionItem {
  return {
    id: String(r.id),
    action: String(r.action ?? ''),
    responsable: String(r.responsable ?? ''),
    echeance: String(r.echeance ?? ''),
    impact: String(r.impact ?? ''),
    statut: (r.statut ?? 'a_faire') as StatutAction,
  };
}

// ---------- lecture ----------
/** Charge tous les dossiers accessibles à l'utilisateur, prêts pour le moteur. */
export async function chargerDossiers(): Promise<DossierRow[]> {
  const s = db();
  const { data: dossiers, error } = await s
    .from('dossiers')
    .select('id, nom, metier, detail_financier, mois_cloture_index, charges_fixes, date_bilan, exercice')
    .order('created_at');
  if (error) throw error;
  if (!dossiers || dossiers.length === 0) return [];

  const ids = dossiers.map((d) => d.id as string);
  const [param, pnl, cash, prev, actions] = await Promise.all([
    s.from('dossier_parametrage').select('*').in('dossier_id', ids),
    s.from('dossier_pnl').select('*').in('dossier_id', ids),
    s.from('dossier_cash').select('*').in('dossier_id', ids),
    s.from('previsionnels').select('*').in('dossier_id', ids).order('created_at', { ascending: false }),
    s.from('plan_actions').select('*').in('dossier_id', ids).order('created_at', { ascending: false }),
  ]);
  for (const r of [param, pnl, cash, prev, actions]) if (r.error) throw r.error;

  const byId = <T extends { dossier_id: string }>(rows: T[] | null) => {
    const m = new Map<string, T[]>();
    for (const r of rows ?? []) (m.get(r.dossier_id) ?? m.set(r.dossier_id, []).get(r.dossier_id)!).push(r);
    return m;
  };
  const paramMap = byId(param.data as { dossier_id: string }[]);
  const pnlMap = byId(pnl.data as { dossier_id: string }[]);
  const cashMap = byId(cash.data as { dossier_id: string }[]);
  const prevMap = byId(prev.data as { dossier_id: string }[]);
  const actionMap = byId(actions.data as { dossier_id: string }[]);

  return dossiers.map((d) => {
    const p = paramMap.get(d.id as string)?.[0] ?? {};
    const { parametrage, creancesClients } = mapParametrage(p as Record<string, unknown>);
    const dr = d as Record<string, unknown>;
    const detailBrut = dr.detail_financier as DetailFinancier | null;
    const chargesFixesBrut = dr.charges_fixes as EntreesMoteur['chargesFixes'] | null;
    const entreesBase: EntreesMoteur = {
      parametrage,
      pnl: mapPnl((pnlMap.get(d.id as string) ?? []) as Record<string, unknown>[]),
      cash: mapCash((cashMap.get(d.id as string) ?? []) as Record<string, unknown>[]),
      creancesClients,
      detail: detailBrut ?? undefined,
      chargesFixes: chargesFixesBrut ?? undefined,
    };
    return {
      id: d.id as string,
      nom: (d.nom as string) ?? '',
      metier: (d.metier as string) ?? '',
      entreesBase,
      previsionnels: ((prevMap.get(d.id as string) ?? []) as Record<string, unknown>[]).map(mapPrevisionnel),
      planActions: ((actionMap.get(d.id as string) ?? []) as Record<string, unknown>[]).map(mapAction),
      moisClotureIndex: dr.mois_cloture_index == null ? -1 : n(dr.mois_cloture_index),
      dateBilan: (dr.date_bilan as string) ?? '',
      exercice: dr.exercice == null ? 0 : n(dr.exercice),
    };
  });
}

// ---------- écriture ----------
export async function creerDossier(
  nom: string,
  entreesBase: EntreesMoteur,
  metier = '',
  moisClotureIndex = -1,
  dateBilan = '',
  exercice = 0,
): Promise<string> {
  const s = db();
  const { data, error } = await s
    .from('dossiers')
    .insert({
      nom,
      metier,
      detail_financier: entreesBase.detail ?? null,
      mois_cloture_index: moisClotureIndex,
      charges_fixes: entreesBase.chargesFixes ?? null,
      date_bilan: dateBilan || null,
      exercice: exercice || null,
    })
    .select('id')
    .single();
  if (error) throw error;
  const id = data.id as string;
  const p = entreesBase.parametrage;
  const inserts = await Promise.all([
    s.from('dossier_parametrage').insert({
      dossier_id: id,
      solde_initial_tresorerie: p.soldeInitialTresorerie,
      objectif_ca_annuel: p.objectifCaAnnuel,
      objectif_remuneration_mensuelle: p.objectifRemunerationMensuelle,
      mois_securite_tresorerie: p.moisSecuriteTresorerie,
      objectif_taux_marque: p.objectifTauxMarque,
      seuil_charges_fixes_pct_ca: p.seuilChargesFixesPctCa,
      objectif_resultat_net_annuel: p.objectifResultatNetAnnuel,
      tva_a_provisionner: p.tvaAProvisionner ?? 0,
      charges_sociales_a_provisionner: p.chargesSocialesAProvisionner ?? 0,
      impots_a_provisionner: p.impotsAProvisionner ?? 0,
      securite_tresorerie_cible: p.securiteTresorerieCible ?? 0,
      investissements_a_provisionner: p.investissementsAProvisionner ?? 0,
      saisonnalite_a_provisionner: p.saisonnaliteAProvisionner ?? 0,
      creances_clients: entreesBase.creancesClients ?? 0,
    }),
    s.from('dossier_pnl').insert(
      entreesBase.pnl.map((m, i) => ({
        dossier_id: id, mois: i,
        ca_ht: m.caHt, achats_marchandises_mp: m.achatsMarchandisesMp,
        autres_achats_charges_externes: m.autresAchatsChargesExternes, salaires_et_charges: m.salairesEtCharges,
        impots_et_taxes: m.impotsEtTaxes, charges_financieres: m.chargesFinancieres,
        charges_exceptionnelles: m.chargesExceptionnelles, amortissements: m.amortissements,
      })),
    ),
    s.from('dossier_cash').insert(
      entreesBase.cash.map((m, i) => ({ dossier_id: id, mois: i, encaissements: m.encaissements, decaissements: m.decaissements })),
    ),
  ]);
  for (const r of inserts) if (r.error) throw r.error;
  return id;
}

export async function supprimerDossier(id: string): Promise<void> {
  const { error } = await db().from('dossiers').delete().eq('id', id);
  if (error) throw error;
}

export async function majParametrageDb(dossierId: string, patch: Partial<ParametrageFinancier>): Promise<void> {
  const map: Record<string, string> = {
    soldeInitialTresorerie: 'solde_initial_tresorerie',
    objectifCaAnnuel: 'objectif_ca_annuel',
    objectifRemunerationMensuelle: 'objectif_remuneration_mensuelle',
    moisSecuriteTresorerie: 'mois_securite_tresorerie',
    objectifTauxMarque: 'objectif_taux_marque',
    seuilChargesFixesPctCa: 'seuil_charges_fixes_pct_ca',
    objectifResultatNetAnnuel: 'objectif_resultat_net_annuel',
    tvaAProvisionner: 'tva_a_provisionner',
    chargesSocialesAProvisionner: 'charges_sociales_a_provisionner',
    impotsAProvisionner: 'impots_a_provisionner',
    securiteTresorerieCible: 'securite_tresorerie_cible',
    investissementsAProvisionner: 'investissements_a_provisionner',
    saisonnaliteAProvisionner: 'saisonnalite_a_provisionner',
  };
  const upd: Record<string, number> = {};
  for (const [k, v] of Object.entries(patch)) if (map[k] && v != null) upd[map[k]] = v as number;
  if (Object.keys(upd).length === 0) return;
  const { error } = await db().from('dossier_parametrage').update(upd).eq('dossier_id', dossierId);
  if (error) throw error;
}

/** Corrige le réalisé d'un mois (une ligne de dossier_pnl) : factures manquantes, compte pas à jour. */
export async function majPnlMoisDb(
  dossierId: string,
  moisIndex: number,
  patch: Partial<LignePnlMensuelle>,
): Promise<void> {
  const map: Record<string, string> = {
    caHt: 'ca_ht',
    achatsMarchandisesMp: 'achats_marchandises_mp',
    autresAchatsChargesExternes: 'autres_achats_charges_externes',
    salairesEtCharges: 'salaires_et_charges',
    impotsEtTaxes: 'impots_et_taxes',
    chargesFinancieres: 'charges_financieres',
    chargesExceptionnelles: 'charges_exceptionnelles',
    amortissements: 'amortissements',
  };
  const upd: Record<string, number> = {};
  for (const [k, v] of Object.entries(patch)) if (map[k] && v != null) upd[map[k]] = v as number;
  if (Object.keys(upd).length === 0) return;
  const { error } = await db()
    .from('dossier_pnl')
    .update(upd)
    .eq('dossier_id', dossierId)
    .eq('mois', moisIndex);
  if (error) throw error;
}

/**
 * Avance un dossier avec une balance cumulée : seul le mois `moisArrete` change (les mois
 * précédents sont figés). On met à jour la ligne P&L et la ligne cash du mois, les créances et le détail.
 */
export async function avancerDossierDb(
  dossierId: string,
  entrees: EntreesMoteur,
  moisArrete: number,
): Promise<void> {
  const s = db();
  const p = entrees.pnl[moisArrete];
  const c = entrees.cash[moisArrete];
  const res = await Promise.all([
    s.from('dossier_pnl').update({
      ca_ht: p.caHt, achats_marchandises_mp: p.achatsMarchandisesMp,
      autres_achats_charges_externes: p.autresAchatsChargesExternes, salaires_et_charges: p.salairesEtCharges,
      impots_et_taxes: p.impotsEtTaxes, charges_financieres: p.chargesFinancieres,
      charges_exceptionnelles: p.chargesExceptionnelles, amortissements: p.amortissements,
    }).eq('dossier_id', dossierId).eq('mois', moisArrete),
    s.from('dossier_cash').update({ encaissements: c.encaissements, decaissements: c.decaissements })
      .eq('dossier_id', dossierId).eq('mois', moisArrete),
    s.from('dossier_parametrage').update({ creances_clients: entrees.creancesClients ?? 0 }).eq('dossier_id', dossierId),
    s.from('dossiers').update({ detail_financier: entrees.detail ?? null, mois_cloture_index: moisArrete }).eq('id', dossierId),
  ]);
  for (const r of res) if (r.error) throw r.error;
}

/** Met à jour le dernier mois clôturé d'un dossier. */
export async function majMoisClotureDb(dossierId: string, moisClotureIndex: number): Promise<void> {
  const { error } = await db().from('dossiers').update({ mois_cloture_index: moisClotureIndex }).eq('id', dossierId);
  if (error) throw error;
}

/** Met à jour la liste des charges fixes mensuelles d'un dossier. */
export async function majChargesFixesDb(dossierId: string, chargesFixes: EntreesMoteur['chargesFixes']): Promise<void> {
  const { error } = await db().from('dossiers').update({ charges_fixes: chargesFixes ?? null }).eq('id', dossierId);
  if (error) throw error;
}

/** Met à jour la date de bilan (clôture) et l'année d'exercice d'un dossier. */
export async function majDateBilanDb(dossierId: string, dateBilan: string, exercice: number): Promise<void> {
  const { error } = await db().from('dossiers').update({ date_bilan: dateBilan || null, exercice: exercice || null }).eq('id', dossierId);
  if (error) throw error;
}

export async function ajouterPrevisionnelDb(
  dossierId: string,
  mv: Omit<MouvementPrevisionnel, 'id'>,
): Promise<MouvementPrevisionnel> {
  const { data, error } = await db()
    .from('previsionnels')
    .insert({
      dossier_id: dossierId, type: mv.type, libelle: mv.libelle, montant_ht: mv.montantHt,
      taux_tva: mv.tauxTva, mois_index: mv.moisIndex, categorie: mv.categorie ?? null,
      mois_encaissement: mv.moisEncaissement ?? null, statut: mv.statut ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapPrevisionnel(data as Record<string, unknown>);
}

export async function supprimerPrevisionnelDb(id: string): Promise<void> {
  const { error } = await db().from('previsionnels').delete().eq('id', id);
  if (error) throw error;
}

export async function ajouterActionDb(
  dossierId: string,
  a: Omit<ActionItem, 'id' | 'statut'>,
): Promise<ActionItem> {
  const { data, error } = await db()
    .from('plan_actions')
    .insert({
      dossier_id: dossierId, action: a.action, responsable: a.responsable,
      echeance: a.echeance, impact: a.impact, statut: 'a_faire',
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapAction(data as Record<string, unknown>);
}

export async function majStatutActionDb(id: string, statut: StatutAction): Promise<void> {
  const { error } = await db().from('plan_actions').update({ statut }).eq('id', id);
  if (error) throw error;
}

/** Met à jour les champs d'une action (responsable, échéance, action, impact, statut). */
export async function majActionDb(id: string, patch: Partial<ActionItem>): Promise<void> {
  const map: Record<string, string> = {
    action: 'action', responsable: 'responsable', echeance: 'echeance', impact: 'impact', statut: 'statut',
  };
  const upd: Record<string, string> = {};
  for (const [k, v] of Object.entries(patch)) if (map[k] && v != null) upd[map[k]] = v as string;
  if (Object.keys(upd).length === 0) return;
  const { error } = await db().from('plan_actions').update(upd).eq('id', id);
  if (error) throw error;
}

export async function supprimerActionDb(id: string): Promise<void> {
  const { error } = await db().from('plan_actions').delete().eq('id', id);
  if (error) throw error;
}
