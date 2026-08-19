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
  /** Mois de démarrage par défaut (0-11) si un mois par variable n'est pas précisé. */
  moisDebut?: number;
  /** Mois de démarrage propres à chaque variable (0-11). À défaut : moisDebut. */
  moisPrix?: number;
  moisCa?: number;
  moisCharge?: number;
  moisRemu?: number;
  /** Charges ajoutées au scénario : ponctuelles (un mois) ou récurrentes (à partir du mois, jusqu'à décembre). */
  chargesScenario?: { libelle?: string; montant: number; moisIndex: number; toutAnnee?: boolean }[];
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
  const dPrix = h.moisPrix ?? debut;
  const dCa = h.moisCa ?? debut;
  const dCharge = h.moisCharge ?? debut;
  const dRemu = h.moisRemu ?? debut;
  const chargesScenario = h.chargesScenario ?? [];
  // Montant d'une charge du scénario applicable au mois i (ponctuelle = ce mois ; récurrente = à partir du mois).
  const chargeAuMois = (i: number) =>
    chargesScenario.reduce((acc, c) => acc + ((c.toutAnnee ? i >= c.moisIndex : i === c.moisIndex) ? c.montant : 0), 0);

  const pnl: LignePnlMensuelle[] = base.pnl.map((m, i) => {
    let caHt = m.caHt;
    if (h.variationPrixPct && i >= dPrix) caHt *= 1 + h.variationPrixPct;
    if (h.variationCaPct && i >= dCa && i < dCa + duree) caHt *= 1 + h.variationCaPct;
    return {
      ...m,
      caHt,
      salairesEtCharges:
        m.salairesEtCharges + (i >= dCharge ? h.chargeMensuelleSupplementaire ?? 0 : 0) + (i >= dRemu ? h.remunerationSupplementaire ?? 0 : 0),
      autresAchatsChargesExternes: m.autresAchatsChargesExternes + chargeAuMois(i),
    };
  });

  const cash: LigneCashMensuelle[] = base.cash.map((m, i) => {
    let encaissements = m.encaissements;
    let decaissements = m.decaissements;
    if (h.variationPrixPct && i >= dPrix) encaissements *= 1 + h.variationPrixPct;
    if (h.variationCaPct && i >= dCa && i < dCa + duree) encaissements *= 1 + h.variationCaPct;
    if (h.decalageEncaissementMensuel && i >= debut) encaissements -= h.decalageEncaissementMensuel;
    decaissements += (i >= dCharge ? h.chargeMensuelleSupplementaire ?? 0 : 0) + (i >= dRemu ? h.remunerationSupplementaire ?? 0 : 0);
    decaissements += chargeAuMois(i) * 1.2;
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
