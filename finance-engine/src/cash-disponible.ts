/**
 * Le cash réellement disponible à la fin du mois (pilier 1 de NAVISCOP).
 *
 * Principe (retours Michael) : on part du solde bancaire PRÉVISIONNEL à la fin du mois en
 * cours, puis on retranche TOUTES les échéances certaines à venir jusqu'à la fin de
 * l'exercice — pas une moyenne mensuelle. Ce qui reste est le cash réellement disponible :
 *   solde fin de mois − (TVA + URSSAF + impôt + rémunération + charges fixes) des mois suivants.
 */
import type { EntreesMoteur } from './types.ts';
import { calculerTresorerie } from './cashflow.ts';
import { projeterFiscalite } from './profil-fiscal.ts';

/** Une ligne de la cascade (un engagement à venir déduit du solde bancaire). */
export interface LigneCashDisponible {
  libelle: string;
  montant: number;
  /** true = saisi à la main, false = estimé/projeté par le moteur. */
  saisi: boolean;
}

export interface CashDisponible {
  /** Mois de référence (0-11) : « à la fin de ce mois ». */
  moisReference: number;
  /** Solde bancaire prévisionnel à la fin du mois de référence. */
  soldeBancaire: number;
  /** Engagements certains à venir (des mois suivants jusqu'à décembre). */
  deductions: LigneCashDisponible[];
  /** Total des engagements à venir. */
  totalEngage: number;
  /** Cash réellement disponible = solde de fin de mois − engagements à venir. */
  cashDisponible: number;
}

const r = (n: number) => Math.round(n);
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * @param moisReference mois « en cours » (0-11). Défaut : mois calendaire courant.
 * @param soldeOverride force le solde bancaire de fin de mois (sinon pris du plan de trésorerie).
 */
export function calculerCashDisponible(
  entrees: EntreesMoteur,
  moisReference?: number,
  soldeOverride?: number,
): CashDisponible {
  const p = entrees.parametrage;
  const treso = calculerTresorerie(p.soldeInitialTresorerie, entrees.cash);

  const moisRef = clamp(moisReference ?? new Date().getMonth(), 0, 11);
  const soldeBancaire = r(soldeOverride ?? treso.parMois[moisRef].soldeFin);
  const nbMoisRestants = 11 - moisRef; // mois strictement à venir jusqu'à décembre

  // Fiscalité projetée à venir (somme des mois suivants).
  const proj = entrees.profilFiscal ? projeterFiscalite(entrees, entrees.profilFiscal) : null;
  let tvaFutur = 0, urssafFutur = 0, impotFutur = 0;
  if (proj) {
    for (let m = moisRef + 1; m <= 11; m++) {
      tvaFutur += proj.parMois[m].tva;
      urssafFutur += proj.parMois[m].urssaf;
      impotFutur += proj.parMois[m].impot;
    }
  }

  // Rémunération et charges fixes à venir (mensuel × nombre de mois restants).
  // NB : on N'UTILISE PAS pnl.chargesFixesTotales (qui inclut les salaires/rému, déjà comptés
  // dans la ligne « Rémunération à venir ») — uniquement les charges fixes déclarées / saisies « fixe ».
  const remuFutur = (p.objectifRemunerationMensuelle || 0) * nbMoisRestants;
  const chargesFixesMensuel = (entrees.chargesFixes ?? []).reduce((acc, c) => acc + c.montant, 0);
  const chargesFutur = chargesFixesMensuel * nbMoisRestants;

  const deductions: LigneCashDisponible[] = [
    { libelle: 'TVA à venir', montant: r(tvaFutur), saisi: false },
    { libelle: 'URSSAF / charges sociales à venir', montant: r(urssafFutur), saisi: false },
    { libelle: 'Impôts à venir', montant: r(impotFutur), saisi: false },
    { libelle: 'Rémunération à venir', montant: r(remuFutur), saisi: false },
    { libelle: 'Charges fixes à venir', montant: r(chargesFutur), saisi: false },
  ].filter((d) => d.montant !== 0);

  const totalEngage = deductions.reduce((acc, d) => acc + d.montant, 0);
  return {
    moisReference: moisRef,
    soldeBancaire,
    deductions,
    totalEngage,
    cashDisponible: soldeBancaire - totalEngage,
  };
}
