'use client';

import { useState } from 'react';
import { LinkIcon, Check, Copy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useDossier } from '@/lib/dossier-context';
import { Section } from '@/components/ui';

export function InviterClient() {
  const { actifId, nom, connecte, role } = useDossier();
  const [email, setEmail] = useState('');
  const [lien, setLien] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [copie, setCopie] = useState(false);

  if (!connecte || role !== 'daf') return null;

  const genererLien = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur('');
    setLien('');
    setEnCours(true);
    try {
      const { data, error } = await supabase!
        .from('invitations')
        .insert({ dossier_id: actifId, email: email.trim() || null })
        .select('token')
        .single();
      if (error || !data) {
        setErreur(error?.message || 'Génération impossible.');
      } else {
        setLien(`${window.location.origin}/invite/${data.token}`);
      }
    } catch {
      setErreur('Erreur réseau.');
    } finally {
      setEnCours(false);
    }
  };

  const copier = () => {
    navigator.clipboard?.writeText(lien);
    setCopie(true);
    setTimeout(() => setCopie(false), 1500);
  };

  const champ = 'w-full rounded-xl border border-navy/10 bg-white/60 px-3 py-2 text-sm text-navy outline-none focus:border-brand/50';

  return (
    <Section title="Accès client">
      <p className="mb-3 text-xs text-slate-700">
        Générez un lien d’accès pour le dirigeant de <b className="text-slate-700">{nom}</b>. Transmettez-lui ce lien
        (email, SMS, message…) : il choisira son mot de passe et n’aura accès qu’à ce dossier. Le lien est valable 14 jours.
      </p>
      <form onSubmit={genererLien} className="space-y-3">
        <input
          type="email"
          placeholder="Email du client (facultatif, pré-rempli sur le lien)"
          className={champ}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          type="submit"
          disabled={enCours}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-soft disabled:opacity-60"
        >
          <LinkIcon className="h-4 w-4" /> {enCours ? 'Génération…' : lien ? 'Générer un nouveau lien' : 'Générer le lien d’accès'}
        </button>
        {erreur && <p className="text-sm text-rose-600">{erreur}</p>}
      </form>

      {lien && (
        <div className="mt-3 rounded-xl border border-navy/10 bg-slate-50 p-3">
          <p className="mb-2 text-xs font-medium text-navy">Lien à transmettre au client :</p>
          <div className="flex items-center gap-2">
            <input readOnly value={lien} className={`${champ} bg-white font-mono text-xs`} onFocus={(e) => e.target.select()} />
            <button
              type="button"
              onClick={copier}
              title="Copier le lien"
              className="flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-navy/10 text-slate-700 hover:bg-slate-100"
            >
              {copie ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}
    </Section>
  );
}
