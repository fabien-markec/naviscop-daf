/**
 * Analyse « comme un DAF » : commentaire à base de règles, généré depuis les KPI.
 * Aucune dépendance externe, aucune IA : un premier niveau d'analyse déterministe,
 * dans la voix d'un directeur financier (cf. cahier des charges, modules Analyse et Plan d'action).
 */
import type { EntreesMoteur } from '../types.ts';
import { MOIS } from '../types.ts';
import { calculerPnl } from '../pnl.ts';
import { calculerTresorerie } from '../cashflow.ts';
import { calculerKpis } from '../kpi.ts';

export interface AnalyseDaf {
  synthese: string;
  pointsForts: string[];
  pointsVigilance: string[];
  recommandations: string[];
  explicationSimple: string;
}

function eur(n: number): string {
  return `${Math.round(n).toLocaleString('fr-FR')} €`;
}
function pct(n: number): string {
  return `${Math.round(n * 100)} %`;
}

export function analyserCommeDaf(entrees: EntreesMoteur): AnalyseDaf {
  const pnl = calculerPnl(entrees.pnl);
  const tresorerie = calculerTresorerie(entrees.parametrage.soldeInitialTresorerie, entrees.cash);
  const kpis = calculerKpis(entrees);
  const p = entrees.parametrage;

  const forts: string[] = [];
  const vigilance: string[] = [];
  const reco: string[] = [];

  const moisCritique = MOIS[tresorerie.moisCritiqueIndex];
  const ca = pnl.annuel.caHt;

  // --- Trésorerie ---
  if (tresorerie.soldeFinLePlusBas < 0) {
    vigilance.push(
      `La trésorerie passe dans le rouge en ${moisCritique} (${eur(tresorerie.soldeFinLePlusBas)}). C'est le point de rupture à traiter en priorité.`,
    );
    reco.push(
      `Sécuriser la trésorerie avant ${moisCritique} : accélérer l'encaissement des créances, négocier un décalage des paiements fournisseurs, ou préparer une ligne de découvert avec la banque.`,
    );
  } else if (kpis.moisTresorerieAvance < p.moisSecuriteTresorerie) {
    vigilance.push(
      `Le matelas de trésorerie est mince : ${kpis.moisTresorerieAvance.toFixed(1)} mois de charges d'avance, sous votre seuil de sécurité de ${p.moisSecuriteTresorerie} mois.`,
    );
    reco.push(`Reconstituer un matelas d'au moins ${p.moisSecuriteTresorerie} mois de charges avant tout nouvel engagement.`);
  } else {
    forts.push(`La trésorerie reste solide toute l'année (${kpis.moisTresorerieAvance.toFixed(1)} mois de charges d'avance).`);
  }

  // --- Créances clients ---
  const creancesEnMoisCa = ca > 0 ? kpis.creancesClients / (ca / 12) : 0;
  if (creancesEnMoisCa > 1.5) {
    vigilance.push(
      `${eur(kpis.creancesClients)} de factures émises ne sont pas encore encaissées, soit plus de ${creancesEnMoisCa.toFixed(1)} mois de CA. C'est de la trésorerie qui dort.`,
    );
    reco.push(`Mettre en place une relance clients systématique et, si besoin, des acomptes à la commande.`);
  }

  // --- Marge ---
  if (kpis.tauxMarque < p.objectifTauxMarque) {
    vigilance.push(
      `Le taux de marque (${pct(kpis.tauxMarque)}) est sous votre objectif de ${pct(p.objectifTauxMarque)} : chaque vente rapporte moins qu'attendu.`,
    );
    reco.push(`Revoir la politique de prix ou renégocier les coûts directs (achats, sous-traitance) pour remonter la marge.`);
  } else {
    forts.push(`La marge brute est au rendez-vous (${pct(kpis.tauxMarque)} de taux de marque).`);
  }

  // --- Exploitation ---
  if (kpis.excedentBrutExploitation < 0) {
    vigilance.push(
      `L'excédent brut d'exploitation est négatif (${eur(kpis.excedentBrutExploitation)}) : l'activité elle-même consomme du cash avant même les investissements et les emprunts.`,
    );
    reco.push(`Agir sur la structure de coûts : l'exploitation courante doit redevenir positive, c'est le socle de tout le reste.`);
  } else {
    forts.push(`L'exploitation dégage un EBE positif (${eur(kpis.excedentBrutExploitation)}).`);
  }

  // --- Résultat vs objectif ---
  if (kpis.resultatPrevisionnel < 0) {
    vigilance.push(`Le résultat prévisionnel est une perte de ${eur(Math.abs(kpis.resultatPrevisionnel))}.`);
  } else if (kpis.resultatPrevisionnel < p.objectifResultatNetAnnuel) {
    vigilance.push(
      `Le résultat prévisionnel (${eur(kpis.resultatPrevisionnel)}) reste sous votre objectif de ${eur(p.objectifResultatNetAnnuel)}.`,
    );
  } else {
    forts.push(`Le résultat prévisionnel (${eur(kpis.resultatPrevisionnel)}) atteint votre objectif.`);
  }

  // --- Charges fixes ---
  if (ca > 0 && pnl.annuel.chargesFixesTotales / ca > p.seuilChargesFixesPctCa) {
    vigilance.push(
      `Les charges de structure pèsent ${pct(pnl.annuel.chargesFixesTotales / ca)} du CA, au-dessus de votre seuil de ${pct(p.seuilChargesFixesPctCa)}. Le modèle est rigide.`,
    );
    reco.push(`Passer en revue les charges fixes ligne à ligne : chaque euro économisé tombe directement dans le résultat.`);
  }

  // --- Seuil de rentabilité ---
  if (ca > 0 && ca < kpis.seuilRentabilite) {
    vigilance.push(
      `Le CA (${eur(ca)}) est sous le seuil de rentabilité (${eur(kpis.seuilRentabilite)}) : il manque du chiffre pour couvrir les charges.`,
    );
    reco.push(`Fixer un objectif de CA au moins égal au seuil de rentabilité de ${eur(kpis.seuilRentabilite)}.`);
  }

  // --- Rémunération ---
  const remuCibleAnnuelle = p.objectifRemunerationMensuelle * 12;
  if (remuCibleAnnuelle > 0 && kpis.cashflowGenere < remuCibleAnnuelle) {
    vigilance.push(`L'activité ne finance pas encore votre rémunération cible de ${eur(p.objectifRemunerationMensuelle)} par mois.`);
  }

  // --- Synthèse ---
  let synthese: string;
  if (tresorerie.soldeFinLePlusBas < 0) {
    synthese = `Situation à surveiller de près : l'entreprise génère de l'activité mais la trésorerie décroche en ${moisCritique}. L'enjeu n'est pas le chiffre d'affaires, c'est le timing des encaissements et le poids des charges.`;
  } else if (kpis.resultatPrevisionnel < 0 || kpis.excedentBrutExploitation < 0) {
    synthese = `L'entreprise tient sa trésorerie mais ne gagne pas encore d'argent sur le fond : le modèle économique doit être ajusté (prix, marge ou charges).`;
  } else if (vigilance.length === 0) {
    synthese = `Situation saine : trésorerie confortable, marge au rendez-vous et résultat en ligne avec les objectifs. On peut passer en mode pilotage et arbitrage.`;
  } else {
    synthese = `Situation globalement maîtrisée, avec quelques points d'attention à traiter pour sécuriser l'année.`;
  }

  // --- Explication à un enfant de 5 ans ---
  const entre = eur(pnl.annuel.caHt);
  const reste = eur(kpis.resultatPrevisionnel);
  const explicationSimple =
    kpis.resultatPrevisionnel >= 0
      ? `Imagine une tirelire. Cette année, l'entreprise a mis dedans ${entre} grâce à son travail, et elle a dépensé presque autant pour tout faire tourner. À la fin, il reste ${reste} dans la tirelire. Le plus important, c'est qu'il y ait toujours des pièces dedans quand il faut payer quelque chose.`
      : `Imagine une tirelire. Cette année, l'entreprise a mis dedans ${entre} grâce à son travail, mais elle a dépensé un peu plus que ça pour tout faire tourner. Du coup la tirelire s'est un peu vidée. Il faut soit gagner un peu plus, soit dépenser un peu moins, pour que la tirelire se remplisse à nouveau.`;

  if (reco.length === 0) reco.push(`Maintenir le cap et continuer à suivre les indicateurs chaque mois.`);

  return {
    synthese,
    pointsForts: forts,
    pointsVigilance: vigilance,
    recommandations: reco,
    explicationSimple,
  };
}
