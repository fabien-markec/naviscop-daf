'use client';

import { useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import { useDossier } from '@/lib/dossier-context';

/**
 * Module bloquant affiché à la première connexion sur un dossier : le client
 * DOIT renseigner sa date de clôture (bilan) avant d'accéder au pilotage.
 * On propose aussi de créer directement l'exercice suivant (N+1).
 */
export function ModuleDateBilan() {
  const { nom, majDateBilan, creerExerciceSuivant } = useDossier();
  const [date, setDate] = useState('2025-12-31');
  const [creerSuivant, setCreerSuivant] = useState(false);

  const valider = () => {
    if (!date) return;
    majDateBilan(date);
    if (creerSuivant) {
      // Laisse le state se propager avant de dériver N+1.
      setTimeout(() => creerExerciceSuivant(), 0);
    }
  };

  const annee = Number(date.slice(0, 4)) || 0;

  return (
    <div className="mx-auto max-w-xl">
      <div className="card p-7">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <CalendarCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-navy">Date de clôture</h1>
            <p className="text-sm text-slate-700">{nom}</p>
          </div>
        </div>

        <p className="mb-5 text-sm leading-relaxed text-slate-700">
          Avant de piloter votre trésorerie, indiquez la date de clôture de votre exercice comptable
          (votre date de bilan). Tous les calculs, prévisions et le suivi mensuel s'appuient dessus.
          Cette étape est obligatoire pour ce dossier.
        </p>

        <label className="block text-[13px] font-medium text-navy">Date de clôture de l'exercice</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-navy/15 bg-white px-3.5 py-2.5 text-sm text-navy outline-none focus:border-brand/50"
        />
        {annee > 0 && (
          <p className="mt-1.5 text-xs text-slate-600">
            Exercice comptable : <span className="font-medium text-navy">{annee}</span>
          </p>
        )}

        <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={creerSuivant}
            onChange={(e) => setCreerSuivant(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-navy/20 text-brand"
          />
          <span>
            Créer aussi l'exercice suivant (N+1{annee > 0 ? ` — ${annee + 1}` : ''}) pour préparer le
            prévisionnel. Vous pourrez basculer entre les deux à tout moment.
          </span>
        </label>

        <button
          onClick={valider}
          disabled={!date}
          className="mt-6 w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:opacity-40"
        >
          Valider et accéder au pilotage
        </button>
      </div>
    </div>
  );
}
