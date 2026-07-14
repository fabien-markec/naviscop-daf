/**
 * Règles d'alerte (section 10 du cahier des charges).
 * Les seuils par défaut sont paramétrables via ParametrageFinancier.
 */
import type { EntreesMoteur } from './types.ts';
import { MOIS } from './types.ts';
import { calculerPnl } from './pnl.ts';
import { calculerTresorerie } from './cashflow.ts';

export type NiveauAlerte = 'rouge' | 'orange';

export interface Alerte {
  code: string;
  niveau: NiveauAlerte;
  message: string;
  /** Mois concerné, si l'alerte est datée. */
  mois?: string;
}

export function evaluerAlertes(entrees: EntreesMoteur): Alerte[] {
  const { parametrage: p } = entrees;
  const pnl = calculerPnl(entrees.pnl);
  const treso = calculerTresorerie(p.soldeInitialTresorerie, entrees.cash);
  const alertes: Alerte[] = [];

  const seuilSecurite = p.moisSecuriteTresorerie * treso.decaissementMensuelMoyen;

  // Trésorerie critique : solde prévisionnel négatif.
  if (treso.soldeFinLePlusBas < 0) {
    alertes.push({
      code: 'tresorerie_critique',
      niveau: 'rouge',
      message: `Votre trésorerie devient négative en ${MOIS[treso.moisCritiqueIndex]}.`,
      mois: MOIS[treso.moisCritiqueIndex],
    });
  } else if (treso.soldeFinLePlusBas < seuilSecurite) {
    // Trésorerie fragile : sous le seuil de sécurité.
    alertes.push({
      code: 'tresorerie_fragile',
      niveau: 'orange',
      message: 'Votre marge de sécurité de trésorerie est insuffisante.',
      mois: MOIS[treso.moisCritiqueIndex],
    });
  }

  // Marge insuffisante.
  if (pnl.annuel.tauxMarqueBrute < p.objectifTauxMarque) {
    alertes.push({
      code: 'marge_insuffisante',
      niveau: pnl.annuel.tauxMarqueBrute < p.objectifTauxMarque * 0.75 ? 'rouge' : 'orange',
      message: 'Votre marge est sous l’objectif défini.',
    });
  }

  // Charges fixes lourdes.
  if (
    pnl.annuel.caHt > 0 &&
    pnl.annuel.chargesFixesTotales / pnl.annuel.caHt > p.seuilChargesFixesPctCa
  ) {
    alertes.push({
      code: 'charges_fixes_lourdes',
      niveau: 'orange',
      message: 'Votre structure de charges fixes pèse trop lourd dans votre modèle.',
    });
  }

  // Rémunération insuffisante : capacité de rému annuelle < objectif.
  const remuAnnuelleCible = p.objectifRemunerationMensuelle * 12;
  if (remuAnnuelleCible > 0 && pnl.annuel.caf < remuAnnuelleCible) {
    alertes.push({
      code: 'remuneration_insuffisante',
      niveau: 'orange',
      message: 'Votre activité ne finance pas encore votre rémunération cible.',
    });
  }

  // Rentabilité faible.
  if (pnl.annuel.resultatNet < p.objectifResultatNetAnnuel) {
    alertes.push({
      code: 'rentabilite_faible',
      niveau: 'orange',
      message: 'Votre activité ne dégage pas le résultat attendu.',
    });
  }

  return alertes;
}
