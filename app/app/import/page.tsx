'use client';

import { useMemo, useState } from 'react';
import {
  parseFec,
  entreesMoteurDepuisFec,
  calculerTableauDeBord,
  diagnostiquerFec,
  fecExemple,
  type EntreesMoteur,
  type DiagnosticFec,
} from '@naviscop/finance-engine';

type ResultatImportEtat =
  | { statut: 'vide' }
  | { statut: 'erreur'; message: string }
  | {
      statut: 'ok';
      tdb: ReturnType<typeof calculerTableauDeBord>;
      entrees: EntreesMoteur;
      diagnostic: DiagnosticFec;
      annee: number;
      nb: number;
    };
import { useRouter } from 'next/navigation';
import { useDossier } from '@/lib/dossier-context';
import { eur, pct } from '@/lib/format';
import { KpiCard, PageHeader, Section, ListeAlertes } from '@/components/ui';
import { TresorerieChart } from '@/components/charts';

const MOIS_COURT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

export default function ImportPage() {
  const [contenu, setContenu] = useState('');
  const [nomFichier, setNomFichier] = useState('');
  const { activerDossier } = useDossier();
  const router = useRouter();

  const resultat = useMemo<ResultatImportEtat>(() => {
    if (!contenu.trim()) return { statut: 'vide' };
    try {
      const ecritures = parseFec(contenu);
      if (ecritures.length === 0) return { statut: 'erreur', message: 'Aucune écriture lisible dans ce fichier.' };
      const { entrees, annee } = entreesMoteurDepuisFec(contenu, { objectifCaAnnuel: 200000 });
      const maintenant = new Date();
      const diagnostic = diagnostiquerFec(ecritures, { annee: maintenant.getFullYear(), moisIndex: maintenant.getMonth() });
      return { statut: 'ok', tdb: calculerTableauDeBord(entrees), entrees, diagnostic, annee, nb: ecritures.length };
    } catch (e) {
      return { statut: 'erreur', message: `Erreur de lecture : ${(e as Error).message}` };
    }
  }, [contenu]);

  const onFichier = (f: File | undefined) => {
    if (!f) return;
    setNomFichier(f.name.replace(/\.[^.]+$/, ''));
    const reader = new FileReader();
    reader.onload = () => setContenu(String(reader.result ?? ''));
    reader.readAsText(f, 'utf-8');
  };

  const activer = () => {
    if (resultat.statut !== 'ok') return;
    const nom = nomFichier || `Import FEC ${resultat.annee}`;
    activerDossier(nom, resultat.entrees);
    router.push('/');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import FEC"
        subtitle="Déposez le Fichier des Écritures Comptables exporté depuis n’importe quel logiciel (Pennylane, EBP, SAGE, Indy…)."
      />

      <Section title="Fichier comptable">
        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-full bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-soft">
            Choisir un fichier FEC
            <input
              type="file"
              accept=".txt,.csv,.tsv"
              className="hidden"
              onChange={(e) => onFichier(e.target.files?.[0])}
            />
          </label>
          <button
            onClick={() => setContenu(fecExemple)}
            className="rounded-full border border-navy/15 px-5 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            Charger un exemple
          </button>
          {contenu && (
            <button
              onClick={() => setContenu('')}
              className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-slate-700"
            >
              Effacer
            </button>
          )}
          {resultat.statut === 'ok' && (
            <span className="text-sm text-emerald-600">
              {resultat.nb} écritures lues · exercice {resultat.annee}
            </span>
          )}
          {resultat.statut === 'ok' && (
            <button
              onClick={activer}
              className="ml-auto rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Activer ce dossier →
            </button>
          )}
        </div>
        <textarea
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          placeholder="…ou collez ici le contenu du FEC (tabulations, point-virgules ou pipes)."
          className="mt-4 h-28 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-500 outline-none focus:border-brand/50"
        />
      </Section>

      {resultat.statut === 'erreur' && (
        <Section title="Résultat">
          <p className="text-sm text-rose-600">{resultat.message}</p>
        </Section>
      )}

      {resultat.statut === 'ok' && resultat.diagnostic.messages.length > 0 && (
        <DiagnosticImport diagnostic={resultat.diagnostic} />
      )}

      {resultat.statut === 'ok' && <ResultatImport tdb={resultat.tdb} />}
    </div>
  );
}

function DiagnosticImport({ diagnostic }: { diagnostic: DiagnosticFec }) {
  const alertes = diagnostic.messages.filter((m) => m.niveau === 'attention');
  return (
    <Section title="Contrôle de cohérence">
      {alertes.length > 0 && (
        <p className="mb-3 text-sm text-slate-600">
          {alertes.length === 1 ? 'Un point mérite votre attention' : `${alertes.length} points méritent votre attention`} avant
          d’exploiter ces données.
        </p>
      )}
      <ul className="space-y-2">
        {diagnostic.messages.map((m, i) => {
          const attention = m.niveau === 'attention';
          return (
            <li
              key={i}
              className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 text-sm ${
                attention ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-navy/10 bg-white/50 text-slate-600'
              }`}
            >
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${attention ? 'bg-amber-500' : 'bg-brand'}`} />
              <span className="leading-snug">{m.texte}</span>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function ResultatImport({ tdb }: { tdb: ReturnType<typeof calculerTableauDeBord> }) {
  const { kpis, tresorerie, pnl, alertes } = tdb;
  const chartData = tresorerie.parMois.map((m, i) => ({ mois: MOIS_COURT[i], solde: m.soldeFin }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Chiffre d’affaires" value={eur(pnl.annuel.caHt)} />
        <KpiCard label="Marge brute" value={eur(kpis.margeBrute)} hint={`Taux ${pct(kpis.tauxMarque)}`} />
        <KpiCard label="Résultat" value={eur(kpis.resultatPrevisionnel)} tone={kpis.resultatPrevisionnel < 0 ? 'negative' : 'positive'} />
        <KpiCard label="Trésorerie fin d’année" value={eur(kpis.tresorerie12Mois)} tone={kpis.tresorerie12Mois < 0 ? 'negative' : 'positive'} />
        <KpiCard label="EBE" value={eur(kpis.excedentBrutExploitation)} tone={kpis.excedentBrutExploitation < 0 ? 'negative' : 'positive'} />
        <KpiCard label="Créances clients" value={eur(kpis.creancesClients)} tone="warning" />
        <KpiCard label="Trésorerie disponible" value={eur(kpis.tresorerieDisponible)} />
        <KpiCard label="Mois de tréso d’avance" value={kpis.moisTresorerieAvance.toFixed(1)} tone={kpis.moisTresorerieAvance < 2 ? 'warning' : 'positive'} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section title="Trésorerie reconstituée depuis le FEC">
            <TresorerieChart data={chartData} />
          </Section>
        </div>
        <Section title="Alertes">
          <ListeAlertes alertes={alertes} />
        </Section>
      </div>
    </div>
  );
}
