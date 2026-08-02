'use client';

import { MOIS } from '@naviscop/finance-engine';
import { useDossier } from '@/lib/dossier-context';
import { eur, pct } from '@/lib/format';
import { KpiCard, StatBar, PageHeader, Section, ListeAlertes } from '@/components/ui';
import { TresorerieChart } from '@/components/charts';

export default function DashboardPage() {
  const { tableauDeBord } = useDossier();
  const { kpis, tresorerie, pnl, alertes } = tableauDeBord;
  const moisCritique = MOIS[tresorerie.moisCritiqueIndex];
  const chartData = tresorerie.parMois.map((m, i) => ({ mois: MOIS[i].slice(0, 3), solde: m.soldeFin }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord"
        subtitle="Comprendre la situation financière en 30 secondes."
      />

      {/* Bandeau décision */}
      <StatBar
        stats={[
          { label: 'Trésorerie disponible', value: eur(kpis.tresorerieDisponible) },
          {
            label: 'Trésorerie à 12 mois',
            value: eur(kpis.tresorerie12Mois),
            tone: kpis.tresorerie12Mois < 0 ? 'negative' : 'positive',
          },
          {
            label: 'Résultat prévisionnel',
            value: eur(kpis.resultatPrevisionnel),
            tone: kpis.resultatPrevisionnel < 0 ? 'negative' : 'positive',
          },
          { label: 'Mois critique', value: moisCritique, hint: eur(tresorerie.soldeFinLePlusBas), tone: 'warning' },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section title="Évolution de la trésorerie sur 12 mois">
            <TresorerieChart data={chartData} />
          </Section>
        </div>
        <Section title="Alertes prioritaires">
          <ListeAlertes alertes={alertes} />
        </Section>
      </div>

      {/* Les 11 KPI */}
      <div>
        <h2 className="mb-3 px-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-slate-500">Indicateurs clés</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          <KpiCard label="Chiffre d’affaires" value={eur(pnl.annuel.caHt)} hint={`${pct(kpis.tauxAtteinteObjectifCa)} de l’objectif`} />
          <KpiCard label="Trésorerie à 3 mois" value={eur(kpis.tresorerie3Mois)} hint="projection" tone={kpis.tresorerie3Mois < 0 ? 'negative' : 'positive'} />
          <KpiCard label="Trésorerie à 6 mois" value={eur(kpis.tresorerie6Mois)} hint="projection" tone={kpis.tresorerie6Mois < 0 ? 'negative' : 'positive'} />
          <KpiCard label="Marge brute" value={eur(kpis.margeBrute)} hint={`Taux de marque ${pct(kpis.tauxMarque)}`} />
          <KpiCard label="EBE" value={eur(kpis.excedentBrutExploitation)} tone={kpis.excedentBrutExploitation < 0 ? 'negative' : 'positive'} />
          <KpiCard label="Seuil de rentabilité" value={eur(kpis.seuilRentabilite)} hint="CA à atteindre" />
          <KpiCard label="Capacité de rémunération" value={eur(kpis.capaciteRemunerationMensuelle)} hint="par mois" tone={kpis.capaciteRemunerationMensuelle < 0 ? 'negative' : 'neutral'} />
          <KpiCard label="Créances clients" value={eur(kpis.creancesClients)} hint="facturé non encaissé" tone="warning" />
          <KpiCard label="Cashflow généré" value={eur(kpis.cashflowGenere)} tone={kpis.cashflowGenere < 0 ? 'negative' : 'positive'} />
          <KpiCard label="Mois de tréso d’avance" value={kpis.moisTresorerieAvance.toFixed(1)} hint="matelas de sécurité" tone={kpis.moisTresorerieAvance < 2 ? 'warning' : 'positive'} />
        </div>
      </div>
    </div>
  );
}
