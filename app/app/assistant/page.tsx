'use client';

import { useMemo, useRef, useState } from 'react';
import { Sparkles, Send } from 'lucide-react';
import { MOIS } from '@naviscop/finance-engine';
import { useDossier } from '@/lib/dossier-context';
import { supabase } from '@/lib/supabase';
import { eur, pct } from '@/lib/format';
import { PageHeader } from '@/components/ui';

type Tour = { role: 'user' | 'assistant'; content: string };

const SUGGESTIONS = [
  'Quels sont mes principaux risques financiers ?',
  'Comment améliorer ma trésorerie dans les prochains mois ?',
  'Est-ce que je peux augmenter ma rémunération ?',
  'Où puis-je réduire mes charges ?',
];

export default function AssistantPage() {
  const { nom, metier, entrees, tableauDeBord, connecte } = useDossier();
  const { kpis, pnl, tresorerie, alertes } = tableauDeBord;
  const [messages, setMessages] = useState<Tour[]>([]);
  const [saisie, setSaisie] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState('');
  const finRef = useRef<HTMLDivElement>(null);

  const contexte = useMemo(() => {
    const p = kpis;
    return [
      `Dossier : ${nom}${metier ? ` (${metier})` : ''}`,
      `Chiffre d'affaires HT annuel : ${eur(pnl.annuel.caHt)}`,
      `Marge brute : ${eur(p.margeBrute)} (taux de marque ${pct(p.tauxMarque)})`,
      `EBE : ${eur(p.excedentBrutExploitation)}`,
      `Résultat prévisionnel : ${eur(p.resultatPrevisionnel)}`,
      `Seuil de rentabilité : ${eur(p.seuilRentabilite)}`,
      `Trésorerie disponible : ${eur(p.tresorerieDisponible)}`,
      `Trésorerie projetée à 3 / 6 / 12 mois : ${eur(p.tresorerie3Mois)} / ${eur(p.tresorerie6Mois)} / ${eur(p.tresorerie12Mois)}`,
      `Créances clients : ${eur(p.creancesClients)}`,
      `Cashflow généré : ${eur(p.cashflowGenere)}`,
      `Mois de trésorerie d'avance : ${p.moisTresorerieAvance.toFixed(1)}`,
      `Capacité de rémunération mensuelle : ${eur(p.capaciteRemunerationMensuelle)}`,
      `Objectif de CA annuel : ${eur(entrees.parametrage.objectifCaAnnuel)}`,
      `Alertes en cours : ${alertes.map((a) => a.message).join(' | ') || 'aucune'}`,
      `Solde de trésorerie fin de mois : ${tresorerie.parMois.map((m, i) => `${MOIS[i].slice(0, 3)} ${Math.round(m.soldeFin)}`).join(', ')}`,
    ].join('\n');
  }, [nom, metier, entrees, kpis, pnl, tresorerie, alertes]);

  const envoyer = async (texte: string) => {
    const q = texte.trim();
    if (!q || enCours) return;
    setErreur('');
    const nouveaux: Tour[] = [...messages, { role: 'user', content: q }];
    setMessages(nouveaux);
    setSaisie('');
    setEnCours(true);
    try {
      const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : undefined;
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ question: q, contexte, historique: messages }),
      });
      const j = await res.json();
      if (res.ok) {
        setMessages([...nouveaux, { role: 'assistant', content: j.reponse }]);
      } else {
        setErreur(j.error || 'Erreur.');
      }
    } catch {
      setErreur('Erreur réseau.');
    } finally {
      setEnCours(false);
      setTimeout(() => finRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assistant IA"
        subtitle={`Posez vos questions sur la situation de ${nom}. L'assistant raisonne comme un DAF, à partir de vos chiffres réels.`}
      />

      {!connecte && (
        <div className="note-info rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          L&apos;assistant IA nécessite d&apos;être connecté et configuré sur votre serveur. En démonstration, il peut être indisponible.
        </div>
      )}

      <div className="card flex min-h-[52vh] flex-col p-0">
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <Sparkles className="h-6 w-6" />
              </div>
              <p className="max-w-sm text-sm text-slate-500">
                Demandez une analyse, un conseil ou une explication. Quelques idées pour démarrer :
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => envoyer(s)}
                    className="rounded-full border border-navy/10 bg-white/60 px-3.5 py-1.5 text-xs text-slate-600 hover:border-brand/40 hover:text-navy"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === 'user'
                      ? 'bg-brand text-white'
                      : 'border border-navy/10 bg-white/70 text-slate-800'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))
          )}
          {enCours && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-navy/10 bg-white/70 px-4 py-2.5 text-sm text-slate-400">
                L&apos;assistant réfléchit…
              </div>
            </div>
          )}
          <div ref={finRef} />
        </div>

        {erreur && <p className="px-5 text-sm text-rose-600">{erreur}</p>}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            envoyer(saisie);
          }}
          className="flex items-center gap-2 border-t border-navy/10 p-3"
        >
          <input
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            placeholder="Posez votre question…"
            className="flex-1 rounded-full border border-navy/10 bg-white/60 px-4 py-2.5 text-sm text-navy outline-none focus:border-brand/50"
          />
          <button
            type="submit"
            disabled={enCours || !saisie.trim()}
            className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-brand text-white hover:bg-brand-soft disabled:opacity-50"
            aria-label="Envoyer"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>

      <p className="text-xs text-slate-400">
        L&apos;assistant s&apos;appuie sur les chiffres du dossier actif. Vérifiez toujours les décisions importantes.
      </p>
    </div>
  );
}
