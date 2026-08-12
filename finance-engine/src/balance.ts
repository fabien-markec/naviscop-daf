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

export function construireEntreesDepuisBalance(lignes: LigneBalance[]): EntreesDepuisBalance {
  const pnlAnnuel: LignePnlMensuelle = {
    caHt: 0, achatsMarchandisesMp: 0, autresAchatsChargesExternes: 0, salairesEtCharges: 0,
    impotsEtTaxes: 0, chargesFinancieres: 0, chargesExceptionnelles: 0, amortissements: 0,
  };
  let creancesClients = 0;
  let soldeInitialTresorerie = 0;
  const chargesMap = new Map<string, PosteCharge>();

  for (const e of lignes) {
    if (estCompteClient(e.compteNum)) creancesClients += e.soldeNet;
    if (estTresorerie(e.compteNum)) soldeInitialTresorerie += e.soldeNet;

    const cat = categoriePourCompte(e.compteNum);
    switch (cat) {
      case 'caHt':
      case 'autresProduits':
        pnlAnnuel.caHt += -e.soldeNet; // produits = créditeurs
        break;
      case 'achatsMarchandisesMp':
        pnlAnnuel.achatsMarchandisesMp += e.soldeNet;
        break;
      case 'autresAchatsChargesExternes':
        pnlAnnuel.autresAchatsChargesExternes += e.soldeNet;
        break;
      case 'salairesEtCharges':
        pnlAnnuel.salairesEtCharges += e.soldeNet;
        break;
      case 'impotsEtTaxes':
        pnlAnnuel.impotsEtTaxes += e.soldeNet;
        break;
      case 'chargesFinancieres':
        pnlAnnuel.chargesFinancieres += e.soldeNet;
        break;
      case 'chargesExceptionnelles':
        pnlAnnuel.chargesExceptionnelles += e.soldeNet;
        break;
      case 'amortissements':
        pnlAnnuel.amortissements += e.soldeNet;
        break;
      default:
        break;
    }

    // Détail des charges par poste (classe 6).
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

  // Répartition à plat sur 12 mois, en préservant le total annuel exact (le 12e mois absorbe l'arrondi).
  const repartir = (annuel: number): number[] => {
    const total = r2(annuel);
    const base = r2(total / 12);
    const arr = Array.from({ length: 11 }, () => base);
    arr.push(r2(total - base * 11));
    return arr;
  };
  const caR = repartir(pnlAnnuel.caHt);
  const achR = repartir(pnlAnnuel.achatsMarchandisesMp);
  const aaceR = repartir(pnlAnnuel.autresAchatsChargesExternes);
  const salR = repartir(pnlAnnuel.salairesEtCharges);
  const impR = repartir(pnlAnnuel.impotsEtTaxes);
  const finR = repartir(pnlAnnuel.chargesFinancieres);
  const excR = repartir(pnlAnnuel.chargesExceptionnelles);
  const amoR = repartir(pnlAnnuel.amortissements);
  const pnl: LignePnlMensuelle[] = Array.from({ length: 12 }, (_, i) => ({
    caHt: caR[i],
    achatsMarchandisesMp: achR[i],
    autresAchatsChargesExternes: aaceR[i],
    salairesEtCharges: salR[i],
    impotsEtTaxes: impR[i],
    chargesFinancieres: finR[i],
    chargesExceptionnelles: excR[i],
    amortissements: amoR[i],
  }));

  // Trésorerie approchée (lissée) : encaissements = CA TTC, décaissements = charges TTC, par mois.
  const chargesTotales =
    pnlAnnuel.achatsMarchandisesMp + pnlAnnuel.autresAchatsChargesExternes + pnlAnnuel.salairesEtCharges +
    pnlAnnuel.impotsEtTaxes + pnlAnnuel.chargesFinancieres + pnlAnnuel.chargesExceptionnelles;
  const cash: LigneCashMensuelle[] = Array.from({ length: 12 }, () => ({
    encaissements: r2((pnlAnnuel.caHt * 1.2) / 12),
    decaissements: r2((chargesTotales * 1.2) / 12),
  }));

  const charges = [...chargesMap.values()].map((p) => ({ ...p, montant: r2(p.montant) })).sort((a, b) => b.montant - a.montant);

  return {
    pnl,
    cash,
    creancesClients: r2(creancesClients),
    soldeInitialTresorerie: r2(soldeInitialTresorerie),
    detail: { charges, clients: [] },
  };
}

/** Chaîne complète : contenu balance → entrées moteur. */
export function entreesMoteurDepuisBalance(
  contenu: string,
  parametrage: Partial<ParametrageFinancier> = {},
): { entrees: EntreesMoteur } {
  const bal = construireEntreesDepuisBalance(parseBalance(contenu));
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
