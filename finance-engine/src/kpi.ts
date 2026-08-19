/**
 * Les 11 KPI essentiels (section 9 du cahier des charges).
 */
import type { EntreesMoteur } from './types.ts';
import { calculerPnl } from './pnl.ts';
import { calculerTresorerie } from './cashflow.ts';

export interface Kpis {
  /** 1. Cash disponible à date (solde de fin du mois écoulé, approché par le solde initial en début d'exercice). */
  tresorerieDisponible: number;
  /** 2. Projection du solde à 3 / 6 / 12 mois. */
  tresorerie3Mois: number;
  tresorerie6Mois: number;
  tresorerie12Mois: number;
  /** 3. Marge brute et taux de marque. */
  margeBrute: number;
  tauxMarque: number;
  /** 4. Résultat prévisionnel (annuel). */
  resultatPrevisionnel: number;
  /** 5. Seuil de rentabilité = charges fixes / taux de marge sur coûts variables. */
  seuilRentabilite: number;
  /** 6. Capacité de rémunération : cash annuel généré rapporté au mois. */
  capaciteRemunerationMensuelle: number;
  /** 7. Créances clients (factures émises non encaissées). */
  creancesClients: number;
  /** 8. EBE. */
  excedentBrutExploitation: number;
  /** 9. Cashflow généré sur l'année (CAF). */
  cashflowGenere: number;
  /** 10. Nombre de mois de trésorerie d'avance. */
  moisTresorerieAvance: number;
  /** 11. Atteinte de l'objectif de CA. */
  tauxAtteinteObjectifCa: number;
}

/** Horizon = solde de fin du n-ième mois (1-indexé), borné à 12. */
function soldeAHorizon(soldesFin: number[], nbMois: number): number {
  const idx = Math.min(nbMois, soldesFin.length) - 1;
  return soldesFin[idx] ?? 0;
}

export function calculerKpis(entrees: EntreesMoteur): Kpis {
  const { parametrage: p } = entrees;
  const pnl = calculerPnl(entrees.pnl);
  const treso = calculerTresorerie(p.soldeInitialTresorerie, entrees.cash);
  const soldesFin = treso.parMois.map((m) => m.soldeFin);

  const tmcv = pnl.annuel.tauxMarqueBrute;
  const seuilRentabilite = tmcv === 0 ? 0 : pnl.annuel.chargesFixesTotales / tmcv;

  const tresorerieDisponible = treso.soldeADate;
  const moisTresorerieAvance =
    treso.decaissementMensuelMoyen === 0
      ? 0
      : tresorerieDisponible / treso.decaissementMensuelMoyen;

  return {
    tresorerieDisponible,
    tresorerie3Mois: soldeAHorizon(soldesFin, 3),
    tresorerie6Mois: soldeAHorizon(soldesFin, 6),
    tresorerie12Mois: soldeAHorizon(soldesFin, 12),
    margeBrute: pnl.annuel.margeBrute,
    tauxMarque: tmcv,
    resultatPrevisionnel: pnl.annuel.resultatNet,
    seuilRentabilite,
    capaciteRemunerationMensuelle: pnl.annuel.caf / 12,
    creancesClients: entrees.creancesClients ?? 0,
    excedentBrutExploitation: pnl.annuel.ebe,
    cashflowGenere: pnl.annuel.caf,
    moisTresorerieAvance,
    tauxAtteinteObjectifCa:
      p.objectifCaAnnuel === 0 ? 0 : pnl.annuel.caHt / p.objectifCaAnnuel,
  };
}
