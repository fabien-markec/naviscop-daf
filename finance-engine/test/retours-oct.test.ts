import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculerTresorerie, moisDuSolde } from '../src/cashflow.ts';
import { fusionnerPrevisionnels } from '../src/previsionnel.ts';
import type { EntreesMoteur, LigneCashMensuelle, LignePnlMensuelle } from '../src/types.ts';

const zeroCash = (): LigneCashMensuelle[] =>
  Array.from({ length: 12 }, () => ({ encaissements: 0, decaissements: 0 }));
const zeroPnl = (): LignePnlMensuelle[] =>
  Array.from({ length: 12 }, () => ({
    caHt: 0, achatsMarchandisesMp: 0, autresAchatsChargesExternes: 0, salairesEtCharges: 0,
    impotsEtTaxes: 0, chargesFinancieres: 0, chargesExceptionnelles: 0, amortissements: 0,
  }));

test('moisDuSolde — déduit le mois d’une date ISO', () => {
  assert.equal(moisDuSolde(undefined), 0);
  assert.equal(moisDuSolde('2026-03-15'), 2);
  assert.equal(moisDuSolde('2026-12-01'), 11);
  assert.equal(moisDuSolde('pas une date'), 0);
});

test('#3 — solde initial appliqué à un mois de départ (démarrage en cours d’année)', () => {
  const t = calculerTresorerie(10000, zeroCash(), 2); // solde constaté en mars
  assert.equal(t.parMois[0].soldeFin, 0);
  assert.equal(t.parMois[1].soldeFin, 0);
  assert.equal(t.parMois[2].soldeDebut, 10000);
  assert.equal(t.parMois[2].soldeFin, 10000);
  // Rétrocompatibilité : sans mois de départ, le solde démarre en janvier (comportement historique).
  const t0 = calculerTresorerie(10000, zeroCash());
  assert.equal(t0.parMois[0].soldeDebut, 10000);
});

test('#6 — mouvement bancaire : touche la trésorerie, pas le compte de résultat', () => {
  const base = { pnl: zeroPnl(), cash: zeroCash() } as EntreesMoteur;
  const sortie = fusionnerPrevisionnels(base, [
    { id: '1', type: 'mouvement_bancaire', libelle: 'Dividendes', montantHt: 5000, tauxTva: 0, moisIndex: 5, sensCash: 'sortie' },
  ]);
  assert.equal(sortie.cash[5].decaissements, 5000);
  assert.equal(sortie.pnl[5].salairesEtCharges, 0);
  assert.equal(sortie.pnl[5].caHt, 0);

  const entree = fusionnerPrevisionnels(base, [
    { id: '2', type: 'mouvement_bancaire', libelle: 'Obtention prêt', montantHt: 20000, tauxTva: 0, moisIndex: 3, sensCash: 'entree' },
  ]);
  assert.equal(entree.cash[3].encaissements, 20000);
  assert.equal(entree.cash[3].decaissements, 0);
});
