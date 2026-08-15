'use client';

import { MOIS } from '@naviscop/finance-engine';
import { useDossier } from '@/lib/dossier-context';
import { eur } from '@/lib/format';
import { PageHeader, Section } from '@/components/ui';
import { FluxChart } from '@/components/charts';
import { CascadeCash } from '@/components/cash-disponible';
import { EnveloppesProvision } from '@/components/enveloppes';

export default function TresoreriePage() {
  const { tableauDeBord } = useDossier();
  const { tresorerie, cashDisponible } = tableauDeBord;
  const chartData = tresorerie.parMois.map((m, i) => ({
    mois: MOIS[i].slice(0, 3),
    encaissements: m.encaissements,
    decaissements: m.decaissements,
    solde: m.soldeFin,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plan de trésorerie"
        subtitle="Reconstitution du réel et projection des soldes mensuels (TTC)."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CascadeCash data={cashDisponible} />
        <EnveloppesProvision data={cashDisponible} />
      </div>

      <Section title="Encaissements, décaissements et solde">
        <FluxChart data={chartData} />
      </Section>

      <Section title="Détail mensuel">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mois</th>
                <th className="!text-right">Solde début</th>
                <th className="!text-right">Encaissements</th>
                <th className="!text-right">Décaissements</th>
                <th className="!text-right">Variation</th>
                <th className="!text-right">Solde fin</th>
              </tr>
            </thead>
            <tbody>
              {tresorerie.parMois.map((m, i) => {
                const critique = i === tresorerie.moisCritiqueIndex;
                return (
                  <tr key={i} className={critique ? 'bg-rose-50' : ''}>
                    <td className="font-medium text-slate-800">{MOIS[i]}</td>
                    <td className="num text-slate-500">{eur(m.soldeDebut)}</td>
                    <td className="num text-emerald-600">{eur(m.encaissements)}</td>
                    <td className="num text-rose-600">{eur(m.decaissements)}</td>
                    <td className={`num ${m.variation < 0 ? 'text-rose-600' : 'text-slate-700'}`}>{eur(m.variation)}</td>
                    <td className={`num font-semibold ${m.soldeFin < 0 ? 'text-rose-600' : 'text-navy'}`}>{eur(m.soldeFin)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Mois critique : <span className="text-amber-600">{MOIS[tresorerie.moisCritiqueIndex]}</span>{' '}
          ({eur(tresorerie.soldeFinLePlusBas)}). Décaissement mensuel moyen :{' '}
          {eur(tresorerie.decaissementMensuelMoyen)}.
        </p>
      </Section>
    </div>
  );
}
