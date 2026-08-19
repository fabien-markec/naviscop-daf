'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Send, X } from 'lucide-react';
import { MOIS } from '@naviscop/finance-engine';
import { useDossier } from '@/lib/dossier-context';
import { supabase } from '@/lib/supabase';
import { eur, pct } from '@/lib/format';

type Tour = { role: 'user' | 'assistant'; content: string };

/** Assistant outil : aide à utiliser NAVISCOP et à lire ses chiffres. Quota mensuel pour maîtriser le coût. */
const LIMITE_MENSUELLE = 30;

const SUGGESTIONS = [
  'Où je saisis mes charges à venir ?',
  'Comment lire mon cash réellement disponible ?',
  'Que veut dire mon EBE ?',
  'Comment corriger un mois où il manque des factures ?',
];

function cleMois(): string {
  const d = new Date();
  return `naviscop.assistant.usage.${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function AssistantBulle() {
  const { nom, metier, entrees, tableauDeBord, connecte } = useDossier();
  const { kpis, pnl, tresorerie, alertes } = tableauDeBord;
  const [ouvert, setOuvert] = useState(false);
  const [messages, setMessages] = useState<Tour[]>([]);
  const [saisie, setSaisie] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState('');
  const [usage, setUsage] = useState(0);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setUsage(Number(window.localStorage.getItem(cleMois()) ?? 0));
    } catch {
      /* ignore */
    }
  }, []);

  const restant = Math.max(0, LIMITE_MENSUELLE - usage);
  const quotaAtteint = restant <= 0;

  const contexte = useMemo(() => {
    const p = kpis;
    return [
      `Dossier : ${nom}${metier ? ` (${metier})` : ''}`,
      `Chiffre d'affaires HT annuel : ${eur(pnl.annuel.caHt)}`,
      `Marge brute : ${eur(p.margeBrute)} (taux de marque ${pct(p.tauxMarque)})`,
      `EBE : ${eur(p.excedentBrutExploitation)}`,
      `Résultat prévisionnel : ${eur(p.resultatPrevisionnel)}`,
      `Trésorerie disponible : ${eur(p.tresorerieDisponible)}`,
      `Trésorerie projetée à 3 / 6 / 12 mois : ${eur(p.tresorerie3Mois)} / ${eur(p.tresorerie6Mois)} / ${eur(p.tresorerie12Mois)}`,
      `Cash réellement disponible : ${eur(tableauDeBord.cashDisponible.cashDisponible)}`,
      `Créances clients : ${eur(p.creancesClients)}`,
      `Capacité de rémunération mensuelle : ${eur(p.capaciteRemunerationMensuelle)}`,
      `Objectif de CA annuel : ${eur(entrees.parametrage.objectifCaAnnuel)}`,
      `Alertes en cours : ${alertes.map((a) => a.message).join(' | ') || 'aucune'}`,
      `Solde de trésorerie fin de mois : ${tresorerie.parMois.map((m, i) => `${MOIS[i].slice(0, 3)} ${Math.round(m.soldeFin)}`).join(', ')}`,
    ].join('\n');
  }, [nom, metier, entrees, kpis, pnl, tresorerie, alertes, tableauDeBord.cashDisponible]);

  const incrementerUsage = () => {
    const n = usage + 1;
    setUsage(n);
    try {
      window.localStorage.setItem(cleMois(), String(n));
    } catch {
      /* ignore */
    }
  };

  const envoyer = async (texte: string) => {
    const q = texte.trim();
    if (!q || enCours || quotaAtteint) return;
    setErreur('');
    const nouveaux: Tour[] = [...messages, { role: 'user', content: q }];
    setMessages(nouveaux);
    setSaisie('');
    setEnCours(true);
    incrementerUsage();
    try {
      const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : undefined;
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ question: q, contexte, historique: messages }),
      });
      const j = await res.json();
      if (res.ok) setMessages([...nouveaux, { role: 'assistant', content: j.reponse }]);
      else setErreur(j.error || 'Assistant indisponible pour le moment.');
    } catch {
      setErreur('Erreur réseau.');
    } finally {
      setEnCours(false);
      setTimeout(() => finRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  return (
    <>
      {/* Bouton flottant */}
      {!ouvert && (
        <button
          onClick={() => setOuvert(true)}
          aria-label="Ouvrir l’assistant"
          className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-[0_10px_30px_-8px_rgba(0,98,184,0.6)] transition hover:bg-brand-soft"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {/* Panneau */}
      {ouvert && (
        <div className="fixed bottom-5 right-5 z-50 flex h-[70vh] max-h-[600px] w-[92vw] max-w-sm flex-col overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-2xl">
          <header className="flex items-center justify-between border-b border-navy/10 bg-white px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-navy">Assistant NAVISCOP</p>
                <p className="text-[11px] text-slate-600">{restant} question{restant > 1 ? 's' : ''} restante{restant > 1 ? 's' : ''} ce mois</p>
              </div>
            </div>
            <button onClick={() => setOuvert(false)} aria-label="Fermer" className="text-slate-600 hover:text-navy">
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-700">
                  Une question sur l’outil ou sur vos chiffres ? Je suis là pour vous aider à naviguer.
                </p>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => envoyer(s)}
                      disabled={quotaAtteint}
                      className="rounded-xl border border-navy/10 bg-white/60 px-3 py-2 text-left text-xs text-slate-600 hover:border-brand/40 hover:text-navy disabled:opacity-50"
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
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                      m.role === 'user' ? 'bg-brand text-white' : 'border border-navy/10 bg-white text-slate-800'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {enCours && <p className="text-xs text-slate-600">L’assistant réfléchit…</p>}
            {!connecte && messages.length === 0 && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                En démonstration, l’assistant peut être indisponible (il nécessite la configuration du serveur).
              </p>
            )}
            <div ref={finRef} />
          </div>

          {erreur && <p className="px-4 pb-1 text-xs text-rose-600">{erreur}</p>}
          {quotaAtteint && (
            <p className="px-4 pb-1 text-xs text-amber-600">
              Quota mensuel atteint ({LIMITE_MENSUELLE} questions). Il se réinitialise le mois prochain.
            </p>
          )}

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
              placeholder={quotaAtteint ? 'Quota mensuel atteint' : 'Votre question…'}
              disabled={quotaAtteint}
              className="flex-1 rounded-full border border-navy/10 bg-white/60 px-3.5 py-2 text-sm text-navy outline-none focus:border-brand/50 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={enCours || quotaAtteint || !saisie.trim()}
              className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand text-white hover:bg-brand-soft disabled:opacity-50"
              aria-label="Envoyer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
