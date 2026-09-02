'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Etat =
  | { statut: 'chargement' }
  | { statut: 'invalide'; message: string }
  | { statut: 'ok'; dossierNom: string; email: string };

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? '';
  const router = useRouter();

  const [etat, setEtat] = useState<Etat>({ statut: 'chargement' });
  const [email, setEmail] = useState('');
  const [mdp, setMdp] = useState('');
  const [mdp2, setMdp2] = useState('');
  const [voir, setVoir] = useState(false);
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`/api/invitation?token=${encodeURIComponent(token)}`);
        const j = await res.json();
        if (j.valide) {
          setEtat({ statut: 'ok', dossierNom: j.dossierNom, email: j.email || '' });
          setEmail(j.email || '');
        } else {
          setEtat({ statut: 'invalide', message: j.error || 'Ce lien n’est pas valide.' });
        }
      } catch {
        setEtat({ statut: 'invalide', message: 'Impossible de vérifier ce lien.' });
      }
    })();
  }, [token]);

  const activer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur('');
    if (mdp.length < 8) {
      setErreur('Choisissez un mot de passe d’au moins 8 caractères.');
      return;
    }
    if (mdp !== mdp2) {
      setErreur('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setEnCours(true);
    try {
      const res = await fetch('/api/invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email: email.trim(), motDePasse: mdp }),
      });
      const j = await res.json();
      if (!res.ok) {
        setErreur(j.error || 'Activation impossible.');
        setEnCours(false);
        return;
      }
      // Connexion automatique puis accès au pilotage.
      const { error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password: mdp });
      if (error) {
        setErreur('Compte créé, mais connexion impossible. Essayez de vous connecter manuellement.');
        setEnCours(false);
        return;
      }
      router.push('/');
    } catch {
      setErreur('Erreur réseau.');
      setEnCours(false);
    }
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

        {etat.statut === 'chargement' && <p className="text-sm text-slate-700">Vérification du lien…</p>}

        {etat.statut === 'invalide' && (
          <>
            <h1 className="mb-1 text-xl font-semibold text-navy">Lien indisponible</h1>
            <p className="text-sm text-slate-700">{etat.message}</p>
            <p className="mt-4 text-xs text-slate-600">Demandez un nouveau lien d’accès à votre interlocuteur.</p>
          </>
        )}

        {etat.statut === 'ok' && (
          <>
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-brand/20 bg-brand/5 px-3 py-2.5 text-sm text-slate-800">
              <ShieldCheck className="h-4 w-4 flex-none text-brand" />
              <span>
                Vous avez été invité à suivre <b className="text-navy">{etat.dossierNom}</b>.
              </span>
            </div>
            <h1 className="mb-1 text-xl font-semibold text-navy">Activez votre accès</h1>
            <p className="mb-5 text-sm text-slate-700">Choisissez votre mot de passe pour accéder à votre pilotage.</p>
            <form onSubmit={activer} className="space-y-3">
              <input
                type="email"
                required
                placeholder="Votre email"
                className={champ}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <div className="relative">
                <input
                  type={voir ? 'text' : 'password'}
                  required
                  placeholder="Mot de passe (8 caractères min.)"
                  className={`${champ} pr-11`}
                  value={mdp}
                  onChange={(e) => setMdp(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setVoir((v) => !v)}
                  aria-label={voir ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-600 hover:text-navy"
                >
                  {voir ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <input
                type={voir ? 'text' : 'password'}
                required
                placeholder="Confirmez le mot de passe"
                className={champ}
                value={mdp2}
                onChange={(e) => setMdp2(e.target.value)}
              />
              {erreur && <p className="text-sm text-rose-600">{erreur}</p>}
              <button
                type="submit"
                disabled={enCours}
                className="w-full rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-soft disabled:opacity-60"
              >
                {enCours ? 'Activation…' : 'Activer et accéder'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
