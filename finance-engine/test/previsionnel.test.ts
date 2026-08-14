import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fusionnerPrevisionnels, type MouvementPrevisionnel } from '../src/previsionnel.ts';
import { calculerTableauDeBord } from '../src/index.ts';
import type { EntreesMoteur } from '../src/types.ts';

function baseVide(): EntreesMoteur {
  const mois = <T,>(f: () => T) => Array.from({ length: 12 }, f);
  return {
    parametrage: {
      soldeInitialTresorerie: 10000,
      objectifCaAnnuel: 0,
      objectifRemunerationMensuelle: 0,
      moisSecuriteTresorerie: 2,
      objectifTauxMarque: 0.3,
      seuilChargesFixesPctCa: 0.3,
      objectifResultatNetAnnuel: 0,
    },
    pnl: mois(() => ({
      caHt: 0,
      achatsMarchandisesMp: 0,
      autresAchatsChargesExternes: 0,
      salairesEtCharges: 0,
      impotsEtTaxes: 0,
      chargesFinancieres: 0,
      chargesExceptionnelles: 0,
      amortissements: 0,
    })),
    cash: mois(() => ({ encaissements: 0, decaissements: 0 })),
  };
}

test('prévisionnel — facture à venir alimente CA et encaissements', () => {
  const mv: MouvementPrevisionnel[] = [
    { id: '1', type: 'facture_a_venir', libelle: 'Devis X', montantHt: 1000, tauxTva: 20, moisIndex: 2 },
  ];
  const e = fusionnerPrevisionnels(baseVide(), mv);
  assert.equal(e.pnl[2].caHt, 1000);
  assert.equal(e.cash[2].encaissements, 1200);
  // base non mutée
});

test('prévisionnel — un mois clôturé ignore la prévision (réalisé remplace)', () => {
  const mv: MouvementPrevisionnel[] = [
    { id: '1', type: 'facture_a_venir', libelle: 'Devis mars', montantHt: 1000, tauxTva: 20, moisIndex: 2 },
    { id: '2', type: 'facture_a_venir', libelle: 'Devis mai', montantHt: 2000, tauxTva: 20, moisIndex: 4 },
  ];
  // Clôture jusqu'à mars (index 2) : mars ignoré, mai (futur) conservé.
  const e = fusionnerPrevisionnels(baseVide(), mv, 2);
  assert.equal(e.pnl[2].caHt, 0); // mars clôturé -> prévision ignorée
  assert.equal(e.pnl[4].caHt, 2000); // mai ouvert -> prévision conservée
});

test('prévisionnel — charge prévue et investissement', () => {
  const mv: MouvementPrevisionnel[] = [
    { id: '1', type: 'charge_prevue', libelle: 'Pub', montantHt: 500, tauxTva: 20, moisIndex: 0, categorie: 'autresAchatsChargesExternes' },
    { id: '2', type: 'investissement', libelle: 'Machine', montantHt: 8000, tauxTva: 20, moisIndex: 5 },
  ];
  const e = fusionnerPrevisionnels(baseVide(), mv);
  assert.equal(e.pnl[0].autresAchatsChargesExternes, 500);
  assert.equal(e.cash[0].decaissements, 600);
  // investissement : décaissement sans impact résultat
  assert.equal(e.cash[5].decaissements, 9600);
  assert.equal(e.pnl[5].caHt, 0);
});

test('prévisionnel — n’altère pas les entrées de base', () => {
  const base = baseVide();
  fusionnerPrevisionnels(base, [
    { id: '1', type: 'facture_a_venir', libelle: 'X', montantHt: 999, tauxTva: 20, moisIndex: 0 },
  ]);
  assert.equal(base.pnl[0].caHt, 0);
  assert.equal(base.cash[0].encaissements, 0);
});

test('prévisionnel — tableau de bord recalculé sur les entrées fusionnées', () => {
  const e = fusionnerPrevisionnels(baseVide(), [
    { id: '1', type: 'facture_a_venir', libelle: 'X', montantHt: 5000, tauxTva: 20, moisIndex: 0 },
  ]);
  const tdb = calculerTableauDeBord(e);
  assert.equal(tdb.pnl.annuel.caHt, 5000);
  assert.equal(tdb.tresorerie.parMois[0].soldeFin, 10000 + 6000);
});
