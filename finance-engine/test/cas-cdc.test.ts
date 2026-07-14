/**
 * Les 3 cas test du cahier des charges (section 15).
 * Validation fonctionnelle : le moteur doit produire les signaux attendus
 * pour chaque profil, et objectiver l'impact des décisions à simuler.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { EntreesMoteur, ParametrageFinancier, LignePnlMensuelle } from '../src/types.ts';
import { calculerKpis } from '../src/kpi.ts';
import { evaluerAlertes } from '../src/alerts.ts';
import { appliquerScenario } from '../src/scenarios.ts';

/** Répartit des montants annuels en 12 mois égaux et construit les entrées du moteur. */
function dossier(annuel: {
  caHt: number;
  achatsMp: number;
  chargesFixes: number;
  salairesEtChargesDirigeant: number;
  soldeInitial: number;
  param: Partial<ParametrageFinancier>;
}): EntreesMoteur {
  const mois = <T,>(v: T) => Array.from({ length: 12 }, () => v);
  const ligne: LignePnlMensuelle = {
    caHt: annuel.caHt / 12,
    achatsMarchandisesMp: annuel.achatsMp / 12,
    autresAchatsChargesExternes: annuel.chargesFixes / 12,
    salairesEtCharges: annuel.salairesEtChargesDirigeant / 12,
    impotsEtTaxes: 0,
    chargesFinancieres: 0,
    chargesExceptionnelles: 0,
    amortissements: 0,
  };
  const totalCharges =
    annuel.achatsMp + annuel.chargesFixes + annuel.salairesEtChargesDirigeant;
  return {
    parametrage: {
      soldeInitialTresorerie: annuel.soldeInitial,
      objectifCaAnnuel: annuel.caHt,
      objectifRemunerationMensuelle: 0,
      moisSecuriteTresorerie: 2,
      objectifTauxMarque: 0.4,
      seuilChargesFixesPctCa: 0.3,
      objectifResultatNetAnnuel: 0,
      ...annuel.param,
    },
    pnl: mois(ligne),
    cash: mois({
      encaissements: (annuel.caHt * 1.2) / 12,
      decaissements: (totalCharges * 1.1) / 12,
    }),
  };
}

test('cas 1 — artisan rentable (marge saine) mais fragilisé par une embauche', () => {
  const d = dossier({
    caHt: 283719,
    achatsMp: 118963,
    chargesFixes: 155221,
    salairesEtChargesDirigeant: 37000 + 27700,
    soldeInitial: 34028,
    param: { objectifRemunerationMensuelle: 37000 / 12 },
  });
  const kpis = calculerKpis(d);
  // Rentable au sens de la marge brute (CA très supérieur aux coûts directs).
  assert.ok(kpis.tauxMarque > 0.5, `taux de marque ${kpis.tauxMarque}`);

  // Simuler l'embauche d'un salarié au SMIC (~1800 € chargé / mois).
  const sim = appliquerScenario(d, { chargeMensuelleSupplementaire: 1800 });
  assert.ok(sim.ecart.resultatNetAnnuel < 0, 'l’embauche dégrade le résultat');
  assert.ok(
    sim.scenario.soldeFinLePlusBas < sim.base.soldeFinLePlusBas,
    'l’embauche abaisse le point de trésorerie le plus bas',
  );
});

test('cas 2 — consultant : marge à 100 %, capacité de rémunération réelle faible', () => {
  const d = dossier({
    caHt: 95000,
    achatsMp: 0,
    chargesFixes: 52000,
    salairesEtChargesDirigeant: 33000 + 20460,
    soldeInitial: 25000,
    param: { objectifRemunerationMensuelle: 33000 / 12, objectifResultatNetAnnuel: 5000 },
  });
  const kpis = calculerKpis(d);
  // Prestation pure : pas de coûts directs → taux de marque = 100 %.
  assert.equal(Math.round(kpis.tauxMarque * 100), 100);

  const alertes = evaluerAlertes(d);
  const codes = alertes.map((a) => a.code);
  assert.ok(
    codes.includes('remuneration_insuffisante') || codes.includes('rentabilite_faible'),
    `alertes: ${codes.join(', ')}`,
  );
});

test('cas 3 — commerce : problème de marge isolé', () => {
  const d = dossier({
    caHt: 64000,
    achatsMp: 38500,
    chargesFixes: 22000,
    salairesEtChargesDirigeant: 6700 + 1350,
    soldeInitial: 20500,
    param: { objectifTauxMarque: 0.45 },
  });
  const kpis = calculerKpis(d);
  // Marge sous les 45 % attendus dans le commerce.
  assert.ok(kpis.tauxMarque < 0.45, `taux de marque ${kpis.tauxMarque}`);

  const codes = evaluerAlertes(d).map((a) => a.code);
  assert.ok(codes.includes('marge_insuffisante'), `alertes: ${codes.join(', ')}`);
});
