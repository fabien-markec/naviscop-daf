/**
 * Capacité de rémunération du dirigeant (pilier 2 de NAVISCOP).
 *
 * Part de l'objectif PERSONNEL du dirigeant et remonte la chaîne :
 *   rémunération souhaitée -> charges sociales -> coût total -> marge nécessaire -> CA minimum.
 * Répond à : combien puis-je me payer durablement ? Quel CA pour me payer davantage ?
 */
import type { EntreesMoteur } from './types.ts';
import { calculerPnl } from './pnl.ts';

/** Taux de charges sociales par défaut (TNS, ordre de grandeur ~45 % de la rémunération nette). */
export const TAUX_CHARGES_SOCIALES_DEFAUT = 0.45;

export interface LigneRemuneration {
  /** Rémunération nette mensuelle visée. */
  remuNetteMensuelle: number;
  /** Coût total mensuel = rémunération + charges sociales. */
  coutTotalMensuel: number;
  /** Finançable dès maintenant avec le cash généré ? */
  financableMaintenant: boolean;
  /** CA annuel actuel. */
  caActuelAnnuel: number;
  /** CA annuel minimum pour financer durablement cette rémunération. */
  caMinimumAnnuel: number;
  /** CA mensuel supplémentaire à générer (0 si déjà finançable). */
  effortCaMensuel: number;
}

export interface CapaciteRemuneration {
  /** Ce que l'activité peut financer en plus, par mois, sans puiser dans la trésorerie (CAF / 12). */
  capaciteActuelleMensuelle: number;
  tauxChargesSociales: number;
  tauxMarge: number;
  caActuelAnnuel: number;
  /** Simulation : rémunération souhaitée puis + 500, + 1 000, + 2 000 par mois. */
  lignes: LigneRemuneration[];
}

function ligne(
  remuNette: number,
  taux: number,
  capaciteActuelle: number,
  caActuel: number,
  tauxMarge: number,
): LigneRemuneration {
  const coutTotal = remuNette * (1 + taux);
  const manqueMensuel = Math.max(0, coutTotal - capaciteActuelle);
  const effortCaMensuel = tauxMarge > 0 ? manqueMensuel / tauxMarge : 0;
  return {
    remuNetteMensuelle: Math.round(remuNette),
    coutTotalMensuel: Math.round(coutTotal),
    financableMaintenant: manqueMensuel <= 0,
    caActuelAnnuel: Math.round(caActuel),
    caMinimumAnnuel: Math.round(caActuel + effortCaMensuel * 12),
    effortCaMensuel: Math.round(effortCaMensuel),
  };
}

export function calculerCapaciteRemuneration(
  entrees: EntreesMoteur,
  remunerationSouhaitee?: number,
  tauxChargesSociales: number = TAUX_CHARGES_SOCIALES_DEFAUT,
): CapaciteRemuneration {
  const pnl = calculerPnl(entrees.pnl);
  const capaciteActuelle = pnl.annuel.caf / 12;
  const caActuel = pnl.annuel.caHt;
  const tauxMarge = pnl.annuel.tauxMarqueBrute;

  const souhaitee =
    remunerationSouhaitee ?? entrees.parametrage.objectifRemunerationMensuelle ?? 0;

  const cibles = [souhaitee, souhaitee + 500, souhaitee + 1000, souhaitee + 2000].filter((v) => v > 0);
  return {
    capaciteActuelleMensuelle: Math.round(capaciteActuelle),
    tauxChargesSociales,
    tauxMarge,
    caActuelAnnuel: Math.round(caActuel),
    lignes: cibles.map((r) => ligne(r, tauxChargesSociales, capaciteActuelle, caActuel, tauxMarge)),
  };
}
