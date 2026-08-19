import type { ReactNode } from 'react';
import type { Alerte } from '@naviscop/finance-engine';

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-8">
      <h1 className="text-[1.7rem] font-semibold text-navy">{title}</h1>
      {subtitle && <p className="mt-1.5 text-sm font-medium text-slate-700">{subtitle}</p>}
    </header>
  );
}

const TONE = {
  neutral: 'text-navy',
  positive: 'text-emerald-600',
  negative: 'text-rose-600',
  warning: 'text-amber-600',
} as const;

const TONE_BAR = {
  neutral: 'bg-brand/50',
  positive: 'bg-emerald-400/60',
  negative: 'bg-rose-400/60',
  warning: 'bg-amber-400/60',
} as const;

export function KpiCard({
  label,
  value,
  hint,
  info,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  hint?: string;
  /** Explication en langage dirigeant, révélée au survol du point d'interrogation. */
  info?: string;
  tone?: keyof typeof TONE;
}) {
  return (
    <div className="group card relative overflow-hidden p-4 transition-all duration-200 hover:bg-white/70">
      <span className={`absolute inset-x-0 top-0 h-px ${TONE_BAR[tone]} opacity-60`} />
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-slate-700">{label}</p>
        {info && (
          <span className="group/info relative flex-none">
            <span
              tabIndex={0}
              className="flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-slate-300 text-[9px] font-semibold text-slate-600 hover:border-brand/50 hover:text-brand"
              aria-label={info}
            >
              ?
            </span>
            <span className="pointer-events-none absolute right-0 top-6 z-20 w-56 rounded-xl border border-navy/10 bg-navy px-3 py-2 text-[11px] font-normal leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/info:opacity-100 group-focus-within/info:opacity-100">
              {info}
            </span>
          </span>
        )}
      </div>
      <p className={`tabular mt-2 text-[1.7rem] font-semibold leading-none ${TONE[tone]}`}>{value}</p>
      {hint && <p className="mt-1.5 text-xs text-slate-700">{hint}</p>}
    </div>
  );
}

export function StatBar({
  stats,
}: {
  stats: { label: string; value: string; hint?: string; tone?: keyof typeof TONE }[];
}) {
  return (
    <div className="card flex flex-col divide-y divide-navy/[0.08] md:flex-row md:divide-x md:divide-y-0">
      {stats.map((s) => (
        <div key={s.label} className="flex-1 px-5 py-4">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-slate-700">{s.label}</p>
          <p className={`tabular mt-2 text-[1.85rem] font-semibold leading-none ${TONE[s.tone ?? 'neutral']}`}>{s.value}</p>
          {s.hint && <p className="mt-1.5 text-xs text-slate-700">{s.hint}</p>}
        </div>
      ))}
    </div>
  );
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-slate-700">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ListeAlertes({ alertes }: { alertes: Alerte[] }) {
  if (alertes.length === 0)
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-600">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs">✓</span>
        Situation sous contrôle, aucune alerte.
      </div>
    );
  return (
    <ul className="space-y-2">
      {alertes.map((a) => {
        const rouge = a.niveau === 'rouge';
        return (
          <li
            key={a.code}
            className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 text-sm ${
              rouge ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-amber-200 bg-amber-50 text-amber-700'
            }`}
          >
            <span
              className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${rouge ? 'bg-rose-400' : 'bg-amber-400'} ${
                rouge ? 'shadow-[0_0_8px_rgba(251,113,133,0.8)]' : ''
              }`}
            />
            <span className="leading-snug">{a.message}</span>
          </li>
        );
      })}
    </ul>
  );
}
