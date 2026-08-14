/**
 * Construction des entrées du moteur à partir d'un FEC.
 *
 * - Compte de résultat (HT) : classes 7 (produits) et 6 (charges), ventilées par mois.
 * - Trésorerie (TTC) : mouvements des comptes de classe 5 (débit = encaissement, crédit = décaissement).
 * - Solde initial : ouverture des comptes de trésorerie (journal d'à-nouveau).
 * - Créances clients : solde net des comptes 411 en fin de période.
 */
import type {
  EntreesMoteur,
  LignePnlMensuelle,
  LigneCashMensuelle,
  ParametrageFinancier,
  DetailFinancier,
  PosteCharge,
  ClientCa,
  EcritureDetail,
} from '../types.ts';
import type { EcritureFec } from './types.ts';
import { parseFec } from './parse.ts';
import { categoriePourCompte, estTresorerie, estCompteClient, estJournalOuverture } from './mapping.ts';

export interface EntreesDepuisFec {
  annee: number;
  pnl: LignePnlMensuelle[];
  cash: LigneCashMensuelle[];
  creancesClients: number;
  soldeInitialTresorerie: number;
  detail: DetailFinancier;
}

/**
 * Détail par compte (charges) et par client (CA), non porté par les 12 lignes agrégées.
 * - Charges : cumul par numéro de compte de classe 6 (fixe si hors coûts directs 601/602/607).
 * - Clients : CA HT attribué en regroupant chaque écriture (ligne 411 débitrice = facture, ligne 70 = CA).
 */
function construireDetail(ecritures: EcritureFec[]): DetailFinancier {
  const r = (n: number) => Math.round(n * 100) / 100;
  const chargesMap = new Map<string, PosteCharge>();
  const parEcriture = new Map<string, { clientId?: string; clientNom?: string; caHt: number }>();

  for (const e of ecritures) {
    if (estJournalOuverture(e.journalCode)) continue;
    const cat = categoriePourCompte(e.compteNum);

    // Postes de charges (classe 6).
    const estCharge =
      cat === 'achatsMarchandisesMp' ||
      cat === 'autresAchatsChargesExternes' ||
      cat === 'salairesEtCharges' ||
      cat === 'impotsEtTaxes' ||
      cat === 'chargesFinancieres' ||
      cat === 'chargesExceptionnelles' ||
      cat === 'amortissements';
    if (estCharge) {
      const p = chargesMap.get(e.compteNum) ?? {
        compte: e.compteNum,
        libelle: e.compteLib || e.compteNum,
        montant: 0,
        fixe: cat !== 'achatsMarchandisesMp',
        ecritures: [] as EcritureDetail[],
      };
      const mouvement = e.debit - e.credit;
      p.montant += mouvement;
      if ((!p.libelle || p.libelle === e.compteNum) && e.compteLib) p.libelle = e.compteLib;
      if (mouvement !== 0) {
        p.ecritures!.push({
          date: e.dateBrute,
          libelle: e.libelle || e.compteLib || '',
          montant: Math.round(mouvement * 100) / 100,
          ref: `${e.journalCode} ${e.ecritureNum}`.trim(),
        });
      }
      chargesMap.set(e.compteNum, p);
    }

    // CA par client : on regroupe les lignes d'une même écriture.
    const cle = `${e.journalCode}|${e.ecritureNum}`;
    let slot = parEcriture.get(cle);
    if (!slot) {
      slot = { caHt: 0 };
      parEcriture.set(cle, slot);
    }
    if (estCompteClient(e.compteNum) && e.debit > 0) {
      slot.clientId = e.compAuxNum || e.compteNum;
      slot.clientNom = e.compAuxLib || e.compAuxNum || e.compteLib || 'Client';
    }
    if (cat === 'caHt' || cat === 'autresProduits') slot.caHt += e.credit - e.debit;
  }

  const clientsMap = new Map<string, ClientCa>();
  for (const s of parEcriture.values()) {
    if (!s.clientId || Math.abs(s.caHt) <= 0.005) continue;
    const c = clientsMap.get(s.clientId) ?? { id: s.clientId, nom: s.clientNom ?? s.clientId, caHt: 0 };
    c.caHt += s.caHt;
    clientsMap.set(s.clientId, c);
  }

  const charges = [...chargesMap.values()]
    .map((p) => ({ ...p, montant: r(p.montant) }))
    .filter((p) => p.montant > 0)
    .sort((a, b) => b.montant - a.montant);
  const clients = [...clientsMap.values()]
    .map((c) => ({ ...c, caHt: r(c.caHt) }))
    .filter((c) => c.caHt > 0)
    .sort((a, b) => b.caHt - a.caHt);

  return { charges, clients };
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

  return {
    annee,
    pnl,
    cash,
    creancesClients: r(creancesClients),
    soldeInitialTresorerie: r(soldeInitialTresorerie),
    detail: construireDetail(ecritures),
  };
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
    entrees: {
      parametrage: param,
      pnl: fec.pnl,
      cash: fec.cash,
      creancesClients: fec.creancesClients,
      detail: fec.detail,
    },
    annee: fec.annee,
  };
}
