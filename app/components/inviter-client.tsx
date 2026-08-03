'use client';

import { useState } from 'react';
import { UserPlus, Check, Copy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useDossier } from '@/lib/dossier-context';
import { Section } from '@/components/ui';

function genererMotDePasse(): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const arr = new Uint32Array(12);
  crypto.getRandomValues(arr);
  return Array.from(arr, (x) => charset[x % charset.length]).join('') + '!';
}

export function InviterClient() {
  const { actifId, nom, connecte, role } = useDossier();
  const [email, setEmail] = useState('');
  const [mdp, setMdp] = useState(genererMotDePasse);
  const [msg, setMsg] = useState<{ ok: boolean; txt: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [copie, setCopie] = useState(false);

  if (!connecte || role !== 'daf') return null;

  const inviter = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setEnvoi(true);
    const { data } = await supabase!.auth.getSession();
    const token = data.session?.access_token;
    try {
      const res = await fetch('/api/inviter-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ dossierId: actifId, email: email.trim(), motDePasse: mdp }),
      });
      const j = await res.json();
      if (res.ok) {
        setMsg({ ok: true, txt: `Accès créé pour ${email.trim()}. Communiquez-lui l'email et le mot de passe.` });
        setEmail('');
      } else {
        setMsg({ ok: false, txt: j.error || 'Erreur.' });
      }
    } catch {
      setMsg({ ok: false, txt: 'Erreur réseau.' });
    } finally {
      setEnvoi(false);
    }
  };

  const champ = 'w-full rounded-xl border border-navy/10 bg-white/60 px-3 py-2 text-sm text-navy outline-none focus:border-brand/50';

  return (
    <Section title="Accès client">
      <p className="mb-3 text-xs text-slate-500">
        Donnez au dirigeant de <b className="text-slate-700">{nom}</b> un accès à ce dossier uniquement. Il se connectera avec
        l&apos;email et le mot de passe ci-dessous.
      </p>
      <form onSubmit={inviter} className="space-y-3">
        <input
          type="email"
          required
          placeholder="Email du client"
          className={champ}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <input className={`${champ} font-mono`} value={mdp} onChange={(e) => setMdp(e.target.value)} />
          <button
            type="button"
            title="Copier"
            onClick={() => {
              navigator.clipboard?.writeText(mdp);
              setCopie(true);
              setTimeout(() => setCopie(false), 1500);
            }}
            className="flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-navy/10 text-slate-500 hover:bg-slate-100"
          >
            {copie ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setMdp(genererMotDePasse())}
            className="flex-none rounded-xl border border-navy/10 px-3 py-2 text-xs text-slate-600 hover:bg-slate-100"
          >
            Régénérer
          </button>
        </div>
        <button
          type="submit"
          disabled={envoi}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-soft disabled:opacity-60"
        >
          <UserPlus className="h-4 w-4" /> {envoi ? 'Création…' : 'Créer l’accès client'}
        </button>
        {msg && <p className={`text-sm ${msg.ok ? 'text-emerald-600' : 'text-rose-600'}`}>{msg.txt}</p>}
      </form>
    </Section>
  );
}
