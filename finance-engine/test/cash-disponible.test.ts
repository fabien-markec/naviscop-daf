/**
 * Cash réellement disponible à la fin du mois : solde de fin de mois moins toutes les
 * échéances certaines à venir jusqu'à la fin de l'exercice.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculerCashDisponible } from '../src/cash-disponible.ts';
import type { EntreesMoteur, LignePnlMensuelle, ProfilFiscal } from '../src/types.ts';

function pnlVide(): LignePnlMensuelle[] {
  return Array.from({ length: 12 }, () => ({
    caHt: 0, achatsMarchandisesMp: 0, autresAchatsChargesExternes: 0, salairesEtCharges: 0,
    impotsEtTaxes: 0, chargesFinancieres: 0, chargesExceptionnelles: 0, amortissements: 0,
  }));
}

test('cash dispo — solde de fin de mois moins rémunération et charges fixes à venir', () => {
  const entrees: EntreesMoteur = {
    parametrage: {
      soldeInitialTresorerie: 30000, objectifCaAnnuel: 0, objectifRemunerationMensuelle: 3000,
      moisSecuriteTresorerie: 2, objectifTauxMarque: 0, seuilChargesFixesPctCa: 0.3, objectifResultatNetAnnuel: 0,
    },
    pnl: pnlVide(),
    cash: Array.from({ length: 12 }, () => ({ encaissements: 0, decaissements: 0 })),
    chargesFixes: [{ id: '1', libelle: 'Loyer', montant: 7000 }],
  };
  // Positionné fin novembre (index 10) : un seul mois restant (décembre).
  const cd = calculerCashDisponible(entrees, 10);
  assert.equal(cd.soldeBancaire, 30000); // aucun flux → solde inchangé
  // 3000 rému + 7000 charges fixes (décembre) = 10000 à venir
  assert.equal(cd.totalEngage, 10000);
  assert.equal(cd.cashDisponible, 20000);
});

test('cash dispo — les salaires du résultat ne sont PAS comptés comme charges fixes (anti double-compte)', () => {
  const entrees: EntreesMoteur = {
    parametrage: {
      soldeInitialTresorerie: 50000, objectifCaAnnuel: 0, objectifRemunerationMensuelle: 3000,
      moisSecuriteTresorerie: 2, objectifTauxMarque: 0, seuilChargesFixesPctCa: 0.3, objectifResultatNetAnnuel: 0,
    },
    // Salaires présents dans le résultat, mais AUCUNE charge fixe déclarée.
    pnl: pnlVide().map((m) => ({ ...m, salairesEtCharges: 5000 })),
    cash: Array.from({ length: 12 }, () => ({ encaissements: 0, decaissements: 0 })),
  };
  const cd = calculerCashDisponible(entrees, 10); // décembre à venir
  // Seule la rémunération est déduite (3000). Pas de ligne « charges fixes » (salaires non recomptés).
  assert.equal(cd.totalEngage, 3000);
  assert.equal(cd.deductions.some((d) => d.libelle.includes('Charges fixes')), false);
});

test('cash dispo — TVA à venir déduite (profil à l’IS)', () => {
  const profil: ProfilFiscal = {
    statutJuridique: 'SAS_SASU', regimeFiscal: 'REEL_IS',
    chargesSociales: { periodicite: 'mensuel', tauxTnsSurRemuneration: 0.45 },
    impot: { periodicite: 'mensuel', echeancierManuel: Array(12).fill(0) },
    tva: { assujetti: true, periodicite: 'mensuel', taux: 0.2 },
  };
  const pnl = pnlVide().map((m) => ({ ...m, caHt: 10000 }));
  const entrees: EntreesMoteur = {
    parametrage: {
      soldeInitialTresorerie: 5000, objectifCaAnnuel: 0, objectifRemunerationMensuelle: 0,
      moisSecuriteTresorerie: 2, objectifTauxMarque: 0, seuilChargesFixesPctCa: 0.3, objectifResultatNetAnnuel: 0,
    },
    pnl,
    cash: Array.from({ length: 12 }, () => ({ encaissements: 12000, decaissements: 0 })),
    profilFiscal: profil,
  };
  const cd = calculerCashDisponible(entrees, 10); // fin novembre, décembre à venir
  // solde fin nov = 5000 + 11×12000 = 137000 ; TVA décembre = 10000×0.2 = 2000
  assert.equal(cd.soldeBancaire, 137000);
  const tva = cd.deductions.find((d) => d.libelle.includes('TVA'));
  assert.equal(tva?.montant, 2000);
  assert.equal(cd.cashDisponible, 135000);
});
