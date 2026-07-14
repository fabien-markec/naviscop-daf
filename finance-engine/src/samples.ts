/**
 * Jeu de données de démonstration : société MB SAS, issu de l'Excel NAVISCOP v9.
 * Sert de dossier de démo pour l'application tant que Supabase n'est pas branché.
 */
import type { EntreesMoteur, LignePnlMensuelle, LigneCashMensuelle } from './types.ts';

const caHt = [19475.44, 55559.37, 39989.89, 19233.22, 24798.42, 28164.88, 11105.71, 4182.4, 0, 0, 0, 0];
const achatsMp = [8758.21, 28126.65, 20230.79, 14917.46, 9933.6, 29679.97, 5277.85, 1596, 0, 0, 0, 0];
const aace = [3171.99, 8240.2, 6401.94, 10312.78, 6462.71, 9027.26, 8521.62, 7097.54, 6433.14, 8550.21, 6627.54, 7766.98];
const salaires = [3827.17, 2697.9, 5629.57, 4175.63, 8467.16, 8361.47, 4607.95, 4607.95, 4607.95, 4607.95, 4607.95, 4607.95];
const impotsTaxes = [155, 240, 1238, 155, 3446, 155, 155, 155, 155, 155, 155, 155];
const chargesFin = [156.97, 144.2, 157.06, 488.35, 105.29, 78.83, 77.29, 75.73, 74.18, 72.61, 71.04, 69.46];
const encaissements = [82962.88, 39197.69, 51605.24, 56325.31, 29304.43, 38226.92, 19223.85, 6546.24, 0, 0, 0, 0];
const decaissements = [40950.63, 69078.46, 65335.18, 43233.03, 31357.92, 40794.15, 39187.06, 21306.17, 14752.98, 14183.01, 12260.34, 13666.54];

const pnl: LignePnlMensuelle[] = caHt.map((_, i) => ({
  caHt: caHt[i],
  achatsMarchandisesMp: achatsMp[i],
  autresAchatsChargesExternes: aace[i],
  salairesEtCharges: salaires[i],
  impotsEtTaxes: impotsTaxes[i],
  chargesFinancieres: chargesFin[i],
  chargesExceptionnelles: 0,
  amortissements: 0,
}));

const cash: LigneCashMensuelle[] = caHt.map((_, i) => ({
  encaissements: encaissements[i],
  decaissements: decaissements[i],
}));

export const dossierDemoMbSas: EntreesMoteur = {
  parametrage: {
    soldeInitialTresorerie: 49231.8,
    objectifCaAnnuel: 500000,
    objectifRemunerationMensuelle: 4000,
    moisSecuriteTresorerie: 2,
    objectifTauxMarque: 0.45,
    seuilChargesFixesPctCa: 0.3,
    objectifResultatNetAnnuel: 0,
  },
  pnl,
  cash,
  creancesClients: 42000,
};

export const nomDossierDemo = 'MB SAS';
