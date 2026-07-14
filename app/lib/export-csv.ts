import { MOIS, type calculerTableauDeBord } from '@naviscop/finance-engine';

type Tdb = ReturnType<typeof calculerTableauDeBord>;

const nb = (n: number) => n.toFixed(2).replace('.', ',');

/** Construit un CSV (séparateur point-virgule, décimale virgule) prêt pour Excel FR. */
export function construireCsv(nom: string, tdb: Tdb): string {
  const { kpis, tresorerie, pnl } = tdb;
  const lignes: string[] = [];
  const L = (...cells: (string | number)[]) => lignes.push(cells.join(';'));

  L(`NAVISCOP - Rapport ${nom}`);
  L('');

  L('INDICATEURS CLÉS', 'Valeur');
  L('Chiffre d’affaires HT', nb(pnl.annuel.caHt));
  L('Marge brute', nb(kpis.margeBrute));
  L('Taux de marque', nb(kpis.tauxMarque * 100) + ' %');
  L('EBE', nb(kpis.excedentBrutExploitation));
  L('Résultat prévisionnel', nb(kpis.resultatPrevisionnel));
  L('Seuil de rentabilité', nb(kpis.seuilRentabilite));
  L('Trésorerie disponible', nb(kpis.tresorerieDisponible));
  L('Trésorerie à 12 mois', nb(kpis.tresorerie12Mois));
  L('Créances clients', nb(kpis.creancesClients));
  L('Cashflow généré', nb(kpis.cashflowGenere));
  L('Mois de trésorerie d’avance', nb(kpis.moisTresorerieAvance));
  L('');

  L('PLAN DE TRÉSORERIE', 'Solde début', 'Encaissements', 'Décaissements', 'Variation', 'Solde fin');
  tresorerie.parMois.forEach((m, i) => {
    L(MOIS[i], nb(m.soldeDebut), nb(m.encaissements), nb(m.decaissements), nb(m.variation), nb(m.soldeFin));
  });
  L('');

  L('COMPTE DE RÉSULTAT', 'CA HT', 'Marge brute', 'EBE', 'Résultat', 'Résultat cumulé');
  pnl.parMois.forEach((m, i) => {
    L(MOIS[i], nb(m.caHt), nb(m.margeBrute), nb(m.ebe), nb(m.resultatNet), nb(pnl.resultatCumule[i]));
  });

  return lignes.join('\n');
}

/** Déclenche le téléchargement d'un fichier CSV (avec BOM pour Excel). */
export function telechargerCsv(nom: string, contenu: string) {
  const blob = new Blob(['﻿' + contenu], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `NAVISCOP_${nom.replace(/\s+/g, '_')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
