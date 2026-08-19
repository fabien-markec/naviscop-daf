'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { MOIS, calculerTableauDeBord, calculerCashDisponible, dernierMoisActif } from '@naviscop/finance-engine';
import { useDossier } from '@/lib/dossier-context';
import { eur, pct } from '@/lib/format';
import { KpiCard, StatBar, PageHeader, Section, ListeAlertes } from '@/components/ui';
import { TresorerieChart } from '@/components/charts';
import { CascadeCash } from '@/components/cash-disponible';

type VueDashboard = 'aujourdhui' | 'annee' | 'perso';

const STATUT_LABEL: Record<string, string> = {
  a_faire: 'À faire',
  en_cours: 'En cours',
  fait: 'Fait',
};
const STATUT_STYLE: Record<string, string> = {
  a_faire: 'border-slate-200 bg-slate-50 text-slate-700',
  en_cours: 'border-amber-200 bg-amber-50 text-amber-700',
  fait: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

export default function DashboardPage() {
  const { entrees, entreesReel, previsionnels, planActions, chargesFixes, ajouterChargeFixe, supprimerChargeFixe } = useDossier();
  const [vue, setVue] = useState<VueDashboard>('aujourdhui');
  const [moisPerso, setMoisPerso] = useState(() => dernierMoisActif(entreesReel));

  // Vue « à aujourd'hui » = réalisé seul ; « fin d'année » / « personnalisé » = base + prévisions.
  const entreesVue = vue === 'aujourdhui' ? entreesReel : entrees;
  const tdb = useMemo(() => calculerTableauDeBord(entreesVue), [entreesVue]);
  const { kpis, tresorerie, pnl, alertes } = tdb;
  const moisRef =
    vue === 'annee' ? 11 : vue === 'perso' ? moisPerso : tresorerie.moisADateIndex >= 0 ? tresorerie.moisADateIndex : 11;
  const soldeADate = tresorerie.parMois[moisRef]?.soldeFin ?? kpis.tresorerieDisponible;
  const cashDisponible = useMemo(() => calculerCashDisponible(entreesVue, soldeADate), [entreesVue, soldeADate]);
  const sansPrevision = vue !== 'aujourdhui' && previsionnels.length === 0;
  const chartData = tresorerie.parMois.map((m, i) => ({ mois: MOIS[i].slice(0, 3), solde: m.soldeFin }));

  // 3 actions prioritaires : celles qui restent à mener (à faire ou en cours).
  const actionsPrioritaires = (planActions ?? [])
    .filter((a) => a.statut !== 'fait')
    .slice(0, 3);

  // Détail par poste et par client (présent après import FEC ou en démo).
  const detail = entrees.detail;
  const caHt = pnl.annuel.caHt || 1;
  const topChargesFixes = (detail?.charges ?? []).filter((c) => c.fixe).slice(0, 5);
  const maxCharge = topChargesFixes[0]?.montant ?? 1;
  const topClients = (detail?.clients ?? []).slice(0, 3);
  const caClients = (detail?.clients ?? []).reduce((acc, c) => acc + c.caHt, 0) || 1;
  const partTopClient = topClients[0] ? topClients[0].caHt / caClients : 0;
  const risqueDependance = partTopClient >= 0.35;
  const poidsChargesFixes = pnl.annuel.chargesFixesTotales / caHt;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord"
        subtitle="Comprendre la situation financière en 30 secondes, et savoir quoi décider."
      />

      {/* Sélecteur de vue : à date / fin d'année / mois personnalisé */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full border border-navy/10 bg-white/70 p-1">
          {([
            ['aujourdhui', 'À aujourd’hui'],
            ['annee', 'Prévision fin d’année'],
            ['perso', 'Personnalisé'],
          ] as [VueDashboard, string][]).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setVue(v)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                vue === v ? 'bg-brand text-white shadow-[0_4px_12px_-4px_rgba(0,98,184,0.4)]' : 'text-slate-700 hover:text-navy'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {vue === 'perso' && (
          <select
            value={moisPerso}
            onChange={(e) => setMoisPerso(Number(e.target.value))}
            className="rounded-full border border-navy/10 bg-white/70 px-3 py-1.5 text-sm text-navy outline-none focus:border-brand/50"
          >
            {MOIS.map((m, i) => (
              <option key={m} value={i}>
                Situation à fin {m}
              </option>
            ))}
          </select>
        )}
        <span className="text-xs text-slate-700">
          Situation à fin <strong>{MOIS[moisRef]}</strong>
          {vue === 'aujourdhui' ? ' (dernier mois réalisé)' : vue === 'annee' ? ' (projeté)' : ''}
        </span>
      </div>

      {sansPrevision && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Vous n’avez pas encore saisi de prévisions (factures et charges à venir) dans les autres modules. Cette vue reprend
          donc simplement le réalisé. Ajoutez vos mouvements dans « Saisie prévisionnelle » et « Carnet de commandes » pour une
          vraie projection.
        </div>
      )}

      {/* Bandeau décision */}
      <StatBar
        stats={[
          { label: `Trésorerie à fin ${MOIS[moisRef].toLowerCase()}`, value: eur(soldeADate), tone: soldeADate < 0 ? 'negative' : 'neutral' },
          {
            label: 'Trésorerie à 3 mois',
            value: eur(kpis.tresorerie3Mois),
            tone: kpis.tresorerie3Mois < 0 ? 'negative' : 'positive',
          },
          {
            label: 'Résultat prévisionnel',
            value: eur(kpis.resultatPrevisionnel),
            tone: kpis.resultatPrevisionnel < 0 ? 'negative' : 'positive',
          },
          { label: 'Créances clients', value: eur(kpis.creancesClients), hint: 'facturé non encaissé', tone: 'warning' },
        ]}
      />

      {/* Cash réellement disponible (pilier 1) + alertes */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CascadeCash data={cashDisponible} chargesFixes={chargesFixes} onAjouterCharge={ajouterChargeFixe} onSupprimerCharge={supprimerChargeFixe} />
        <Section title="Alertes prioritaires">
          <ListeAlertes alertes={alertes} />
        </Section>
      </div>

      <Section title="Évolution de la trésorerie sur 12 mois">
        <TresorerieChart data={chartData} />
      </Section>

      {/* Rappel des actions à mener */}
      <Section
        title="Vos actions prioritaires"
        action={
          <Link href="/plan-action" className="text-xs font-medium text-brand hover:underline">
            Voir le plan d’action
          </Link>
        }
      >
        {actionsPrioritaires.length === 0 ? (
          <p className="text-sm text-slate-700">
            Aucune action en attente. Les préconisations de l’analyse viendront alimenter cette liste.
          </p>
        ) : (
          <ul className="space-y-2">
            {actionsPrioritaires.map((a) => (
              <li
                key={a.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-navy/[0.08] bg-white/60 px-3.5 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-navy">{a.action}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-700">
                    {[a.responsable, a.echeance].filter(Boolean).join(' · ') || 'À planifier'}
                  </p>
                </div>
                <span
                  className={`flex-none rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    STATUT_STYLE[a.statut] ?? STATUT_STYLE.a_faire
                  }`}
                >
                  {STATUT_LABEL[a.statut] ?? 'À faire'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Voyants de gestion : est-ce que l'activité gagne de l'argent ? */}
      <div>
        <h2 className="mb-3 px-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-slate-700">
          Voyants de gestion
        </h2>
        <p className="mb-3 px-1 text-xs text-slate-700">Est-ce que votre activité gagne réellement de l’argent ?</p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard
            label="Chiffre d’affaires"
            value={eur(pnl.annuel.caHt)}
            hint={`${pct(kpis.tauxAtteinteObjectifCa)} de l’objectif`}
            info="Le total de ce que vous facturez sur l’année, hors TVA. C’est ce que l’entreprise vend, pas ce qu’elle gagne."
          />
          <KpiCard
            label="Marge brute"
            value={eur(kpis.margeBrute)}
            hint={`Taux de marque ${pct(kpis.tauxMarque)}`}
            info="Ce qui reste du chiffre d’affaires une fois payés vos achats directs. C’est l’argent réellement disponible pour couvrir vos charges et vous payer."
            calcul={{
              formule: 'Marge brute = CA HT − Achats directs',
              lignes: [
                { label: 'Chiffre d’affaires HT', valeur: eur(pnl.annuel.caHt) },
                { label: '− Achats directs', valeur: eur(pnl.annuel.achatsMarchandisesMp) },
                { label: '= Marge brute', valeur: eur(kpis.margeBrute) },
              ],
            }}
          />
          <KpiCard
            label="EBE"
            value={eur(kpis.excedentBrutExploitation)}
            tone={kpis.excedentBrutExploitation < 0 ? 'negative' : 'positive'}
            info="L’argent que votre activité dégage vraiment, avant impôts et financements. S’il est négatif, l’activité ne couvre pas ses charges courantes."
            calcul={{
              formule: 'EBE = Marge brute − charges externes − salaires − impôts',
              lignes: [
                { label: 'Marge brute', valeur: eur(kpis.margeBrute) },
                { label: '− Charges externes', valeur: eur(pnl.annuel.autresAchatsChargesExternes) },
                { label: '− Salaires et charges', valeur: eur(pnl.annuel.salairesEtCharges) },
                { label: '− Impôts et taxes', valeur: eur(pnl.annuel.impotsEtTaxes) },
                { label: '= EBE', valeur: eur(kpis.excedentBrutExploitation) },
              ],
            }}
          />
          <KpiCard
            label="Seuil de rentabilité"
            value={eur(kpis.seuilRentabilite)}
            hint="CA à atteindre"
            info="Le chiffre d’affaires minimum à réaliser pour couvrir toutes vos charges. En dessous, vous perdez de l’argent ; au-dessus, vous en gagnez."
            calcul={{
              formule: 'Seuil = Charges fixes ÷ taux de marge',
              lignes: [
                { label: 'Charges fixes (annuelles)', valeur: eur(pnl.annuel.chargesFixesTotales) },
                { label: 'Taux de marge', valeur: pct(kpis.tauxMarque) },
                { label: '= Seuil de rentabilité', valeur: eur(kpis.seuilRentabilite) },
              ],
            }}
          />
        </div>
      </div>

      {/* Voyants financiers : est-ce que la trésorerie tient ? */}
      <div>
        <h2 className="mb-3 px-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-slate-700">
          Voyants financiers
        </h2>
        <p className="mb-3 px-1 text-xs text-slate-700">Est-ce que votre trésorerie tient dans le temps ?</p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <KpiCard
            label="Trésorerie à 3 mois"
            value={eur(kpis.tresorerie3Mois)}
            hint="projection"
            tone={kpis.tresorerie3Mois < 0 ? 'negative' : 'positive'}
            info="Le solde de trésorerie prévu dans 3 mois, si tout se passe comme prévu. S’il est négatif, un trou de caisse se prépare."
          />
          <KpiCard
            label="Trésorerie à 6 mois"
            value={eur(kpis.tresorerie6Mois)}
            hint="projection"
            tone={kpis.tresorerie6Mois < 0 ? 'negative' : 'positive'}
            info="Le solde de trésorerie prévu dans 6 mois. Utile pour anticiper les périodes creuses et les grosses échéances (TVA, URSSAF)."
          />
          <KpiCard
            label="Capacité de rémunération"
            value={eur(kpis.capaciteRemunerationMensuelle)}
            hint="par mois"
            tone={kpis.capaciteRemunerationMensuelle < 0 ? 'negative' : 'neutral'}
            info="Ce que vous pouvez raisonnablement vous verser chaque mois sans mettre la trésorerie en danger, d’après le cash généré par l’activité."
            calcul={{
              formule: 'Capacité = Cash généré sur l’année ÷ 12',
              lignes: [
                { label: 'Cash généré (CAF annuelle)', valeur: eur(kpis.cashflowGenere) },
                { label: '÷ 12 mois', valeur: '' },
                { label: '= Capacité mensuelle', valeur: eur(kpis.capaciteRemunerationMensuelle) },
              ],
            }}
          />
          <KpiCard
            label="Créances clients"
            value={eur(kpis.creancesClients)}
            hint="facturé non encaissé"
            tone="warning"
            info="L’argent déjà facturé mais pas encore encaissé. C’est votre argent, mais il est dehors : à relancer pour le rentrer en trésorerie."
          />
          <KpiCard
            label="Cash-flow généré"
            value={eur(kpis.cashflowGenere)}
            tone={kpis.cashflowGenere < 0 ? 'negative' : 'positive'}
            info="L’argent que l’activité a réellement fait rentrer sur l’année. Calcul : solde de fin de mois en cours moins solde initial en début d’année."
          />
          <KpiCard
            label="Mois de tréso d’avance"
            value={kpis.moisTresorerieAvance.toFixed(1)}
            hint="matelas de sécurité"
            tone={kpis.moisTresorerieAvance < 2 ? 'warning' : 'positive'}
            info="Combien de mois de charges vous pourriez tenir avec la trésorerie actuelle, sans aucune rentrée d’argent. En dessous de 2, la marge de sécurité est mince."
          />
        </div>
      </div>

      {/* Où part l'argent + dépendance client */}
      {(topChargesFixes.length > 0 || topClients.length > 0) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {topChargesFixes.length > 0 && (
            <Section title="Où part l’argent — top charges fixes">
              <ul className="space-y-3">
                {topChargesFixes.map((c) => (
                  <li key={c.compte}>
                    <div className="mb-1 flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm text-navy">{c.libelle}</span>
                      <span className="tabular flex-none text-sm font-semibold text-navy">
                        {eur(c.montant)}
                        <span className="ml-1.5 text-xs font-normal text-slate-600">{pct(c.montant / caHt)} du CA</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-brand/60" style={{ width: `${Math.round((c.montant / maxCharge) * 100)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded-xl border border-navy/[0.08] bg-slate-50 px-3.5 py-2.5 text-xs leading-snug text-slate-600">
                {poidsChargesFixes > 0.3
                  ? `Vos charges fixes pèsent ${pct(poidsChargesFixes)} de votre chiffre d’affaires. C’est lourd : agir sur les premiers postes (${topChargesFixes[0]?.libelle}) est le levier le plus rapide pour retrouver de la marge.`
                  : `Vos charges fixes représentent ${pct(poidsChargesFixes)} du chiffre d’affaires, un niveau maîtrisé. Le premier poste à surveiller reste ${topChargesFixes[0]?.libelle}.`}
              </p>
            </Section>
          )}

          {topClients.length > 0 && (
            <Section title="Vos plus gros clients">
              <ul className="space-y-3">
                {topClients.map((cl) => {
                  const part = cl.caHt / caClients;
                  return (
                    <li key={cl.id}>
                      <div className="mb-1 flex items-baseline justify-between gap-3">
                        <span className="truncate text-sm text-navy">{cl.nom}</span>
                        <span className="tabular flex-none text-sm font-semibold text-navy">
                          {eur(cl.caHt)}
                          <span className="ml-1.5 text-xs font-normal text-slate-600">{pct(part)}</span>
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${part >= 0.35 ? 'bg-amber-400/70' : 'bg-brand/60'}`}
                          style={{ width: `${Math.round(part * 100)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p
                className={`mt-4 rounded-xl border px-3.5 py-2.5 text-xs leading-snug ${
                  risqueDependance
                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                    : 'border-navy/[0.08] bg-slate-50 text-slate-600'
                }`}
              >
                {risqueDependance
                  ? `Dépendance à surveiller : ${topClients[0]?.nom} représente ${pct(partTopClient)} de votre chiffre d’affaires. Perdre ce client fragiliserait fortement votre trésorerie. Sécurisez la relation et développez d’autres comptes.`
                  : `Votre chiffre d’affaires est bien réparti entre vos clients. Le risque de dépendance à un seul compte est limité.`}
              </p>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}
