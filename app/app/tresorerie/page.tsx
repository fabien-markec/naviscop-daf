'use client';

import { useMemo, useState } from 'react';
import { MOIS, tresorerieApresFiscalite } from '@naviscop/finance-engine';
import { ChevronDown, Trash2 } from 'lucide-react';
import { useDossier } from '@/lib/dossier-context';
import { eur } from '@/lib/format';
import { PageHeader, Section } from '@/components/ui';
import { FluxChart } from '@/components/charts';
import { CashDisponibleCard } from '@/components/enveloppes';
import { ProjectionFiscale } from '@/components/projection-fiscale';

export default function TresoreriePage() {
  const { tableauDeBord, entrees, profilFiscal, moisClotureIndex, previsionnels, ajouterPrevisionnel, supprimerPrevisionnel } = useDossier();
  const { tresorerie, cashDisponible } = tableauDeBord;
  const [projOuverte, setProjOuverte] = useState(false);

  // #6 — mouvements bancaires hors compte de résultat (dividendes, épargne, emprunt, investissement…).
  const mouvementsBancaires = previsionnels.filter((mv) => mv.type === 'mouvement_bancaire');
  const [libOp, setLibOp] = useState('');
  const [mntOp, setMntOp] = useState(0);
  const [sensOp, setSensOp] = useState<'sortie' | 'entree'>('sortie');
  const [moisOp, setMoisOp] = useState(new Date().getMonth());
  const champOp = 'rounded-xl border border-navy/10 bg-white/60 px-3 py-2 text-sm text-navy outline-none focus:border-brand/50';
  const ajouterOp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!libOp.trim() || mntOp <= 0) return;
    ajouterPrevisionnel({ type: 'mouvement_bancaire', libelle: libOp.trim(), montantHt: mntOp, tauxTva: 0, moisIndex: moisOp, sensCash: sensOp });
    setLibOp('');
    setMntOp(0);
  };
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

      {/* #6 — Opérations bancaires hors compte de résultat */}
      <Section title="Opérations bancaires hors compte de résultat">
        <p className="mb-3 text-xs text-slate-700">
          Mouvements qui touchent la trésorerie mais pas le résultat : versement de dividendes, épargne sur un autre compte,
          remboursement d’emprunt, investissement, obtention d’un prêt bancaire, apport…
        </p>
        <form onSubmit={ajouterOp} className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <input className={`${champOp} md:col-span-4`} placeholder="Libellé (ex. dividendes, remboursement prêt)" value={libOp} onChange={(e) => setLibOp(e.target.value)} list="ops-bancaires" />
          <datalist id="ops-bancaires">
            <option value="Versement de dividendes" />
            <option value="Épargne (autre compte)" />
            <option value="Remboursement d'emprunt" />
            <option value="Investissement" />
            <option value="Obtention d'un prêt bancaire" />
            <option value="Apport en compte courant" />
          </datalist>
          <input type="number" className={`${champOp} md:col-span-2`} placeholder="Montant €" value={mntOp || ''} onChange={(e) => setMntOp(Number(e.target.value))} />
          <select className={`${champOp} md:col-span-2`} value={sensOp} onChange={(e) => setSensOp(e.target.value as 'sortie' | 'entree')} title="Sens du flux">
            <option value="sortie" className="bg-white">Sortie (− trésorerie)</option>
            <option value="entree" className="bg-white">Entrée (+ trésorerie)</option>
          </select>
          <select className={`${champOp} md:col-span-2`} value={moisOp} onChange={(e) => setMoisOp(Number(e.target.value))}>
            {MOIS.map((m, i) => (<option key={m} value={i} className="bg-white">{m}</option>))}
          </select>
          <button type="submit" className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-soft md:col-span-2">Ajouter</button>
        </form>

        {mouvementsBancaires.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Libellé</th><th>Sens</th><th>Mois</th><th className="!text-right">Montant</th><th></th></tr>
              </thead>
              <tbody>
                {mouvementsBancaires.map((mv) => (
                  <tr key={mv.id}>
                    <td className="font-medium text-slate-800">{mv.libelle}</td>
                    <td className={mv.sensCash === 'entree' ? 'text-emerald-600' : 'text-rose-600'}>{mv.sensCash === 'entree' ? 'Entrée' : 'Sortie'}</td>
                    <td className="text-slate-700">{MOIS[mv.moisIndex]}</td>
                    <td className={`num font-medium ${mv.sensCash === 'entree' ? 'text-emerald-600' : 'text-rose-600'}`}>{mv.sensCash === 'entree' ? '+' : '−'} {eur(mv.montantHt)}</td>
                    <td className="!text-right">
                      <button onClick={() => supprimerPrevisionnel(mv.id)} className="text-slate-600 hover:text-rose-600" aria-label="Supprimer">
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
