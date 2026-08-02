import { MOIS, type calculerTableauDeBord } from '@naviscop/finance-engine';

type Tdb = ReturnType<typeof calculerTableauDeBord>;

const EUR_FMT = '#,##0 "€"';

/**
 * Génère un vrai classeur Excel (.xlsx) à 3 feuilles :
 * Indicateurs, Trésorerie, Compte de résultat — avec formats € et %.
 * SheetJS est importé dynamiquement pour ne pas alourdir le bundle initial.
 */
export async function telechargerXlsx(nom: string, tdb: Tdb) {
  const XLSX = await import('xlsx');
  const { kpis, tresorerie, pnl } = tdb;

  const setFmt = (ws: Record<string, { z?: string }>, ref: string, z: string) => {
    if (ws[ref]) ws[ref].z = z;
  };
  // Applique le format € à toutes les cellules numériques (hors 1re ligne / 1re colonne).
  const moneyAll = (ws: XLSXWs) => {
    if (!ws['!ref']) return;
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let r = range.s.r + 1; r <= range.e.r; r++) {
      for (let c = range.s.c + 1; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        if (cell && typeof cell.v === 'number') cell.z = EUR_FMT;
      }
    }
  };

  const wb = XLSX.utils.book_new();

  // --- Feuille 1 : Indicateurs ---
  const indic: (string | number)[][] = [
    [`NAVISCOP — Rapport ${nom}`],
    [],
    ['Indicateur', 'Valeur'],
    ['Chiffre d’affaires HT', pnl.annuel.caHt],
    ['Marge brute', kpis.margeBrute],
    ['Taux de marque (%)', +(kpis.tauxMarque * 100).toFixed(1)],
    ['EBE', kpis.excedentBrutExploitation],
    ['Résultat prévisionnel', kpis.resultatPrevisionnel],
    ['Seuil de rentabilité', kpis.seuilRentabilite],
    ['Trésorerie disponible', kpis.tresorerieDisponible],
    ['Trésorerie à 12 mois', kpis.tresorerie12Mois],
    ['Créances clients', kpis.creancesClients],
    ['Cashflow généré', kpis.cashflowGenere],
    ['Mois de trésorerie d’avance', +kpis.moisTresorerieAvance.toFixed(1)],
  ];
  const wsI = XLSX.utils.aoa_to_sheet(indic);
  wsI['!cols'] = [{ wch: 30 }, { wch: 16 }];
  ['B4', 'B5', 'B7', 'B8', 'B9', 'B10', 'B11', 'B12', 'B13'].forEach((ref) => setFmt(wsI, ref, EUR_FMT));
  setFmt(wsI, 'B6', '0.0"%"');
  setFmt(wsI, 'B14', '0.0');
  XLSX.utils.book_append_sheet(wb, wsI, 'Indicateurs');

  // --- Feuille 2 : Trésorerie ---
  const tres: (string | number)[][] = [
    ['Mois', 'Solde début', 'Encaissements', 'Décaissements', 'Variation', 'Solde fin'],
    ...tresorerie.parMois.map((m, i) => [MOIS[i], m.soldeDebut, m.encaissements, m.decaissements, m.variation, m.soldeFin]),
  ];
  const wsT = XLSX.utils.aoa_to_sheet(tres);
  wsT['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 }];
  moneyAll(wsT);
  XLSX.utils.book_append_sheet(wb, wsT, 'Trésorerie');

  // --- Feuille 3 : Compte de résultat ---
  const cr: (string | number)[][] = [
    ['Mois', 'CA HT', 'Marge brute', 'EBE', 'Résultat', 'Résultat cumulé'],
    ...pnl.parMois.map((m, i) => [MOIS[i], m.caHt, m.margeBrute, m.ebe, m.resultatNet, pnl.resultatCumule[i]]),
  ];
  const wsC = XLSX.utils.aoa_to_sheet(cr);
  wsC['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 16 }];
  moneyAll(wsC);
  XLSX.utils.book_append_sheet(wb, wsC, 'Compte de résultat');

  XLSX.writeFile(wb, `NAVISCOP_${nom.replace(/\s+/g, '_')}.xlsx`);
}

type XLSXWs = { '!ref'?: string } & Record<string, { v?: unknown; z?: string }>;
