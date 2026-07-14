'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  FlaskConical,
  ListChecks,
  FileText,
  Upload,
  Settings,
  FileDown,
  PencilLine,
  Users,
} from 'lucide-react';
import { useDossier } from '@/lib/dossier-context';

const MODULES = [
  { href: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/tresorerie', label: 'Plan de trésorerie', icon: Wallet },
  { href: '/rentabilite', label: 'Rentabilité', icon: TrendingUp },
  { href: '/scenarios', label: 'Scénarios', icon: FlaskConical },
  { href: '/import', label: 'Import FEC', icon: Upload },
  { href: '/saisie', label: 'Saisie prévisionnelle', icon: PencilLine },
  { href: '/bilan', label: 'Analyse', icon: FileText },
  { href: '/plan-action', label: 'Plan d’action', icon: ListChecks },
  { href: '/rapport', label: 'Rapport / Export', icon: FileDown },
  { href: '/parametres', label: 'Paramétrage', icon: Settings },
];

export function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const { role, setRole, nom, metier, dossiers, actifId, ouvrirDossier } = useDossier();

  const nav = role === 'daf' ? [{ href: '/clients', label: 'Portefeuille clients', icon: Users }, ...MODULES] : MODULES;

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-4">
      <div className="mb-7 flex items-center gap-2.5 px-2 pt-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-brand to-brand-soft text-sm font-bold text-white shadow-[0_4px_14px_-4px_rgba(0,98,184,0.35)]">
          N
        </div>
        <span className="text-[17px] font-semibold tracking-tight text-navy">
          NAVISCOP
        </span>
      </div>

      {/* Dossier actif */}
      <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-slate-500">
          {role === 'daf' ? 'Dossier client' : 'Mon entreprise'}
        </p>
        {role === 'daf' ? (
          <select
            value={actifId}
            onChange={(e) => ouvrirDossier(e.target.value)}
            className="-ml-0.5 mt-1 w-full cursor-pointer bg-transparent text-sm font-semibold text-slate-800 outline-none"
          >
            {dossiers.map((d) => (
              <option key={d.id} value={d.id} className="bg-white">
                {d.nom}
              </option>
            ))}
          </select>
        ) : (
          <p className="mt-1 truncate text-sm font-semibold text-slate-800">{nom}</p>
        )}
        {metier && <p className="truncate text-[11px] text-slate-500">{metier}</p>}
      </div>

      <nav className="flex flex-col gap-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = path === href;
          return (
            <Link
              key={href}
              href={href}
              className={`group relative flex items-center gap-3 rounded-full px-3.5 py-[9px] text-[13.5px] transition-colors ${
                active
                  ? 'bg-brand/10 font-medium text-navy'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-navy'
              }`}
            >
              <Icon className={`h-[17px] w-[17px] ${active ? 'text-brand' : 'text-slate-500 group-hover:text-slate-700'}`} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bascule de rôle (démo) */}
      <div className="mt-auto pt-6">
        <p className="mb-2 px-1 text-[10px] font-medium uppercase tracking-[0.1em] text-slate-400">Vue (démo)</p>
        <div className="flex gap-1 rounded-full border border-slate-200 bg-slate-50 p-1">
          {(['daf', 'client'] as const).map((r) => (
            <button
              key={r}
              onClick={() => {
                setRole(r);
                if (r === 'client') router.push('/');
              }}
              className={`flex-1 rounded-full py-1.5 text-xs font-semibold transition ${
                role === r ? 'bg-brand text-white shadow-[0_4px_12px_-4px_rgba(0,98,184,0.4)]' : 'text-slate-500 hover:text-navy'
              }`}
            >
              {r === 'daf' ? 'DAF' : 'Client'}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
