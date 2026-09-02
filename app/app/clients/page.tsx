'use client';

import { useRouter } from 'next/navigation';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { calculerTableauDeBord, fusionnerPrevisionnels } from '@naviscop/finance-engine';
import { useDossier, type DossierEntry } from '@/lib/dossier-context';
import { eur } from '@/lib/format';
import { PageHeader, Section } from '@/components/ui';

function resume(d: DossierEntry) {
  const tdb = calculerTableauDeBord(fusionnerPrevisionnels(d.entreesBase, d.previsionnels, d.moisClotureIndex ?? -1));
  const rouges = tdb.alertes.filter((a) => a.niveau === 'rouge').length;
  const oranges = tdb.alertes.filter((a) => a.niveau === 'orange').length;
  return {
    ca: tdb.pnl.annuel.caHt,
    resultat: tdb.kpis.resultatPrevisionnel,
    treso12: tdb.kpis.tresorerie12Mois,
    moisCritique: tdb.tresorerie.moisCritiqueIndex,
    soldeBas: tdb.tresorerie.soldeFinLePlusBas,
    rouges,
    oranges,
  };
}

export default function ClientsPage() {
  const { role, dossiers, ouvrirDossier, supprimerDossier } = useDossier();
  const router = useRouter();

  if (role === 'client') {
    return (
      <div className="space-y-6">
        <PageHeader title="Portefeuille clients" />
        <Section title="Accès réservé">
          <p className="text-sm text-slate-700">Cette vue est réservée au DAF. Vous accédez uniquement à votre entreprise.</p>
        </Section>
      </div>
    );
  }

  const ouvrir = (id: string) => {
    ouvrirDossier(id);
    router.push('/');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Portefeuille clients" subtitle={`${dossiers.length} dossiers suivis. Vue d'ensemble et accès rapide.`} />
        <button
          onClick={() => router.push('/nouveau')}
          className="flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-soft"
        >
          <Plus className="h-4 w-4" /> Nouveau client
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {dossiers.map((d) => {
          const r = resume(d);
          const critique = r.soldeBas < 0;
          return (
            <div
              key={d.id}
              className="card group flex flex-col p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300"
            >
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-navy">{d.nom}</h3>
                  <p className="text-xs text-slate-700">{d.metier || 'Activité non précisée'}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {r.rouges > 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-600">
                      <AlertTriangle className="h-3 w-3" /> {r.rouges}
                    </span>
                  )}
                  {r.oranges > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-600">{r.oranges}</span>
                  )}
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-slate-700">CA</dt>
                <dd className="text-right tabular-nums text-slate-800">{eur(r.ca)}</dd>
                <dt className="text-slate-700">Résultat</dt>
                <dd className={`text-right tabular-nums ${r.resultat < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{eur(r.resultat)}</dd>
                <dt className="text-slate-700">Tréso 12 mois</dt>
                <dd className={`text-right tabular-nums ${r.treso12 < 0 ? 'text-rose-600' : 'text-slate-800'}`}>{eur(r.treso12)}</dd>
              </dl>

              {critique && (
                <p className="mt-3 rounded-lg bg-rose-50 px-2 py-1.5 text-xs text-rose-600">
                  Trésorerie négative en cours d’année ({eur(r.soldeBas)})
                </p>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
                <button onClick={() => ouvrir(d.id)} className="text-sm font-medium text-brand hover:text-navy">
                  Ouvrir le dossier →
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Supprimer le dossier ${d.nom} ?`)) supprimerDossier(d.id);
                  }}
                  className="text-slate-600 hover:text-rose-600"
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
