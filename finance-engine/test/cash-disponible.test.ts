/**
 * Test du cash réellement disponible (pilier 1), calé sur l'exemple de Michael :
 * 30 000 € en banque, mais seulement 2 000 € réellement disponibles.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculerCashDisponible } from '../src/cash-disponible.ts';
import type { EntreesMoteur, LignePnlMensuelle } from '../src/types.ts';

function pnlAvecChargesFixes(mensuel: number): LignePnlMensuelle[] {
  return Array.from({ length: 12 }, () => ({
    caHt: 0,
    achatsMarchandisesMp: 0,
    autresAchatsChargesExternes: mensuel, // charge fixe
    salairesEtCharges: 0,
    impotsEtTaxes: 0,
    chargesFinancieres: 0,
    chargesExceptionnelles: 0,
    amortissements: 0,
  }));
}

test('cash disponible — exemple Michael : 30 000 € en banque, 2 000 € disponibles', () => {
  const entrees: EntreesMoteur = {
    parametrage: {
      soldeInitialTresorerie: 30000,
      objectifCaAnnuel: 0,
      objectifRemunerationMensuelle: 3000, // rémunération minimale
      moisSecuriteTresorerie: 2,
      objectifTauxMarque: 0,
      seuilChargesFixesPctCa: 0.3,
      objectifResultatNetAnnuel: 0,
      tvaAProvisionner: 6000,
      chargesSocialesAProvisionner: 5000,
      impotsAProvisionner: 3000,
      securiteTresorerieCible: 4000,
    },
    pnl: pnlAvecChargesFixes(7000), // charges fixes mensuelles = 7000
    cash: Array.from({ length: 12 }, () => ({ encaissements: 0, decaissements: 0 })),
  };

  const cd = calculerCashDisponible(entrees);
  assert.equal(cd.soldeBancaire, 30000);
  // 6000 TVA + 5000 URSSAF + 3000 impôts + 7000 charges fixes + 3000 rému + 4000 sécurité = 28000
  assert.equal(cd.totalEngage, 28000);
  assert.equal(cd.cashDisponible, 2000);
  assert.equal(cd.deductions.length, 6);
});

test('cash disponible — les lignes à zéro sont masquées', () => {
  const entrees: EntreesMoteur = {
    parametrage: {
      soldeInitialTresorerie: 10000,
      objectifCaAnnuel: 0,
      objectifRemunerationMensuelle: 0,
      moisSecuriteTresorerie: 0,
      objectifTauxMarque: 0,
      seuilChargesFixesPctCa: 0.3,
      objectifResultatNetAnnuel: 0,
      tvaAProvisionner: 2000,
    },
    pnl: pnlAvecChargesFixes(0),
    cash: Array.from({ length: 12 }, () => ({ encaissements: 0, decaissements: 0 })),
  };
  const cd = calculerCashDisponible(entrees);
  assert.equal(cd.deductions.length, 1); // seule la TVA
  assert.equal(cd.cashDisponible, 8000);
});
