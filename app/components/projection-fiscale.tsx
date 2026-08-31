'use client';

import { useMemo } from 'react';
import { projeterFiscalite, type EntreesMoteur, type ProfilFiscal } from '@naviscop/finance-engine';
import { eur } from '@/lib/format';
import { Section } from '@/components/ui';

const MOIS_COURT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const LIBELLE_STATUT: Record<string, string> = {
  EI: 'Entreprise individuelle',
  SARL_EURL: 'SARL / EURL',
  SAS_SASU: 'SAS / SASU',
};
const LIBELLE_REGIME: Record<string, string> = {
  MICRO: 'Micro-entreprise',
  REEL_IR: 'Réel à l’IR',
  REEL_IS: 'Réel à l’IS',
};

/**
 * Tableau des charges & taxes projetées (URSSAF, impôt, TVA) mois par mois,
 * calculées automatiquement à partir du CA et des charges + du profil fiscal.
 */
export function ProjectionFiscale({ entrees, profil }: { entrees: EntreesMoteur; profil: ProfilFiscal }) {
  const proj = useMemo(() => projeterFiscalite(entrees, profil), [entrees, profil]);

  const lignes: { cle: string; label: string; valeurs: number[]; total: number }[] = [
    { cle: 'urssaf', label: 'URSSAF / charges sociales', valeurs: proj.parMois.map((m) => m.urssaf), total: proj.annuel.urssaf },
    { cle: 'impot', label: 'Impôt (IR / IS)', valeurs: proj.parMois.map((m) => m.impot), total: proj.annuel.impot },
    { cle: 'tva', label: 'TVA', valeurs: proj.parMois.map((m) => m.tva), total: proj.annuel.tva },
  ].filter((l) => l.total !== 0);

  return (
    <Section title="Charges & taxes projetées">
      <p className="mb-3 text-xs text-slate-600">
        {LIBELLE_STATUT[profil.statutJuridique]} · {LIBELLE_REGIME[profil.regimeFiscal]}. URSSAF, impôt et TVA sont projetés
        automatiquement à partir du chiffre d’affaires et des charges saisis.
      </p>
      {lignes.length === 0 ? (
        <p className="text-sm text-slate-600">Aucune charge projetée (renseignez le CA dans Rentabilité).</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table w-full min-w-[720px] text-sm">
            <thead>
              <tr>
                <th className="py-2 text-left">Poste</th>
                {MOIS_COURT.map((m) => (
                  <th key={m} className="py-2 text-right">{m}</th>
                ))}
                <th className="py-2 text-right font-semibold">Année</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l) => (
                <tr key={l.cle}>
                  <td className="py-2 text-left font-medium text-navy">{l.label}</td>
                  {l.valeurs.map((v, i) => (
                    <td key={i} className="num py-2 text-slate-700">{v ? eur(v) : '—'}</td>
                  ))}
                  <td className="num py-2 font-semibold text-navy">{eur(l.total)}</td>
                </tr>
              ))}
              <tr className="border-t border-navy/10">
                <td className="py-2 text-left font-semibold text-navy">Total prélèvements</td>
                {proj.parMois.map((m, i) => (
                  <td key={i} className="num py-2 font-medium text-navy">{m.total ? eur(m.total) : '—'}</td>
                ))}
                <td className="num py-2 font-semibold text-navy">{eur(proj.annuel.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-[11px] text-slate-500">
        Provision mensuelle moyenne à mettre de côté : {eur(proj.provisionMensuelle.urssaf)} URSSAF ·{' '}
        {eur(proj.provisionMensuelle.impot)} impôt · {eur(proj.provisionMensuelle.tva)} TVA.
      </p>
    </Section>
  );
}
