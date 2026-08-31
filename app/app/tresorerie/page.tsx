'use client';

import { useState } from 'react';
import { MOIS } from '@naviscop/finance-engine';
import { Pencil } from 'lucide-react';
import { useDossier } from '@/lib/dossier-context';
import { eur } from '@/lib/format';
import { PageHeader, Section } from '@/components/ui';
import { FluxChart } from '@/components/charts';
import { CascadeCash } from '@/components/cash-disponible';
import { EnveloppesProvision } from '@/components/enveloppes';
import { ProjectionFiscale } from '@/components/projection-fiscale';
import { GrilleMensuelle, type LigneGrille } from '@/components/grille-mensuelle';

export default function TresoreriePage() {
  const { tableauDeBord, entrees, entreesReel, profilFiscal, chargesFixes, ajouterChargeFixe, supprimerChargeFixe, majCashMois, majParametrage } = useDossier();
  const { tresorerie, cashDisponible } = tableauDeBord;
  const [saisieOuverte, setSaisieOuverte] = useState(false);

  const lignesCash: LigneGrille[] = [
    { key: 'enc', label: 'Encaissements (TTC)', get: (i) => entreesReel.cash[i].encaissements, set: (i, v) => majCashMois(i, { encaissements: v }) },
    { key: 'dec', label: 'Décaissements (TTC)', charge: true, get: (i) => entreesReel.cash[i].decaissements, set: (i, v) => majCashMois(i, { decaissements: v }) },
  ];
  const chartData = tresorerie.parMois.map((m, i) => ({
    mois: MOIS[i].slice(0, 3),
    encaissements: m.encaissements,
    decaissements: m.decaissements,
    solde: m.soldeFin,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plan de trésorerie"
        subtitle="Reconstitution du réel et projection des soldes mensuels (TTC)."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CascadeCash data={cashDisponible} chargesFixes={chargesFixes} onAjouterCharge={ajouterChargeFixe} onSupprimerCharge={supprimerChargeFixe} />
        <EnveloppesProvision data={cashDisponible} />
      </div>

      {/* Saisie manuelle de la trésorerie mois par mois (dossier sans FEC) */}
      <Section
        title="Saisir la trésorerie mois par mois"
        action={
          <button
            onClick={() => setSaisieOuverte((o) => !o)}
            className="inline-flex items-center gap-1.5 rounded-full border border-navy/15 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            <Pencil className="h-3.5 w-3.5" /> {saisieOuverte ? 'Masquer la saisie' : 'Saisir à la main'}
          </button>
        }
      >
        {saisieOuverte ? (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <label className="text-sm text-slate-700">Solde de trésorerie de départ</label>
              <input
                type="number"
                value={entrees.parametrage.soldeInitialTresorerie || ''}
                onChange={(e) => majParametrage({ soldeInitialTresorerie: Number(e.target.value) || 0 })}
                className="w-40 rounded-xl border border-navy/10 bg-white px-3 py-1.5 text-sm tabular-nums text-navy outline-none focus:border-brand/50"
                placeholder="0"
              />
              <span className="text-sm text-slate-700">€</span>
            </div>
            <p className="mb-3 text-xs text-slate-700">
              Pas de FEC ni de balance ? Saisissez les encaissements et décaissements réels (TTC) de chaque mois. Le solde se
              recalcule automatiquement à partir du solde de départ.
            </p>
            <GrilleMensuelle lignes={lignesCash} />
          </>
        ) : (
          <p className="text-sm text-slate-700">
            Pour un dossier sans import comptable, cliquez sur « Saisir à la main » pour renseigner la trésorerie mois par mois.
          </p>
        )}
      </Section>

      {profilFiscal && <ProjectionFiscale entrees={entrees} profil={profilFiscal} />}

      <Section title="Encaissements, décaissements et solde">
        <FluxChart data={chartData} />
      </Section>

      <Section title="Détail mensuel">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mois</th>
                <th className="!text-right">Solde début</th>
                <th className="!text-right">Encaissements</th>
                <th className="!text-right">Décaissements</th>
                <th className="!text-right">Variation</th>
                <th className="!text-right">Solde fin</th>
              </tr>
            </thead>
            <tbody>
              {tresorerie.parMois.map((m, i) => {
                const critique = i === tresorerie.moisCritiqueIndex;
                return (
                  <tr key={i} className={critique ? 'bg-rose-50' : ''}>
                    <td className="font-medium text-slate-800">{MOIS[i]}</td>
                    <td className="num text-slate-700">{eur(m.soldeDebut)}</td>
                    <td className="num text-emerald-600">{eur(m.encaissements)}</td>
                    <td className="num text-rose-600">{eur(m.decaissements)}</td>
                    <td className={`num ${m.variation < 0 ? 'text-rose-600' : 'text-slate-700'}`}>{eur(m.variation)}</td>
                    <td className={`num font-semibold ${m.soldeFin < 0 ? 'text-rose-600' : 'text-navy'}`}>{eur(m.soldeFin)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-slate-700">
          Mois critique : <span className="text-amber-600">{MOIS[tresorerie.moisCritiqueIndex]}</span>{' '}
          ({eur(tresorerie.soldeFinLePlusBas)}). Décaissement mensuel moyen :{' '}
          {eur(tresorerie.decaissementMensuelMoyen)}.
        </p>
      </Section>
    </div>
  );
}
