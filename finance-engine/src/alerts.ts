/**
 * Règles d'alerte (section 10 du cahier des charges).
 * Formulées en langage dirigeant, sans jargon comptable. Les seuils sont paramétrables.
 */
import type { EntreesMoteur } from './types.ts';
import { MOIS } from './types.ts';
import { calculerPnl } from './pnl.ts';
import { calculerTresorerie } from './cashflow.ts';
import { calculerCashDisponible } from './cash-disponible.ts';

export type NiveauAlerte = 'rouge' | 'orange';

export interface Alerte {
  code: string;
  niveau: NiveauAlerte;
  message: string;
  /** Mois concerné, si l'alerte est datée. */
  mois?: string;
}

function eur(n: number): string {
  return `${Math.round(n).toLocaleString('fr-FR')} €`;
}
function pct(n: number): string {
  return `${Math.round(n * 100)} %`;
}

export function evaluerAlertes(entrees: EntreesMoteur): Alerte[] {
  const { parametrage: p } = entrees;
  const pnl = calculerPnl(entrees.pnl);
  const treso = calculerTresorerie(p.soldeInitialTresorerie, entrees.cash);
  const alertes: Alerte[] = [];

  const seuilSecurite = p.moisSecuriteTresorerie * treso.decaissementMensuelMoyen;

  // 1. Trésorerie sous le seuil de sécurité (avec les causes probables).
  if (treso.soldeFinLePlusBas < 0) {
    alertes.push({
      code: 'tresorerie_critique',
      niveau: 'rouge',
      message: `En ${MOIS[treso.moisCritiqueIndex]}, votre trésorerie passe dans le rouge. Les leviers : accélérer vos encaissements, étaler vos charges (TVA, URSSAF), ou lisser vos gros décaissements.`,
      mois: MOIS[treso.moisCritiqueIndex],
    });
  } else if (treso.soldeFinLePlusBas < seuilSecurite) {
    alertes.push({
      code: 'tresorerie_fragile',
      niveau: 'orange',
      message: `Votre matelas de sécurité est mince en ${MOIS[treso.moisCritiqueIndex]}. Un imprévu et la trésorerie se tend. Reconstituez une réserve avant tout nouvel engagement.`,
      mois: MOIS[treso.moisCritiqueIndex],
    });
  }

  // 2. Cash réellement disponible faible malgré un solde bancaire positif.
  const cd = calculerCashDisponible(entrees);
  if (cd.soldeBancaire > 0 && cd.cashDisponible < 0) {
    alertes.push({
      code: 'cash_disponible_faible',
      niveau: 'rouge',
      message: `Votre compte affiche ${eur(cd.soldeBancaire)}, mais une fois vos provisions déduites (TVA, URSSAF, charges), il ne reste rien de réellement disponible. Ne prenez pas cet argent pour du cash libre.`,
    });
  } else if (cd.soldeBancaire > 0 && cd.cashDisponible < cd.soldeBancaire * 0.15) {
    alertes.push({
      code: 'cash_disponible_faible',
      niveau: 'orange',
      message: `Votre solde bancaire est positif, mais votre cash réellement disponible est faible (${eur(cd.cashDisponible)}) après provisions. Prudence avant toute dépense.`,
    });
  }

  // 3. Marge : sous l'objectif, et/ou en baisse alors que le CA monte.
  if (pnl.annuel.tauxMarqueBrute < p.objectifTauxMarque) {
    alertes.push({
      code: 'marge_insuffisante',
      niveau: pnl.annuel.tauxMarqueBrute < p.objectifTauxMarque * 0.75 ? 'rouge' : 'orange',
      message: `Sur chaque euro facturé, vous gardez ${pct(pnl.annuel.tauxMarqueBrute)}, sous votre objectif de ${pct(p.objectifTauxMarque)}. Le problème n'est pas de vendre plus, mais de mieux vendre (prix ou coûts d'achat).`,
    });
  }
  // Tendance : CA en hausse mais marge en baisse (2e semestre vs 1er).
  const som = (arr: typeof entrees.pnl, get: (m: (typeof entrees.pnl)[number]) => number) => arr.reduce((a, m) => a + get(m), 0);
  const h1 = entrees.pnl.slice(0, 6);
  const h2 = entrees.pnl.slice(6);
  const caH1 = som(h1, (m) => m.caHt);
  const caH2 = som(h2, (m) => m.caHt);
  const margeRate = (arr: typeof entrees.pnl) => {
    const ca = som(arr, (m) => m.caHt);
    return ca > 0 ? (ca - som(arr, (m) => m.achatsMarchandisesMp)) / ca : 0;
  };
  if (caH1 > 0 && caH2 > caH1 * 1.02 && margeRate(h2) < margeRate(h1) - 0.02) {
    alertes.push({
      code: 'marge_en_baisse',
      niveau: 'orange',
      message: `Vous vendez plus qu'en début d'année, mais vous gardez moins sur chaque euro facturé. Votre croissance ne se transforme pas en résultat : à surveiller.`,
    });
  }

  // 4. Charges fixes trop lourdes.
  if (pnl.annuel.caHt > 0 && pnl.annuel.chargesFixesTotales / pnl.annuel.caHt > p.seuilChargesFixesPctCa) {
    alertes.push({
      code: 'charges_fixes_lourdes',
      niveau: 'orange',
      message: `Vos charges fixes pèsent ${pct(pnl.annuel.chargesFixesTotales / pnl.annuel.caHt)} de votre chiffre d'affaires. Votre modèle est rigide : chaque euro de charge en moins tombe direct dans votre poche.`,
    });
  }

  // 5. Dépendance à un client (risque commercial).
  const clients = entrees.detail?.clients ?? [];
  const caClients = clients.reduce((a, c) => a + c.caHt, 0);
  if (clients.length > 0 && caClients > 0 && clients[0].caHt / caClients >= 0.35) {
    alertes.push({
      code: 'dependance_client',
      niveau: 'orange',
      message: `${clients[0].nom} représente ${pct(clients[0].caHt / caClients)} de votre chiffre d'affaires. Perdre ce client fragiliserait fortement l'entreprise : sécurisez la relation et développez d'autres comptes.`,
    });
  }

  // Rémunération du dirigeant non finançable.
  const remuAnnuelleCible = p.objectifRemunerationMensuelle * 12;
  if (remuAnnuelleCible > 0 && pnl.annuel.caf < remuAnnuelleCible) {
    alertes.push({
      code: 'remuneration_insuffisante',
      niveau: 'orange',
      message: `Votre activité ne dégage pas encore assez pour financer votre rémunération de ${eur(p.objectifRemunerationMensuelle)} par mois de façon durable.`,
    });
  }

  // Résultat sous l'objectif.
  if (pnl.annuel.resultatNet < p.objectifResultatNetAnnuel) {
    alertes.push({
      code: 'rentabilite_faible',
      niveau: 'orange',
      message: `Votre activité ne dégage pas le résultat attendu (${eur(pnl.annuel.resultatNet)} contre ${eur(p.objectifResultatNetAnnuel)} visés).`,
    });
  }

  return alertes;
}
