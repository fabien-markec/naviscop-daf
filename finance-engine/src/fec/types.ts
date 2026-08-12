/**
 * Types de l'import FEC (Fichier des Écritures Comptables, norme A47 A-1 du LPF).
 * Un seul format, exportable par tous les logiciels comptables → couverture 100 % du marché.
 */

/** Une écriture comptable issue du FEC (une ligne). */
export interface EcritureFec {
  journalCode: string;
  ecritureNum: string;
  /** Date au format brut du fichier. */
  dateBrute: string;
  /** Mois 0-11 (Janvier = 0). */
  moisIndex: number;
  annee: number;
  compteNum: string;
  compteLib: string;
  compAuxNum: string;
  /** Libellé du compte auxiliaire (nom du client / fournisseur). */
  compAuxLib: string;
  libelle: string;
  debit: number;
  credit: number;
  lettrage: string;
}
