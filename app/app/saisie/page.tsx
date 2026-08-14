'use client';

import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { MOIS, resultatMensuel, type TypePrevisionnel, type CategorieCharge } from '@naviscop/finance-engine';
import { useDossier } from '@/lib/dossier-context';
import { eur } from '@/lib/format';
import { PageHeader, Section } from '@/components/ui';

const TYPES: { valeur: TypePrevisionnel; label: string }[] = [
  { valeur: 'facture_a_venir', label: 'Facture à venir' },
  { valeur: 'charge_prevue', label: 'Charge prévue' },
  { valeur: 'investissement', label: 'Investissement' },
];

const CATEGORIES: { valeur: CategorieCharge; label: string }[] = [
  { valeur: 'autresAchatsChargesExternes', label: 'Charges externes' },
  { valeur: 'achatsMarchandisesMp', label: 'Achats / matières' },
  { valeur: 'salairesEtCharges', label: 'Salaires et charges' },
  { valeur: 'impotsEtTaxes', label: 'Impôts et taxes' },
  { valeur: 'chargesFinancieres', label: 'Charges financières' },
];

const LABEL_TYPE: Record<TypePrevisionnel, string> = {
  facture_a_venir: 'Facture à venir',
  charge_prevue: 'Charge prévue',
  investissement: 'Investissement',
};

export default function SaisiePage() {
  const { previsionnels, ajouterPrevisionnel, supprimerPrevisionnel, pnlReel, entrees, majReelMois, moisClotureIndex, majMoisCloture } = useDossier();

  // Comparaison Réalisé (données de base) vs Prévisionnel (base + mouvements saisis), par mois.
  const comparaison = MOIS.map((mois, i) => {
    const reel = resultatMensuel(pnlReel[i]);
    const prev = resultatMensuel(entrees.pnl[i]);
    return {
      i,
      mois,
      caReel: pnlReel[i].caHt,
      caPrev: entrees.pnl[i].caHt,
      resReel: reel.resultatNet,
      resPrev: prev.resultatNet,
      ecart: reel.resultatNet - prev.resultatNet,
    };
  });
  const totReel = comparaison.reduce((a, l) => a + l.resReel, 0);
  const totPrev = comparaison.reduce((a, l) => a + l.resPrev, 0);
  const [type, setType] = useState<TypePrevisionnel>('facture_a_venir');
  const [libelle, setLibelle] = useState('');
  const [montant, setMontant] = useState(0);
  const [tva, setTva] = useState(20);
  const [moisIndex, setMoisIndex] = useState(new Date().getMonth());
  const [repeter, setRepeter] = useState(-1); // -1 = ponctuel ; sinon index du mois de fin
  const [categorie, setCategorie] = useState<CategorieCharge>('autresAchatsChargesExternes');

  const champ = 'rounded-xl border border-navy/10 bg-white/60 px-3 py-2 text-sm text-navy outline-none focus:border-brand/50';

  // Sous-totaux HT par type de mouvement.
  const totaux = useMemo(() => {
    const t = { facture_a_venir: 0, charge_prevue: 0, investissement: 0 };
    for (const mv of previsionnels) t[mv.type] += mv.montantHt;
    return t;
  }, [previsionnels]);

  const soumettre = (e: React.FormEvent) => {
    e.preventDefault();
    if (!libelle.trim() || montant <= 0) return;
    const commun = {
      type,
      libelle: libelle.trim(),
      montantHt: montant,
      tauxTva: tva,
      categorie: type === 'charge_prevue' ? categorie : undefined,
    };
    // Récurrence : un mouvement par mois, de moisIndex jusqu'au mois de fin choisi.
    const finMois = repeter > moisIndex ? repeter : moisIndex;
    for (let i = moisIndex; i <= finMois; i++) {
      ajouterPrevisionnel({ ...commun, moisIndex: i });
    }
    setLibelle('');
    setMontant(0);
    setRepeter(-1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Saisie prévisionnelle"
        subtitle="Ce que la comptabilité ne connaît pas encore : devis en cours, factures et charges à venir, investissements. Cela affine la projection."
      />

      <Section title="Ajouter un mouvement prévisionnel">
        <form onSubmit={soumettre} className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <select className={`${champ} md:col-span-2`} value={type} onChange={(e) => setType(e.target.value as TypePrevisionnel)}>
            {TYPES.map((t) => (
              <option key={t.valeur} value={t.valeur} className="bg-white">
                {t.label}
              </option>
            ))}
          </select>
          <input
            className={`${champ} md:col-span-4`}
            placeholder="Libellé"
            value={libelle}
            onChange={(e) => setLibelle(e.target.value)}
          />
          <input
            type="number"
            className={`${champ} md:col-span-2`}
            placeholder="Montant HT"
            value={montant || ''}
            onChange={(e) => setMontant(Number(e.target.value))}
          />
          <select className={`${champ} md:col-span-1`} value={tva} onChange={(e) => setTva(Number(e.target.value))}>
            {[0, 5.5, 10, 20].map((t) => (
              <option key={t} value={t} className="bg-white">
                {t}%
              </option>
            ))}
          </select>
          <select
            className={`${champ} md:col-span-3`}
            value={moisIndex}
            onChange={(e) => {
              const v = Number(e.target.value);
              setMoisIndex(v);
              if (repeter !== -1 && repeter <= v) setRepeter(-1);
            }}
          >
            {MOIS.map((m, i) => (
              <option key={m} value={i} className="bg-white">
                {m}
              </option>
            ))}
          </select>

          {/* Récurrence : répéter chaque mois jusqu'à un mois de fin. */}
          <select
            className={`${champ} md:col-span-3`}
            value={repeter}
            onChange={(e) => setRepeter(Number(e.target.value))}
            title="Répéter le mouvement chaque mois"
          >
            <option value={-1} className="bg-white">
              Ponctuel (1 mois)
            </option>
            {MOIS.map((m, i) =>
              i > moisIndex ? (
                <option key={m} value={i} className="bg-white">
                  Répéter jusqu’à {m}
                </option>
              ) : null,
            )}
          </select>

          {type === 'charge_prevue' && (
            <select
              className={`${champ} md:col-span-3`}
              value={categorie}
              onChange={(e) => setCategorie(e.target.value as CategorieCharge)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.valeur} value={c.valeur} className="bg-white">
                  {c.label}
                </option>
              ))}
            </select>
          )}

          <button
            type="submit"
            className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-soft md:col-span-3 md:col-start-10"
          >
            Ajouter
          </button>
        </form>
        {repeter > moisIndex && (
          <p className="mt-2 text-xs text-brand">
            {repeter - moisIndex + 1} mouvements seront créés ({MOIS[moisIndex]} → {MOIS[repeter]}).
          </p>
        )}
      </Section>

      {/* Sous-totaux par type */}
      {previsionnels.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="card px-5 py-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500">Factures à venir (HT)</p>
            <p className="mt-1 text-lg font-semibold text-emerald-600">{eur(totaux.facture_a_venir)}</p>
          </div>
          <div className="card px-5 py-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500">Charges prévues (HT)</p>
            <p className="mt-1 text-lg font-semibold text-rose-600">{eur(totaux.charge_prevue)}</p>
          </div>
          <div className="card px-5 py-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500">Investissements (HT)</p>
            <p className="mt-1 text-lg font-semibold text-navy">{eur(totaux.investissement)}</p>
          </div>
        </div>
      )}

      <Section title={`Mouvements prévisionnels (${previsionnels.length})`}>
        {previsionnels.length === 0 ? (
          <p className="text-sm text-slate-500">
            Aucun mouvement prévisionnel. Ajoutez vos devis en cours et charges à venir pour projeter la trésorerie.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Libellé</th>
                  <th className="!text-right">Montant HT</th>
                  <th>Mois</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {previsionnels.map((mv) => (
                  <tr key={mv.id}>
                    <td className="text-slate-700">{LABEL_TYPE[mv.type]}</td>
                    <td className="font-medium text-slate-800">{mv.libelle}</td>
                    <td className="num text-slate-700">{eur(mv.montantHt)}</td>
                    <td className="text-slate-500">{MOIS[mv.moisIndex]}</td>
                    <td className="!text-right">
                      <button onClick={() => supprimerPrevisionnel(mv.id)} className="text-slate-500 hover:text-rose-600" aria-label="Supprimer">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-xs text-slate-500">
          Ces mouvements se superposent aux données réelles importées et alimentent directement le dashboard, le plan de trésorerie et les scénarios.
        </p>
      </Section>

      {/* Réalisé vs Prévisionnel */}
      <Section title="Réalisé vs Prévisionnel par mois">
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-700">
          Votre compte n’est pas à jour ? Il manque peut-être des factures sur le mois. Corrigez directement le CA
          réalisé dans le tableau ci-dessous : le reste se recalcule tout seul.
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-navy/10 bg-slate-50 px-3.5 py-3 text-sm">
          <span className="font-medium text-navy">Dernier mois clôturé (réalisé) :</span>
          <select
            value={moisClotureIndex}
            onChange={(e) => majMoisCloture(Number(e.target.value))}
            className="rounded-lg border border-navy/10 bg-white px-2.5 py-1.5 text-sm text-navy outline-none focus:border-brand/50"
          >
            <option value={-1}>Aucun</option>
            {MOIS.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
          <span className="w-full text-xs leading-snug text-slate-500">
            Jusqu’à ce mois, le réalisé remplace la prévision : les mouvements prévisionnels portant sur un mois clôturé sont
            ignorés (plus de double compte). Les mois suivants restent prévisionnels.
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mois</th>
                <th className="!text-right">CA réalisé</th>
                <th className="!text-right">CA prévu</th>
                <th className="!text-right">Résultat réalisé</th>
                <th className="!text-right">Résultat prévu</th>
                <th className="!text-right">Écart</th>
              </tr>
            </thead>
            <tbody>
              {comparaison.map((l) => (
                <tr key={l.mois}>
                  <td className="text-slate-700">
                    {l.mois}
                    {l.i <= moisClotureIndex && (
                      <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">clôturé</span>
                    )}
                  </td>
                  <td className="!text-right">
                    <input
                      type="number"
                      step={100}
                      value={Math.round(l.caReel)}
                      onChange={(e) => majReelMois(l.i, { caHt: Number(e.target.value) })}
                      className="w-28 rounded-lg border border-navy/10 bg-white/60 px-2 py-1 text-right text-sm tabular-nums text-navy outline-none focus:border-brand/50"
                    />
                  </td>
                  <td className="num text-slate-500">{eur(l.caPrev)}</td>
                  <td className={`num ${l.resReel < 0 ? 'text-rose-600' : 'text-slate-700'}`}>{eur(l.resReel)}</td>
                  <td className="num text-slate-500">{eur(l.resPrev)}</td>
                  <td className={`num font-medium ${l.ecart < 0 ? 'text-rose-600' : l.ecart > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {l.ecart > 0 ? '+' : ''}
                    {eur(l.ecart)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-navy/10 font-semibold">
                <td className="text-navy">Total année</td>
                <td></td>
                <td></td>
                <td className={`num ${totReel < 0 ? 'text-rose-600' : 'text-navy'}`}>{eur(totReel)}</td>
                <td className={`num ${totPrev < 0 ? 'text-rose-600' : 'text-navy'}`}>{eur(totPrev)}</td>
                <td className={`num ${totReel - totPrev < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {totReel - totPrev > 0 ? '+' : ''}
                  {eur(totReel - totPrev)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Le réalisé, c’est ce que dit votre comptabilité (import FEC ou balance). Le prévisionnel ajoute vos mouvements
          saisis ci-dessus. L’analyse de ces écarts est centralisée dans la page Analyse.
        </p>
      </Section>
    </div>
  );
}
