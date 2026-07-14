'use client';

import { MOIS } from '@naviscop/finance-engine';
import { useDossier } from '@/lib/dossier-context';
import { eur, pct } from '@/lib/format';
import { KpiCard, PageHeader, Section } from '@/components/ui';
import { ResultatChart } from '@/components/charts';

export default function RentabilitePage() {
  const { tableauDeBord } = useDossier();
  const { pnl } = tableauDeBord;
  const a = pnl.annuel;
  const chartData = pnl.parMois.map((m, i) => ({
    mois: MOIS[i].slice(0, 3),
    resultat: m.resultatNet,
    cumule: pnl.resultatCumule[i],
  }));

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
                <th className="!text-right">CA HT</th>
                <th className="!text-right">Marge brute</th>
                <th className="!text-right">EBE</th>
                <th className="!text-right">Résultat</th>
                <th className="!text-right">Cumulé</th>
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
    </div>
  );
}
