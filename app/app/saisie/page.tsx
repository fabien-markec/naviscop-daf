'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { MOIS, type TypePrevisionnel, type CategorieCharge } from '@naviscop/finance-engine';
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
  const { previsionnels, ajouterPrevisionnel, supprimerPrevisionnel } = useDossier();
  const [type, setType] = useState<TypePrevisionnel>('facture_a_venir');
  const [libelle, setLibelle] = useState('');
  const [montant, setMontant] = useState(0);
  const [tva, setTva] = useState(20);
  const [moisIndex, setMoisIndex] = useState(new Date().getMonth());
  const [categorie, setCategorie] = useState<CategorieCharge>('autresAchatsChargesExternes');

  const champ = 'rounded-xl border border-navy/10 bg-white/60 px-3 py-2 text-sm text-navy outline-none focus:border-brand/50';

  const soumettre = (e: React.FormEvent) => {
    e.preventDefault();
    if (!libelle.trim() || montant <= 0) return;
    ajouterPrevisionnel({
      type,
      libelle: libelle.trim(),
      montantHt: montant,
      tauxTva: tva,
      moisIndex,
      categorie: type === 'charge_prevue' ? categorie : undefined,
    });
    setLibelle('');
    setMontant(0);
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
            className={`${champ} md:col-span-3`}
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
          <select className={`${champ} md:col-span-2`} value={moisIndex} onChange={(e) => setMoisIndex(Number(e.target.value))}>
            {MOIS.map((m, i) => (
              <option key={m} value={i} className="bg-white">
                {m}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-soft md:col-span-2">
            Ajouter
          </button>
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
        </form>
      </Section>

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
    </div>
  );
}
