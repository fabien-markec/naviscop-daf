'use client';

import { useDossier } from '@/lib/dossier-context';
import { eur } from '@/lib/format';
import { PageHeader, Section, ListeAlertes } from '@/components/ui';
import { InviterClient } from '@/components/inviter-client';

function ChampNombre({
  label,
  value,
  onChange,
  suffix,
  step = 1,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: number;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm text-slate-700">{label}</span>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-40 rounded-xl border border-navy/10 bg-white/60 px-3 py-2 text-sm tabular-nums text-navy outline-none focus:border-brand/50"
        />
        {suffix && <span className="text-sm text-slate-500">{suffix}</span>}
      </div>
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export default function ParametresPage() {
  const { entrees, majParametrage, tableauDeBord, reinitialiser, connecte } = useDossier();
  const p = entrees.parametrage;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paramétrage"
        subtitle="Objectifs et seuils du dossier. Les alertes et les KPI se recalculent en direct."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section title="Objectifs">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <ChampNombre
                label="Objectif de CA annuel"
                value={p.objectifCaAnnuel}
                step={1000}
                suffix="€"
                onChange={(v) => majParametrage({ objectifCaAnnuel: v })}
              />
              <ChampNombre
                label="Objectif de rémunération"
                value={p.objectifRemunerationMensuelle}
                step={100}
                suffix="€ / mois"
                onChange={(v) => majParametrage({ objectifRemunerationMensuelle: v })}
              />
              <ChampNombre
                label="Objectif de résultat net"
                value={p.objectifResultatNetAnnuel}
                step={1000}
                suffix="€ / an"
                onChange={(v) => majParametrage({ objectifResultatNetAnnuel: v })}
              />
            </div>
          </Section>

          <Section title="Trésorerie et sécurité">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <ChampNombre
                label="Solde initial de trésorerie"
                value={p.soldeInitialTresorerie}
                step={500}
                suffix="€"
                onChange={(v) => majParametrage({ soldeInitialTresorerie: v })}
              />
              <ChampNombre
                label="Sécurité de trésorerie"
                value={p.moisSecuriteTresorerie}
                step={0.5}
                suffix="mois de décaissement"
                hint="Seuil sous lequel la trésorerie est jugée fragile."
                onChange={(v) => majParametrage({ moisSecuriteTresorerie: v })}
              />
            </div>
          </Section>

          <Section title="Seuils d’alerte">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <ChampNombre
                label="Objectif de taux de marque"
                value={Math.round(p.objectifTauxMarque * 100)}
                step={1}
                suffix="% du CA"
                hint="En dessous, l’alerte « marge insuffisante » se déclenche."
                onChange={(v) => majParametrage({ objectifTauxMarque: v / 100 })}
              />
              <ChampNombre
                label="Charges fixes maximum"
                value={Math.round(p.seuilChargesFixesPctCa * 100)}
                step={1}
                suffix="% du CA"
                hint="Au dessus, l’alerte « charges fixes lourdes » se déclenche."
                onChange={(v) => majParametrage({ seuilChargesFixesPctCa: v / 100 })}
              />
            </div>
          </Section>

          {!connecte && (
            <button
              onClick={reinitialiser}
              className="rounded-full border border-navy/15 px-5 py-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              Réinitialiser le dossier de démo
            </button>
          )}
        </div>

        <div className="space-y-4">
          <InviterClient />
          <Section title="Alertes actuelles">
            <ListeAlertes alertes={tableauDeBord.alertes} />
          </Section>
          <Section title="Repères">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Résultat prévisionnel</dt>
                <dd className={tableauDeBord.kpis.resultatPrevisionnel < 0 ? 'text-rose-600' : 'text-emerald-600'}>
                  {eur(tableauDeBord.kpis.resultatPrevisionnel)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Seuil de rentabilité</dt>
                <dd className="text-slate-800">{eur(tableauDeBord.kpis.seuilRentabilite)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Mois de tréso d’avance</dt>
                <dd className="text-slate-800">{tableauDeBord.kpis.moisTresorerieAvance.toFixed(1)}</dd>
              </div>
            </dl>
          </Section>
        </div>
      </div>
    </div>
  );
}
