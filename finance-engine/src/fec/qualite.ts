/**
 * Contrôle qualité du FEC à l'import : fraîcheur (dernière écriture) et cohérence
 * mensuelle (détection d'un mois au CA anormalement bas → écritures manquantes).
 */
import type { EcritureFec } from './types.ts';
import { MOIS } from '../types.ts';
import { estJournalOuverture } from './mapping.ts';

export interface MessageQualiteFec {
  niveau: 'info' | 'attention';
  texte: string;
}

export interface DiagnosticFec {
  anneeExercice: number;
  dernierMoisActif: number | null;
  /** Indices des mois jugés incomplets (CA anormalement bas ou vide). */
  moisSuspects: number[];
  messages: MessageQualiteFec[];
}

function chiffres(compteNum: string): string {
  return compteNum.replace(/\D/g, '');
}

function eur(n: number): string {
  return `${Math.round(n).toLocaleString('fr-FR')} €`;
}

/**
 * @param ref date de référence (aujourd'hui) pour juger la fraîcheur — optionnelle.
 */
export function diagnostiquerFec(
  ecritures: EcritureFec[],
  ref?: { annee: number; moisIndex: number },
): DiagnosticFec {
  const caParMois = new Array(12).fill(0);
  const nbParMois = new Array(12).fill(0);
  const compteAnnees: Record<number, number> = {};

  for (const e of ecritures) {
    if (estJournalOuverture(e.journalCode)) continue;
    if (e.annee) compteAnnees[e.annee] = (compteAnnees[e.annee] || 0) + 1;
    const m = e.moisIndex;
    if (m < 0 || m > 11) continue;
    nbParMois[m] += 1;
    if (chiffres(e.compteNum).startsWith('70')) caParMois[m] += e.credit - e.debit;
  }

  const anneeExercice = Number(
    Object.entries(compteAnnees).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0,
  );

  const actifs: number[] = [];
  for (let i = 0; i < 12; i++) if (nbParMois[i] > 0) actifs.push(i);

  if (actifs.length === 0) {
    return {
      anneeExercice,
      dernierMoisActif: null,
      moisSuspects: [],
      messages: [{ niveau: 'attention', texte: 'Aucune écriture datée exploitable dans ce fichier.' }],
    };
  }

  const premier = actifs[0];
  const dernier = actifs[actifs.length - 1];
  const messages: MessageQualiteFec[] = [];
  const moisSuspects: number[] = [];

  // Médiane du CA sur les mois actifs, hors dernier mois (souvent partiel).
  const caPourMediane = actifs
    .filter((i) => i !== dernier)
    .map((i) => caParMois[i])
    .filter((v) => v > 0)
    .sort((a, b) => a - b);
  const median = caPourMediane.length ? caPourMediane[Math.floor(caPourMediane.length / 2)] : 0;

  // Trous et creux anormaux dans la plage d'activité.
  for (let m = premier; m <= dernier; m++) {
    if (nbParMois[m] === 0) {
      moisSuspects.push(m);
      messages.push({
        niveau: 'attention',
        texte: `Aucune écriture en ${MOIS[m]}, alors qu'il y a de l'activité avant et après. Il manque probablement des écritures sur ce mois.`,
      });
    } else if (m !== dernier && median > 0 && caParMois[m] < 0.4 * median) {
      moisSuspects.push(m);
      messages.push({
        niveau: 'attention',
        texte: `Le chiffre d'affaires de ${MOIS[m]} (${eur(caParMois[m])}) est très inférieur aux autres mois (médiane ${eur(median)}). Le FEC semble incomplet sur ce mois.`,
      });
    }
  }

  // Dernier mois potentiellement partiel.
  if (median > 0 && caParMois[dernier] >= 0 && caParMois[dernier] < 0.5 * median) {
    messages.push({
      niveau: 'info',
      texte: `Le dernier mois (${MOIS[dernier]}) semble partiel : son chiffre d'affaires est plus faible. C'est normal s'il est en cours.`,
    });
  }

  // Fraîcheur.
  if (ref && anneeExercice === ref.annee) {
    const manque = ref.moisIndex - dernier;
    if (manque >= 2) {
      messages.push({
        niveau: 'attention',
        texte: `Les données s'arrêtent en ${MOIS[dernier]}. Il manque environ ${manque} mois pour être à jour (nous sommes en ${MOIS[ref.moisIndex]}).`,
      });
    } else {
      messages.push({ niveau: 'info', texte: `Données à jour : dernière écriture en ${MOIS[dernier]}.` });
    }
  } else if (ref && anneeExercice > 0 && anneeExercice < ref.annee) {
    messages.push({ niveau: 'info', texte: `Exercice clos ${anneeExercice} (dernière écriture en ${MOIS[dernier]}).` });
  }

  return { anneeExercice, dernierMoisActif: dernier, moisSuspects, messages };
}
