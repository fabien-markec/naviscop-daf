/**
 * Mapping des comptes du Plan Comptable Général (PCG) vers les catégories NAVISCOP.
 * Déterministe : basé sur le préfixe du numéro de compte.
 */

export type CategoriePnl =
  | 'caHt'
  | 'autresProduits'
  | 'achatsMarchandisesMp'
  | 'autresAchatsChargesExternes'
  | 'salairesEtCharges'
  | 'impotsEtTaxes'
  | 'chargesFinancieres'
  | 'chargesExceptionnelles'
  | 'amortissements'
  | 'horsResultat';

/** Ne garde que les chiffres du numéro de compte (les comptes auxiliaires ont des lettres). */
function chiffres(compteNum: string): string {
  return compteNum.replace(/\D/g, '');
}

export function categoriePourCompte(compteNum: string): CategoriePnl {
  const c = chiffres(compteNum);
  const p2 = c.slice(0, 2);
  const p3 = c.slice(0, 3);

  // Classe 7 — produits
  if (p2 === '70') return 'caHt';
  if (c.startsWith('7')) return 'autresProduits';

  // Classe 6 — charges
  if (p3 === '601' || p3 === '602' || p3 === '607') return 'achatsMarchandisesMp';
  if (p2 === '60' || p2 === '61' || p2 === '62' || p2 === '65') return 'autresAchatsChargesExternes';
  if (p2 === '63') return 'impotsEtTaxes';
  if (p2 === '64') return 'salairesEtCharges';
  if (p2 === '66') return 'chargesFinancieres';
  if (p2 === '67') return 'chargesExceptionnelles';
  if (p2 === '68') return 'amortissements';

  return 'horsResultat';
}

/** Comptes de trésorerie : banques (51), caisse (53), régies (54). */
export function estTresorerie(compteNum: string): boolean {
  const c = chiffres(compteNum);
  return c.startsWith('51') || c.startsWith('53') || c.startsWith('54');
}

/** Comptes clients (411) — base des créances. */
export function estCompteClient(compteNum: string): boolean {
  return chiffres(compteNum).startsWith('411');
}

/** Journaux d'à-nouveau (ouverture d'exercice) : à exclure des flux de l'année. */
export function estJournalOuverture(journalCode: string): boolean {
  const j = journalCode.trim().toUpperCase();
  return j.startsWith('AN') || j === 'OUV' || j === 'ANOUV' || j === 'RAN';
}
