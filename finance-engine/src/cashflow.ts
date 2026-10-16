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
  /** Index du dernier mois avec un mouvement de trésorerie (-1 si aucun). */
  moisADateIndex: number;
  /** Solde de trésorerie à date : solde de fin du dernier mois actif (position actuelle). */
  soldeADate: number;
}

/**
 * Mois (0-11) auquel se rattache le solde initial de trésorerie.
 * Permet de démarrer la saisie en cours d'année : le solde connu est injecté
 * au début de ce mois, les mois antérieurs ne sont pas suivis.
 * Accepte une date ISO 'YYYY-MM-DD' ; vide/invalide → janvier (0).
 */
export function moisDuSolde(dateSoldeInitial?: string): number {
  if (!dateSoldeInitial) return 0;
  const m = /^\d{4}-(\d{2})-\d{2}/.exec(dateSoldeInitial.trim());
  if (!m) return 0;
  const idx = Number(m[1]) - 1;
  return idx >= 0 && idx <= 11 ? idx : 0;
}

export function calculerTresorerie(
  soldeInitial: number,
  cash: LigneCashMensuelle[],
  moisDebut = 0,
): PlanTresorerie {
  const debut = moisDebut >= 0 && moisDebut <= 11 ? moisDebut : 0;
  const parMois: MoisTresorerie[] = [];
  let soldePrecedent = 0;

  for (let i = 0; i < cash.length; i++) {
    const m = cash[i];
    // Avant le mois de départ : pas de suivi de solde (démarrage en cours d'année).
    if (i < debut) {
      parMois.push({ soldeDebut: 0, encaissements: m.encaissements, decaissements: m.decaissements, variation: m.encaissements - m.decaissements, soldeFin: 0 });
      continue;
    }
    const soldeDebut = i === debut ? soldeInitial : soldePrecedent;
    const variation = m.encaissements - m.decaissements;
    const soldeFin = soldeDebut + variation;
    parMois.push({ soldeDebut, encaissements: m.encaissements, decaissements: m.decaissements, variation, soldeFin });
    soldePrecedent = soldeFin;
  }

  let moisCritiqueIndex = debut;
  for (let i = debut + 1; i < parMois.length; i++) {
    if (parMois[i].soldeFin < parMois[moisCritiqueIndex].soldeFin) {
      moisCritiqueIndex = i;
    }
  }

  const moisActifs = cash.filter((m) => m.decaissements > 0);
  const decaissementMensuelMoyen =
    moisActifs.length === 0
      ? 0
      : moisActifs.reduce((acc, m) => acc + m.decaissements, 0) / moisActifs.length;

  let moisADateIndex = -1;
  for (let i = cash.length - 1; i >= 0; i--) {
    if (cash[i].encaissements !== 0 || cash[i].decaissements !== 0) {
      moisADateIndex = i;
      break;
    }
  }
  const soldeADate = moisADateIndex >= 0 ? parMois[moisADateIndex].soldeFin : soldeInitial;

  return {
    parMois,
    moisCritiqueIndex,
    soldeFinLePlusBas: parMois[moisCritiqueIndex].soldeFin,
    soldeFinAnnee: parMois[parMois.length - 1].soldeFin,
    decaissementMensuelMoyen,
    moisADateIndex,
    soldeADate,
  };
}

/** Besoin de trésorerie du mois = seuil de sécurité − solde prévisionnel (si négatif). */
export function besoinTresorerie(soldeFin: number, seuilSecurite: number): number {
  return Math.max(0, seuilSecurite - soldeFin);
}
