'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// Palette « Le Cost Killer » (thème clair).
const C = {
  brand: '#0062B8',
  brandSoft: '#3b86d6',
  positif: '#0E9F6E',
  negatif: '#E5484D',
  accent: '#F59331',
  grid: 'rgba(0,4,40,0.07)',
  axis: '#79808F',
};

const AXIS = { stroke: C.axis, fontSize: 11, fontWeight: 500 };
const fmtK = (n: number) => (Math.abs(n) >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`);
const eur = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

const tooltipStyle = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  color: '#000428',
  fontSize: 12,
  boxShadow: '0 12px 30px -12px rgba(0,4,40,0.25)',
  padding: '8px 12px',
};
const labelStyle = { color: '#79808F', fontSize: 11, marginBottom: 2 };

const gridProps = { strokeDasharray: '3 3', stroke: C.grid, vertical: false as const };
const noAnim = { isAnimationActive: false as const };
const legendProps = {
  wrapperStyle: { fontSize: 11, paddingTop: 8 },
  iconType: 'circle' as const,
  iconSize: 8,
};

export function TresorerieChart({ data }: { data: { mois: string; solde: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="gTreso" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.brandSoft} stopOpacity={0.45} />
            <stop offset="100%" stopColor={C.brandSoft} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="mois" tick={AXIS} tickLine={false} axisLine={false} dy={6} />
        <YAxis tickFormatter={fmtK} tick={AXIS} tickLine={false} axisLine={false} width={38} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} cursor={{ stroke: 'rgba(0,4,40,0.15)' }} formatter={(v: number) => [eur(v), 'Solde']} />
        <ReferenceLine y={0} stroke={C.negatif} strokeDasharray="4 4" strokeOpacity={0.7} />
        <Area type="monotone" dataKey="solde" stroke={C.brandSoft} strokeWidth={2} fill="url(#gTreso)" {...noAnim} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function FluxChart({
  data,
}: {
  data: { mois: string; encaissements: number; decaissements: number; solde: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={290}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} barGap={2}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="mois" tick={AXIS} tickLine={false} axisLine={false} dy={6} />
        <YAxis tickFormatter={fmtK} tick={AXIS} tickLine={false} axisLine={false} width={38} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} cursor={{ fill: 'rgba(0,4,40,0.04)' }} formatter={(v: number) => eur(v)} />
        <Legend {...legendProps} />
        <Bar dataKey="encaissements" name="Encaissements" fill={C.positif} radius={[3, 3, 0, 0]} maxBarSize={18} {...noAnim} />
        <Bar dataKey="decaissements" name="Décaissements" fill={C.negatif} radius={[3, 3, 0, 0]} maxBarSize={18} {...noAnim} />
        <Line type="monotone" dataKey="solde" name="Solde" stroke={C.brandSoft} strokeWidth={2} dot={false} {...noAnim} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function ResultatChart({
  data,
}: {
  data: { mois: string; resultat: number; cumule: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={290}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="mois" tick={AXIS} tickLine={false} axisLine={false} dy={6} />
        <YAxis tickFormatter={fmtK} tick={AXIS} tickLine={false} axisLine={false} width={38} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} cursor={{ fill: 'rgba(0,4,40,0.04)' }} formatter={(v: number) => eur(v)} />
        <ReferenceLine y={0} stroke={C.axis} strokeOpacity={0.4} />
        <Legend {...legendProps} />
        <Bar dataKey="resultat" name="Résultat du mois" radius={[3, 3, 0, 0]} maxBarSize={22} {...noAnim}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.resultat >= 0 ? C.positif : C.negatif} />
          ))}
        </Bar>
        <Line type="monotone" dataKey="cumule" name="Résultat cumulé" stroke={C.accent} strokeWidth={2} dot={false} {...noAnim} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
