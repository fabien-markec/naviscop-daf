'use client';

import { Fragment, useMemo, useState } from 'react';
import { ChevronRight, Trash2, Pencil } from 'lucide-react';
import {
  MOIS,
  resultatMensuel,
  type LignePnlMensuelle,
  type TypePrevisionnel,
  type CategorieCharge,
} from '@naviscop/finance-engine';
import { useDossier } from '@/lib/dossier-context';
import { eur, pct } from '@/lib/format';
import { KpiCard, PageHeader, Section } from '@/components/ui';
import { ResultatChart } from '@/components/charts';
import { GrilleMensuelle, type LigneGrille } from '@/components/grille-mensuelle';

const MOIS_COURT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function formatDateFec(d: string): string {
  const v = (d ?? '').trim();
  if (/^\d{8}$/.test(v)) return `${v.slice(6, 8)}/${v.slice(4, 6)}/${v.slice(0, 4)}`;
  return v;
}

/** Catégorie NAVISCOP d'un numéro de compte (aligné sur le moteur). */
function categorieDeCompte(compte: string): keyof LignePnlMensuelle | null {
  const c = (compte ?? '').replace(/\D/g, '');
  const p2 = c.slice(0, 2);
  const p3 = c.slice(0, 3);
  if (p3 === '601' || p3 === '602' || p3 === '607') return 'achatsMarchandisesMp';
  if (p2 === '60' || p2 === '61' || p2 === '62' || p2 === '65') return 'autresAchatsChargesExternes';
  if (p2 === '63') return 'impotsEtTaxes';
  if (p2 === '64') return 'salairesEtCharges';
  if (p2 === '66') return 'chargesFinancieres';
  if (p2 === '67') return 'chargesExceptionnelles';
  if (p2 === '68') return 'amortissements';
  return null;
}

type KindSIG = 'produit' | 'charge' | 'solde';
interface LigneSIG {
  key: string;
  label: string;
  kind: KindSIG;
  cat?: keyof LignePnlMensuelle; // pour les charges : catégorie détaillable
  val: (i: number) => number;
  fort?: boolean;
}

const CATEGORIES_SAISIE: { valeur: CategorieCharge; label: string }[] = [
  { valeur: 'autresAchatsChargesExternes', label: 'Charges externes' },
  { valeur: 'achatsMarchandisesMp', label: 'Achats / matières' },
  { valeur: 'salairesEtCharges', label: 'Salaires et charges' },
  { valeur: 'impotsEtTaxes', label: 'Impôts et taxes' },
  { valeur: 'chargesFinancieres', label: 'Charges financières' },
];

export default function RentabilitePage() {
  const { entrees, pnlReel, tableauDeBord, previsionnels, ajouterPrevisionnel, supprimerPrevisionnel, majReelMois, moisClotureIndex, majMoisCloture } = useDossier();
  const { pnl } = tableauDeBord;
  const a = pnl.annuel;
  const pnlMensuel = entrees.pnl;
  const postes = entrees.detail?.charges ?? [];

  const [catOuverte, setCatOuverte] = useState<keyof LignePnlMensuelle | null>(null);
  const [posteOuvert, setPosteOuvert] = useState<string | null>(null);
  const [saisieOuverte, setSaisieOuverte] = useState(false);

  // Grille de saisie manuelle du compte de résultat (réalisé, mois par mois).
  const lignesSaisie: LigneGrille[] = [
    { key: 'ca', label: "Chiffre d'affaires HT", get: (i) => pnlReel[i].caHt, set: (i, v) => majReelMois(i, { caHt: v }) },
    { key: 'achats', label: 'Achats consommés', charge: true, get: (i) => pnlReel[i].achatsMarchandisesMp, set: (i, v) => majReelMois(i, { achatsMarchandisesMp: v }) },
    { key: 'externes', label: 'Charges externes', charge: true, get: (i) => pnlReel[i].autresAchatsChargesExternes, set: (i, v) => majReelMois(i, { autresAchatsChargesExternes: v }) },
    { key: 'salaires', label: 'Salaires et charges', charge: true, get: (i) => pnlReel[i].salairesEtCharges, set: (i, v) => majReelMois(i, { salairesEtCharges: v }) },
    { key: 'impots', label: 'Impôts et taxes', charge: true, get: (i) => pnlReel[i].impotsEtTaxes, set: (i, v) => majReelMois(i, { impotsEtTaxes: v }) },
    { key: 'fin', label: 'Charges financières', charge: true, get: (i) => pnlReel[i].chargesFinancieres, set: (i, v) => majReelMois(i, { chargesFinancieres: v }) },
    { key: 'exc', label: 'Charges exceptionnelles', charge: true, get: (i) => pnlReel[i].chargesExceptionnelles, set: (i, v) => majReelMois(i, { chargesExceptionnelles: v }) },
    { key: 'amort', label: 'Dotations aux amortissements', charge: true, get: (i) => pnlReel[i].amortissements, set: (i, v) => majReelMois(i, { amortissements: v }) },
  ];

  // Saisie manuelle produit / charge.
  const [typeSaisie, setTypeSaisie] = useState<'produit' | 'charge'>('produit');
  const [libelle, setLibelle] = useState('');
  const [montant, setMontant] = useState(0);
  const [tva, setTva] = useState(20);
  const [moisFact, setMoisFact] = useState(new Date().getMonth());
  const [moisEnc, setMoisEnc] = useState(new Date().getMonth());
  const [statut, setStatut] = useState<'signee' | 'prevue'>('signee');
  const [categorie, setCategorie] = useState<CategorieCharge>('autresAchatsChargesExternes');

  const rm = useMemo(() => pnlMensuel.map((m) => resultatMensuel(m)), [pnlMensuel]);
  const cumul = useMemo(() => {
    let c = 0;
    return rm.map((r) => (c += r.resultatNet));
  }, [rm]);

  const lignes: LigneSIG[] = [
    { key: 'ca', label: "Chiffre d'affaires HT", kind: 'produit', val: (i) => pnlMensuel[i].caHt },
    { key: 'achats', label: 'Achats consommés', kind: 'charge', cat: 'achatsMarchandisesMp', val: (i) => pnlMensuel[i].achatsMarchandisesMp },
    { key: 'marge', label: 'Marge brute', kind: 'solde', fort: true, val: (i) => rm[i].margeBrute },
    { key: 'externes', label: 'Charges externes', kind: 'charge', cat: 'autresAchatsChargesExternes', val: (i) => pnlMensuel[i].autresAchatsChargesExternes },
    { key: 'impots', label: 'Impôts et taxes', kind: 'charge', cat: 'impotsEtTaxes', val: (i) => pnlMensuel[i].impotsEtTaxes },
    { key: 'salaires', label: 'Salaires et charges', kind: 'charge', cat: 'salairesEtCharges', val: (i) => pnlMensuel[i].salairesEtCharges },
    { key: 'ebe', label: "Excédent brut d'exploitation (EBE)", kind: 'solde', fort: true, val: (i) => rm[i].ebe },
    { key: 'fin', label: 'Charges financières', kind: 'charge', cat: 'chargesFinancieres', val: (i) => pnlMensuel[i].chargesFinancieres },
    { key: 'exc', label: 'Charges exceptionnelles', kind: 'charge', cat: 'chargesExceptionnelles', val: (i) => pnlMensuel[i].chargesExceptionnelles },
    { key: 'amort', label: 'Dotations aux amortissements', kind: 'charge', cat: 'amortissements', val: (i) => pnlMensuel[i].amortissements },
    { key: 'resultat', label: 'Résultat net', kind: 'solde', fort: true, val: (i) => rm[i].resultatNet },
    { key: 'cumul', label: 'Résultat cumulé', kind: 'solde', val: (i) => cumul[i] },
  ];

  const totalLigne = (l: LigneSIG) => (l.key === 'cumul' ? cumul[11] : Array.from({ length: 12 }, (_, i) => l.val(i)).reduce((x, y) => x + y, 0));

  const chartData = pnl.parMois.map((m, i) => ({ mois: MOIS_COURT[i], resultat: m.resultatNet, cumule: pnl.resultatCumule[i] }));
  const postesCategorie = (cat: keyof LignePnlMensuelle) => postes.filter((p) => categorieDeCompte(p.compte) === cat);

  const champ = 'rounded-xl border border-navy/10 bg-white/60 px-3 py-2 text-sm text-navy outline-none focus:border-brand/50';
  const soumettre = (e: React.FormEvent) => {
    e.preventDefault();
    if (!libelle.trim() || montant <= 0) return;
    if (typeSaisie === 'produit') {
      ajouterPrevisionnel({ type: 'facture_a_venir', libelle: libelle.trim(), montantHt: montant, tauxTva: tva, moisIndex: moisFact, moisEncaissement: moisEnc, statut });
    } else {
      ajouterPrevisionnel({ type: 'charge_prevue', libelle: libelle.trim(), montantHt: montant, tauxTva: tva, moisIndex: moisFact, categorie });
    }
    setLibelle('');
    setMontant(0);
  };

  const LABEL_TYPE: Record<TypePrevisionnel, string> = {
    facture_a_venir: 'Produit',
    charge_prevue: 'Charge',
    investissement: 'Investissement',
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Rentabilité" subtitle="L’activité gagne-t-elle vraiment de l’argent ? Compte de résultat détaillé, mois par mois." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="CA HT annuel" value={eur(a.caHt)} />
        <KpiCard label="Marge brute" value={eur(a.margeBrute)} hint={pct(a.tauxMarqueBrute)} />
        <KpiCard label="EBE" value={eur(a.ebe)} tone={a.ebe < 0 ? 'negative' : 'positive'} />
        <KpiCard label="Résultat net" value={eur(a.resultatNet)} tone={a.resultatNet < 0 ? 'negative' : 'positive'} />
      </div>

      <Section title="Résultat mensuel et cumulé">
        <ResultatChart data={chartData} />
      </Section>

      {/* Compte de résultat détaillé — mois en colonnes, postes en lignes */}
      <Section title="Résultat détaillé (mensuel)">
        <p className="mb-3 text-xs text-slate-700">Cliquez sur une ligne de charge pour voir le détail des postes qui la composent.</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-navy/10 text-[11px] uppercase tracking-wide text-slate-700">
                <th className="sticky left-0 z-10 bg-white py-2 pr-3 text-left font-semibold">Poste</th>
                {MOIS_COURT.map((m) => (
                  <th key={m} className="px-2 py-2 text-right font-semibold">{m}</th>
                ))}
                <th className="px-2 py-2 text-right font-semibold text-navy">Année</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l) => {
                const cliquable = l.kind === 'charge' && !!l.cat;
                const ouvert = cliquable && catOuverte === l.cat;
                return (
                  <Fragment key={l.key}>
                    <tr
                      className={`border-b border-navy/[0.05] ${l.fort ? 'bg-slate-50 font-semibold' : ''} ${cliquable ? 'cursor-pointer hover:bg-white/60' : ''}`}
                      onClick={cliquable ? () => setCatOuverte(ouvert ? null : (l.cat as keyof LignePnlMensuelle)) : undefined}
                    >
                      <td className={`sticky left-0 z-10 py-2 pr-3 text-left ${l.fort ? 'bg-slate-50 text-navy' : 'bg-white text-slate-800'}`}>
                        <span className="inline-flex items-center gap-1.5">
                          {cliquable && <ChevronRight className={`h-3.5 w-3.5 text-slate-600 transition-transform ${ouvert ? 'rotate-90' : ''}`} />}
                          {l.kind === 'charge' && <span className="text-slate-600">−</span>}
                          {l.label}
                        </span>
                      </td>
                      {Array.from({ length: 12 }, (_, i) => {
                        const v = l.val(i);
                        return (
                          <td key={i} className={`px-2 py-2 text-right tabular-nums ${v < 0 ? 'text-rose-600' : l.fort ? 'text-navy' : 'text-slate-700'}`}>
                            {v !== 0 || l.kind === 'solde' ? eur(v) : '—'}
                          </td>
                        );
                      })}
                      <td className={`px-2 py-2 text-right font-semibold tabular-nums ${totalLigne(l) < 0 ? 'text-rose-600' : 'text-navy'}`}>{eur(totalLigne(l))}</td>
                    </tr>
                    {ouvert && (
                      <tr>
                        <td colSpan={14} className="bg-slate-50 px-3 py-2">
                          {postesCategorie(l.cat as keyof LignePnlMensuelle).length === 0 ? (
                            <p className="text-xs text-slate-700">Détail des postes indisponible (pas d’import FEC pour cette catégorie).</p>
                          ) : (
                            <div className="space-y-1.5">
                              {postesCategorie(l.cat as keyof LignePnlMensuelle).map((p) => {
                                const po = posteOuvert === p.compte;
                                const nbEcr = p.ecritures?.length ?? 0;
                                return (
                                  <div key={p.compte} className="rounded-lg border border-navy/[0.06] bg-white/70">
                                    <button
                                      onClick={() => setPosteOuvert(po ? null : p.compte)}
                                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
                                    >
                                      <span className="flex items-center gap-1.5 text-sm text-slate-800">
                                        <ChevronRight className={`h-3 w-3 text-slate-600 transition-transform ${po ? 'rotate-90' : ''}`} />
                                        {p.libelle} <span className="text-[10px] text-slate-600">{p.compte}{nbEcr > 0 ? ` · ${nbEcr}` : ''}</span>
                                      </span>
                                      <span className="tabular-nums text-sm font-medium text-slate-800">{eur(p.montant)}</span>
                                    </button>
                                    {po && nbEcr > 0 && (
                                      <div className="max-h-56 overflow-y-auto border-t border-slate-100 px-3 py-2">
                                        <table className="w-full text-xs">
                                          <tbody>
                                            {p.ecritures!.map((ec, k) => (
                                              <tr key={k} className="border-t border-slate-100 first:border-0">
                                                <td className="whitespace-nowrap py-1 pr-3 text-slate-600">{formatDateFec(ec.date)}</td>
                                                <td className="py-1 pr-3 text-slate-800">{ec.libelle}</td>
                                                <td className="whitespace-nowrap py-1 text-right tabular-nums text-slate-800">{eur(ec.montant)}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Saisie manuelle du compte de résultat mois par mois (dossier sans FEC) */}
      <Section
        title="Saisir le compte de résultat mois par mois"
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
            <p className="mb-3 text-xs text-slate-700">
              Pas de FEC ni de balance ? Saisissez directement le chiffre d’affaires et les charges de chaque mois. Les soldes
              (marge, EBE, résultat) se recalculent automatiquement.
            </p>
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-navy/10 bg-slate-50 px-3.5 py-2.5">
              <label className="text-sm text-slate-700">Dernier mois clôturé (réalisé connu)</label>
              <select
                value={moisClotureIndex ?? -1}
                onChange={(e) => majMoisCloture(Number(e.target.value))}
                className="rounded-lg border border-navy/10 bg-white px-2.5 py-1.5 text-sm text-navy outline-none focus:border-brand/50"
              >
                <option value={-1}>Aucun</option>
                {MOIS.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
              <span className="text-xs text-slate-600">
                Au-delà de ce mois, seules vos prévisions comptent. En deçà, c’est le réalisé — évite de compter deux fois une facture prévue puis réalisée.
              </span>
            </div>
            <GrilleMensuelle lignes={lignesSaisie} />
          </>
        ) : (
          <p className="text-sm text-slate-700">
            Pour un dossier sans import comptable, cliquez sur « Saisir à la main » pour renseigner le compte de résultat mois
            par mois.
          </p>
        )}
      </Section>

      {/* Saisie manuelle : produits et charges */}
      <Section title="Ajouter un produit ou une charge">
        <div className="mb-3 inline-flex rounded-full border border-navy/10 bg-slate-50 p-1">
          {(['produit', 'charge'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeSaisie(t)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${typeSaisie === t ? 'bg-brand text-white' : 'text-slate-700 hover:text-navy'}`}
            >
              {t === 'produit' ? 'Produit (facture)' : 'Charge'}
            </button>
          ))}
        </div>
        <form onSubmit={soumettre} className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <input className={`${champ} md:col-span-3`} placeholder={typeSaisie === 'produit' ? 'Client / produit' : 'Libellé de la charge'} value={libelle} onChange={(e) => setLibelle(e.target.value)} />
          <input type="number" className={`${champ} md:col-span-2`} placeholder="Montant HT" value={montant || ''} onChange={(e) => setMontant(Number(e.target.value))} />
          <select className={`${champ} md:col-span-1`} value={tva} onChange={(e) => setTva(Number(e.target.value))}>
            {[0, 5.5, 10, 20].map((t) => (<option key={t} value={t} className="bg-white">{t}%</option>))}
          </select>
          <select className={`${champ} md:col-span-2`} value={moisFact} onChange={(e) => setMoisFact(Number(e.target.value))}>
            {MOIS.map((m, i) => (<option key={m} value={i} className="bg-white">{typeSaisie === 'produit' ? `Facture : ${m}` : `Mois : ${m}`}</option>))}
          </select>
          {typeSaisie === 'produit' ? (
            <>
              <select className={`${champ} md:col-span-2`} value={moisEnc} onChange={(e) => setMoisEnc(Number(e.target.value))}>
                {MOIS.map((m, i) => (<option key={m} value={i} className="bg-white">Encaissé : {m}</option>))}
              </select>
              <select className={`${champ} md:col-span-1`} value={statut} onChange={(e) => setStatut(e.target.value as 'signee' | 'prevue')}>
                <option value="signee" className="bg-white">Signé</option>
                <option value="prevue" className="bg-white">Prévu</option>
              </select>
            </>
          ) : (
            <select className={`${champ} md:col-span-3`} value={categorie} onChange={(e) => setCategorie(e.target.value as CategorieCharge)}>
              {CATEGORIES_SAISIE.map((c) => (<option key={c.valeur} value={c.valeur} className="bg-white">{c.label}</option>))}
            </select>
          )}
          <button type="submit" className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-soft md:col-span-1">Ajouter</button>
        </form>
      </Section>

      <Section title={`Saisies manuelles (${previsionnels.length})`}>
        {previsionnels.length === 0 ? (
          <p className="text-sm text-slate-700">Aucune saisie. Ajoutez vos produits (factures à venir) et charges pour affiner la projection.</p>
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
                    <td>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${mv.type === 'facture_a_venir' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {LABEL_TYPE[mv.type]}
                      </span>
                    </td>
                    <td className="font-medium text-slate-800">{mv.libelle}</td>
                    <td className="num text-slate-700">{eur(mv.montantHt)}</td>
                    <td className="text-slate-700">{MOIS[mv.moisIndex]}</td>
                    <td className="!text-right">
                      <button onClick={() => supprimerPrevisionnel(mv.id)} className="text-slate-600 hover:text-rose-600" aria-label="Supprimer">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
