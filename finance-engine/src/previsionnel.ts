/**
 * Saisie prévisionnelle : mouvements futurs saisis à la main (devis en cours,
 * factures à venir, charges prévues, investissements) qui n'existent pas encore
 * dans la comptabilité (le FEC ne contient que le réalisé).
 * Ils se superposent aux entrées de base pour projeter la trésorerie et le résultat.
 */
import type { EntreesMoteur, LignePnlMensuelle, LigneCashMensuelle } from './types.ts';

export type TypePrevisionnel = 'facture_a_venir' | 'charge_prevue' | 'investissement';

export type CategorieCharge =
  | 'achatsMarchandisesMp'
  | 'autresAchatsChargesExternes'
  | 'salairesEtCharges'
  | 'impotsEtTaxes'
  | 'chargesFinancieres';

export interface MouvementPrevisionnel {
  id: string;
  type: TypePrevisionnel;
  libelle: string;
  /** Montant HT (facture, charge) ou montant de l'investissement. */
  montantHt: number;
  /** Taux de TVA en pourcentage (ex 20). */
  tauxTva: number;
  /** Mois concerné, 0-11. Pour une facture à venir : mois de facturation (impact CA). */
  moisIndex: number;
  /** Catégorie de charge (pour type = charge_prevue). */
  categorie?: CategorieCharge;
  /** Mois d'encaissement (0-11), pour une facture à venir. Défaut : le mois de facturation. */
  moisEncaissement?: number;
  /** Statut d'une commande : signée (sûre) ou seulement prévue. */
  statut?: 'signee' | 'prevue';
  /** Charge fixe récurrente : le montant se répète chaque mois du mois de départ jusqu'à décembre. */
  estFixe?: boolean;
  /** Délai de paiement d'une charge en jours (0, 30, 45, 60). Décale le décaissement, pas le résultat. */
  delaiPaiementJours?: number;
}

/** Convertit un délai de paiement (jours) en décalage de mois pour le décaissement. */
function decalageMois(delaiJours = 0): number {
  return Math.round((delaiJours || 0) / 30); // 0j→0, 30j→1, 45j→2 (1,5 arrondi), 60j→2
}

/**
 * Fusionne des mouvements prévisionnels dans une copie des entrées de base.
 * @param moisClotureIndex Dernier mois clôturé (réalisé connu). Les prévisions portant sur un
 *   mois déjà clôturé sont ignorées : le réalisé remplace la prévision, sans double compte.
 */
export function fusionnerPrevisionnels(
  base: EntreesMoteur,
  mouvements: MouvementPrevisionnel[],
  moisClotureIndex = -1,
): EntreesMoteur {
  const pnl: LignePnlMensuelle[] = base.pnl.map((m) => ({ ...m }));
  const cash: LigneCashMensuelle[] = base.cash.map((m) => ({ ...m }));

  for (const mv of mouvements) {
    const i = mv.moisIndex;
    if (i < 0 || i > 11) continue;
    // Mois clôturé : la prévision est remplacée par le réalisé, on ignore le mouvement.
    if (i <= moisClotureIndex) continue;
    const ttc = mv.montantHt * (1 + mv.tauxTva / 100);

    switch (mv.type) {
      case 'facture_a_venir': {
        // CA au mois de facturation, encaissement (TTC) au mois d'encaissement (défaut : facturation).
        pnl[i].caHt += mv.montantHt;
        const j = mv.moisEncaissement ?? i;
        if (j >= 0 && j <= 11) cash[j].encaissements += ttc;
        break;
      }
      case 'charge_prevue': {
        const cat = mv.categorie ?? 'autresAchatsChargesExternes';
        const dec = decalageMois(mv.delaiPaiementJours);
        // Mois d'application : une seule fois, ou chaque mois (charge fixe) du mois de départ à décembre.
        const moisApplication = mv.estFixe ? Array.from({ length: 12 - i }, (_, k) => i + k) : [i];
        for (const m of moisApplication) {
          if (m <= moisClotureIndex) continue;
          pnl[m][cat] += mv.montantHt;
          const p = m + dec;
          if (p >= 0 && p <= 11) cash[p].decaissements += ttc;
        }
        break;
      }
      case 'investissement':
        // Décaissement de trésorerie sans impact sur le résultat (immobilisation).
        cash[i].decaissements += ttc;
        break;
    }
  }

  return { ...base, pnl, cash };
}

/**
 * Pour un dossier à l'IS : reporte automatiquement dans le résultat (rentabilité) la
 * rémunération du dirigeant et ses charges sociales (URSSAF), calculées sur la rémunération.
 * N'affecte que les mois non clôturés (les mois réalisés contiennent déjà les vrais salaires).
 */
export function appliquerCoutDirigeantIS(entrees: EntreesMoteur, moisClotureIndex = -1): EntreesMoteur {
  const p = entrees.profilFiscal;
  const remu = entrees.parametrage.objectifRemunerationMensuelle || 0;
  if (!p || p.regimeFiscal !== 'REEL_IS' || remu <= 0) return entrees;
  const taux = p.chargesSociales.tauxTnsSurRemuneration ?? 0.45;
  const cout = remu + remu * taux; // rémunération + charges sociales patronales/personnelles
  const pnl = entrees.pnl.map((m, i) =>
    i > moisClotureIndex ? { ...m, salairesEtCharges: m.salairesEtCharges + cout } : m,
  );
  return { ...entrees, pnl };
}
