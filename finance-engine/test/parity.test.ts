/**
 * Test de parité : le moteur doit reproduire exactement les sorties de l'Excel
 * NAVISCOP v9 sur la société MB SAS. C'est le critère de validation n°1 du CdC :
 * « mêmes entrées → mêmes résultats que l'Excel ».
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculerPnl } from '../src/pnl.ts';
import { calculerTresorerie } from '../src/cashflow.ts';
import {
  pnlMbSas,
  cashMbSas,
  soldeInitial,
  resultatExcel,
  soldeFinExcel,
  kpiExcel,
} from './fixtures/mb-sas.ts';

const EPS = 0.01; // 1 centime de tolérance (arrondis)

test('parité — résultat net mensuel identique à l’Excel', () => {
  const { parMois } = calculerPnl(pnlMbSas);
  for (let i = 0; i < 12; i++) {
    assert.ok(
      Math.abs(parMois[i].resultatNet - resultatExcel[i]) < EPS,
      `mois ${i + 1} : moteur ${parMois[i].resultatNet.toFixed(2)} ≠ Excel ${resultatExcel[i]}`,
    );
  }
});

test('parité — solde de fin de mois identique à l’Excel', () => {
  // Tolérance 2 centimes : les entrées de la fixture sont arrondies au centime,
  // donc le solde cumulé peut dériver d'un cent sur l'année. La logique est exacte.
  const EPS_CUMUL = 0.02;
  const { parMois } = calculerTresorerie(soldeInitial, cashMbSas);
  for (let i = 0; i < 12; i++) {
    assert.ok(
      Math.abs(parMois[i].soldeFin - soldeFinExcel[i]) < EPS_CUMUL,
      `mois ${i + 1} : moteur ${parMois[i].soldeFin.toFixed(2)} ≠ Excel ${soldeFinExcel[i]}`,
    );
  }
});

test('parité — KPI annuels alignés sur l’Excel', () => {
  const { annuel } = calculerPnl(pnlMbSas);
  assert.ok(Math.abs(annuel.caHt - kpiExcel.caAnnuel) < 0.5, `CA : ${annuel.caHt}`);
  assert.ok(Math.abs(annuel.margeBrute - kpiExcel.margeBrute) < 0.5, `Marge brute : ${annuel.margeBrute}`);
  assert.ok(Math.abs(annuel.resultatNet - kpiExcel.resultatNet) < 0.5, `Résultat : ${annuel.resultatNet}`);

  const { soldeFinAnnee } = calculerTresorerie(soldeInitial, cashMbSas);
  assert.ok(Math.abs(soldeFinAnnee - kpiExcel.tresoFinAnnee) < 0.5, `Tréso fin : ${soldeFinAnnee}`);
});

test('mois critique — Décembre, solde négatif', () => {
  const treso = calculerTresorerie(soldeInitial, cashMbSas);
  assert.equal(treso.moisCritiqueIndex, 11);
  assert.ok(treso.soldeFinLePlusBas < 0);
});
