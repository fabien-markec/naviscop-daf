import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diagnostiquerFec } from '../src/fec/qualite.ts';
import type { EcritureFec } from '../src/fec/types.ts';

function ecr(mois: number, compte: string, credit: number, journal = 'VE'): EcritureFec {
  return {
    journalCode: journal,
    ecritureNum: '1',
    dateBrute: `2026${String(mois + 1).padStart(2, '0')}15`,
    moisIndex: mois,
    annee: 2026,
    compteNum: compte,
    compteLib: '',
    compAuxNum: '',
    libelle: '',
    debit: 0,
    credit,
    lettrage: '',
  };
}

test('qualité — détecte un mois au CA anormalement bas (écritures manquantes)', () => {
  const ecritures: EcritureFec[] = [];
  // Jan-Mai : ~10000 de CA ; Juin : 500 (creux anormal) ; Juillet : 9000
  for (const m of [0, 1, 2, 3, 4]) ecritures.push(ecr(m, '706000', 10000));
  ecritures.push(ecr(5, '706000', 500)); // juin anormal
  ecritures.push(ecr(6, '706000', 9000));

  const d = diagnostiquerFec(ecritures);
  assert.ok(d.moisSuspects.includes(5), 'juin doit être suspect');
  assert.ok(d.messages.some((m) => m.texte.includes('Juin') && m.niveau === 'attention'));
});

test('qualité — détecte un mois entièrement manquant au milieu', () => {
  const ecritures = [ecr(0, '706000', 8000), ecr(1, '706000', 8000), ecr(3, '706000', 8000)];
  // février (index 1) présent, mars (index 2) absent, avril présent
  const d = diagnostiquerFec(ecritures);
  assert.ok(d.moisSuspects.includes(2), 'mars manquant doit être suspect');
});

test('qualité — fraîcheur : signale les mois manquants pour être à jour', () => {
  const ecritures = [ecr(0, '706000', 8000), ecr(1, '706000', 8000), ecr(2, '706000', 8000)];
  const d = diagnostiquerFec(ecritures, { annee: 2026, moisIndex: 6 }); // on est en juillet
  assert.ok(d.messages.some((m) => m.texte.includes('manque') && m.niveau === 'attention'));
});

test('qualité — données à jour ne déclenche pas d’alerte', () => {
  const ecritures = [ecr(4, '706000', 8000), ecr(5, '706000', 8000), ecr(6, '706000', 8000)];
  const d = diagnostiquerFec(ecritures, { annee: 2026, moisIndex: 6 });
  assert.equal(d.dernierMoisActif, 6);
  assert.ok(d.messages.some((m) => m.texte.includes('à jour')));
  assert.ok(!d.messages.some((m) => m.niveau === 'attention'));
});
