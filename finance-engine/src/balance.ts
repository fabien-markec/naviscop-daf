/**
 * Import d'une BALANCE comptable (alternative au FEC).
 *
 * Une balance donne le solde par compte sur une période, sans le détail des écritures
 * ni la ventilation mensuelle. On reconstruit donc :
 *  - le compte de résultat annuel (classes 6 et 7), réparti à plat sur 12 mois ;
 *  - les créances clients (solde 411) et le solde de trésorerie (comptes 5) ;
 *  - le détail des charges par poste (un poste = un compte de classe 6).
 * La trésorerie mensuelle est approchée (lissée) faute de dates : à affiner avec un FEC.
 */
import type {
  EntreesMoteur,
  LignePnlMensuelle,
  LigneCashMensuelle,
  ParametrageFinancier,
  DetailFinancier,
  PosteCharge,
} from './types.ts';
import { parseMontant } from './fec/parse.ts';
import { categoriePourCompte, estTresorerie, estCompteClient } from './fec/mapping.ts';

export interface LigneBalance {
  compteNum: string;
  compteLib: string;
  /** Solde net : débit − crédit (positif = débiteur). */
  soldeNet: number;
}

function normaliser(nom: string): string {
  return nom.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
}

function detecterSeparateur(entete: string): string {
  const candidats = ['\t', ';', ',', '|'];
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

/** Parse une balance en lignes {compte, libellé, solde net débiteur}. */
export function parseBalance(contenu: string): LigneBalance[] {
  const lignes = contenu.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
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

  const iCompte = col('comptenum', 'compte', 'numerodecompte', 'numero', 'ncompte', 'numcompte');
  const iLib = col('comptelib', 'libelle', 'intitule', 'libellecompte', 'nom');
  const iSoldeDeb = col('soldedebiteur', 'soldedebit', 'soldedb');
  const iSoldeCred = col('soldecrediteur', 'soldecredit', 'soldecr');
  const iDebit = col('debit', 'totaldebit', 'mouvementdebit', 'debitcumule');
  const iCredit = col('credit', 'totalcredit', 'mouvementcredit', 'creditcumule');
  const iSolde = col('solde', 'soldenet');

  const out: LigneBalance[] = [];
  for (let l = 1; l < lignes.length; l++) {
    const champs = lignes[l].split(sep);
    const get = (i: number) => (i >= 0 && i < champs.length ? champs[i].trim() : '');
    const compteNum = get(iCompte);
    if (!compteNum) continue;

    let soldeNet = 0;
    if (iSoldeDeb >= 0 || iSoldeCred >= 0) {
      soldeNet = parseMontant(get(iSoldeDeb)) - parseMontant(get(iSoldeCred));
    } else if (iDebit >= 0 || iCredit >= 0) {
      soldeNet = parseMontant(get(iDebit)) - parseMontant(get(iCredit));
    } else if (iSolde >= 0) {
      soldeNet = parseMontant(get(iSolde)); // signé : positif = débiteur
    }
    out.push({ compteNum, compteLib: get(iLib), soldeNet });
  }
  return out;
}

export interface EntreesDepuisBalance {
  pnl: LignePnlMensuelle[];
  cash: LigneCashMensuelle[];
  creancesClients: number;
  soldeInitialTresorerie: number;
  detail: DetailFinancier;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Catégories de charges (classe 6), pour figer et cumuler mois par mois. */
const CATEGORIES: (keyof LignePnlMensuelle)[] = [
  'caHt', 'achatsMarchandisesMp', 'autresAchatsChargesExternes', 'salairesEtCharges',
  'impotsEtTaxes', 'chargesFinancieres', 'chargesExceptionnelles', 'amortissements',
];

/** Totaux (cumulés) d'une balance : par catégorie, créances, trésorerie et postes de charges. */
export interface TotauxBalance {
  pnl: LignePnlMensuelle;
  creancesClients: number;
  soldeTresorerie: number;
  charges: PosteCharge[];
}

export function totauxBalance(lignes: LigneBalance[]): TotauxBalance {
  const pnl: LignePnlMensuelle = {
    caHt: 0, achatsMarchandisesMp: 0, autresAchatsChargesExternes: 0, salairesEtCharges: 0,
    impotsEtTaxes: 0, chargesFinancieres: 0, chargesExceptionnelles: 0, amortissements: 0,
  };
  let creancesClients = 0;
  let soldeTresorerie = 0;
  const chargesMap = new Map<string, PosteCharge>();

  for (const e of lignes) {
    if (estCompteClient(e.compteNum)) creancesClients += e.soldeNet;
    if (estTresorerie(e.compteNum)) soldeTresorerie += e.soldeNet;

    const cat = categoriePourCompte(e.compteNum);
    switch (cat) {
      case 'caHt':
      case 'autresProduits':
        pnl.caHt += -e.soldeNet; // produits = créditeurs
        break;
      case 'achatsMarchandisesMp': pnl.achatsMarchandisesMp += e.soldeNet; break;
      case 'autresAchatsChargesExternes': pnl.autresAchatsChargesExternes += e.soldeNet; break;
      case 'salairesEtCharges': pnl.salairesEtCharges += e.soldeNet; break;
      case 'impotsEtTaxes': pnl.impotsEtTaxes += e.soldeNet; break;
      case 'chargesFinancieres': pnl.chargesFinancieres += e.soldeNet; break;
      case 'chargesExceptionnelles': pnl.chargesExceptionnelles += e.soldeNet; break;
      case 'amortissements': pnl.amortissements += e.soldeNet; break;
      default: break;
    }

    const estCharge =
      cat === 'achatsMarchandisesMp' || cat === 'autresAchatsChargesExternes' ||
      cat === 'salairesEtCharges' || cat === 'impotsEtTaxes' || cat === 'chargesFinancieres' ||
      cat === 'chargesExceptionnelles' || cat === 'amortissements';
    if (estCharge && e.soldeNet > 0) {
      chargesMap.set(e.compteNum, {
        compte: e.compteNum,
        libelle: e.compteLib || e.compteNum,
        montant: e.soldeNet,
        fixe: cat !== 'achatsMarchandisesMp',
      });
    }
  }

  for (const c of CATEGORIES) pnl[c] = r2(pnl[c]);
  const charges = [...chargesMap.values()].map((p) => ({ ...p, montant: r2(p.montant) })).sort((a, b) => b.montant - a.montant);
  return { pnl, creancesClients: r2(creancesClients), soldeTresorerie: r2(soldeTresorerie), charges };
}

/** Répartit un total sur les `nbMois` premiers mois (le dernier absorbe l'arrondi), reste à 0. */
function repartirSur(annuel: number, nbMois: number): number[] {
  const total = r2(annuel);
  const n = Math.max(1, Math.min(12, nbMois));
  const arr = Array<number>(12).fill(0);
  const base = r2(total / n);
  for (let i = 0; i < n - 1; i++) arr[i] = base;
  arr[n - 1] = r2(total - base * (n - 1));
  return arr;
}

/**
 * Construit les entrées depuis une balance.
 * @param moisArrete Mois d'arrêté (0-11) d'une balance cumulée : le cumulé est réparti sur
 *   les mois écoulés (0..moisArrete), les mois suivants restent à zéro. Défaut : toute l'année.
 */
export function construireEntreesDepuisBalance(lignes: LigneBalance[], moisArrete = 11): EntreesDepuisBalance {
  const t = totauxBalance(lignes);
  const nb = Math.max(1, Math.min(12, moisArrete + 1));
  const rep = (v: number) => repartirSur(v, nb);
  const caR = rep(t.pnl.caHt), achR = rep(t.pnl.achatsMarchandisesMp), aaceR = rep(t.pnl.autresAchatsChargesExternes),
    salR = rep(t.pnl.salairesEtCharges), impR = rep(t.pnl.impotsEtTaxes), finR = rep(t.pnl.chargesFinancieres),
    excR = rep(t.pnl.chargesExceptionnelles), amoR = rep(t.pnl.amortissements);
  const pnl: LignePnlMensuelle[] = Array.from({ length: 12 }, (_, i) => ({
    caHt: caR[i], achatsMarchandisesMp: achR[i], autresAchatsChargesExternes: aaceR[i], salairesEtCharges: salR[i],
    impotsEtTaxes: impR[i], chargesFinancieres: finR[i], chargesExceptionnelles: excR[i], amortissements: amoR[i],
  }));

  const chargesTotales = t.pnl.achatsMarchandisesMp + t.pnl.autresAchatsChargesExternes + t.pnl.salairesEtCharges +
    t.pnl.impotsEtTaxes + t.pnl.chargesFinancieres + t.pnl.chargesExceptionnelles;
  const encR = repartirSur(t.pnl.caHt * 1.2, nb);
  const decR = repartirSur(chargesTotales * 1.2, nb);
  const cash: LigneCashMensuelle[] = Array.from({ length: 12 }, (_, i) => ({ encaissements: encR[i], decaissements: decR[i] }));

  return {
    pnl,
    cash,
    creancesClients: t.creancesClients,
    soldeInitialTresorerie: t.soldeTresorerie,
    detail: { charges: t.charges, clients: [] },
  };
}

/**
 * Avance un dossier avec une balance CUMULÉE arrêtée au mois `moisArrete` (0-11), façon logiciel comptable.
 * Les mois AVANT `moisArrete` sont figés ; `moisArrete` reçoit la différence entre le cumulé importé
 * et le cumulé déjà connu ; les mois SUIVANTS (prévisionnel) sont conservés.
 * La trésorerie du nouveau mois est approchée (une balance ne porte pas les flux datés).
 */
export function appliquerBalanceCumulee(
  actuel: EntreesMoteur,
  contenuBalance: string,
  moisArrete: number,
): EntreesMoteur {
  const m = Math.max(0, Math.min(11, moisArrete));
  const t = totauxBalance(parseBalance(contenuBalance));
  const pnl = actuel.pnl.map((x) => ({ ...x }));

  for (const c of CATEGORIES) {
    let cumulPrecedent = 0;
    for (let i = 0; i < m; i++) cumulPrecedent += pnl[i][c];
    pnl[m][c] = r2(t.pnl[c] - cumulPrecedent);
  }

  const cash = actuel.cash.map((x) => ({ ...x }));
  const chargesMois = pnl[m].achatsMarchandisesMp + pnl[m].autresAchatsChargesExternes + pnl[m].salairesEtCharges +
    pnl[m].impotsEtTaxes + pnl[m].chargesFinancieres + pnl[m].chargesExceptionnelles;
  cash[m] = { encaissements: r2(pnl[m].caHt * 1.2), decaissements: r2(chargesMois * 1.2) };

  return {
    ...actuel,
    pnl,
    cash,
    creancesClients: t.creancesClients,
    detail: { charges: t.charges, clients: actuel.detail?.clients ?? [] },
  };
}

/** Chaîne complète : contenu balance → entrées moteur. */
export function entreesMoteurDepuisBalance(
  contenu: string,
  parametrage: Partial<ParametrageFinancier> = {},
  moisArrete = 11,
): { entrees: EntreesMoteur } {
  const bal = construireEntreesDepuisBalance(parseBalance(contenu), moisArrete);
  const param: ParametrageFinancier = {
    soldeInitialTresorerie: bal.soldeInitialTresorerie,
    objectifCaAnnuel: 0,
    objectifRemunerationMensuelle: 0,
    moisSecuriteTresorerie: 2,
    objectifTauxMarque: 0.3,
    seuilChargesFixesPctCa: 0.3,
    objectifResultatNetAnnuel: 0,
    ...parametrage,
  };
  return {
    entrees: { parametrage: param, pnl: bal.pnl, cash: bal.cash, creancesClients: bal.creancesClients, detail: bal.detail },
  };
}
