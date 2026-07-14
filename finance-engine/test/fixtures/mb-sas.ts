/**
 * Fixture de parité : société MB SAS, extraite de l'Excel NAVISCOP Finances v9.
 * Les séries mensuelles ci-dessous sont les valeurs réelles des onglets
 * "Plan de marges" et "Plan de trésorerie". Elles servent à prouver que le
 * moteur TypeScript reproduit exactement les sorties de l'Excel.
 */
import type { LignePnlMensuelle, LigneCashMensuelle } from '../../src/types.ts';

// Séries HT (Plan de marges), Janvier → Décembre.
const caHt = [19475.44, 55559.37, 39989.89, 19233.22, 24798.42, 28164.88, 11105.71, 4182.4, 0, 0, 0, 0];
const achatsMp = [8758.21, 28126.65, 20230.79, 14917.46, 9933.6, 29679.97, 5277.85, 1596, 0, 0, 0, 0];
const aace = [3171.99, 8240.2, 6401.94, 10312.78, 6462.71, 9027.26, 8521.62, 7097.54, 6433.14, 8550.21, 6627.54, 7766.98];
const salaires = [3827.17, 2697.9, 5629.57, 4175.63, 8467.16, 8361.47, 4607.95, 4607.95, 4607.95, 4607.95, 4607.95, 4607.95];
const impotsTaxes = [155, 240, 1238, 155, 3446, 155, 155, 155, 155, 155, 155, 155];
const chargesFin = [156.97, 144.2, 157.06, 488.35, 105.29, 78.83, 77.29, 75.73, 74.18, 72.61, 71.04, 69.46];

// Résultat net mensuel calculé par l'Excel (Plan de marges ligne 105), pour la parité.
export const resultatExcel = [3406.1, 16110.42, 6332.53, -10816.0, -3616.34, -19137.65, -7534.0, -9349.82, -11270.27, -13385.77, -11461.53, -12599.39];

// Séries de trésorerie TTC (Plan de trésorerie), Janvier → Décembre.
const encaissements = [82962.88, 39197.69, 51605.24, 56325.31, 29304.43, 38226.92, 19223.85, 6546.24, 0, 0, 0, 0];
const decaissements = [40950.63, 69078.46, 65335.18, 43233.03, 31357.92, 40794.15, 39187.06, 21306.17, 14752.98, 14183.01, 12260.34, 13666.54];

export const soldeInitial = 49231.8;

// Solde de fin de mois calculé par l'Excel (Plan de trésorerie ligne 114), pour la parité.
export const soldeFinExcel = [91244.05, 61363.28, 47633.34, 60725.61, 58672.13, 56104.89, 36141.68, 21381.76, 6628.78, -7554.23, -19814.57, -33481.11];

// KPI annuels calculés par l'Excel (onglet Analysis), pour le cross-check.
export const kpiExcel = {
  caAnnuel: 202509.32,
  margeBrute: 83988.795,
  resultatNet: -73321.75,
  tresoFinAnnee: -33481.11,
};

export const pnlMbSas: LignePnlMensuelle[] = caHt.map((_, i) => ({
  caHt: caHt[i],
  achatsMarchandisesMp: achatsMp[i],
  autresAchatsChargesExternes: aace[i],
  salairesEtCharges: salaires[i],
  impotsEtTaxes: impotsTaxes[i],
  chargesFinancieres: chargesFin[i],
  chargesExceptionnelles: 0,
  amortissements: 0,
}));

export const cashMbSas: LigneCashMensuelle[] = caHt.map((_, i) => ({
  encaissements: encaissements[i],
  decaissements: decaissements[i],
}));
