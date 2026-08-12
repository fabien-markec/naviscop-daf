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
  /** TVA à provisionner (montant à mettre de côté avant échéance). Optionnel. */
  tvaAProvisionner?: number;
  /** URSSAF / charges sociales à provisionner. Optionnel. */
  chargesSocialesAProvisionner?: number;
  /** Impôts à venir à provisionner (IS, CFE...). Optionnel. */
  impotsAProvisionner?: number;
  /** Matelas de sécurité de trésorerie souhaité (montant fixe à conserver). Optionnel. */
  securiteTresorerieCible?: number;
}

/** Un poste de charge détaillé (par compte comptable). */
export interface PosteCharge {
  /** Numéro de compte PCG (ex 613000). */
  compte: string;
  /** Libellé du compte (ex "Locations"). */
  libelle: string;
  /** Montant annuel de la charge. */
  montant: number;
  /** true = charge fixe (structure), false = coût direct/variable. */
  fixe: boolean;
}

/** Un client avec son chiffre d'affaires HT sur la période. */
export interface ClientCa {
  /** Identifiant (compte auxiliaire ou numéro de compte). */
  id: string;
  /** Nom lisible du client. */
  nom: string;
  /** Chiffre d'affaires HT attribué au client. */
  caHt: number;
}

/**
 * Détail financier issu du FEC (au-delà des 12 lignes agrégées).
 * Sert aux blocs "où part l'argent" (top charges) et "dépendance client" (top clients).
 */
export interface DetailFinancier {
  /** Postes de charges par compte, triés du plus lourd au plus léger. */
  charges: PosteCharge[];
  /** Clients par CA HT, triés du plus gros au plus petit. */
  clients: ClientCa[];
}

export interface EntreesMoteur {
  parametrage: ParametrageFinancier;
  pnl: LignePnlMensuelle[]; // 12 mois
  cash: LigneCashMensuelle[]; // 12 mois
  /** Créances clients à date (factures émises non encaissées). Optionnel. */
  creancesClients?: number;
  /** Détail par compte et par client (présent seulement après import FEC). Optionnel. */
  detail?: DetailFinancier;
}
