'use client';

import { useMemo, useState } from 'react';
import { appliquerScenario, type HypothesesScenario } from '@naviscop/finance-engine';
import { useDossier } from '@/lib/dossier-context';
import { eur } from '@/lib/format';
import { PageHeader, Section } from '@/components/ui';

const MOIS_COURT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function Curseur({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-slate-700">{label}</span>
        <span className="font-medium text-navy">
          {value > 0 && suffix === '%' ? '+' : ''}
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand"
      />
    </div>
  );
}

function Impact({ label, base, sim }: { label: string; base: number; sim: number }) {
  const delta = sim - base;
  return (
    <div className="card p-4">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1.5 text-xl font-semibold tabular-nums ${sim < 0 ? 'text-rose-600' : 'text-navy'}`}>
        {eur(sim)}
      </p>
      <p className={`mt-1 text-xs tabular-nums ${delta < 0 ? 'text-rose-600' : delta > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
        {delta >= 0 ? '+' : ''}
        {eur(delta)} vs base
      </p>
    </div>
  );
}

export default function ScenariosPage() {
  const { entrees: dossierActif } = useDossier();
  const [prix, setPrix] = useState(0);
  const [ca, setCa] = useState(0);
  const [embauche, setEmbauche] = useState(0);
  const [remu, setRemu] = useState(0);
  const [invest, setInvest] = useState(0);

  const h: HypothesesScenario = useMemo(
    () => ({
      variationPrixPct: prix / 100,
      variationCaPct: ca / 100,
      chargeMensuelleSupplementaire: embauche,
      remunerationSupplementaire: remu,
      investissementComptant: invest > 0 ? { montant: invest, moisIndex: 0 } : undefined,
    }),
    [prix, ca, embauche, remu, invest],
  );

  const res = useMemo(() => appliquerScenario(dossierActif, h), [h, dossierActif]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scénarios"
        subtitle="Mesurer l’impact d’une décision sur la trésorerie et le résultat avant de la prendre."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="Hypothèses">
          <div className="space-y-5">
            <Curseur label="Hausse / baisse de prix" value={prix} min={-30} max={30} step={1} suffix="%" onChange={setPrix} />
            <Curseur label="Variation de CA" value={ca} min={-50} max={50} step={1} suffix="%" onChange={setCa} />
            <Curseur label="Recrutement (coût chargé / mois)" value={embauche} min={0} max={6000} step={100} suffix=" €" onChange={setEmbauche} />
            <Curseur label="Rémunération dirigeant en plus / mois" value={remu} min={0} max={5000} step={100} suffix=" €" onChange={setRemu} />
            <Curseur label="Investissement comptant (janvier)" value={invest} min={0} max={80000} step={1000} suffix=" €" onChange={setInvest} />
          </div>
        </Section>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Impact label="Résultat net annuel" base={res.base.resultatNetAnnuel} sim={res.scenario.resultatNetAnnuel} />
            <Impact label="Trésorerie fin d’année" base={res.base.soldeFinAnnee} sim={res.scenario.soldeFinAnnee} />
            <Impact label="Point de tréso le plus bas" base={res.base.soldeFinLePlusBas} sim={res.scenario.soldeFinLePlusBas} />
            <div className="card p-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Mois critique</p>
              <p className="mt-1.5 text-xl font-semibold text-amber-600">
                {MOIS_COURT[res.scenario.moisCritiqueIndex]}
              </p>
              <p className="mt-1 text-xs text-slate-500">le plus tendu</p>
            </div>
          </div>
          <div className="card p-4 text-sm text-slate-500">
            {res.scenario.soldeFinLePlusBas < 0 ? (
              <span className="text-rose-600">
                ⚠️ Avec ces hypothèses, la trésorerie devient négative en cours d’année.
              </span>
            ) : (
              <span className="text-emerald-600">
                ✓ La trésorerie reste positive toute l’année avec ces hypothèses.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
