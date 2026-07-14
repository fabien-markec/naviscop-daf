/** Démo : tableau de bord NAVISCOP calculé pour la société MB SAS (données Excel v9). */
import { calculerTableauDeBord } from './src/index.ts';
import { MOIS } from './src/types.ts';
import { pnlMbSas, cashMbSas, soldeInitial } from './test/fixtures/mb-sas.ts';

const eur = (n: number) =>
  n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const pct = (n: number) => `${(n * 100).toFixed(1)} %`;

const tdb = calculerTableauDeBord({
  parametrage: {
    soldeInitialTresorerie: soldeInitial,
    objectifCaAnnuel: 500000,
    objectifRemunerationMensuelle: 4000,
    moisSecuriteTresorerie: 2,
    objectifTauxMarque: 0.45,
    seuilChargesFixesPctCa: 0.3,
    objectifResultatNetAnnuel: 0,
  },
  pnl: pnlMbSas,
  cash: cashMbSas,
  creancesClients: 42000,
});

console.log('\n=== NAVISCOP — Tableau de bord MB SAS ===\n');
const k = tdb.kpis;
console.log('KPI ANNUELS');
console.log('  CA HT                :', eur(k.margeBrute + tdb.pnl.annuel.achatsMarchandisesMp));
console.log('  Marge brute          :', eur(k.margeBrute), `(${pct(k.tauxMarque)})`);
console.log('  EBE                  :', eur(k.excedentBrutExploitation));
console.log('  Résultat prévisionnel:', eur(k.resultatPrevisionnel));
console.log('  Seuil de rentabilité :', eur(k.seuilRentabilite));
console.log('  Cashflow généré (CAF):', eur(k.cashflowGenere));
console.log('  Mois de tréso d’avance:', k.moisTresorerieAvance.toFixed(1));
console.log('  Créances clients     :', eur(k.creancesClients));
console.log('  Atteinte objectif CA :', pct(k.tauxAtteinteObjectifCa));

console.log('\nTRÉSORERIE 12 MOIS (solde de fin de mois)');
tdb.tresorerie.parMois.forEach((m, i) => {
  const flag = m.soldeFin < 0 ? '  🔴' : '';
  console.log(`  ${MOIS[i].padEnd(10)} ${eur(m.soldeFin).padStart(14)}${flag}`);
});
console.log(
  `  → mois critique : ${MOIS[tdb.tresorerie.moisCritiqueIndex]} (${eur(tdb.tresorerie.soldeFinLePlusBas)})`,
);

console.log('\nALERTES');
if (tdb.alertes.length === 0) console.log('  (aucune)');
for (const a of tdb.alertes) {
  console.log(`  ${a.niveau === 'rouge' ? '🔴' : '🟠'} [${a.code}] ${a.message}`);
}
console.log('');
