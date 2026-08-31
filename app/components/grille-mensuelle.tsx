'use client';

import { useState } from 'react';
import { eur } from '@/lib/format';

const MOIS_COURT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

export interface LigneGrille {
  key: string;
  label: string;
  /** Ligne de charge (préfixée d'un « − » et non éditable si calculée). */
  charge?: boolean;
  get: (i: number) => number;
  set: (i: number, v: number) => void;
}

/** Une cellule éditable : état local pendant la saisie, commit à la sortie du champ (onBlur). */
function Cellule({ valeur, onCommit }: { valeur: number; onCommit: (v: number) => void }) {
  const [txt, setTxt] = useState<string | null>(null);
  const affiche = txt ?? (valeur ? String(valeur) : '');
  return (
    <input
      type="number"
      inputMode="numeric"
      value={affiche}
      onChange={(e) => setTxt(e.target.value)}
      onBlur={() => {
        if (txt !== null) {
          onCommit(Number(txt) || 0);
          setTxt(null);
        }
      }}
      className="w-[72px] rounded-md border border-navy/10 bg-white px-1.5 py-1 text-right text-xs tabular-nums text-navy outline-none focus:border-brand/50"
      placeholder="0"
    />
  );
}

/**
 * Grille de saisie mensuelle : lignes (postes) × 12 mois, chaque cellule éditable.
 * Sert à saisir un dossier entièrement à la main, sans FEC ni balance.
 */
export function GrilleMensuelle({ lignes }: { lignes: LigneGrille[] }) {
  const total = (l: LigneGrille) => Array.from({ length: 12 }, (_, i) => l.get(i)).reduce((a, b) => a + b, 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-navy/10 text-[11px] uppercase tracking-wide text-slate-700">
            <th className="sticky left-0 z-10 bg-white py-2 pr-3 text-left font-semibold">Poste</th>
            {MOIS_COURT.map((m) => (
              <th key={m} className="px-1 py-2 text-right font-semibold">{m}</th>
            ))}
            <th className="px-2 py-2 text-right font-semibold text-navy">Année</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l.key} className="border-b border-navy/[0.05]">
              <td className="sticky left-0 z-10 bg-white py-1.5 pr-3 text-left text-slate-800">
                {l.charge && <span className="mr-1 text-slate-600">−</span>}
                {l.label}
              </td>
              {Array.from({ length: 12 }, (_, i) => (
                <td key={i} className="px-0.5 py-1">
                  <Cellule valeur={l.get(i)} onCommit={(v) => l.set(i, v)} />
                </td>
              ))}
              <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-navy">{eur(total(l))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
