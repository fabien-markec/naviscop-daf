/**
 * Plan de trésorerie (TTC) sur 12 mois.
 * Validé en parité exacte contre l'Excel NAVISCOP v9 (voir test/parity.test.ts).
 */
import type { LigneCashMensuelle } from './types.ts';

export interface MoisTresorerie {
  soldeDebut: number;
  encaissements: number;
  decaissements: number;
  variation: number;
  soldeFin: number;
}

export interface PlanTresorerie {
  parMois: MoisTresorerie[];
  /** Index (0-11) du mois où le solde de fin est le plus bas. */
  moisCritiqueIndex: number;
  soldeFinLePlusBas: number;
  soldeFinAnnee: number;
  /** Décaissement mensuel moyen sur les mois où il y a de l'activité. */
  decaissementMensuelMoyen: number;
}

export function calculerTresorerie(
  soldeInitial: number,
  cash: LigneCashMensuelle[],
): PlanTresorerie {
  const parMois: MoisTresorerie[] = [];
  let soldePrecedent = soldeInitial;

  for (const m of cash) {
    const soldeDebut = soldePrecedent;
    const variation = m.encaissements - m.decaissements;
    const soldeFin = soldeDebut + variation;
    parMois.push({
      soldeDebut,
      encaissements: m.encaissements,
      decaissements: m.decaissements,
      variation,
      soldeFin,
    });
    soldePrecedent = soldeFin;
  }

  let moisCritiqueIndex = 0;
  for (let i = 1; i < parMois.length; i++) {
    if (parMois[i].soldeFin < parMois[moisCritiqueIndex].soldeFin) {
      moisCritiqueIndex = i;
    }
  }

  const moisActifs = cash.filter((m) => m.decaissements > 0);
  const decaissementMensuelMoyen =
    moisActifs.length === 0
      ? 0
      : moisActifs.reduce((acc, m) => acc + m.decaissements, 0) / moisActifs.length;

  return {
    parMois,
    moisCritiqueIndex,
    soldeFinLePlusBas: parMois[moisCritiqueIndex].soldeFin,
    soldeFinAnnee: parMois[parMois.length - 1].soldeFin,
    decaissementMensuelMoyen,
  };
}

/** Besoin de trésorerie du mois = seuil de sécurité − solde prévisionnel (si négatif). */
export function besoinTresorerie(soldeFin: number, seuilSecurite: number): number {
  return Math.max(0, seuilSecurite - soldeFin);
}
