/**
 * Tests de l'import FEC : parsing, mapping PCG et construction des entrées moteur.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFec, parseMontant, parseDate } from '../src/fec/parse.ts';
import { categoriePourCompte, estTresorerie, estCompteClient } from '../src/fec/mapping.ts';
import { construireEntreesDepuisFec, entreesMoteurDepuisFec } from '../src/fec/build.ts';
import { calculerTableauDeBord } from '../src/index.ts';

const ENTETE = [
  'JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate', 'CompteNum', 'CompteLib',
  'CompAuxNum', 'CompAuxLib', 'PieceRef', 'PieceDate', 'EcritureLib', 'Debit', 'Credit',
  'EcritureLet', 'DateLet', 'ValidDate', 'Montantdevise', 'Idevise',
];

// (journal, num, date, compte, lib, debit, credit)
const L = (j: string, n: string, d: string, cpt: string, lib: string, deb: string, cred: string) =>
  [j, '', n, d, cpt, lib, '', '', 'P' + n, d, lib, deb, cred, '', '', d, '', ''].join('\t');

const FEC = [
  ENTETE.join('\t'),
  // Ouverture : solde de trésorerie 10 000
  L('AN', '1', '20260101', '512000', 'Banque', '10000', ''),
  L('AN', '1', '20260101', '101000', 'Capital', '', '10000'),
  // Janvier — vente TTC 1200 (HT 1000)
  L('VE', '10', '20260115', '411DUP', 'Client Dupont', '1200', ''),
  L('VE', '10', '20260115', '706000', 'Prestations', '', '1000'),
  L('VE', '10', '20260115', '445710', 'TVA collectée', '', '200'),
  // Janvier — encaissement 1200
  L('BQ', '20', '20260120', '512000', 'Banque', '1200', ''),
  L('BQ', '20', '20260120', '411DUP', 'Client Dupont', '', '1200'),
  // Janvier — achat matières premières HT 400
  L('HA', '30', '20260110', '607000', 'Achats marchandises', '400', ''),
  L('HA', '30', '20260110', '445660', 'TVA déductible', '80', ''),
  L('HA', '30', '20260110', '401FOU', 'Fournisseur', '', '480'),
  // Janvier — paiement fournisseur 480
  L('BQ', '40', '20260125', '401FOU', 'Fournisseur', '480', ''),
  L('BQ', '40', '20260125', '512000', 'Banque', '', '480'),
  // Janvier — loyer 100 payé directement
  L('HA', '50', '20260131', '613000', 'Loyers', '100', ''),
  L('HA', '50', '20260131', '512000', 'Banque', '', '100'),
  // Février — salaire 500
  L('OD', '60', '20260228', '641000', 'Rémunérations', '500', ''),
  L('OD', '60', '20260228', '512000', 'Banque', '', '500'),
  // Février — impôt 50
  L('OD', '70', '20260215', '635000', 'Impôts et taxes', '50', ''),
  L('OD', '70', '20260215', '512000', 'Banque', '', '50'),
  // Mars — charge financière 30
  L('BQ', '80', '20260331', '661000', 'Intérêts', '30', ''),
  L('BQ', '80', '20260331', '512000', 'Banque', '', '30'),
  // Mars — vente non encaissée TTC 600 (HT 500)
  L('VE', '90', '20260310', '411MAR', 'Client Martin', '600', ''),
  L('VE', '90', '20260310', '706000', 'Prestations', '', '500'),
  L('VE', '90', '20260310', '445710', 'TVA collectée', '', '100'),
].join('\n');

test('parse — montants et dates', () => {
  assert.equal(parseMontant('1 234,56'), 1234.56);
  assert.equal(parseMontant(''), 0);
  assert.equal(parseMontant('480'), 480);
  assert.deepEqual(parseDate('20260115'), { annee: 2026, moisIndex: 0 });
  assert.deepEqual(parseDate('15/02/2026'), { annee: 2026, moisIndex: 1 });
});

test('mapping — comptes PCG vers catégories', () => {
  assert.equal(categoriePourCompte('706000'), 'caHt');
  assert.equal(categoriePourCompte('607000'), 'achatsMarchandisesMp');
  assert.equal(categoriePourCompte('613000'), 'autresAchatsChargesExternes');
  assert.equal(categoriePourCompte('641000'), 'salairesEtCharges');
  assert.equal(categoriePourCompte('635000'), 'impotsEtTaxes');
  assert.equal(categoriePourCompte('661000'), 'chargesFinancieres');
  assert.equal(estTresorerie('512000'), true);
  assert.equal(estCompteClient('411DUP'), true);
});

test('parse — le FEC synthétique est lu intégralement', () => {
  const ecritures = parseFec(FEC);
  assert.equal(ecritures.length, 23);
  assert.equal(ecritures[0].compteNum, '512000');
  assert.equal(ecritures[0].debit, 10000);
});

test('build — reconstruit le compte de résultat, la trésorerie et les créances', () => {
  const e = construireEntreesDepuisFec(parseFec(FEC));
  assert.equal(e.annee, 2026);
  assert.equal(e.soldeInitialTresorerie, 10000);
  assert.equal(e.creancesClients, 600); // Dupont soldé, Martin dû

  // Janvier
  assert.equal(e.pnl[0].caHt, 1000);
  assert.equal(e.pnl[0].achatsMarchandisesMp, 400);
  assert.equal(e.pnl[0].autresAchatsChargesExternes, 100);
  assert.equal(e.cash[0].encaissements, 1200);
  assert.equal(e.cash[0].decaissements, 580); // 480 fournisseur + 100 loyer

  // Février
  assert.equal(e.pnl[1].salairesEtCharges, 500);
  assert.equal(e.pnl[1].impotsEtTaxes, 50);
  assert.equal(e.cash[1].decaissements, 550);

  // Mars
  assert.equal(e.pnl[2].caHt, 500);
  assert.equal(e.pnl[2].chargesFinancieres, 30);
});

test('build — détail : CA attribué par client et charges triées', () => {
  const e = construireEntreesDepuisFec(parseFec(FEC));

  // Clients : Dupont 1000 HT devant Martin 500 HT (paiement exclu, seule la facture compte).
  assert.equal(e.detail.clients.length, 2);
  assert.equal(e.detail.clients[0].id, '411DUP');
  assert.equal(e.detail.clients[0].caHt, 1000);
  assert.equal(e.detail.clients[1].id, '411MAR');
  assert.equal(e.detail.clients[1].caHt, 500);

  // Charges triées du plus lourd au plus léger ; salaires en tête, achats marqués variables.
  assert.equal(e.detail.charges[0].compte, '641000');
  assert.equal(e.detail.charges[0].montant, 500);
  assert.equal(e.detail.charges[0].fixe, true);
  const achats = e.detail.charges.find((c) => c.compte === '607000');
  assert.equal(achats?.montant, 400);
  assert.equal(achats?.fixe, false);

  // Écritures : chaque poste conserve les lignes qui le composent (voir le détail).
  const loyer = e.detail.charges.find((c) => c.compte === '613000');
  assert.equal(loyer?.ecritures?.length, 1);
  assert.equal(loyer?.ecritures?.[0].montant, 100);
  assert.equal(loyer?.ecritures?.[0].libelle, 'Loyers');
});

test('pipeline — FEC vers tableau de bord complet', () => {
  const { entrees, annee } = entreesMoteurDepuisFec(FEC, { objectifCaAnnuel: 5000 });
  assert.equal(annee, 2026);
  const tdb = calculerTableauDeBord(entrees);
  assert.equal(tdb.pnl.annuel.caHt, 1500); // 1000 + 500
  assert.equal(tdb.pnl.annuel.margeBrute, 1100); // 1500 - 400
  assert.equal(tdb.kpis.creancesClients, 600);
  assert.equal(tdb.kpis.tresorerieDisponible, 10040); // solde à date = solde fin du dernier mois actif (mars)
});
