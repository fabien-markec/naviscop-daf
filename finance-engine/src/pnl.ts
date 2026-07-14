/**
 * Compte de résultat / plan de marges (HT).
 * Validé en parité exacte contre l'Excel NAVISCOP v9 (voir test/parity.test.ts).
 */
import type { LignePnlMensuelle } from './types.ts';

export interface ResultatMensuel {
  caHt: number;
  margeBrute: number;
  ebe: number;
  resultatNet: number;
  caf: number;
}

export interface SyntheseAnnuellePnl {
  caHt: number;
  achatsMarchandisesMp: number;
  autresAchatsChargesExternes: number;
  salairesEtCharges: number;
  impotsEtTaxes: number;
  chargesFinancieres: number;
  chargesExceptionnelles: number;
  amortissements: number;
  margeBrute: number;
  tauxMarqueBrute: number;
  /** Total des charges hors coûts directs (base du seuil de rentabilité). */
  chargesFixesTotales: number;
  ebe: number;
  caf: number;
  resultatNet: number;
}

/** Marge brute = CA HT − coûts directs. */
export function margeBrute(m: LignePnlMensuelle): number {
  return m.caHt - m.achatsMarchandisesMp;
}

/**
 * Excédent brut d'exploitation.
 * EBE = CA − achats − autres achats et charges externes − salaires − impôts et taxes.
 */
export function ebe(m: LignePnlMensuelle): number {
  return (
    m.caHt -
    m.achatsMarchandisesMp -
    m.autresAchatsChargesExternes -
    m.salairesEtCharges -
    m.impotsEtTaxes
  );
}

/** Résultat net = EBE − charges financières − charges exceptionnelles − amortissements. */
export function resultatNet(m: LignePnlMensuelle): number {
  return ebe(m) - m.chargesFinancieres - m.chargesExceptionnelles - m.amortissements;
}

/** Capacité d'autofinancement = résultat net + amortissements. */
export function caf(m: LignePnlMensuelle): number {
  return resultatNet(m) + m.amortissements;
}

export function resultatMensuel(m: LignePnlMensuelle): ResultatMensuel {
  return {
    caHt: m.caHt,
    margeBrute: margeBrute(m),
    ebe: ebe(m),
    resultatNet: resultatNet(m),
    caf: caf(m),
  };
}

export function calculerPnl(pnl: LignePnlMensuelle[]): {
  parMois: ResultatMensuel[];
  resultatCumule: number[];
  annuel: SyntheseAnnuellePnl;
} {
  const parMois = pnl.map(resultatMensuel);

  const resultatCumule: number[] = [];
  let cumul = 0;
  for (const r of parMois) {
    cumul += r.resultatNet;
    resultatCumule.push(cumul);
  }

  const somme = (get: (m: LignePnlMensuelle) => number) =>
    pnl.reduce((acc, m) => acc + get(m), 0);

  const caHt = somme((m) => m.caHt);
  const achatsMarchandisesMp = somme((m) => m.achatsMarchandisesMp);
  const autresAchatsChargesExternes = somme((m) => m.autresAchatsChargesExternes);
  const salairesEtCharges = somme((m) => m.salairesEtCharges);
  const impotsEtTaxes = somme((m) => m.impotsEtTaxes);
  const chargesFinancieres = somme((m) => m.chargesFinancieres);
  const chargesExceptionnelles = somme((m) => m.chargesExceptionnelles);
  const amortissements = somme((m) => m.amortissements);

  const mb = caHt - achatsMarchandisesMp;
  const chargesFixesTotales =
    autresAchatsChargesExternes +
    salairesEtCharges +
    impotsEtTaxes +
    chargesFinancieres +
    chargesExceptionnelles +
    amortissements;

  const annuel: SyntheseAnnuellePnl = {
    caHt,
    achatsMarchandisesMp,
    autresAchatsChargesExternes,
    salairesEtCharges,
    impotsEtTaxes,
    chargesFinancieres,
    chargesExceptionnelles,
    amortissements,
    margeBrute: mb,
    tauxMarqueBrute: caHt === 0 ? 0 : mb / caHt,
    chargesFixesTotales,
    ebe: caHt - achatsMarchandisesMp - autresAchatsChargesExternes - salairesEtCharges - impotsEtTaxes,
    caf: somme(caf),
    resultatNet: somme(resultatNet),
  };

  return { parMois, resultatCumule, annuel };
}
