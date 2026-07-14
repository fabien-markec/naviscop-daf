import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyserCommeDaf } from '../src/analyse/daf.ts';
import { dossierDemoMbSas } from '../src/samples.ts';

test('analyse DAF — dossier en difficulté produit synthèse + vigilances + reco', () => {
  const a = analyserCommeDaf(dossierDemoMbSas);
  assert.ok(a.synthese.length > 20);
  assert.ok(a.pointsVigilance.length >= 1, 'doit relever des points de vigilance');
  assert.ok(a.recommandations.length >= 1, 'doit proposer des recommandations');
  assert.ok(a.explicationSimple.includes('tirelire'), 'encadré pédagogique présent');
});

test('analyse DAF — trésorerie négative citée dans les vigilances', () => {
  const a = analyserCommeDaf(dossierDemoMbSas);
  // MB SAS finit l'année en trésorerie négative.
  assert.ok(
    a.pointsVigilance.some((v) => v.toLowerCase().includes('rouge') || v.toLowerCase().includes('trésorerie')),
    'la tension de trésorerie doit être signalée',
  );
});
