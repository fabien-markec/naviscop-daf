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
import { supabase, supabaseConfigured } from './supabase';
import {
  chargerDossiers,
  creerDossier,
  supprimerDossier as supprimerDossierDb,
  majParametrageDb,
  ajouterPrevisionnelDb,
  supprimerPrevisionnelDb,
  type DossierRow,
} from './naviscop-db';

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
  chargement: boolean;
  connecte: boolean;
  ouvrirDossier: (id: string) => void;
  ajouterDossier: (nom: string, entreesBase: EntreesMoteur, metier?: string) => void;
  supprimerDossier: (id: string) => void;
  activerDossier: (nom: string, entreesBase: EntreesMoteur) => void;
  majParametrage: (patch: Partial<ParametrageFinancier>) => void;
  ajouterPrevisionnel: (mv: Omit<MouvementPrevisionnel, 'id'>) => void;
  supprimerPrevisionnel: (id: string) => void;
  reinitialiser: () => void;
  deconnexion: () => void;
}

function entreesVides(): EntreesMoteur {
  return {
    parametrage: {
      soldeInitialTresorerie: 0,
      objectifCaAnnuel: 0,
      objectifRemunerationMensuelle: 0,
      moisSecuriteTresorerie: 2,
      objectifTauxMarque: 0,
      seuilChargesFixesPctCa: 0.3,
      objectifResultatNetAnnuel: 0,
    },
    pnl: Array.from({ length: 12 }, () => ({
      caHt: 0, achatsMarchandisesMp: 0, autresAchatsChargesExternes: 0, salairesEtCharges: 0,
      impotsEtTaxes: 0, chargesFinancieres: 0, chargesExceptionnelles: 0, amortissements: 0,
    })),
    cash: Array.from({ length: 12 }, () => ({ encaissements: 0, decaissements: 0 })),
    creancesClients: 0,
  };
}

function defautWorkspace(): Workspace {
  const dossiers: DossierEntry[] = dossiersDemo.map((d) => ({ ...d, previsionnels: [] }));
  return { role: 'daf', dossiers, actifId: dossiers[0].id };
}

const DossierContext = createContext<DossierContextValue | null>(null);

export function DossierProvider({ children }: { children: React.ReactNode }) {
  const [ws, setWs] = useState<Workspace>(defautWorkspace);
  const [chargement, setChargement] = useState<boolean>(supabaseConfigured);

  // --- Mode Supabase : charge les vrais dossiers ---
  useEffect(() => {
    if (!supabaseConfigured) return;
    let annule = false;
    (async () => {
      try {
        let dossiers: DossierRow[] = await chargerDossiers();
        if (dossiers.length === 0) {
          const base = entreesVides();
          const id = await creerDossier('Mon entreprise', base, '');
          dossiers = [{ id, nom: 'Mon entreprise', metier: '', entreesBase: base, previsionnels: [] }];
        }
        if (!annule) setWs({ role: 'daf', dossiers, actifId: dossiers[0].id });
      } catch (e) {
        console.error('Chargement des dossiers échoué', e);
      } finally {
        if (!annule) setChargement(false);
      }
    })();
    return () => {
      annule = true;
    };
  }, []);

  // --- Mode démo : restauration localStorage ---
  useEffect(() => {
    if (supabaseConfigured) return;
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

  // --- Mode démo : persistance localStorage ---
  useEffect(() => {
    if (supabaseConfigured) return;
    try {
      window.localStorage.setItem(CLE_STORAGE, JSON.stringify(ws));
    } catch {
      /* ignore */
    }
  }, [ws]);

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
      chargement,
      connecte: supabaseConfigured,
      ouvrirDossier: (id) => setWs((s) => ({ ...s, actifId: id })),

      ajouterDossier: async (nom, entreesBase, metier = '') => {
        if (supabaseConfigured) {
          const id = await creerDossier(nom, entreesBase, metier);
          setWs((s) => ({ ...s, dossiers: [...s.dossiers, { id, nom, metier, entreesBase, previsionnels: [] }], actifId: id }));
        } else {
          const id = crypto.randomUUID();
          setWs((s) => ({ ...s, dossiers: [...s.dossiers, { id, nom, metier, entreesBase, previsionnels: [] }], actifId: id }));
        }
      },

      supprimerDossier: async (id) => {
        if (supabaseConfigured) {
          try {
            await supprimerDossierDb(id);
          } catch (e) {
            console.error('Suppression échouée', e);
            return;
          }
        }
        setWs((s) => {
          const restants = s.dossiers.filter((d) => d.id !== id);
          if (restants.length === 0) return s;
          return { ...s, dossiers: restants, actifId: s.actifId === id ? restants[0].id : s.actifId };
        });
      },

      activerDossier: async (nom, entreesBase) => {
        if (supabaseConfigured) {
          const id = await creerDossier(nom, entreesBase, '');
          setWs((s) => ({ ...s, dossiers: [...s.dossiers, { id, nom, metier: '', entreesBase, previsionnels: [] }], actifId: id }));
        } else {
          const id = crypto.randomUUID();
          setWs((s) => ({ ...s, dossiers: [...s.dossiers, { id, nom, metier: '', entreesBase, previsionnels: [] }], actifId: id }));
        }
      },

      majParametrage: (patch) => {
        majActif((d) => ({ ...d, entreesBase: { ...d.entreesBase, parametrage: { ...d.entreesBase.parametrage, ...patch } } }));
        if (supabaseConfigured) majParametrageDb(ws.actifId, patch).catch((e) => console.error('MAJ paramétrage échouée', e));
      },

      ajouterPrevisionnel: async (mv) => {
        if (supabaseConfigured) {
          try {
            const cree = await ajouterPrevisionnelDb(ws.actifId, mv);
            majActif((d) => ({ ...d, previsionnels: [cree, ...d.previsionnels] }));
          } catch (e) {
            console.error('Ajout prévisionnel échoué', e);
          }
        } else {
          majActif((d) => ({ ...d, previsionnels: [{ ...mv, id: crypto.randomUUID() }, ...d.previsionnels] }));
        }
      },

      supprimerPrevisionnel: (idmv) => {
        majActif((d) => ({ ...d, previsionnels: d.previsionnels.filter((m) => m.id !== idmv) }));
        if (supabaseConfigured) supprimerPrevisionnelDb(idmv).catch((e) => console.error('Suppression prévisionnel échouée', e));
      },

      reinitialiser: () => {
        if (!supabaseConfigured) setWs(defautWorkspace());
      },

      deconnexion: () => {
        supabase?.auth.signOut();
      },
    };
  }, [ws, chargement]);

  return <DossierContext.Provider value={value}>{children}</DossierContext.Provider>;
}

export function useDossier(): DossierContextValue {
  const ctx = useContext(DossierContext);
  if (!ctx) throw new Error('useDossier doit être utilisé dans un DossierProvider');
  return ctx;
}
