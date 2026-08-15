/**
 * Le cash réellement disponible (pilier 1 de NAVISCOP).
 *
 * Le solde bancaire montre l'argent présent. Il ne montre pas l'argent utilisable
 * sans danger : une partie est déjà due (TVA, URSSAF, impôts), une autre couvre les
 * charges du mois à venir, la rémunération du dirigeant et une sécurité de trésorerie.
 * Ce module part du solde bancaire et déduit ces engagements pour ne garder que le
 * cash réellement disponible.
 */
import type { EntreesMoteur } from './types.ts';
import { calculerPnl } from './pnl.ts';

/** Une ligne de la cascade (un engagement déduit du solde bancaire). */
export interface LigneCashDisponible {
  libelle: string;
  montant: number;
  /** true = le montant est saisi à la main, false = estimé par le moteur. */
  saisi: boolean;
}

export interface CashDisponible {
  /** Solde bancaire à date. */
  soldeBancaire: number;
  /** Engagements à déduire (montants positifs). */
  deductions: LigneCashDisponible[];
  /** Total des engagements. */
  totalEngage: number;
  /** Cash réellement disponible = solde bancaire − engagements. */
  cashDisponible: number;
}

const r = (n: number) => Math.round(n);

export function calculerCashDisponible(entrees: EntreesMoteur): CashDisponible {
  const p = entrees.parametrage;
  const pnl = calculerPnl(entrees.pnl);

  const soldeBancaire = r(p.soldeInitialTresorerie);
  const chargesFixesMois = pnl.annuel.chargesFixesTotales / 12;

  const deductions: LigneCashDisponible[] = [
    { libelle: 'TVA à provisionner', montant: r(p.tvaAProvisionner ?? 0), saisi: true },
    { libelle: 'URSSAF / charges sociales', montant: r(p.chargesSocialesAProvisionner ?? 0), saisi: true },
    { libelle: 'Impôts à venir', montant: r(p.impotsAProvisionner ?? 0), saisi: true },
    { libelle: 'Charges fixes du mois à venir', montant: r(chargesFixesMois), saisi: false },
    { libelle: 'Rémunération minimale dirigeant', montant: r(p.objectifRemunerationMensuelle || 0), saisi: true },
    { libelle: 'Sécurité de trésorerie', montant: r(p.securiteTresorerieCible ?? 0), saisi: true },
    { libelle: 'Investissements à venir', montant: r(p.investissementsAProvisionner ?? 0), saisi: true },
    { libelle: 'Saisonnalité / périodes creuses', montant: r(p.saisonnaliteAProvisionner ?? 0), saisi: true },
  ].filter((d) => d.montant !== 0);

  const totalEngage = deductions.reduce((acc, d) => acc + d.montant, 0);
  return {
    soldeBancaire,
    deductions,
    totalEngage,
    cashDisponible: soldeBancaire - totalEngage,
  };
}
