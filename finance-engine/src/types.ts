/**
 * Types du moteur financier NAVISCOP.
 *
 * Principe fondamental (cf. cahier des charges p.9) :
 *  - Le PLAN DE TRÉSORERIE raisonne en flux réels TTC (encaissements / décaissements datés).
 *  - Le COMPTE DE RÉSULTAT (plan de marges) raisonne en engagement HT (facturation).
 * Les deux ne se mélangent jamais.
 *
 * Toutes les séries mensuelles sont des tableaux de 12 nombres (Janvier → Décembre).
 */

export const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
] as const;

export type Mois = (typeof MOIS)[number];

/** Série de 12 valeurs mensuelles. */
export type Serie12 = readonly number[];

/** Une ligne mensuelle du compte de résultat (en HT). */
export interface LignePnlMensuelle {
  /** Chiffre d'affaires HT du mois. */
  caHt: number;
  /** Achats de marchandises et de matières premières (coûts directs). */
  achatsMarchandisesMp: number;
  /** Autres achats et charges externes (AACE). */
  autresAchatsChargesExternes: number;
  /** Salaires + charges sociales + rémunération dirigeant. */
  salairesEtCharges: number;
  /** Impôts et taxes (hors IS). */
  impotsEtTaxes: number;
  /** Charges financières. */
  chargesFinancieres: number;
  /** Charges exceptionnelles. */
  chargesExceptionnelles: number;
  /** Dotations aux amortissements et provisions (DAP). */
  amortissements: number;
}

/** Un mois de flux de trésorerie (en TTC). */
export interface LigneCashMensuelle {
  encaissements: number;
  decaissements: number;
}

/** Paramétrage financier du dossier (onglet Paramètres + section 12 du CdC). */
export interface ParametrageFinancier {
  soldeInitialTresorerie: number;
  objectifCaAnnuel: number;
  objectifRemunerationMensuelle: number;
  /** Nombre de mois de décaissement moyen à garder en sécurité (défaut 2). */
  moisSecuriteTresorerie: number;
  /** Objectif de taux de marque (marge brute / CA), ex 0.4 pour 40 %. */
  objectifTauxMarque: number;
  /** Seuil au-delà duquel les charges fixes sont jugées lourdes (% du CA, ex 0.3). */
  seuilChargesFixesPctCa: number;
  /** Objectif de résultat net annuel. */
  objectifResultatNetAnnuel: number;
}

export interface EntreesMoteur {
  parametrage: ParametrageFinancier;
  pnl: LignePnlMensuelle[]; // 12 mois
  cash: LigneCashMensuelle[]; // 12 mois
  /** Créances clients à date (factures émises non encaissées). Optionnel. */
  creancesClients?: number;
}
