'use client';

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from '@/lib/supabase';

export function AuthGate({ children }: { children: React.ReactNode }) {
  // Mode démo (pas de Supabase configuré) : aucun login, on passe tout.
  if (!supabaseConfigured) return <>{children}</>;
  return <AuthGateSupabase>{children}</AuthGateSupabase>;
}

function AuthGateSupabase({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [pret, setPret] = useState(false);

  useEffect(() => {
    supabase!.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setPret(true);
    });
    const { data: sub } = supabase!.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!pret) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500">Chargement…</p>
      </div>
    );
  }
  if (!session) return <LoginForm />;
  return <>{children}</>;
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [mdp, setMdp] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur('');
    setEnCours(true);
    const { error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password: mdp });
    setEnCours(false);
    if (error) setErreur('Identifiants incorrects.');
  };

  const champ =
    'w-full rounded-xl border border-navy/10 bg-white/70 px-4 py-2.5 text-sm text-navy outline-none focus:border-brand/50';

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-gradient-to-br from-brand to-brand-soft text-sm font-bold text-white">
            N
          </div>
          <span className="text-lg font-semibold tracking-tight text-navy">NAVISCOP</span>
        </div>
        <h1 className="mb-1 text-xl font-semibold text-navy">Connexion</h1>
        <p className="mb-6 text-sm text-slate-500">Accédez à votre pilotage financier.</p>
        <form onSubmit={soumettre} className="space-y-3">
          <input
            type="email"
            required
            placeholder="Adresse email"
            className={champ}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            required
            placeholder="Mot de passe"
            className={champ}
            value={mdp}
            onChange={(e) => setMdp(e.target.value)}
          />
          {erreur && <p className="text-sm text-rose-600">{erreur}</p>}
          <button
            type="submit"
            disabled={enCours}
            className="w-full rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-soft disabled:opacity-60"
          >
            {enCours ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
