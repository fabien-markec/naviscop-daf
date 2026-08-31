/**
 * Projection fiscale : URSSAF + impôt + TVA selon le statut/régime.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projeterFiscalite, profilFiscalParDefaut, type ProfilFiscal } from '../src/profil-fiscal.ts';
import type { EntreesMoteur, LignePnlMensuelle } from '../src/types.ts';

function pnl(caMensuel: number, achatsMensuel = 0): LignePnlMensuelle[] {
  return Array.from({ length: 12 }, () => ({
    caHt: caMensuel,
    achatsMarchandisesMp: achatsMensuel,
    autresAchatsChargesExternes: 0,
    salairesEtCharges: 0,
    impotsEtTaxes: 0,
    chargesFinancieres: 0,
    chargesExceptionnelles: 0,
    amortissements: 0,
  }));
}

function entrees(caMensuel: number, achatsMensuel = 0, remuMensuelle = 0): EntreesMoteur {
  return {
    parametrage: {
      soldeInitialTresorerie: 0, objectifCaAnnuel: 0, objectifRemunerationMensuelle: remuMensuelle,
      moisSecuriteTresorerie: 0, objectifTauxMarque: 0, seuilChargesFixesPctCa: 0.3, objectifResultatNetAnnuel: 0,
    },
    pnl: pnl(caMensuel, achatsMensuel),
    cash: Array.from({ length: 12 }, () => ({ encaissements: 0, decaissements: 0 })),
  };
}

test('micro BIC presta — URSSAF mensuelle = CA × 21,2 %, sans TVA (franchise)', () => {
  const profil: ProfilFiscal = {
    statutJuridique: 'EI', regimeFiscal: 'MICRO',
    chargesSociales: { periodicite: 'mensuel', natureMicro: 'BIC_PRESTA' },
    impot: { periodicite: 'mensuel', versementLiberatoire: false },
    tva: { assujetti: false, periodicite: 'mensuel', taux: 0.2 },
  };
  const p = projeterFiscalite(entrees(10000), profil);
  assert.equal(p.parMois[0].urssaf, 2120);
  assert.equal(p.annuel.urssaf, 25440); // 10000×0.212×12
  assert.equal(p.annuel.tva, 0);
  assert.equal(p.annuel.impot, 0);
});

test('micro BIC vente — versement libératoire trimestriel', () => {
  const profil: ProfilFiscal = {
    statutJuridique: 'EI', regimeFiscal: 'MICRO',
    chargesSociales: { periodicite: 'trimestriel', natureMicro: 'BIC_VENTE' },
    impot: { periodicite: 'trimestriel', versementLiberatoire: true },
    tva: { assujetti: false, periodicite: 'mensuel', taux: 0.2 },
  };
  const p = projeterFiscalite(entrees(10000), profil);
  // impôt VL 1 % → 100/mois, payé par trimestre = 300 aux mois Mars/Juin/Sept/Déc
  assert.equal(p.parMois[0].impot, 0);
  assert.equal(p.parMois[2].impot, 300);
  assert.equal(p.parMois[5].impot, 300);
  assert.equal(p.annuel.impot, 1200);
  // URSSAF 12,3 % trimestriel : 1230×3 = 3690 par trimestre
  assert.equal(p.parMois[2].urssaf, 3690);
  assert.equal(p.annuel.urssaf, 14760);
});

test('réel IS — TVA mensuelle et cotisations gérant sur rému M-1', () => {
  const profil: ProfilFiscal = {
    statutJuridique: 'SAS_SASU', regimeFiscal: 'REEL_IS',
    chargesSociales: { periodicite: 'mensuel', tauxTnsSurRemuneration: 0.45 },
    impot: { periodicite: 'trimestriel', echeancierManuel: Array(12).fill(0) },
    tva: { assujetti: true, periodicite: 'mensuel', taux: 0.2 },
  };
  const p = projeterFiscalite(entrees(10000, 3000, 3000), profil);
  // TVA = (10000-3000)×0.20 = 1400/mois
  assert.equal(p.parMois[0].tva, 1400);
  assert.equal(p.annuel.tva, 16800);
  // cotisations : 0 en janvier (pas de M-1), puis 3000×0.45 = 1350
  assert.equal(p.parMois[0].urssaf, 0);
  assert.equal(p.parMois[1].urssaf, 1350);
  assert.equal(p.annuel.urssaf, 14850); // 1350×11
});

test('réel IR — échéancier URSSAF et IR saisis à la main', () => {
  const ech = [500, 0, 0, 500, 0, 0, 500, 0, 0, 500, 0, 0];
  const profil: ProfilFiscal = {
    statutJuridique: 'SARL_EURL', regimeFiscal: 'REEL_IR',
    chargesSociales: { periodicite: 'mensuel', echeancierManuel: ech },
    impot: { periodicite: 'mensuel', echeancierManuel: ech },
    tva: { assujetti: false, periodicite: 'mensuel', taux: 0.2 },
  };
  const p = projeterFiscalite(entrees(10000), profil);
  assert.equal(p.parMois[0].urssaf, 500);
  assert.equal(p.parMois[3].impot, 500);
  assert.equal(p.annuel.urssaf, 2000);
  assert.equal(p.annuel.impot, 2000);
});

test('profil par défaut = SASU à l’IS assujettie TVA', () => {
  const d = profilFiscalParDefaut();
  assert.equal(d.statutJuridique, 'SAS_SASU');
  assert.equal(d.regimeFiscal, 'REEL_IS');
  assert.equal(d.tva.assujetti, true);
});
