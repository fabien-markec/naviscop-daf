'use client';

import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { MOIS } from '@naviscop/finance-engine';
import { useDossier } from '@/lib/dossier-context';
import { eur } from '@/lib/format';
import { PageHeader, Section, KpiCard } from '@/components/ui';

const MOIS_COURT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

export default function CommandesPage() {
  const { previsionnels, ajouterPrevisionnel, supprimerPrevisionnel } = useDossier();
  const [libelle, setLibelle] = useState('');
  const [montant, setMontant] = useState(0);
  const [tva, setTva] = useState(20);
  const [moisFacturation, setMoisFacturation] = useState(new Date().getMonth());
  const [moisEncaissement, setMoisEncaissement] = useState(new Date().getMonth());
  const [statut, setStatut] = useState<'signee' | 'prevue'>('signee');

  const commandes = useMemo(
    () => previsionnels.filter((m) => m.type === 'facture_a_venir'),
    [previsionnels],
  );

  const totalSignees = commandes.filter((c) => c.statut !== 'prevue').reduce((a, c) => a + c.montantHt, 0);
  const totalPrevues = commandes.filter((c) => c.statut === 'prevue').reduce((a, c) => a + c.montantHt, 0);

  // Projection des encaissements TTC par mois.
  const encaissementsParMois = useMemo(() => {
    const arr = Array<number>(12).fill(0);
    for (const c of commandes) {
      const j = c.moisEncaissement ?? c.moisIndex;
      if (j >= 0 && j <= 11) arr[j] += c.montantHt * (1 + c.tauxTva / 100);
    }
    return arr;
  }, [commandes]);

  const champ = 'rounded-xl border border-navy/10 bg-white/60 px-3 py-2 text-sm text-navy outline-none focus:border-brand/50';

  const soumettre = (e: React.FormEvent) => {
    e.preventDefault();
    if (!libelle.trim() || montant <= 0) return;
    ajouterPrevisionnel({
      type: 'facture_a_venir',
      libelle: libelle.trim(),
      montantHt: montant,
      tauxTva: tva,
      moisIndex: moisFacturation,
      moisEncaissement,
      statut,
    });
    setLibelle('');
    setMontant(0);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Carnet de commandes"
        subtitle="Saisissez vos commandes signées et prévues, avec leur mois de facturation et d'encaissement, pour projeter vos rentrées d'argent."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <KpiCard label="Commandes signées (HT)" value={eur(totalSignees)} tone="positive" info="Le CA sécurisé : commandes confirmées, à facturer." />
        <KpiCard label="Commandes prévues (HT)" value={eur(totalPrevues)} tone="warning" info="Le CA probable mais non confirmé. À sécuriser." />
        <KpiCard label="Total carnet (HT)" value={eur(totalSignees + totalPrevues)} />
      </div>

      <Section title="Ajouter une commande">
        <form onSubmit={soumettre} className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <input className={`${champ} md:col-span-3`} placeholder="Client / commande" value={libelle} onChange={(e) => setLibelle(e.target.value)} />
          <input type="number" className={`${champ} md:col-span-2`} placeholder="Montant HT" value={montant || ''} onChange={(e) => setMontant(Number(e.target.value))} />
          <select className={`${champ} md:col-span-1`} value={tva} onChange={(e) => setTva(Number(e.target.value))}>
            {[0, 5.5, 10, 20].map((t) => (
              <option key={t} value={t} className="bg-white">{t}%</option>
            ))}
          </select>
          <select className={`${champ} md:col-span-2`} value={moisFacturation} onChange={(e) => setMoisFacturation(Number(e.target.value))} title="Mois de facturation">
            {MOIS.map((m, i) => (
              <option key={m} value={i} className="bg-white">Facture : {m}</option>
            ))}
          </select>
          <select className={`${champ} md:col-span-2`} value={moisEncaissement} onChange={(e) => setMoisEncaissement(Number(e.target.value))} title="Mois d'encaissement">
            {MOIS.map((m, i) => (
              <option key={m} value={i} className="bg-white">Encaissé : {m}</option>
            ))}
          </select>
          <select className={`${champ} md:col-span-1`} value={statut} onChange={(e) => setStatut(e.target.value as 'signee' | 'prevue')}>
            <option value="signee" className="bg-white">Signée</option>
            <option value="prevue" className="bg-white">Prévue</option>
          </select>
          <button type="submit" className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-soft md:col-span-1">
            Ajouter
          </button>
        </form>
      </Section>

      <Section title="Projection des encaissements (TTC)">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {MOIS_COURT.map((m) => (
                  <th key={m} className="!text-center">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {encaissementsParMois.map((v, i) => (
                  <td key={i} className={`num ${v > 0 ? 'text-navy' : 'text-slate-300'}`}>{v > 0 ? eur(v) : '—'}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title={`Commandes (${commandes.length})`}>
        {commandes.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune commande. Ajoutez vos devis signés et opportunités pour projeter votre chiffre d'affaires.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client / commande</th>
                  <th className="!text-center">Montant HT</th>
                  <th>Facturation</th>
                  <th>Encaissement</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {commandes.map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium text-slate-800">{c.libelle}</td>
                    <td className="num text-slate-700">{eur(c.montantHt)}</td>
                    <td className="text-slate-500">{MOIS[c.moisIndex]}</td>
                    <td className="text-slate-500">{MOIS[c.moisEncaissement ?? c.moisIndex]}</td>
                    <td>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.statut === 'prevue' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {c.statut === 'prevue' ? 'Prévue' : 'Signée'}
                      </span>
                    </td>
                    <td className="!text-center">
                      <button onClick={() => supprimerPrevisionnel(c.id)} className="text-slate-500 hover:text-rose-600" aria-label="Supprimer">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-xs text-slate-500">
          Ces commandes alimentent le chiffre d'affaires (au mois de facturation) et la trésorerie (au mois d'encaissement).
        </p>
      </Section>
    </div>
  );
}
