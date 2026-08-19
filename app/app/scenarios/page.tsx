'use client';

import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { appliquerScenario, MOIS, type HypothesesScenario } from '@naviscop/finance-engine';
import { useDossier } from '@/lib/dossier-context';
import { eur } from '@/lib/format';
import { PageHeader, Section } from '@/components/ui';

const MOIS_COURT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

interface ChargeScenario {
  libelle: string;
  montant: number;
  moisIndex: number;
  toutAnnee: boolean;
}

function LigneHypothese({
  label,
  value,
  min,
  max,
  step,
  suffix,
  mois,
  onValue,
  onMois,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  mois: number;
  onValue: (v: number) => void;
  onMois: (m: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="text-slate-700">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-medium text-navy">
            {value > 0 && suffix === '%' ? '+' : ''}
            {value}
            {suffix}
          </span>
          <select
            value={mois}
            onChange={(e) => onMois(Number(e.target.value))}
            className="rounded-lg border border-navy/10 bg-white/70 px-2 py-1 text-xs text-navy outline-none focus:border-brand/50"
            title="À partir de quel mois"
          >
            {MOIS.map((m, i) => (
              <option key={m} value={i}>dès {MOIS_COURT[i]}</option>
            ))}
          </select>
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onValue(Number(e.target.value))} className="w-full accent-brand" />
    </div>
  );
}

function Impact({ label, base, sim }: { label: string; base: number; sim: number }) {
  const delta = sim - base;
  return (
    <div className="card p-4">
      <p className="text-[11px] uppercase tracking-wide text-slate-700">{label}</p>
      <p className={`mt-1.5 text-xl font-semibold tabular-nums ${sim < 0 ? 'text-rose-600' : 'text-navy'}`}>{eur(sim)}</p>
      <p className={`mt-1 text-xs tabular-nums ${delta < 0 ? 'text-rose-600' : delta > 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
        {delta >= 0 ? '+' : ''}
        {eur(delta)} vs base
      </p>
    </div>
  );
}

export default function ScenariosPage() {
  const { entrees: dossierActif } = useDossier();
  const [prix, setPrix] = useState(0);
  const [moisPrix, setMoisPrix] = useState(0);
  const [ca, setCa] = useState(0);
  const [moisCa, setMoisCa] = useState(0);
  const [embauche, setEmbauche] = useState(0);
  const [moisCharge, setMoisCharge] = useState(0);
  const [remu, setRemu] = useState(0);
  const [moisRemu, setMoisRemu] = useState(0);
  const [invest, setInvest] = useState(0);
  const [moisInvest, setMoisInvest] = useState(0);
  const [charges, setCharges] = useState<ChargeScenario[]>([]);

  const [chLibelle, setChLibelle] = useState('');
  const [chMontant, setChMontant] = useState(0);
  const [chMois, setChMois] = useState(0);
  const [chRecurrent, setChRecurrent] = useState(false);

  const h: HypothesesScenario = useMemo(
    () => ({
      variationPrixPct: prix / 100,
      moisPrix,
      variationCaPct: ca / 100,
      moisCa,
      chargeMensuelleSupplementaire: embauche,
      moisCharge,
      remunerationSupplementaire: remu,
      moisRemu,
      investissementComptant: invest > 0 ? { montant: invest, moisIndex: moisInvest } : undefined,
      chargesScenario: charges,
    }),
    [prix, moisPrix, ca, moisCa, embauche, moisCharge, remu, moisRemu, invest, moisInvest, charges],
  );

  const res = useMemo(() => appliquerScenario(dossierActif, h), [h, dossierActif]);

  const ajouterCharge = (e: React.FormEvent) => {
    e.preventDefault();
    if (chMontant <= 0) return;
    setCharges((c) => [...c, { libelle: chLibelle.trim() || 'Charge', montant: chMontant, moisIndex: chMois, toutAnnee: chRecurrent }]);
    setChLibelle('');
    setChMontant(0);
  };
  const champ = 'rounded-xl border border-navy/10 bg-white/60 px-3 py-2 text-sm text-navy outline-none focus:border-brand/50';

  return (
    <div className="space-y-6">
      <PageHeader title="Scénarios" subtitle="Mesurer l’impact d’une décision sur la trésorerie et le résultat avant de la prendre." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="Hypothèses">
          <p className="mb-4 text-xs text-slate-700">Chaque hypothèse s’applique à partir du mois que vous choisissez à droite.</p>
          <div className="space-y-5">
            <LigneHypothese label="Hausse / baisse de prix" value={prix} min={-30} max={30} step={1} suffix="%" mois={moisPrix} onValue={setPrix} onMois={setMoisPrix} />
            <LigneHypothese label="Variation de CA" value={ca} min={-50} max={50} step={1} suffix="%" mois={moisCa} onValue={setCa} onMois={setMoisCa} />
            <LigneHypothese label="Recrutement (coût chargé / mois)" value={embauche} min={0} max={6000} step={100} suffix=" €" mois={moisCharge} onValue={setEmbauche} onMois={setMoisCharge} />
            <LigneHypothese label="Rémunération dirigeant en plus / mois" value={remu} min={0} max={5000} step={100} suffix=" €" mois={moisRemu} onValue={setRemu} onMois={setMoisRemu} />
            <LigneHypothese label="Investissement comptant" value={invest} min={0} max={80000} step={1000} suffix=" €" mois={moisInvest} onValue={setInvest} onMois={setMoisInvest} />
          </div>

          {/* Ajouter une charge */}
          <div className="mt-6 border-t border-navy/10 pt-4">
            <p className="mb-2 text-sm font-medium text-navy">Ajouter une charge</p>
            <form onSubmit={ajouterCharge} className="grid grid-cols-1 gap-2 sm:grid-cols-12">
              <input className={`${champ} sm:col-span-4`} placeholder="Libellé" value={chLibelle} onChange={(e) => setChLibelle(e.target.value)} />
              <input type="number" className={`${champ} sm:col-span-3`} placeholder="Montant HT" value={chMontant || ''} onChange={(e) => setChMontant(Number(e.target.value))} />
              <select className={`${champ} sm:col-span-2`} value={chMois} onChange={(e) => setChMois(Number(e.target.value))}>
                {MOIS.map((m, i) => (<option key={m} value={i}>{m}</option>))}
              </select>
              <select className={`${champ} sm:col-span-2`} value={chRecurrent ? '1' : '0'} onChange={(e) => setChRecurrent(e.target.value === '1')}>
                <option value="0">Ponctuelle</option>
                <option value="1">Toute l’année</option>
              </select>
              <button type="submit" className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-soft sm:col-span-1">+</button>
            </form>
            {charges.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {charges.map((c, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 rounded-lg border border-navy/[0.08] bg-white/60 px-3 py-1.5 text-sm">
                    <span className="text-slate-800">
                      {c.libelle} · {eur(c.montant)} · {c.toutAnnee ? `récurrent dès ${MOIS[c.moisIndex]}` : MOIS[c.moisIndex]}
                    </span>
                    <button onClick={() => setCharges((list) => list.filter((_, k) => k !== i))} className="text-slate-600 hover:text-rose-600" aria-label="Supprimer">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Impact label="Résultat net annuel" base={res.base.resultatNetAnnuel} sim={res.scenario.resultatNetAnnuel} />
            <Impact label="Trésorerie fin d’année" base={res.base.soldeFinAnnee} sim={res.scenario.soldeFinAnnee} />
            <Impact label="Point de tréso le plus bas" base={res.base.soldeFinLePlusBas} sim={res.scenario.soldeFinLePlusBas} />
            <div className="card p-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-700">Mois critique</p>
              <p className="mt-1.5 text-xl font-semibold text-amber-600">{MOIS_COURT[res.scenario.moisCritiqueIndex]}</p>
              <p className="mt-1 text-xs text-slate-700">le plus tendu</p>
            </div>
          </div>
          <div className="card p-4 text-sm text-slate-700">
            {res.scenario.soldeFinLePlusBas < 0 ? (
              <span className="text-rose-600">⚠️ Avec ces hypothèses, la trésorerie devient négative en cours d’année.</span>
            ) : (
              <span className="text-emerald-600">✓ La trésorerie reste positive toute l’année avec ces hypothèses.</span>
            )}
          </div>
        </div>
      </div>

      <Section title="Détail mois par mois (avec ces hypothèses)">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mois</th>
                <th className="!text-right">Chiffre d’affaires</th>
                <th className="!text-right">Résultat</th>
                <th className="!text-right">Trésorerie fin de mois</th>
              </tr>
            </thead>
            <tbody>
              {res.parMois.map((m, i) => (
                <tr key={i}>
                  <td className="font-medium text-slate-800">{MOIS[i]}</td>
                  <td className="num text-slate-700">{eur(m.caHt)}</td>
                  <td className={`num ${m.resultatNet < 0 ? 'text-rose-600' : 'text-slate-700'}`}>{eur(m.resultatNet)}</td>
                  <td className={`num font-medium ${m.soldeFin < 0 ? 'text-rose-600' : 'text-slate-800'}`}>{eur(m.soldeFin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
