/**
 * Moteur financier NAVISCOP — point d'entrée.
 *
 * Reproduit la logique de l'outil Excel NAVISCOP Finances v9 :
 *  - plan de trésorerie 12 mois (TTC)
 *  - compte de résultat / plan de marges (HT)
 *  - 11 KPI essentiels
 *  - règles d'alerte
 *  - scénarios de projection
 *
 * Aucune dépendance externe, aucune I/O : 100 % testable.
 */
export * from './types.ts';
export * from './pnl.ts';
export * from './cashflow.ts';
export * from './kpi.ts';
export * from './cash-disponible.ts';
export * from './remuneration.ts';
export * from './synthese.ts';
export * from './alerts.ts';
export * from './scenarios.ts';
export * from './samples.ts';
export * from './fec/index.ts';
export * from './balance.ts';
export * from './analyse/daf.ts';
export * from './previsionnel.ts';
export * from './profil-fiscal.ts';

import type { EntreesMoteur } from './types.ts';
import { calculerPnl } from './pnl.ts';
import { calculerTresorerie } from './cashflow.ts';
import { calculerKpis } from './kpi.ts';
import { calculerCashDisponible } from './cash-disponible.ts';
import { evaluerAlertes } from './alerts.ts';

/** Calcule tout le tableau de bord d'un dossier en une passe. */
export function calculerTableauDeBord(entrees: EntreesMoteur, moisClotureIndex = -1) {
  return {
    pnl: calculerPnl(entrees.pnl),
    tresorerie: calculerTresorerie(entrees.parametrage.soldeInitialTresorerie, entrees.cash),
    kpis: calculerKpis(entrees),
    cashDisponible: calculerCashDisponible(entrees),
    alertes: evaluerAlertes(entrees, moisClotureIndex),
  };
}
