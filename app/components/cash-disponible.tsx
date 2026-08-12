'use client';

import type { CashDisponible } from '@naviscop/finance-engine';
import { eur } from '@/lib/format';

/**
 * La cascade du cash réellement disponible : solde bancaire, moins les engagements,
 * égale l'argent utilisable sans danger. Pilier 1 de NAVISCOP.
 */
export function CascadeCash({ data }: { data: CashDisponible }) {
  const negatif = data.cashDisponible < 0;
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-slate-500">
          Votre cash réellement disponible
        </h2>
        <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand">
          Pilier NAVISCOP
        </span>
      </div>

      <div className="space-y-1.5">
        <Ligne libelle="Solde bancaire" montant={data.soldeBancaire} fort />
        {data.deductions.map((d) => (
          <Ligne
            key={d.libelle}
            libelle={d.libelle}
            montant={-d.montant}
            tag={d.saisi ? undefined : 'estimé'}
          />
        ))}
      </div>

      <div className="mt-3 flex items-baseline justify-between border-t border-navy/10 pt-3">
        <span className="text-sm font-semibold text-navy">Cash réellement disponible</span>
        <span className={`tabular text-2xl font-semibold ${negatif ? 'text-rose-600' : 'text-emerald-600'}`}>
          {eur(data.cashDisponible)}
        </span>
      </div>

      <p className="mt-4 rounded-xl border border-navy/[0.08] bg-slate-50 px-3.5 py-2.5 text-xs leading-snug text-slate-600">
        {negatif ? (
          <>
            Attention : après vos provisions et engagements, votre solde bancaire de {eur(data.soldeBancaire)} est déjà
            entièrement mobilisé. Vous n’avez pas de marge disponible ce mois-ci sans prendre de risque.
          </>
        ) : (
          <>
            Votre compte affiche {eur(data.soldeBancaire)}, mais seulement {eur(data.cashDisponible)} sont réellement
            utilisables sans danger. Le reste est déjà dû ou nécessaire pour tenir.
          </>
        )}
      </p>
    </div>
  );
}

function Ligne({
  libelle,
  montant,
  fort,
  tag,
}: {
  libelle: string;
  montant: number;
  fort?: boolean;
  tag?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={`flex items-center gap-2 text-sm ${fort ? 'font-medium text-navy' : 'text-slate-600'}`}>
        {libelle}
        {tag && (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-slate-400">
            {tag}
          </span>
        )}
      </span>
      <span className={`tabular flex-none text-sm ${fort ? 'font-semibold text-navy' : montant < 0 ? 'text-slate-500' : 'text-navy'}`}>
        {montant < 0 ? `− ${eur(Math.abs(montant))}` : eur(montant)}
      </span>
    </div>
  );
}
