/**
 * Test de l'import balance : parsing + reconstruction annuelle répartie sur 12 mois.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBalance, construireEntreesDepuisBalance, entreesMoteurDepuisBalance, appliquerBalanceCumulee } from '../src/balance.ts';
import { calculerTableauDeBord } from '../src/index.ts';
import type { EntreesMoteur } from '../src/types.ts';

const BALANCE = [
  'CompteNum;CompteLib;SoldeDebiteur;SoldeCrediteur',
  '706000;Prestations de services;0;120000',
  '607000;Achats de marchandises;40000;0',
  '613000;Locations;12000;0',
  '641000;Salaires;30000;0',
  '411000;Clients;15000;0',
  '512000;Banque;25000;0',
].join('\n');

test('balance — parsing solde net débiteur', () => {
  const lignes = parseBalance(BALANCE);
  assert.equal(lignes.length, 6);
  const ca = lignes.find((l) => l.compteNum === '706000');
  assert.equal(ca?.soldeNet, -120000); // créditeur
  const achats = lignes.find((l) => l.compteNum === '607000');
  assert.equal(achats?.soldeNet, 40000);
});

test('balance — reconstruction compte de résultat + détail + position', () => {
  const b = construireEntreesDepuisBalance(parseBalance(BALANCE));
  // CA annuel 120000 réparti sur 12 mois = 10000/mois.
  assert.equal(b.pnl[0].caHt, 10000);
  assert.equal(b.pnl[0].achatsMarchandisesMp, Math.round((40000 / 12) * 100) / 100);
  assert.equal(b.creancesClients, 15000);
  assert.equal(b.soldeInitialTresorerie, 25000);
  // Détail des charges : 3 postes, achats en tête (40000), puis salaires (30000).
  assert.equal(b.detail.charges.length, 3);
  assert.equal(b.detail.charges[0].compte, '607000');
  assert.equal(b.detail.charges[0].fixe, false);
  assert.equal(b.detail.charges[1].compte, '641000');
});

test('balance cumulée — mois figés + différence sur le nouveau mois (façon RCA)', () => {
  // Dossier avec Janvier→Juillet à 10 000 de CA (cumul = 70 000), reste à 0.
  const actuel: EntreesMoteur = {
    parametrage: {
      soldeInitialTresorerie: 5000, objectifCaAnnuel: 0, objectifRemunerationMensuelle: 0,
      moisSecuriteTresorerie: 2, objectifTauxMarque: 0, seuilChargesFixesPctCa: 0.3, objectifResultatNetAnnuel: 0,
    },
    pnl: Array.from({ length: 12 }, (_, i) => ({
      caHt: i <= 6 ? 10000 : 0, achatsMarchandisesMp: 0, autresAchatsChargesExternes: 0, salairesEtCharges: 0,
      impotsEtTaxes: 0, chargesFinancieres: 0, chargesExceptionnelles: 0, amortissements: 0,
    })),
    cash: Array.from({ length: 12 }, () => ({ encaissements: 0, decaissements: 0 })),
  };
  // Balance cumulée arrêtée fin août : CA cumulé 82 000 -> août = 82 000 - 70 000 = 12 000.
  const balanceAout = ['CompteNum;CompteLib;SoldeDebiteur;SoldeCrediteur', '706000;Ventes;0;82000'].join('\n');
  const maj = appliquerBalanceCumulee(actuel, balanceAout, 7);

  assert.equal(maj.pnl[6].caHt, 10000); // juillet figé
  assert.equal(maj.pnl[7].caHt, 12000); // août = différence
  assert.equal(maj.pnl[8].caHt, 0); // septembre inchangé (prévisionnel)
});

test('balance — pipeline vers tableau de bord', () => {
  const { entrees } = entreesMoteurDepuisBalance(BALANCE);
  const tdb = calculerTableauDeBord(entrees);
  assert.equal(tdb.pnl.annuel.caHt, 120000);
  // Marge = 120000 - 40000 ; tolérance au centime (somme de 12 mois arrondis).
  assert.ok(Math.abs(tdb.pnl.annuel.margeBrute - 80000) < 0.5, `marge ${tdb.pnl.annuel.margeBrute}`);
  assert.equal(tdb.kpis.creancesClients, 15000);
});
