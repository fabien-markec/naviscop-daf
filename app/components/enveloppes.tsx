'use client';

import type { CashDisponible } from '@naviscop/finance-engine';
import { eur } from '@/lib/format';

const COULEURS = ['#0062B8', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#14B8A6', '#6366F1', '#94A3B8'];
const VERT = '#10B981';
const ROUGE = '#E11D48';

/**
 * Vue visuelle des enveloppes de provision : le solde bancaire réparti en enveloppes
 * (TVA, URSSAF, impôts, charges, rému, sécurité, investissements, saisonnalité) + le disponible.
 */
export function EnveloppesProvision({ data }: { data: CashDisponible }) {
  const solde = data.soldeBancaire;
  const totalProv = data.totalEngage;
  const negatif = data.cashDisponible < 0;
  const denom = (negatif ? totalProv : solde) || 1;

  const segments = data.deductions.map((d, i) => ({
    libelle: d.libelle,
    montant: d.montant,
    couleur: COULEURS[i % COULEURS.length],
  }));
  if (!negatif) {
    segments.push({ libelle: 'Cash disponible', montant: data.cashDisponible, couleur: VERT });
  }

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-slate-500">
          Enveloppes de provision
        </h2>
        <span className="text-xs text-slate-500">Solde bancaire : {eur(solde)}</span>
      </div>

      {/* Barre empilée */}
      <div className="flex h-5 w-full overflow-hidden rounded-full bg-slate-100">
        {segments.map((s, i) => (
          <div
            key={i}
            title={`${s.libelle} : ${eur(s.montant)}`}
            style={{ width: `${Math.max(0, (s.montant / denom) * 100).toFixed(2)}%`, backgroundColor: s.couleur }}
          />
        ))}
      </div>

      {/* Cartes enveloppes */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {data.deductions.map((d, i) => (
          <div key={d.libelle} className="flex items-center gap-2.5 rounded-xl border border-navy/[0.06] bg-white/60 px-3 py-2">
            <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ backgroundColor: COULEURS[i % COULEURS.length] }} />
            <div className="min-w-0">
              <p className="truncate text-[11px] text-slate-500">{d.libelle}</p>
              <p className="tabular text-sm font-semibold text-navy">{eur(d.montant)}</p>
            </div>
          </div>
        ))}
        <div className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 ${negatif ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'}`}>
          <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ backgroundColor: negatif ? ROUGE : VERT }} />
          <div className="min-w-0">
            <p className="truncate text-[11px] text-slate-500">Cash réellement disponible</p>
            <p className={`tabular text-sm font-semibold ${negatif ? 'text-rose-600' : 'text-emerald-600'}`}>{eur(data.cashDisponible)}</p>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs leading-snug text-slate-500">
        {negatif ? (
          <>
            Vos provisions ({eur(totalProv)}) dépassent votre solde bancaire de {eur(-data.cashDisponible)}. Autrement dit,
            l’argent présent est déjà entièrement engagé : chaque dépense supplémentaire puise dans une réserve nécessaire.
          </>
        ) : (
          <>
            Sur {eur(solde)} en banque, {eur(totalProv)} sont réservés dans des enveloppes (TVA, URSSAF, impôts, charges,
            rémunération, sécurité…). Il ne vous reste réellement que {eur(data.cashDisponible)} de libre.
          </>
        )}
      </p>
    </div>
  );
}
