'use client';

import { useMemo } from 'react';
import { analyserCommeDaf } from '@naviscop/finance-engine';
import { useDossier } from '@/lib/dossier-context';
import { PageHeader, Section } from '@/components/ui';

export default function AnalysePage() {
  const { entrees, nom } = useDossier();
  const analyse = useMemo(() => analyserCommeDaf(entrees), [entrees]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analyse"
        subtitle={`Lecture de la situation de ${nom}, comme le ferait votre DAF. Factuelle, sans jargon.`}
      />

      <Section title="Synthèse">
        <p className="text-[15px] leading-relaxed text-slate-800">{analyse.synthese}</p>
      </Section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="Points forts">
          {analyse.pointsForts.length === 0 ? (
            <p className="text-sm text-slate-700">Rien à souligner particulièrement ce mois-ci.</p>
          ) : (
            <ul className="space-y-2">
              {analyse.pointsForts.map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-800">
                  <span className="mt-0.5 text-emerald-600">✓</span>
                  {t}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Points de vigilance">
          {analyse.pointsVigilance.length === 0 ? (
            <p className="text-sm text-emerald-600">Aucun point critique détecté.</p>
          ) : (
            <ul className="space-y-2">
              {analyse.pointsVigilance.map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-800">
                  <span className="mt-0.5 text-amber-600">!</span>
                  {t}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section title="Recommandations du DAF">
        <ol className="space-y-3">
          {analyse.recommandations.map((t, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                {i + 1}
              </span>
              {t}
            </li>
          ))}
        </ol>
      </Section>

      <div className="card border-brand/20 bg-brand/5 p-5">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-brand">
          <span>🧸</span> Si je devais l’expliquer à un enfant de 5 ans
        </h2>
        <p className="text-[15px] leading-relaxed text-slate-800">{analyse.explicationSimple}</p>
      </div>
    </div>
  );
}
