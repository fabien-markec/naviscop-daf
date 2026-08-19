'use client';

import { Fragment, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { MOIS } from '@naviscop/finance-engine';
import { useDossier } from '@/lib/dossier-context';
import { eur, pct } from '@/lib/format';
import { KpiCard, PageHeader, Section } from '@/components/ui';
import { ResultatChart } from '@/components/charts';

function formatDateFec(d: string): string {
  const v = (d ?? '').trim();
  if (/^\d{8}$/.test(v)) return `${v.slice(6, 8)}/${v.slice(4, 6)}/${v.slice(0, 4)}`;
  return v;
}

const CATEGORIES_CHARGES: { cle: keyof import('@naviscop/finance-engine').LignePnlMensuelle; label: string }[] = [
  { cle: 'achatsMarchandisesMp', label: 'Achats / matières' },
  { cle: 'autresAchatsChargesExternes', label: 'Charges externes' },
  { cle: 'salairesEtCharges', label: 'Salaires et charges' },
  { cle: 'impotsEtTaxes', label: 'Impôts et taxes' },
  { cle: 'chargesFinancieres', label: 'Charges financières' },
  { cle: 'chargesExceptionnelles', label: 'Except.' },
  { cle: 'amortissements', label: 'Amortissements' },
];

export default function RentabilitePage() {
  const { tableauDeBord, entrees } = useDossier();
  const { pnl } = tableauDeBord;
  const a = pnl.annuel;
  const chartData = pnl.parMois.map((m, i) => ({
    mois: MOIS[i].slice(0, 3),
    resultat: m.resultatNet,
    cumule: pnl.resultatCumule[i],
  }));

  const caHtAnnuel = a.caHt || 1;
  const postes = entrees.detail?.charges ?? [];
  const [posteOuvert, setPosteOuvert] = useState<string | null>(null);
  const totalCharges = (m: import('@naviscop/finance-engine').LignePnlMensuelle) =>
    CATEGORIES_CHARGES.reduce((acc, c) => acc + (m[c.cle] as number), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rentabilité"
        subtitle="L’activité gagne-t-elle vraiment de l’argent ? Compte de résultat (HT)."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="CA HT annuel" value={eur(a.caHt)} />
        <KpiCard label="Marge brute" value={eur(a.margeBrute)} hint={pct(a.tauxMarqueBrute)} />
        <KpiCard label="EBE" value={eur(a.ebe)} tone={a.ebe < 0 ? 'negative' : 'positive'} />
        <KpiCard label="Résultat net" value={eur(a.resultatNet)} tone={a.resultatNet < 0 ? 'negative' : 'positive'} />
      </div>

      <Section title="Résultat mensuel et cumulé">
        <ResultatChart data={chartData} />
      </Section>

      <Section title="Compte de résultat mensuel">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mois</th>
                <th className="!text-center">CA HT</th>
                <th className="!text-center">Marge brute</th>
                <th className="!text-center">EBE</th>
                <th className="!text-center">Résultat</th>
                <th className="!text-center">Cumulé</th>
              </tr>
            </thead>
            <tbody>
              {pnl.parMois.map((m, i) => (
                <tr key={i}>
                  <td className="font-medium text-slate-800">{MOIS[i]}</td>
                  <td className="num text-slate-700">{eur(m.caHt)}</td>
                  <td className="num text-slate-700">{eur(m.margeBrute)}</td>
                  <td className={`num ${m.ebe < 0 ? 'text-rose-600' : 'text-slate-700'}`}>{eur(m.ebe)}</td>
                  <td className={`num font-semibold ${m.resultatNet < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{eur(m.resultatNet)}</td>
                  <td className={`num ${pnl.resultatCumule[i] < 0 ? 'text-rose-600' : 'text-slate-700'}`}>{eur(pnl.resultatCumule[i])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {postes.length > 0 && (
        <Section title="Détail des charges par poste (annuel)">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Poste</th>
                  <th>Compte</th>
                  <th>Type</th>
                  <th className="!text-center">Montant annuel</th>
                  <th className="!text-center">% du CA</th>
                </tr>
              </thead>
              <tbody>
                {postes.map((p) => {
                  const ouvert = posteOuvert === p.compte;
                  const nb = p.ecritures?.length ?? 0;
                  return (
                    <Fragment key={p.compte}>
                      <tr
                        className="cursor-pointer hover:bg-white/40"
                        onClick={() => setPosteOuvert(ouvert ? null : p.compte)}
                      >
                        <td className="font-medium text-slate-800">
                          <span className="inline-flex items-center gap-1.5">
                            <ChevronRight className={`h-3.5 w-3.5 text-slate-400 transition-transform ${ouvert ? 'rotate-90' : ''}`} />
                            {p.libelle}
                            {nb > 0 && <span className="text-[10px] font-normal text-slate-400">({nb})</span>}
                          </span>
                        </td>
                        <td className="text-slate-400">{p.compte}</td>
                        <td>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              p.fixe ? 'bg-slate-100 text-slate-600' : 'bg-brand/10 text-brand'
                            }`}
                          >
                            {p.fixe ? 'Fixe' : 'Variable'}
                          </span>
                        </td>
                        <td className="num text-slate-700">{eur(p.montant)}</td>
                        <td className="num text-slate-500">{pct(p.montant / caHtAnnuel)}</td>
                      </tr>
                      {ouvert && (
                        <tr>
                          <td colSpan={5} className="bg-slate-50 !py-0">
                            {nb > 0 ? (
                              <div className="max-h-72 overflow-y-auto px-2 py-2">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-left text-slate-400">
                                      <th className="py-1 pr-3 font-medium">Date</th>
                                      <th className="py-1 pr-3 font-medium">Libellé</th>
                                      <th className="py-1 pr-3 font-medium">Réf.</th>
                                      <th className="py-1 text-right font-medium">Montant</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {p.ecritures!.map((ec, i) => (
                                      <tr key={i} className="border-t border-slate-100">
                                        <td className="whitespace-nowrap py-1 pr-3 text-slate-500">{formatDateFec(ec.date)}</td>
                                        <td className="py-1 pr-3 text-slate-700">{ec.libelle}</td>
                                        <td className="whitespace-nowrap py-1 pr-3 text-slate-400">{ec.ref}</td>
                                        <td className="whitespace-nowrap py-1 text-right tabular-nums text-slate-700">{eur(ec.montant)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="px-3 py-3 text-xs text-slate-500">
                                Détail des écritures indisponible pour ce poste (import balance ou données agrégées).
                              </p>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Charges fixes = structure (loyer, salaires, assurances...). Charges variables = liées à l’activité (achats,
            sous-traitance). Cliquez sur un poste pour voir le détail des écritures qui le composent.
          </p>
        </Section>
      )}

      <Section title="Détail des charges par catégorie (mensuel)">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mois</th>
                {CATEGORIES_CHARGES.map((c) => (
                  <th key={c.cle} className="!text-center">
                    {c.label}
                  </th>
                ))}
                <th className="!text-center">Total charges</th>
              </tr>
            </thead>
            <tbody>
              {entrees.pnl.map((m, i) => (
                <tr key={i}>
                  <td className="font-medium text-slate-800">{MOIS[i]}</td>
                  {CATEGORIES_CHARGES.map((c) => (
                    <td key={c.cle} className="num text-slate-600">
                      {eur(m[c.cle] as number)}
                    </td>
                  ))}
                  <td className="num font-semibold text-slate-800">{eur(totalCharges(m))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
