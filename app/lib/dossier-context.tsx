'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  calculerTableauDeBord,
  fusionnerPrevisionnels,
  type EntreesMoteur,
  type ParametrageFinancier,
  type MouvementPrevisionnel,
} from '@naviscop/finance-engine';
import { dossiersDemo } from './demo-data';

const CLE_STORAGE = 'naviscop.workspace.v1';

export type Role = 'daf' | 'client';

export interface DossierEntry {
  id: string;
  nom: string;
  metier: string;
  entreesBase: EntreesMoteur;
  previsionnels: MouvementPrevisionnel[];
}

interface Workspace {
  role: Role;
  dossiers: DossierEntry[];
  actifId: string;
}

interface DossierContextValue {
  role: Role;
  setRole: (r: Role) => void;
  dossiers: DossierEntry[];
  actifId: string;
  nom: string;
  metier: string;
  entrees: EntreesMoteur;
  previsionnels: MouvementPrevisionnel[];
  tableauDeBord: ReturnType<typeof calculerTableauDeBord>;
  ouvrirDossier: (id: string) => void;
  ajouterDossier: (nom: string, entreesBase: EntreesMoteur, metier?: string) => void;
  supprimerDossier: (id: string) => void;
  activerDossier: (nom: string, entreesBase: EntreesMoteur) => void;
  majParametrage: (patch: Partial<ParametrageFinancier>) => void;
  ajouterPrevisionnel: (mv: Omit<MouvementPrevisionnel, 'id'>) => void;
  supprimerPrevisionnel: (id: string) => void;
  reinitialiser: () => void;
}

function defautWorkspace(): Workspace {
  const dossiers: DossierEntry[] = dossiersDemo.map((d) => ({ ...d, previsionnels: [] }));
  return { role: 'daf', dossiers, actifId: dossiers[0].id };
}

const DossierContext = createContext<DossierContextValue | null>(null);

export function DossierProvider({ children }: { children: React.ReactNode }) {
  const [ws, setWs] = useState<Workspace>(defautWorkspace);

  useEffect(() => {
    try {
      const brut = window.localStorage.getItem(CLE_STORAGE);
      if (brut) {
        const parsed = JSON.parse(brut) as Partial<Workspace>;
        if (parsed.dossiers && parsed.dossiers.length > 0 && parsed.actifId) {
          setWs({ role: parsed.role ?? 'daf', dossiers: parsed.dossiers, actifId: parsed.actifId });
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(CLE_STORAGE, JSON.stringify(ws));
    } catch {
      /* ignore */
    }
  }, [ws]);

  // Modifie le dossier actif de façon immuable.
  const majActif = (fn: (d: DossierEntry) => DossierEntry) =>
    setWs((s) => ({ ...s, dossiers: s.dossiers.map((d) => (d.id === s.actifId ? fn(d) : d)) }));

  const value = useMemo<DossierContextValue>(() => {
    const actif = ws.dossiers.find((d) => d.id === ws.actifId) ?? ws.dossiers[0];
    const entrees = fusionnerPrevisionnels(actif.entreesBase, actif.previsionnels);

    return {
      role: ws.role,
      setRole: (role) => setWs((s) => ({ ...s, role })),
      dossiers: ws.dossiers,
      actifId: actif.id,
      nom: actif.nom,
      metier: actif.metier,
      entrees,
      previsionnels: actif.previsionnels,
      tableauDeBord: calculerTableauDeBord(entrees),
      ouvrirDossier: (id) => setWs((s) => ({ ...s, actifId: id })),
      ajouterDossier: (nom, entreesBase, metier = '') => {
        const id = crypto.randomUUID();
        setWs((s) => ({
          ...s,
          dossiers: [...s.dossiers, { id, nom, metier, entreesBase, previsionnels: [] }],
          actifId: id,
        }));
      },
      supprimerDossier: (id) =>
        setWs((s) => {
          const restants = s.dossiers.filter((d) => d.id !== id);
          if (restants.length === 0) return s;
          return { ...s, dossiers: restants, actifId: s.actifId === id ? restants[0].id : s.actifId };
        }),
      activerDossier: (nom, entreesBase) => {
        const id = crypto.randomUUID();
        setWs((s) => ({
          ...s,
          dossiers: [...s.dossiers, { id, nom, metier: '', entreesBase, previsionnels: [] }],
          actifId: id,
        }));
      },
      majParametrage: (patch) =>
        majActif((d) => ({ ...d, entreesBase: { ...d.entreesBase, parametrage: { ...d.entreesBase.parametrage, ...patch } } })),
      ajouterPrevisionnel: (mv) =>
        majActif((d) => ({ ...d, previsionnels: [{ ...mv, id: crypto.randomUUID() }, ...d.previsionnels] })),
      supprimerPrevisionnel: (idmv) =>
        majActif((d) => ({ ...d, previsionnels: d.previsionnels.filter((m) => m.id !== idmv) })),
      reinitialiser: () => setWs(defautWorkspace()),
    };
  }, [ws]);

  return <DossierContext.Provider value={value}>{children}</DossierContext.Provider>;
}

export function useDossier(): DossierContextValue {
  const ctx = useContext(DossierContext);
  if (!ctx) throw new Error('useDossier doit être utilisé dans un DossierProvider');
  return ctx;
}
