'use client';

import { MOIS, type CashDisponible } from '@naviscop/finance-engine';
import { eur } from '@/lib/format';

const COULEURS = ['#0062B8', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#14B8A6'];
const VERT = '#10B981';
const ROUGE = '#E11D48';

/**
 * Encadré unique « Votre cash réellement disponible » :
 * en-tête = solde bancaire prévisionnel à la fin du mois en cours, puis le cash réellement
 * disponible (après déduction des échéances à venir), puis le détail des provisions.
 */
export function CashDisponibleCard({ data }: { data: CashDisponible }) {
  const negatif = data.cashDisponible < 0;
  const mois = (MOIS[data.moisReference] ?? '').toLowerCase();
  const denom = (negatif ? data.totalEngage : data.soldeBancaire) || 1;

  const segments = data.deductions.map((d, i) => ({ libelle: d.libelle, montant: d.montant, couleur: COULEURS[i % COULEURS.length] }));
  if (!negatif) segments.push({ libelle: 'Cash disponible', montant: data.cashDisponible, couleur: VERT });

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-slate-700">Votre cash réellement disponible</h2>
        <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand">Pilier NAVISCOP</span>
      </div>

      {/* Solde bancaire de fin de mois + cash réellement disponible */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-navy/10 pb-4">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-600">Solde bancaire à la fin de {mois}</p>
          <p className="tabular mt-0.5 text-lg font-semibold text-navy">{eur(data.soldeBancaire)}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wide text-slate-600">Cash réellement disponible</p>
          <p className={`tabular mt-0.5 text-2xl font-semibold ${negatif ? 'text-rose-600' : 'text-emerald-600'}`}>{eur(data.cashDisponible)}</p>
        </div>
      </div>

      {/* Barre empilée des provisions à venir */}
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-slate-100">
        {segments.map((s, i) => (
          <div key={i} title={`${s.libelle} : ${eur(s.montant)}`} style={{ width: `${Math.max(0, (s.montant / denom) * 100).toFixed(2)}%`, backgroundColor: s.couleur }} />
        ))}
      </div>

      {/* Détail des provisions (échéances à venir jusqu'à fin d'exercice) */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {data.deductions.map((d, i) => (
          <div key={d.libelle} className="flex items-center gap-2.5 rounded-xl border border-navy/[0.06] bg-white/60 px-3 py-2">
            <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ backgroundColor: COULEURS[i % COULEURS.length] }} />
            <div className="min-w-0">
              <p className="truncate text-[11px] text-slate-700">{d.libelle}</p>
              <p className="tabular text-sm font-semibold text-navy">{eur(d.montant)}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 rounded-xl border border-navy/[0.08] bg-slate-50 px-3.5 py-2.5 text-xs leading-snug text-slate-700">
        {negatif ? (
          <>Une fois toutes les échéances à venir provisionnées (TVA, URSSAF, impôts, rémunération, charges fixes) jusqu’à la fin de l’exercice, votre solde de fin de {mois} est déjà entièrement engagé : {eur(-data.cashDisponible)} manquent.</>
        ) : (
          <>Sur {eur(data.soldeBancaire)} prévus en banque fin {mois}, {eur(data.totalEngage)} sont déjà dus d’ici la fin de l’exercice (TVA, URSSAF, impôts, rémunération, charges fixes). Il ne reste réellement que {eur(data.cashDisponible)} de libre.</>
        )}
      </p>
    </div>
  );
}
