/**
 * Synthèse mensuelle automatique (section 7 du cahier des charges).
 * Transforme un mois de chiffres en un court commentaire de dirigeant :
 * évolution du CA, tendance de la marge, position de trésorerie et cash réellement disponible.
 */
import type { EntreesMoteur } from './types.ts';
import { MOIS } from './types.ts';
import { calculerPnl, margeBrute } from './pnl.ts';
import { calculerTresorerie } from './cashflow.ts';
import { calculerCashDisponible } from './cash-disponible.ts';

export interface SyntheseMensuelle {
  mois: string;
  moisIndex: number;
  texte: string;
}

function eur(n: number): string {
  return `${Math.round(n).toLocaleString('fr-FR')} €`;
}
function pts(ecartTaux: number): number {
  return Math.round(Math.abs(ecartTaux) * 100);
}
function pct(n: number): string {
  return `${Math.round(n * 100)} %`;
}

/** Dernier mois qui porte de l'activité (CA > 0), pour cadrer la synthèse par défaut. */
export function dernierMoisActif(entrees: EntreesMoteur): number {
  for (let i = 11; i >= 0; i--) if (entrees.pnl[i].caHt > 0) return i;
  return 0;
}

export function synthetiserMois(entrees: EntreesMoteur, moisIndex: number): SyntheseMensuelle {
  const i = Math.max(0, Math.min(11, moisIndex));
  const treso = calculerTresorerie(entrees.parametrage.soldeInitialTresorerie, entrees.cash);
  const cd = calculerCashDisponible(entrees);
  const m = entrees.pnl[i];
  const caMois = m.caHt;
  const tauxMois = caMois > 0 ? margeBrute(m) / caMois : 0;

  const phrases: string[] = [];

  if (i > 0 && entrees.pnl[i - 1].caHt > 0) {
    const caPrec = entrees.pnl[i - 1].caHt;
    const delta = (caMois - caPrec) / caPrec;
    if (delta > 0.05) phrases.push(`Votre chiffre d'affaires progresse ce mois-ci (${eur(caMois)}, +${pct(delta)} par rapport au mois précédent).`);
    else if (delta < -0.05) phrases.push(`Votre chiffre d'affaires recule ce mois-ci (${eur(caMois)}, ${pct(delta)} par rapport au mois précédent).`);
    else phrases.push(`Votre chiffre d'affaires est stable ce mois-ci (${eur(caMois)}).`);

    const tauxPrec = margeBrute(entrees.pnl[i - 1]) / caPrec;
    const dMarge = tauxMois - tauxPrec;
    if (dMarge < -0.02) phrases.push(`En revanche votre marge baisse de ${pts(dMarge)} points : vous gardez moins sur chaque euro facturé. Regardez du côté de vos achats et du temps passé non refacturé.`);
    else if (dMarge > 0.02) phrases.push(`Et votre marge s'améliore (${pct(tauxMois)} de taux de marque).`);
  } else {
    phrases.push(`Chiffre d'affaires du mois : ${eur(caMois)}, avec un taux de marque de ${pct(tauxMois)}.`);
  }

  const solde = treso.parMois[i].soldeFin;
  if (solde < 0) phrases.push(`Point de vigilance : votre trésorerie de fin de mois est négative (${eur(solde)}).`);
  else phrases.push(`Votre trésorerie de fin de mois reste positive (${eur(solde)}).`);

  if (cd.soldeBancaire > 0 && cd.cashDisponible < cd.soldeBancaire * 0.6) {
    phrases.push(`Gardez en tête que votre cash réellement disponible (${eur(cd.cashDisponible)}) est inférieur à votre solde apparent, une fois la TVA, l'URSSAF et vos charges à venir provisionnées.`);
  }

  return { mois: MOIS[i], moisIndex: i, texte: phrases.join(' ') };
}
