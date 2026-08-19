'use client';

import { useMemo, useState } from 'react';
import { calculerCapaciteRemuneration, TAUX_CHARGES_SOCIALES_DEFAUT } from '@naviscop/finance-engine';
import { useDossier } from '@/lib/dossier-context';
import { eur, pct } from '@/lib/format';
import { PageHeader, Section, KpiCard } from '@/components/ui';

export default function RemunerationPage() {
  const { entrees } = useDossier();
  const [remuSouhaitee, setRemuSouhaitee] = useState(
    entrees.parametrage.objectifRemunerationMensuelle || 3000,
  );
  const [tauxPct, setTauxPct] = useState(Math.round(TAUX_CHARGES_SOCIALES_DEFAUT * 100));

  const capacite = useMemo(
    () => calculerCapaciteRemuneration(entrees, remuSouhaitee, tauxPct / 100),
    [entrees, remuSouhaitee, tauxPct],
  );

  const champ =
    'w-40 rounded-xl border border-navy/10 bg-white/60 px-3 py-2 text-sm tabular-nums text-navy outline-none focus:border-brand/50';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Capacité de rémunération"
        subtitle="Combien pouvez-vous vous payer sans mettre l'entreprise en tension, et quel chiffre d'affaires pour vous payer davantage ?"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <KpiCard
          label="Finançable durablement"
          value={`${eur(capacite.capaciteActuelleMensuelle)} / mois`}
          tone={capacite.capaciteActuelleMensuelle <= 0 ? 'negative' : 'positive'}
          info="Ce que l'activité peut vous verser chaque mois, en plus, sans puiser dans la trésorerie (à partir du cash généré)."
        />
        <KpiCard label="Taux de marge" value={pct(capacite.tauxMarge)} info="Part du chiffre d'affaires qui reste après les achats directs. C'est ce qui finance vos charges et votre rémunération." />
        <KpiCard label="CA annuel actuel" value={eur(capacite.caActuelAnnuel)} />
      </div>

      <Section title="Votre objectif de rémunération">
        <div className="flex flex-wrap items-end gap-6">
          <label className="block">
            <span className="text-sm text-slate-700">Rémunération nette souhaitée</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                step={100}
                value={remuSouhaitee}
                onChange={(e) => setRemuSouhaitee(Number(e.target.value))}
                className={champ}
              />
              <span className="text-sm text-slate-700">€ / mois</span>
            </div>
          </label>
          <label className="block">
            <span className="text-sm text-slate-700">Taux de charges sociales</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                step={1}
                value={tauxPct}
                onChange={(e) => setTauxPct(Number(e.target.value))}
                className={champ}
              />
              <span className="text-sm text-slate-700">%</span>
            </div>
            <span className="mt-1 block text-xs text-slate-700">TNS ≈ 45 %, assimilé salarié ≈ 80 %.</span>
          </label>
        </div>
      </Section>

      <Section title="Simulation : quel CA pour quelle rémunération ?">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rémunération nette</th>
                <th className="!text-center">Coût total (avec charges)</th>
                <th>Finançable aujourd’hui ?</th>
                <th className="!text-center">CA annuel minimum</th>
                <th className="!text-center">CA à générer en plus</th>
              </tr>
            </thead>
            <tbody>
              {capacite.lignes.map((l, i) => (
                <tr key={l.remuNetteMensuelle + '-' + i}>
                  <td className="font-medium text-slate-800">
                    {eur(l.remuNetteMensuelle)} / mois
                    {i === 0 && <span className="ml-2 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">souhaité</span>}
                  </td>
                  <td className="num text-slate-700">{eur(l.coutTotalMensuel)} / mois</td>
                  <td>
                    {l.financableMaintenant ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Oui</span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Pas encore</span>
                    )}
                  </td>
                  <td className="num text-slate-700">{eur(l.caMinimumAnnuel)}</td>
                  <td className={`num font-medium ${l.effortCaMensuel > 0 ? 'text-amber-700' : 'text-slate-600'}`}>
                    {l.effortCaMensuel > 0 ? `+ ${eur(l.effortCaMensuel)} / mois` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 rounded-xl border border-navy/[0.08] bg-slate-50 px-3.5 py-2.5 text-xs leading-snug text-slate-600">
          {capacite.lignes[0]?.financableMaintenant
            ? `Vous pouvez vous verser ${eur(capacite.lignes[0].remuNetteMensuelle)} par mois dès maintenant, l'activité le finance. Gardez votre matelas de sécurité de trésorerie avant d'augmenter.`
            : `Pour vous verser ${eur(capacite.lignes[0]?.remuNetteMensuelle ?? 0)} par mois durablement, il faut générer environ ${eur(capacite.lignes[0]?.effortCaMensuel ?? 0)} de chiffre d'affaires en plus chaque mois. En attendant, une rémunération supérieure puise dans la trésorerie.`}
        </p>
      </Section>
    </div>
  );
}
