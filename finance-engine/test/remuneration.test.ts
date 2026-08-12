/**
 * Test de la capacité de rémunération (pilier 2).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculerCapaciteRemuneration } from '../src/remuneration.ts';
import type { EntreesMoteur, LignePnlMensuelle } from '../src/types.ts';

function entrees(caMensuel: number, achatsMensuel: number, objectifRemu: number): EntreesMoteur {
  const pnl: LignePnlMensuelle[] = Array.from({ length: 12 }, () => ({
    caHt: caMensuel,
    achatsMarchandisesMp: achatsMensuel,
    autresAchatsChargesExternes: 0,
    salairesEtCharges: 0,
    impotsEtTaxes: 0,
    chargesFinancieres: 0,
    chargesExceptionnelles: 0,
    amortissements: 0,
  }));
  return {
    parametrage: {
      soldeInitialTresorerie: 0,
      objectifCaAnnuel: 0,
      objectifRemunerationMensuelle: objectifRemu,
      moisSecuriteTresorerie: 2,
      objectifTauxMarque: 0,
      seuilChargesFixesPctCa: 0.3,
      objectifResultatNetAnnuel: 0,
    },
    pnl,
    cash: Array.from({ length: 12 }, () => ({ encaissements: 0, decaissements: 0 })),
  };
}

test('capacité de rémunération — finançable si le cash couvre le coût total', () => {
  // CA 10000/mois, achats 4000/mois -> marge 6000/mois, résultat = CAF = 6000/mois.
  // Taux marge = 60 %. Capacité actuelle = 6000/mois.
  const r = calculerCapaciteRemuneration(entrees(10000, 4000, 2000), 2000, 0.45);
  assert.equal(r.capaciteActuelleMensuelle, 6000);
  assert.equal(Math.round(r.tauxMarge * 100), 60);
  // Rému 2000 nette -> coût total 2900 <= 6000 -> finançable, pas d'effort de CA.
  const l0 = r.lignes[0];
  assert.equal(l0.remuNetteMensuelle, 2000);
  assert.equal(l0.coutTotalMensuel, 2900);
  assert.equal(l0.financableMaintenant, true);
  assert.equal(l0.effortCaMensuel, 0);
});

test('capacité de rémunération — effort de CA si le coût dépasse la capacité', () => {
  // Capacité actuelle 6000/mois, taux marge 60 %.
  const r = calculerCapaciteRemuneration(entrees(10000, 4000, 5000), 5000, 0.45);
  const l0 = r.lignes[0];
  // Coût total 5000*1.45 = 7250 > 6000 -> manque 1250/mois -> CA sup = 1250/0.6 = 2083/mois.
  assert.equal(l0.coutTotalMensuel, 7250);
  assert.equal(l0.financableMaintenant, false);
  assert.equal(l0.effortCaMensuel, Math.round(1250 / 0.6));
});
