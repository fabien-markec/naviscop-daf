/**
 * Scénarios de projection (section 11 du cahier des charges).
 * Applique des hypothèses sur une projection de base et mesure l'impact
 * sur la trésorerie ET le compte de résultat.
 */
import type { EntreesMoteur, LignePnlMensuelle, LigneCashMensuelle } from './types.ts';
import { calculerPnl } from './pnl.ts';
import { calculerTresorerie } from './cashflow.ts';

export interface HypothesesScenario {
  /** Hausse (ou baisse) de prix en pourcentage, ex 0.1 pour +10 %. */
  variationPrixPct?: number;
  /** Variation de CA en pourcentage sur une durée donnée. */
  variationCaPct?: number;
  /** Nombre de mois d'application de la variation de CA (défaut : toute l'année). */
  dureeMois?: number;
  /** Charge mensuelle supplémentaire (ex recrutement, coût salarial chargé). */
  chargeMensuelleSupplementaire?: number;
  /** Rémunération dirigeant supplémentaire par mois. */
  remunerationSupplementaire?: number;
  /** Investissement payé comptant (décaissement ponctuel au mois donné). */
  investissementComptant?: { montant: number; moisIndex: number };
  /** Décalage d'encaissements (montant repoussé) ou retard client, en euros/mois. */
  decalageEncaissementMensuel?: number;
  /** Mois de démarrage des hypothèses (0-11). Avant ce mois, rien ne change. Défaut : Janvier. */
  moisDebut?: number;
}

export interface ResultatScenario {
  resultatNetAnnuel: number;
  soldeFinAnnee: number;
  soldeFinLePlusBas: number;
  moisCritiqueIndex: number;
}

/** Détail mensuel du scénario : CA, résultat et solde de trésorerie de fin de mois. */
export interface LigneScenarioMensuelle {
  caHt: number;
  resultatNet: number;
  soldeFin: number;
}

function projeter(entrees: EntreesMoteur): ResultatScenario {
  const pnl = calculerPnl(entrees.pnl);
  const treso = calculerTresorerie(entrees.parametrage.soldeInitialTresorerie, entrees.cash);
  return {
    resultatNetAnnuel: pnl.annuel.resultatNet,
    soldeFinAnnee: treso.soldeFinAnnee,
    soldeFinLePlusBas: treso.soldeFinLePlusBas,
    moisCritiqueIndex: treso.moisCritiqueIndex,
  };
}

export function appliquerScenario(
  base: EntreesMoteur,
  h: HypothesesScenario,
): {
  base: ResultatScenario;
  scenario: ResultatScenario;
  ecart: ResultatScenario;
  parMois: LigneScenarioMensuelle[];
} {
  const duree = h.dureeMois ?? 12;
  const debut = h.moisDebut ?? 0;
  const actifAu = (i: number) => i >= debut;

  const pnl: LignePnlMensuelle[] = base.pnl.map((m, i) => {
    const actif = actifAu(i);
    let caHt = m.caHt;
    if (h.variationPrixPct && actif) caHt *= 1 + h.variationPrixPct;
    if (h.variationCaPct && actif && i < debut + duree) caHt *= 1 + h.variationCaPct;
    return {
      ...m,
      caHt,
      salairesEtCharges:
        m.salairesEtCharges +
        (actif ? (h.chargeMensuelleSupplementaire ?? 0) + (h.remunerationSupplementaire ?? 0) : 0),
    };
  });

  const cash: LigneCashMensuelle[] = base.cash.map((m, i) => {
    const actif = actifAu(i);
    let encaissements = m.encaissements;
    let decaissements = m.decaissements;
    // La variation de prix/CA se répercute sur les encaissements TTC (approche simplifiée).
    if (h.variationPrixPct && actif) encaissements *= 1 + h.variationPrixPct;
    if (h.variationCaPct && actif && i < debut + duree) encaissements *= 1 + h.variationCaPct;
    if (h.decalageEncaissementMensuel && actif) encaissements -= h.decalageEncaissementMensuel;
    if (actif) {
      decaissements += (h.chargeMensuelleSupplementaire ?? 0) + (h.remunerationSupplementaire ?? 0);
    }
    if (h.investissementComptant && h.investissementComptant.moisIndex === i) {
      decaissements += h.investissementComptant.montant;
    }
    return { encaissements, decaissements };
  });

  const scenarioEntrees: EntreesMoteur = { ...base, pnl, cash };
  const baseR = projeter(base);
  const scenarioR = projeter(scenarioEntrees);

  const pnlS = calculerPnl(scenarioEntrees.pnl);
  const tresoS = calculerTresorerie(scenarioEntrees.parametrage.soldeInitialTresorerie, scenarioEntrees.cash);
  const parMois: LigneScenarioMensuelle[] = scenarioEntrees.pnl.map((m, i) => ({
    caHt: m.caHt,
    resultatNet: pnlS.parMois[i].resultatNet,
    soldeFin: tresoS.parMois[i].soldeFin,
  }));

  return {
    base: baseR,
    scenario: scenarioR,
    ecart: {
      resultatNetAnnuel: scenarioR.resultatNetAnnuel - baseR.resultatNetAnnuel,
      soldeFinAnnee: scenarioR.soldeFinAnnee - baseR.soldeFinAnnee,
      soldeFinLePlusBas: scenarioR.soldeFinLePlusBas - baseR.soldeFinLePlusBas,
      moisCritiqueIndex: scenarioR.moisCritiqueIndex,
    },
    parMois,
  };
}
