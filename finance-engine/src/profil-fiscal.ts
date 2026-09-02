/**
 * Profil fiscal & social du dossier + projection automatique des charges
 * sociales (URSSAF), de l'impôt (IR/IS) et de la TVA à partir du CA et des
 * charges saisies (compte de résultat mensuel).
 *
 * Principe : le statut juridique + le régime fiscal déterminent COMMENT chaque
 * prélèvement se calcule. Tout est calculé en projection sur les 12 mois, sauf
 * ce que l'entrepreneur doit saisir à la main (échéanciers réel IR / IS).
 *
 * Tous les taux ont une valeur par défaut (barèmes 2025/2026) mais restent
 * éditables dans le formulaire de création du dossier : les taux réels varient.
 */

import type { EntreesMoteur } from './types.ts';
import { calculerTresorerie } from './cashflow.ts';

export type StatutJuridique = 'EI' | 'SARL_EURL' | 'SAS_SASU';
export type RegimeFiscal = 'MICRO' | 'REEL_IR' | 'REEL_IS';
export type Periodicite = 'mensuel' | 'trimestriel' | 'annuel';
/** Nature de l'activité en micro (détermine le taux de cotisations et de versement libératoire). */
export type NatureMicro = 'BIC_VENTE' | 'BIC_PRESTA' | 'BNC';

/** Charges sociales (URSSAF / cotisations). */
export interface ProfilChargesSociales {
  /** Périodicité de paiement (micro et TNS au réel). */
  periodicite: Periodicite;
  /** Nature de l'activité (micro uniquement). */
  natureMicro?: NatureMicro;
  /** Taux de cotisations sociales micro (fraction du CA). Défaut selon la nature. */
  tauxMicroSocial?: number;
  /** Réel (gérant TNS EI/EURL) : taux appliqué à la rémunération de M-1. Défaut 0,45. */
  tauxTnsSurRemuneration?: number;
  /** Réel IR : montants d'échéancier saisis à la main (12 mois). */
  echeancierManuel?: number[];
}

/** Impôt (sur le revenu ou sur les sociétés). */
export interface ProfilImpot {
  /** Périodicité de paiement. */
  periodicite: Periodicite;
  /** Micro : option versement libératoire de l'IR. */
  versementLiberatoire?: boolean;
  /** Taux du versement libératoire (fraction du CA). Défaut selon la nature. */
  tauxVersementLiberatoire?: number;
  /** Réel IR / acomptes IS : montants saisis à la main (12 mois). */
  echeancierManuel?: number[];
}

/** TVA. */
export interface ProfilTva {
  /** Assujetti à la TVA (faux en franchise en base / micro sous les seuils). */
  assujetti: boolean;
  periodicite: Periodicite;
  /** Taux de TVA (défaut 0,20). */
  taux: number;
}

/** Profil fiscal complet d'un dossier. */
export interface ProfilFiscal {
  /** Raison sociale / nom du dossier. */
  raisonSociale?: string;
  /** Nom et prénom du dirigeant. */
  dirigeant?: string;
  statutJuridique: StatutJuridique;
  regimeFiscal: RegimeFiscal;
  chargesSociales: ProfilChargesSociales;
  impot: ProfilImpot;
  tva: ProfilTva;
}

/** Taux de cotisations sociales micro par défaut (URSSAF 2025/2026). */
export const TAUX_MICRO_SOCIAL: Record<NatureMicro, number> = {
  BIC_VENTE: 0.123,
  BIC_PRESTA: 0.212,
  BNC: 0.246,
};

/** Taux de versement libératoire de l'IR par défaut (option micro). */
export const TAUX_VERSEMENT_LIBERATOIRE: Record<NatureMicro, number> = {
  BIC_VENTE: 0.01,
  BIC_PRESTA: 0.017,
  BNC: 0.022,
};

/** Profil fiscal par défaut (SASU à l'IS, TVA mensuelle) — point de départ éditable. */
export function profilFiscalParDefaut(): ProfilFiscal {
  return {
    statutJuridique: 'SAS_SASU',
    regimeFiscal: 'REEL_IS',
    chargesSociales: { periodicite: 'mensuel', tauxTnsSurRemuneration: 0.45 },
    impot: { periodicite: 'trimestriel', echeancierManuel: Array(12).fill(0) },
    tva: { assujetti: true, periodicite: 'mensuel', taux: 0.2 },
  };
}

const r = (n: number) => Math.round(n * 100) / 100;
const MOIS_FIN_TRIMESTRE = new Set([2, 5, 8, 11]); // Mars, Juin, Sept, Déc

/**
 * Répartit une série d'accumulations mensuelles selon la périodicité de paiement.
 *  - mensuel : chaque mois paie son accumulation ;
 *  - trimestriel : l'accumulation du trimestre tombe à la fin du trimestre ;
 *  - annuel : tout tombe en décembre.
 */
function echelonner(accrual: number[], periodicite: Periodicite): number[] {
  if (periodicite === 'mensuel') return accrual.map(r);
  const out = Array(12).fill(0);
  if (periodicite === 'trimestriel') {
    let cumul = 0;
    for (let i = 0; i < 12; i++) {
      cumul += accrual[i];
      if (MOIS_FIN_TRIMESTRE.has(i)) {
        out[i] = r(cumul);
        cumul = 0;
      }
    }
    return out;
  }
  // annuel
  out[11] = r(accrual.reduce((s, v) => s + v, 0));
  return out;
}

export interface ProjectionFiscale {
  /** Montant à payer par mois (aux échéances) pour chaque prélèvement. */
  parMois: { urssaf: number; impot: number; tva: number; total: number }[];
  annuel: { urssaf: number; impot: number; tva: number; total: number };
  /** Provision mensuelle moyenne à mettre de côté (annuel / 12). */
  provisionMensuelle: { urssaf: number; impot: number; tva: number };
}

/**
 * Projette URSSAF + impôt + TVA sur 12 mois à partir du CA et des charges.
 * Les montants saisis à la main (échéanciers réel IR/IS) sont repris tels quels.
 */
export function projeterFiscalite(entrees: EntreesMoteur, profil: ProfilFiscal): ProjectionFiscale {
  const ca = entrees.pnl.map((m) => m.caHt);
  const achats = entrees.pnl.map((m) => m.achatsMarchandisesMp + m.autresAchatsChargesExternes);
  const remuMensuelle = entrees.parametrage.objectifRemunerationMensuelle || 0;

  // ---------- Charges sociales ----------
  let urssafAccrual = Array(12).fill(0);
  if (profil.regimeFiscal === 'MICRO') {
    const nature = profil.chargesSociales.natureMicro ?? 'BIC_PRESTA';
    const taux = profil.chargesSociales.tauxMicroSocial ?? TAUX_MICRO_SOCIAL[nature];
    urssafAccrual = ca.map((c) => c * taux);
  } else if (profil.regimeFiscal === 'REEL_IR') {
    // Gérant TNS : soit un échéancier saisi à la main, soit un taux sur la rémunération.
    if (profil.chargesSociales.echeancierManuel?.some((v) => v > 0)) {
      urssafAccrual = profil.chargesSociales.echeancierManuel.slice(0, 12);
    } else {
      const taux = profil.chargesSociales.tauxTnsSurRemuneration ?? 0.45;
      urssafAccrual = Array(12).fill(remuMensuelle * taux);
    }
  } else {
    // REEL_IS : cotisations du gérant TNS calculées sur la rémunération de M-1.
    const taux = profil.chargesSociales.tauxTnsSurRemuneration ?? 0.45;
    urssafAccrual = Array.from({ length: 12 }, (_, i) => (i === 0 ? 0 : remuMensuelle * taux));
  }
  const urssaf = echelonner(urssafAccrual, profil.chargesSociales.periodicite);

  // ---------- Impôt ----------
  let impotAccrual = Array(12).fill(0);
  if (profil.regimeFiscal === 'MICRO' && profil.impot.versementLiberatoire) {
    const nature = profil.chargesSociales.natureMicro ?? 'BIC_PRESTA';
    const taux = profil.impot.tauxVersementLiberatoire ?? TAUX_VERSEMENT_LIBERATOIRE[nature];
    impotAccrual = ca.map((c) => c * taux);
  }
  // Réel IR / IS (et micro au barème) : échéancier saisi à la main, repris tel quel.
  const echImpot = profil.impot.echeancierManuel;
  const impot =
    profil.regimeFiscal === 'MICRO' && profil.impot.versementLiberatoire
      ? echelonner(impotAccrual, profil.impot.periodicite)
      : echImpot && echImpot.length === 12
        ? echImpot.map(r)
        : Array(12).fill(0);

  // ---------- TVA ----------
  let tva = Array(12).fill(0);
  if (profil.tva.assujetti) {
    const taux = profil.tva.taux || 0.2;
    const tvaAccrual = ca.map((c, i) => Math.max(0, c * taux - achats[i] * taux));
    tva = echelonner(tvaAccrual, profil.tva.periodicite);
  }

  const parMois = urssaf.map((u, i) => {
    const total = r(u + impot[i] + tva[i]);
    return { urssaf: r(u), impot: r(impot[i]), tva: r(tva[i]), total };
  });
  const somme = (arr: number[]) => r(arr.reduce((s, v) => s + v, 0));
  const annuel = {
    urssaf: somme(urssaf),
    impot: somme(impot),
    tva: somme(tva),
    total: somme(parMois.map((m) => m.total)),
  };
  return {
    parMois,
    annuel,
    provisionMensuelle: {
      urssaf: r(annuel.urssaf / 12),
      impot: r(annuel.impot / 12),
      tva: r(annuel.tva / 12),
    },
  };
}

export interface TresorerieFiscale {
  /** Par mois : le prélèvement fiscal projeté et le solde de trésorerie une fois ces prélèvements payés. */
  parMois: { fiscal: number; soldeAvant: number; soldeApres: number }[];
  /** Solde de fin d'année après paiement de tous les prélèvements projetés. */
  soldeFinApres: number;
  /** Solde de fin d'année avant prélèvements (trésorerie de base). */
  soldeFinAvant: number;
  /** Premier mois où la trésorerie après prélèvements passe sous zéro (-1 si jamais). */
  moisNegatifApres: number;
}

/**
 * Superpose les prélèvements fiscaux projetés (URSSAF + impôt + TVA) à la trésorerie de base,
 * pour montrer ce qu'il reste réellement une fois les échéances payées.
 * Les prélèvements ne sont appliqués qu'aux mois NON clôturés (les mois réalisés contiennent
 * déjà leurs paiements réels ; on ne compte donc pas deux fois).
 */
export function tresorerieApresFiscalite(entrees: EntreesMoteur, moisClotureIndex = -1): TresorerieFiscale | null {
  if (!entrees.profilFiscal) return null;
  const treso = calculerTresorerie(entrees.parametrage.soldeInitialTresorerie, entrees.cash);
  const proj = projeterFiscalite(entrees, entrees.profilFiscal);
  let cumulFiscal = 0;
  let moisNegatifApres = -1;
  const parMois = treso.parMois.map((m, i) => {
    const fiscal = i > moisClotureIndex ? proj.parMois[i].total : 0;
    cumulFiscal += fiscal;
    const soldeApres = r(m.soldeFin - cumulFiscal);
    if (moisNegatifApres === -1 && soldeApres < 0) moisNegatifApres = i;
    return { fiscal: r(fiscal), soldeAvant: r(m.soldeFin), soldeApres };
  });
  return {
    parMois,
    soldeFinApres: parMois[11].soldeApres,
    soldeFinAvant: parMois[11].soldeAvant,
    moisNegatifApres,
  };
}
