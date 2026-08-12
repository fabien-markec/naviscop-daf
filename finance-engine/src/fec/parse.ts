/**
 * Parseur FEC. Gère les pièges réels :
 *  - séparateur tabulation / pipe / point-virgule (détecté sur l'en-tête)
 *  - BOM UTF-8, lignes vides
 *  - montants avec virgule décimale et espaces (« 1 234,56 »)
 *  - dates AAAAMMJJ ou JJ/MM/AAAA
 *  - variante Debit/Credit ou Montant + Sens (D/C)
 */
import type { EcritureFec } from './types.ts';

function detecterSeparateur(entete: string): string {
  const candidats = ['\t', '|', ';'];
  let best = '\t';
  let max = -1;
  for (const sep of candidats) {
    const n = entete.split(sep).length;
    if (n > max) {
      max = n;
      best = sep;
    }
  }
  return best;
}

function normaliser(nom: string): string {
  return nom
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '');
}

export function parseMontant(valeur: string | undefined): number {
  if (!valeur) return 0;
  const nettoye = valeur.trim().replace(/\s/g, '').replace(',', '.');
  if (nettoye === '' || nettoye === '-') return 0;
  const n = Number.parseFloat(nettoye);
  return Number.isFinite(n) ? n : 0;
}

export function parseDate(valeur: string): { annee: number; moisIndex: number } {
  const v = valeur.trim();
  if (/^\d{8}$/.test(v)) {
    // AAAAMMJJ
    return { annee: Number(v.slice(0, 4)), moisIndex: Number(v.slice(4, 6)) - 1 };
  }
  const parts = v.split(/[/\-.]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // AAAA-MM-JJ
      return { annee: Number(parts[0]), moisIndex: Number(parts[1]) - 1 };
    }
    // JJ/MM/AAAA
    return { annee: Number(parts[2]), moisIndex: Number(parts[1]) - 1 };
  }
  return { annee: 0, moisIndex: 0 };
}

/** Parse le contenu texte d'un FEC en écritures structurées. */
export function parseFec(contenu: string): EcritureFec[] {
  const lignes = contenu
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '');
  if (lignes.length < 2) return [];

  const sep = detecterSeparateur(lignes[0]);
  const entete = lignes[0].split(sep).map(normaliser);

  const col = (...noms: string[]) => {
    for (const n of noms) {
      const i = entete.indexOf(n);
      if (i !== -1) return i;
    }
    return -1;
  };

  const iJournal = col('journalcode');
  const iNum = col('ecriturenum');
  const iDate = col('ecrituredate');
  const iCompte = col('comptenum');
  const iCompteLib = col('comptelib');
  const iCompAux = col('compauxnum');
  const iCompAuxLib = col('compauxlib');
  const iLib = col('ecriturelib');
  const iDebit = col('debit');
  const iCredit = col('credit');
  const iMontant = col('montant', 'montantdevise');
  const iSens = col('sens');
  const iLet = col('ecriturelet');

  const ecritures: EcritureFec[] = [];

  for (let l = 1; l < lignes.length; l++) {
    const champs = lignes[l].split(sep);
    const get = (i: number) => (i >= 0 && i < champs.length ? champs[i].trim() : '');

    let debit = 0;
    let credit = 0;
    if (iDebit >= 0 || iCredit >= 0) {
      debit = parseMontant(get(iDebit));
      credit = parseMontant(get(iCredit));
    } else if (iMontant >= 0) {
      const montant = parseMontant(get(iMontant));
      const sens = get(iSens).toUpperCase();
      if (sens.startsWith('C')) credit = Math.abs(montant);
      else debit = Math.abs(montant);
    }

    const { annee, moisIndex } = parseDate(get(iDate));

    ecritures.push({
      journalCode: get(iJournal),
      ecritureNum: get(iNum),
      dateBrute: get(iDate),
      moisIndex,
      annee,
      compteNum: get(iCompte),
      compteLib: get(iCompteLib),
      compAuxNum: get(iCompAux),
      compAuxLib: get(iCompAuxLib),
      libelle: get(iLib),
      debit,
      credit,
      lettrage: get(iLet),
    });
  }

  return ecritures;
}
