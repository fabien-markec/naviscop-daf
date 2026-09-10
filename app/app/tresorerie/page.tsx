'use client';

import { useMemo, useState } from 'react';
import { MOIS, tresorerieApresFiscalite } from '@naviscop/finance-engine';
import { ChevronDown } from 'lucide-react';
import { useDossier } from '@/lib/dossier-context';
import { eur } from '@/lib/format';
import { PageHeader, Section } from '@/components/ui';
import { FluxChart } from '@/components/charts';
import { CashDisponibleCard } from '@/components/enveloppes';
import { ProjectionFiscale } from '@/components/projection-fiscale';

export default function TresoreriePage() {
  const { tableauDeBord, entrees, profilFiscal, moisClotureIndex } = useDossier();
  const { tresorerie, cashDisponible } = tableauDeBord;
  const [projOuverte, setProjOuverte] = useState(false);
  const tresoFiscale = useMemo(() => tresorerieApresFiscalite(entrees, moisClotureIndex ?? -1), [entrees, moisClotureIndex]);

  const chartData = tresorerie.parMois.map((m, i) => ({
    mois: MOIS[i].slice(0, 3),
    encaissements: m.encaissements,
    decaissements: m.decaissements,
    solde: m.soldeFin,
  }));

  // Mois critique pertinent uniquement si la trésorerie passe sous 2 mois de charges.
  const seuilCritique = 2 * tresorerie.decaissementMensuelMoyen;
  const critiquePertinent = tresorerie.soldeFinLePlusBas < seuilCritique;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plan de trésorerie"
        subtitle="Reconstitution du réel et projection des soldes mensuels (TTC)."
      />

      <CashDisponibleCard data={cashDisponible} />

      <Section title="Encaissements, décaissements et solde">
        <FluxChart data={chartData} />
      </Section>

      {tresoFiscale && (
        <div className="rounded-2xl border border-brand/20 bg-brand/5 px-4 py-3 text-sm leading-relaxed text-slate-800">
          Une fois les cotisations et taxes projetées payées, votre trésorerie de fin d’année passe de{' '}
          <strong>{eur(tresoFiscale.soldeFinAvant)}</strong> à{' '}
          <strong className={tresoFiscale.soldeFinApres < 0 ? 'text-rose-600' : 'text-emerald-700'}>{eur(tresoFiscale.soldeFinApres)}</strong>.
          {tresoFiscale.moisNegatifApres >= 0 && (
            <> Attention : elle devient négative dès <strong>{MOIS[tresoFiscale.moisNegatifApres]}</strong>.</>
          )}
        </div>
      )}

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
                {tresoFiscale && <th className="!text-right">Prélèvements fiscaux</th>}
                {tresoFiscale && <th className="!text-right">Solde après fiscalité</th>}
              </tr>
            </thead>
            <tbody>
              {tresorerie.parMois.map((m, i) => {
                const critique = critiquePertinent && i === tresorerie.moisCritiqueIndex;
                const tf = tresoFiscale?.parMois[i];
                return (
                  <tr key={i} className={critique ? 'bg-rose-50' : ''}>
                    <td className="font-medium text-slate-800">{MOIS[i]}</td>
                    <td className="num text-slate-700">{eur(m.soldeDebut)}</td>
                    <td className="num text-emerald-600">{eur(m.encaissements)}</td>
                    <td className="num text-rose-600">{eur(m.decaissements)}</td>
                    <td className={`num ${m.variation < 0 ? 'text-rose-600' : 'text-slate-700'}`}>{eur(m.variation)}</td>
                    <td className={`num font-semibold ${m.soldeFin < 0 ? 'text-rose-600' : 'text-navy'}`}>{eur(m.soldeFin)}</td>
                    {tf && <td className="num text-rose-600">{tf.fiscal ? `− ${eur(tf.fiscal)}` : '—'}</td>}
                    {tf && <td className={`num font-semibold ${tf.soldeApres < 0 ? 'text-rose-600' : 'text-navy'}`}>{eur(tf.soldeApres)}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {critiquePertinent ? (
          <p className="mt-4 text-xs text-slate-700">
            Mois critique : <span className="text-amber-600">{MOIS[tresorerie.moisCritiqueIndex]}</span>{' '}
            ({eur(tresorerie.soldeFinLePlusBas)}) — sous votre matelas de 2 mois de charges. Décaissement mensuel moyen :{' '}
            {eur(tresorerie.decaissementMensuelMoyen)}.
          </p>
        ) : (
          <p className="mt-4 text-xs text-slate-700">
            Trésorerie au-dessus de 2 mois de charges toute l’année : aucun mois critique. Décaissement mensuel moyen :{' '}
            {eur(tresorerie.decaissementMensuelMoyen)}.
          </p>
        )}
      </Section>

      {/* Charges & taxes projetées : repliable, en bas, pour ne pas alourdir la page. */}
      {profilFiscal && (
        <div className="card p-0">
          <button
            onClick={() => setProjOuverte((o) => !o)}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <span className="text-[13px] font-semibold uppercase tracking-[0.06em] text-slate-700">Charges & taxes projetées</span>
            <ChevronDown className={`h-4 w-4 text-slate-600 transition-transform ${projOuverte ? 'rotate-180' : ''}`} />
          </button>
          {projOuverte && (
            <div className="px-5 pb-5">
              <ProjectionFiscale entrees={entrees} profil={profilFiscal} sansCadre />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
