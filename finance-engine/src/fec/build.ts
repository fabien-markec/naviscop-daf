/**
 * Construction des entrées du moteur à partir d'un FEC.
 *
 * - Compte de résultat (HT) : classes 7 (produits) et 6 (charges), ventilées par mois.
 * - Trésorerie (TTC) : mouvements des comptes de classe 5 (débit = encaissement, crédit = décaissement).
 * - Solde initial : ouverture des comptes de trésorerie (journal d'à-nouveau).
 * - Créances clients : solde net des comptes 411 en fin de période.
 */
import type { EntreesMoteur, LignePnlMensuelle, LigneCashMensuelle, ParametrageFinancier } from '../types.ts';
import type { EcritureFec } from './types.ts';
import { parseFec } from './parse.ts';
import { categoriePourCompte, estTresorerie, estCompteClient, estJournalOuverture } from './mapping.ts';

export interface EntreesDepuisFec {
  annee: number;
  pnl: LignePnlMensuelle[];
  cash: LigneCashMensuelle[];
  creancesClients: number;
  soldeInitialTresorerie: number;
}

function douze<T>(fabrique: () => T): T[] {
  return Array.from({ length: 12 }, fabrique);
}

export function construireEntreesDepuisFec(ecritures: EcritureFec[]): EntreesDepuisFec {
  const pnl: LignePnlMensuelle[] = douze(() => ({
    caHt: 0,
    achatsMarchandisesMp: 0,
    autresAchatsChargesExternes: 0,
    salairesEtCharges: 0,
    impotsEtTaxes: 0,
    chargesFinancieres: 0,
    chargesExceptionnelles: 0,
    amortissements: 0,
  }));
  const cash: LigneCashMensuelle[] = douze(() => ({ encaissements: 0, decaissements: 0 }));

  let soldeInitialTresorerie = 0;
  let creancesClients = 0;
  let annee = 0;

  for (const e of ecritures) {
    if (e.annee) annee = e.annee;
    const m = e.moisIndex >= 0 && e.moisIndex < 12 ? e.moisIndex : 0;

    // Créances : solde net des comptes clients (y compris ouverture).
    if (estCompteClient(e.compteNum)) {
      creancesClients += e.debit - e.credit;
    }

    // Ouverture d'exercice : alimente le solde initial de trésorerie, hors flux de l'année.
    if (estJournalOuverture(e.journalCode)) {
      if (estTresorerie(e.compteNum)) {
        soldeInitialTresorerie += e.debit - e.credit;
      }
      continue;
    }

    // Trésorerie : débit = argent entrant, crédit = argent sortant.
    if (estTresorerie(e.compteNum)) {
      cash[m].encaissements += e.debit;
      cash[m].decaissements += e.credit;
      continue;
    }

    // Compte de résultat.
    const cat = categoriePourCompte(e.compteNum);
    switch (cat) {
      case 'caHt':
      case 'autresProduits':
        // Produits : soldes créditeurs.
        pnl[m].caHt += e.credit - e.debit;
        break;
      case 'achatsMarchandisesMp':
        pnl[m].achatsMarchandisesMp += e.debit - e.credit;
        break;
      case 'autresAchatsChargesExternes':
        pnl[m].autresAchatsChargesExternes += e.debit - e.credit;
        break;
      case 'salairesEtCharges':
        pnl[m].salairesEtCharges += e.debit - e.credit;
        break;
      case 'impotsEtTaxes':
        pnl[m].impotsEtTaxes += e.debit - e.credit;
        break;
      case 'chargesFinancieres':
        pnl[m].chargesFinancieres += e.debit - e.credit;
        break;
      case 'chargesExceptionnelles':
        pnl[m].chargesExceptionnelles += e.debit - e.credit;
        break;
      case 'amortissements':
        pnl[m].amortissements += e.debit - e.credit;
        break;
      default:
        break; // horsResultat (comptes de bilan hors trésorerie/clients)
    }
  }

  // Arrondi au centime pour éviter les résidus de virgule flottante.
  const r = (n: number) => Math.round(n * 100) / 100;
  for (const p of pnl) {
    p.caHt = r(p.caHt);
    p.achatsMarchandisesMp = r(p.achatsMarchandisesMp);
    p.autresAchatsChargesExternes = r(p.autresAchatsChargesExternes);
    p.salairesEtCharges = r(p.salairesEtCharges);
    p.impotsEtTaxes = r(p.impotsEtTaxes);
    p.chargesFinancieres = r(p.chargesFinancieres);
    p.chargesExceptionnelles = r(p.chargesExceptionnelles);
    p.amortissements = r(p.amortissements);
  }
  for (const c of cash) {
    c.encaissements = r(c.encaissements);
    c.decaissements = r(c.decaissements);
  }

  return { annee, pnl, cash, creancesClients: r(creancesClients), soldeInitialTresorerie: r(soldeInitialTresorerie) };
}

/** Chaîne complète : contenu FEC → entrées prêtes pour le moteur, fusionnées avec le paramétrage. */
export function entreesMoteurDepuisFec(
  contenu: string,
  parametrage: Partial<ParametrageFinancier> = {},
): { entrees: EntreesMoteur; annee: number } {
  const fec = construireEntreesDepuisFec(parseFec(contenu));
  const param: ParametrageFinancier = {
    soldeInitialTresorerie: fec.soldeInitialTresorerie,
    objectifCaAnnuel: 0,
    objectifRemunerationMensuelle: 0,
    moisSecuriteTresorerie: 2,
    objectifTauxMarque: 0.3,
    seuilChargesFixesPctCa: 0.3,
    objectifResultatNetAnnuel: 0,
    ...parametrage,
  };
  return {
    entrees: { parametrage: param, pnl: fec.pnl, cash: fec.cash, creancesClients: fec.creancesClients },
    annee: fec.annee,
  };
}
