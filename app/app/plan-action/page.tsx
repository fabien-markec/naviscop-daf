'use client';

import { useMemo, useState } from 'react';
import { Trash2, Plus, Sparkles } from 'lucide-react';
import { analyserCommeDaf } from '@naviscop/finance-engine';
import { type StatutAction } from '@/lib/use-plan-action';
import { useDossier } from '@/lib/dossier-context';
import { PageHeader, Section } from '@/components/ui';

const STATUTS: { valeur: StatutAction; label: string; classe: string }[] = [
  { valeur: 'a_faire', label: 'À faire', classe: 'bg-slate-100 text-slate-700' },
  { valeur: 'en_cours', label: 'En cours', classe: 'bg-amber-100 text-amber-600' },
  { valeur: 'fait', label: 'Fait', classe: 'bg-emerald-100 text-emerald-600' },
];

export default function PlanActionPage() {
  const { planActions: items, ajouterAction: ajouter, majStatutAction: majStatut, supprimerAction: supprimer, entrees } = useDossier();
  const [action, setAction] = useState('');
  const [responsable, setResponsable] = useState('');
  const [echeance, setEcheance] = useState('');
  const [impact, setImpact] = useState('');

  // Recommandations issues de l'analyse DAF, transformables en actions.
  const recommandations = useMemo(() => analyserCommeDaf(entrees).recommandations, [entrees]);
  const dejaPresente = (texte: string) => items.some((it) => it.action.trim() === texte.trim());
  const recoRestantes = recommandations.filter((r) => !dejaPresente(r));

  const ajouterReco = (texte: string) => {
    if (dejaPresente(texte)) return;
    ajouter({ action: texte, responsable: '', echeance: '', impact: 'Recommandation de l’analyse' });
  };
  const ajouterToutesRecos = () => recoRestantes.forEach(ajouterReco);

  const soumettre = (e: React.FormEvent) => {
    e.preventDefault();
    if (!action.trim()) return;
    ajouter({ action: action.trim(), responsable: responsable.trim(), echeance, impact: impact.trim() });
    setAction('');
    setResponsable('');
    setEcheance('');
    setImpact('');
  };

  const champClasse =
    'rounded-xl border border-navy/10 bg-white/60 px-3 py-2 text-sm text-navy outline-none focus:border-brand/50';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plan d’action"
        subtitle="Les recommandations du DAF, transformées en décisions suivies : action, responsable, échéance, statut."
      />

      <Section
        title="Recommandations du DAF (issues de l’analyse)"
        action={
          recoRestantes.length > 0 ? (
            <button
              onClick={ajouterToutesRecos}
              className="flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-xs font-medium text-white hover:bg-brand-soft"
            >
              <Sparkles className="h-3.5 w-3.5" /> Tout ajouter au plan
            </button>
          ) : null
        }
      >
        {recommandations.length === 0 ? (
          <p className="text-sm text-slate-700">Aucune recommandation particulière : maintenez le cap.</p>
        ) : (
          <ul className="space-y-2">
            {recommandations.map((r, i) => {
              const dedans = dejaPresente(r);
              return (
                <li
                  key={i}
                  className="flex items-start justify-between gap-3 rounded-xl border border-navy/[0.08] bg-white/60 px-3.5 py-3"
                >
                  <span className="text-sm leading-snug text-slate-700">{r}</span>
                  {dedans ? (
                    <span className="flex-none rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                      Ajoutée
                    </span>
                  ) : (
                    <button
                      onClick={() => ajouterReco(r)}
                      className="flex flex-none items-center gap-1 rounded-full border border-brand/30 px-2.5 py-1 text-[11px] font-semibold text-brand hover:bg-brand/5"
                    >
                      <Plus className="h-3 w-3" /> Ajouter
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Nouvelle action">
        <form onSubmit={soumettre} className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <input
            className={`${champClasse} md:col-span-4`}
            placeholder="Action à mener"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          />
          <input
            className={`${champClasse} md:col-span-3`}
            placeholder="Responsable"
            value={responsable}
            onChange={(e) => setResponsable(e.target.value)}
          />
          <input
            type="date"
            className={`${champClasse} md:col-span-2`}
            value={echeance}
            onChange={(e) => setEcheance(e.target.value)}
          />
          <input
            className={`${champClasse} md:col-span-2`}
            placeholder="Impact attendu"
            value={impact}
            onChange={(e) => setImpact(e.target.value)}
          />
          <button
            type="submit"
            className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-soft md:col-span-1"
          >
            Ajouter
          </button>
        </form>
      </Section>

      <Section title={`Actions (${items.length})`}>
        {items.length === 0 ? (
          <p className="text-sm text-slate-700">Aucune action pour l’instant. Ajoutez la première décision à suivre.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Responsable</th>
                  <th>Échéance</th>
                  <th>Impact</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <td className="font-medium text-slate-800">{it.action}</td>
                    <td className="text-slate-700">{it.responsable || '—'}</td>
                    <td className="text-slate-700">
                      {it.echeance ? new Date(it.echeance).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="text-slate-700">{it.impact || '—'}</td>
                    <td>
                      <select
                        value={it.statut}
                        onChange={(e) => majStatut(it.id, e.target.value as StatutAction)}
                        className={`rounded-md px-2 py-1 text-xs outline-none ${
                          STATUTS.find((s) => s.valeur === it.statut)?.classe
                        }`}
                      >
                        {STATUTS.map((s) => (
                          <option key={s.valeur} value={s.valeur} className="bg-white text-navy">
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="!text-center">
                      <button
                        onClick={() => supprimer(it.id)}
                        className="text-slate-700 hover:text-rose-600"
                        aria-label="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
