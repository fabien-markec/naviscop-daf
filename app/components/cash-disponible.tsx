'use client';

import { useState } from 'react';
import { ChevronRight, Trash2 } from 'lucide-react';
import type { CashDisponible, ChargeFixe } from '@naviscop/finance-engine';
import { eur } from '@/lib/format';

const LIBELLE_CHARGES_FIXES = 'Charges fixes du mois à venir';

/**
 * La cascade du cash réellement disponible : solde bancaire, moins les engagements,
 * égale l'argent utilisable sans danger. Pilier 1 de NAVISCOP.
 * La ligne « Charges fixes du mois » est éditable si les callbacks sont fournis.
 */
export function CascadeCash({
  data,
  chargesFixes,
  onAjouterCharge,
  onSupprimerCharge,
}: {
  data: CashDisponible;
  chargesFixes?: ChargeFixe[];
  onAjouterCharge?: (charge: Omit<ChargeFixe, 'id'>) => void;
  onSupprimerCharge?: (id: string) => void;
}) {
  const negatif = data.cashDisponible < 0;
  const editable = !!onAjouterCharge;
  const [ouvert, setOuvert] = useState(false);
  const [libelle, setLibelle] = useState('');
  const [montant, setMontant] = useState(0);

  const ajouter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!libelle.trim() || montant <= 0 || !onAjouterCharge) return;
    onAjouterCharge({ libelle: libelle.trim(), montant });
    setLibelle('');
    setMontant(0);
  };

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-slate-700">Votre cash réellement disponible</h2>
        <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand">Pilier NAVISCOP</span>
      </div>

      <div className="space-y-1.5">
        <Ligne libelle="Solde bancaire" montant={data.soldeBancaire} fort />
        {data.deductions.map((d) => {
          const estCharges = d.libelle === LIBELLE_CHARGES_FIXES && editable;
          if (!estCharges) return <Ligne key={d.libelle} libelle={d.libelle} montant={-d.montant} tag={d.saisi ? undefined : 'estimé'} />;
          return (
            <button
              key={d.libelle}
              onClick={() => setOuvert((o) => !o)}
              className="flex w-full items-baseline justify-between gap-3 rounded-lg px-1 py-0.5 text-left hover:bg-slate-50"
            >
              <span className="flex items-center gap-1.5 text-sm text-slate-700">
                <ChevronRight className={`h-3.5 w-3.5 text-slate-600 transition-transform ${ouvert ? 'rotate-90' : ''}`} />
                {d.libelle}
                {(chargesFixes?.length ?? 0) === 0 && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-slate-600">estimé</span>
                )}
              </span>
              <span className="tabular flex-none text-sm text-slate-700">− {eur(d.montant)}</span>
            </button>
          );
        })}
      </div>

      {/* Panneau d'édition des charges fixes */}
      {editable && ouvert && (
        <div className="mt-2 rounded-xl border border-navy/10 bg-slate-50 p-3">
          {(chargesFixes?.length ?? 0) === 0 ? (
            <p className="mb-2 text-xs text-slate-700">Aucune charge fixe saisie : le montant est estimé (charges annuelles ÷ 12). Ajoutez vos charges pour un montant précis. Ces charges servent au calcul du cash disponible ; le compte de résultat et le plan de trésorerie se saisissent dans « Rentabilité ».</p>
          ) : (
            <ul className="mb-2 space-y-1">
              {chargesFixes!.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/70 px-2.5 py-1.5 text-sm">
                  <span className="text-slate-800">{c.libelle}</span>
                  <span className="flex items-center gap-2">
                    <span className="tabular text-slate-800">{eur(c.montant)}</span>
                    <button onClick={() => onSupprimerCharge?.(c.id)} className="text-slate-600 hover:text-rose-600" aria-label="Supprimer">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={ajouter} className="flex items-center gap-2">
            <input value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder="Charge (loyer, assurance…)" className="min-w-0 flex-1 rounded-lg border border-navy/10 bg-white px-2.5 py-1.5 text-sm text-navy outline-none focus:border-brand/50" />
            <input type="number" value={montant || ''} onChange={(e) => setMontant(Number(e.target.value))} placeholder="€ / mois" className="w-24 rounded-lg border border-navy/10 bg-white px-2.5 py-1.5 text-sm text-navy outline-none focus:border-brand/50" />
            <button type="submit" className="flex-none rounded-full bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-soft">Ajouter</button>
          </form>
        </div>
      )}

      <div className="mt-3 flex items-baseline justify-between border-t border-navy/10 pt-3">
        <span className="text-sm font-semibold text-navy">Cash réellement disponible</span>
        <span className={`tabular text-2xl font-semibold ${negatif ? 'text-rose-600' : 'text-emerald-600'}`}>{eur(data.cashDisponible)}</span>
      </div>

      <p className="mt-4 rounded-xl border border-navy/[0.08] bg-slate-50 px-3.5 py-2.5 text-xs leading-snug text-slate-700">
        {negatif ? (
          <>Attention : après vos provisions et engagements, votre solde bancaire de {eur(data.soldeBancaire)} est déjà entièrement mobilisé. Vous n’avez pas de marge disponible ce mois-ci sans prendre de risque.</>
        ) : (
          <>Votre compte affiche {eur(data.soldeBancaire)}, mais seulement {eur(data.cashDisponible)} sont réellement utilisables sans danger. Le reste est déjà dû ou nécessaire pour tenir.</>
        )}
      </p>
    </div>
  );
}

function Ligne({ libelle, montant, fort, tag }: { libelle: string; montant: number; fort?: boolean; tag?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-1">
      <span className={`flex items-center gap-2 text-sm ${fort ? 'font-medium text-navy' : 'text-slate-700'}`}>
        {libelle}
        {tag && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-slate-600">{tag}</span>}
      </span>
      <span className={`tabular flex-none text-sm ${fort ? 'font-semibold text-navy' : montant < 0 ? 'text-slate-700' : 'text-navy'}`}>
        {montant < 0 ? `− ${eur(Math.abs(montant))}` : eur(montant)}
      </span>
    </div>
  );
}
