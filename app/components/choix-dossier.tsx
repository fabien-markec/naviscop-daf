'use client';

import Link from 'next/link';
import { Folder, Upload, Plus } from 'lucide-react';
import { useDossier } from '@/lib/dossier-context';

/** Écran de sélection : tant qu'aucun dossier n'est choisi, le DAF doit en sélectionner un. */
export function ChoixDossier() {
  const { dossiers, ouvrirDossier } = useDossier();

  return (
    <div className="mx-auto max-w-2xl py-10">
      <h1 className="text-[1.7rem] font-semibold text-navy">Choisissez un dossier</h1>
      <p className="mt-1.5 text-sm text-slate-700">
        Sélectionnez le dossier client sur lequel vous voulez travailler.
      </p>

      {dossiers.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-navy/15 bg-white/60 px-5 py-8 text-center">
          <p className="text-sm text-slate-700">Aucun dossier pour le moment.</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/nouveau"
              className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-soft"
            >
              <Plus className="h-4 w-4" /> Créer un dossier
            </Link>
            <Link
              href="/import"
              className="inline-flex items-center gap-2 rounded-full border border-navy/15 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <Upload className="h-4 w-4" /> Importer un FEC / balance
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {dossiers.map((d) => (
              <button
                key={d.id}
                onClick={() => ouvrirDossier(d.id)}
                className="flex items-center gap-3 rounded-2xl border border-navy/10 bg-white/60 px-4 py-3.5 text-left transition hover:border-brand/40 hover:bg-white"
              >
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Folder className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-navy">{d.nom}</span>
                  {d.metier && <span className="block truncate text-xs text-slate-700">{d.metier}</span>}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <Link href="/nouveau" className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline">
              <Plus className="h-4 w-4" /> Créer un dossier
            </Link>
            <Link href="/import" className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:underline">
              <Upload className="h-4 w-4" /> Importer un FEC / balance
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
