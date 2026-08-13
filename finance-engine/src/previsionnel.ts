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
}

/** Fusionne des mouvements prévisionnels dans une copie des entrées de base. */
export function fusionnerPrevisionnels(
  base: EntreesMoteur,
  mouvements: MouvementPrevisionnel[],
): EntreesMoteur {
  const pnl: LignePnlMensuelle[] = base.pnl.map((m) => ({ ...m }));
  const cash: LigneCashMensuelle[] = base.cash.map((m) => ({ ...m }));

  for (const mv of mouvements) {
    const i = mv.moisIndex;
    if (i < 0 || i > 11) continue;
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
        pnl[i][cat] += mv.montantHt;
        cash[i].decaissements += ttc;
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
