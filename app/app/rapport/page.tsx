'use client';

import { useEffect, useMemo, useState } from 'react';
import { Printer, Download } from 'lucide-react';
import { analyserCommeDaf, synthetiserMois, dernierMoisActif, MOIS } from '@naviscop/finance-engine';
import { useDossier } from '@/lib/dossier-context';
import { construireCsv, telechargerCsv } from '@/lib/export-csv';
import { telechargerXlsx } from '@/lib/export-xlsx';
import { eur, pct } from '@/lib/format';

export default function RapportPage() {
  const { entrees, nom, tableauDeBord } = useDossier();
  const { kpis, tresorerie, pnl, alertes } = tableauDeBord;
  const analyse = useMemo(() => analyserCommeDaf(entrees), [entrees]);
  const [moisSynthese, setMoisSynthese] = useState(() => dernierMoisActif(entrees));
  const syntheseMois = useMemo(() => synthetiserMois(entrees, moisSynthese), [entrees, moisSynthese]);
  const [date, setDate] = useState('');

  useEffect(() => {
    setDate(new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }));
  }, []);

  const kpiRows: [string, string][] = [
    ['Chiffre d’affaires HT', eur(pnl.annuel.caHt)],
    ['Marge brute', `${eur(kpis.margeBrute)} (${pct(kpis.tauxMarque)})`],
    ['EBE', eur(kpis.excedentBrutExploitation)],
    ['Résultat prévisionnel', eur(kpis.resultatPrevisionnel)],
    ['Seuil de rentabilité', eur(kpis.seuilRentabilite)],
    ['Trésorerie à 12 mois', eur(kpis.tresorerie12Mois)],
    ['Créances clients', eur(kpis.creancesClients)],
    ['Mois de trésorerie d’avance', kpis.moisTresorerieAvance.toFixed(1)],
  ];

  return (
    <div className="space-y-6">
      <div className="no-print flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-navy">Rapport de rendez-vous</h1>
          <p className="mt-1 text-sm text-slate-700">Export prêt à présenter en rendez-vous DAF.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => telechargerXlsx(nom, tableauDeBord)}
            className="flex items-center gap-2 rounded-full border border-navy/15 px-5 py-2 text-sm text-slate-800 hover:bg-slate-100"
          >
            <Download className="h-4 w-4" /> Excel (.xlsx)
          </button>
          <button
            onClick={() => telechargerCsv(nom, construireCsv(nom, tableauDeBord))}
            className="flex items-center gap-2 rounded-full border border-navy/15 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-soft"
          >
            <Printer className="h-4 w-4" /> Imprimer / PDF
          </button>
        </div>
      </div>

      {/* Zone imprimable */}
      <div id="rapport" className="rapport space-y-6 rounded-2xl border border-slate-200 bg-white p-8 text-slate-800 print:border-0">
        <header className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand">NAVISCOP</p>
            <h2 className="text-xl font-bold text-slate-900">{nom}</h2>
          </div>
          <p className="text-sm text-slate-700">Rapport du {date}</p>
        </header>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Synthèse du mois de {syntheseMois.mois}</h3>
            <select
              value={moisSynthese}
              onChange={(e) => setMoisSynthese(Number(e.target.value))}
              className="no-print rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 outline-none"
            >
              {MOIS.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
          </div>
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-[15px] leading-relaxed text-slate-800">{syntheseMois.texte}</p>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-700">Synthèse de l’année</h3>
          <p className="text-[15px] leading-relaxed text-slate-800">{analyse.synthese}</p>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700">Indicateurs clés</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 md:grid-cols-4">
            {kpiRows.map(([label, val]) => (
              <div key={label} className="border-b border-slate-100 py-1.5">
                <p className="text-[11px] text-slate-700">{label}</p>
                <p className="font-semibold tabular-nums text-slate-900">{val}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-700">Plan de trésorerie</h3>
          <table className="w-full text-xs tabular-nums">
            <thead>
              <tr className="text-left text-slate-700">
                <th className="py-1 pr-2">Mois</th>
                <th className="py-1 pr-2 text-right">Encaissements</th>
                <th className="py-1 pr-2 text-right">Décaissements</th>
                <th className="py-1 pr-2 text-right">Solde fin</th>
              </tr>
            </thead>
            <tbody>
              {tresorerie.parMois.map((m, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="py-1 pr-2">{MOIS[i]}</td>
                  <td className="py-1 pr-2 text-right">{eur(m.encaissements)}</td>
                  <td className="py-1 pr-2 text-right">{eur(m.decaissements)}</td>
                  <td className={`py-1 pr-2 text-right font-medium ${m.soldeFin < 0 ? 'text-rose-600' : ''}`}>
                    {eur(m.soldeFin)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {alertes.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-700">Alertes</h3>
            <ul className="space-y-1 text-sm">
              {alertes.map((a) => (
                <li key={a.code} className={a.niveau === 'rouge' ? 'text-rose-600' : 'text-amber-600'}>
                  • {a.message}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-700">Recommandations</h3>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-800">
            {analyse.recommandations.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
