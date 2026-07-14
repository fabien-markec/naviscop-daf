/**
 * FEC d'exemple (société de services fictive « DEMO CONSEIL »), généré de façon
 * déterministe. Sert à démontrer l'import dans l'application sans fichier réel.
 */

const ENTETE = [
  'JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate', 'CompteNum', 'CompteLib',
  'CompAuxNum', 'CompAuxLib', 'PieceRef', 'PieceDate', 'EcritureLib', 'Debit', 'Credit',
  'EcritureLet', 'DateLet', 'ValidDate', 'Montantdevise', 'Idevise',
];

const MOIS_JJ = ['0131', '0228', '0331', '0430', '0531', '0630', '0731', '0831'];

function ligne(
  j: string, n: number, date: string, compte: string, lib: string, debit: number, credit: number,
): string {
  const m = (x: number) => (x === 0 ? '' : x.toFixed(2).replace('.', ','));
  return [j, j, String(n), date, compte, lib, '', '', 'P' + n, date, lib, m(debit), m(credit), '', '', date, '', ''].join('\t');
}

function construire(): string {
  const rows: string[] = [ENTETE.join('\t')];
  let n = 1;
  const an = '20260101';

  // Ouverture : trésorerie de départ 18 500
  rows.push(ligne('AN', n, an, '512000', 'Banque', 18500, 0));
  rows.push(ligne('AN', n++, an, '101000', 'Capital', 0, 18500));

  // CA HT mensuel (services), 8 mois
  const caHt = [12000, 14500, 9800, 16200, 11000, 15800, 8200, 13400];
  // Charges externes mensuelles (loyer + télécom + honoraires)
  const chargesExternes = [2200, 2200, 2450, 2200, 2200, 2600, 2200, 2450];
  // Salaires mensuels (dirigeant + 1 salarié)
  const salaires = [5200, 5200, 5200, 5200, 5600, 5600, 5600, 5600];

  for (let i = 0; i < 8; i++) {
    const jj = MOIS_JJ[i];
    const date = `2026${jj}`;
    const ht = caHt[i];
    const tva = ht * 0.2;
    const ttc = ht + tva;

    // Facture de vente (encaissée le mois suivant : classique tension de trésorerie)
    rows.push(ligne('VE', n, date, '411CLI', 'Clients', ttc, 0));
    rows.push(ligne('VE', n, date, '706000', 'Prestations de services', 0, ht));
    rows.push(ligne('VE', n++, date, '445710', 'TVA collectée', 0, tva));

    // Encaissement de la facture du mois précédent
    if (i > 0) {
      const htPrec = caHt[i - 1];
      const ttcPrec = htPrec * 1.2;
      rows.push(ligne('BQ', n, date, '512000', 'Banque', ttcPrec, 0));
      rows.push(ligne('BQ', n++, date, '411CLI', 'Clients', 0, ttcPrec));
    }

    // Charges externes payées dans le mois
    rows.push(ligne('HA', n, date, '613000', 'Locations et charges', chargesExternes[i], 0));
    rows.push(ligne('HA', n++, date, '512000', 'Banque', 0, chargesExternes[i]));

    // Salaires payés dans le mois
    rows.push(ligne('OD', n, date, '641000', 'Rémunérations du personnel', salaires[i], 0));
    rows.push(ligne('OD', n++, date, '512000', 'Banque', 0, salaires[i]));

    // TVA à décaisser trimestriellement (mars, juin)
    if (i === 2 || i === 5) {
      const tvaTrim = (caHt[i - 2] + caHt[i - 1] + caHt[i]) * 0.2 * 0.6; // net approximatif
      rows.push(ligne('OD', n, date, '445510', 'TVA à décaisser', tvaTrim, 0));
      rows.push(ligne('OD', n++, date, '512000', 'Banque', 0, tvaTrim));
    }
  }

  return rows.join('\n');
}

export const fecExemple: string = construire();
export const nomSocieteExemple = 'DEMO CONSEIL';
