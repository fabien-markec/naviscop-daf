/**
 * Test du mois de démarrage des scénarios : avant le mois choisi, rien ne change.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appliquerScenario } from '../src/scenarios.ts';
import type { EntreesMoteur } from '../src/types.ts';

function entrees(caMensuel: number): EntreesMoteur {
  return {
    parametrage: {
      soldeInitialTresorerie: 0, objectifCaAnnuel: 0, objectifRemunerationMensuelle: 0,
      moisSecuriteTresorerie: 2, objectifTauxMarque: 0, seuilChargesFixesPctCa: 0.3, objectifResultatNetAnnuel: 0,
    },
    pnl: Array.from({ length: 12 }, () => ({
      caHt: caMensuel, achatsMarchandisesMp: 0, autresAchatsChargesExternes: 0, salairesEtCharges: 0,
      impotsEtTaxes: 0, chargesFinancieres: 0, chargesExceptionnelles: 0, amortissements: 0,
    })),
    cash: Array.from({ length: 12 }, () => ({ encaissements: caMensuel, decaissements: 0 })),
  };
}

test('scénario — hausse de prix à partir d’octobre (index 9)', () => {
  // +10 % de prix à partir d'octobre : sept inchangé, oct/nov/déc à +10 %.
  const res = appliquerScenario(entrees(10000), { variationPrixPct: 0.1, moisDebut: 9 });
  assert.equal(res.parMois[8].caHt, 10000); // septembre : inchangé
  assert.equal(res.parMois[9].caHt, 11000); // octobre : +10 %
  assert.equal(res.parMois[11].caHt, 11000); // décembre : +10 %
});
