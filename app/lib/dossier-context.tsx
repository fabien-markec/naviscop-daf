'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  calculerTableauDeBord,
  fusionnerPrevisionnels,
  type EntreesMoteur,
  type ParametrageFinancier,
  type MouvementPrevisionnel,
  type LignePnlMensuelle,
} from '@naviscop/finance-engine';
import { dossiersDemo } from './demo-data';
import { supabase, supabaseConfigured } from './supabase';
import type { ActionItem, StatutAction } from './use-plan-action';
import {
  chargerDossiers,
  creerDossier,
  supprimerDossier as supprimerDossierDb,
  majParametrageDb,
  majPnlMoisDb,
  ajouterPrevisionnelDb,
  supprimerPrevisionnelDb,
  ajouterActionDb,
  majStatutActionDb,
  supprimerActionDb,
  type DossierRow,
} from './naviscop-db';

const CLE_STORAGE = 'naviscop.workspace.v3';

export type Role = 'daf' | 'client';

export interface DossierEntry {
  id: string;
  nom: string;
  metier: string;
  entreesBase: EntreesMoteur;
  previsionnels: MouvementPrevisionnel[];
  planActions: ActionItem[];
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
  /** Compte de résultat réalisé (données de base, sans les mouvements prévisionnels). */
  pnlReel: LignePnlMensuelle[];
  previsionnels: MouvementPrevisionnel[];
  planActions: ActionItem[];
  tableauDeBord: ReturnType<typeof calculerTableauDeBord>;
  chargement: boolean;
  connecte: boolean;
  ouvrirDossier: (id: string) => void;
  ajouterDossier: (nom: string, entreesBase: EntreesMoteur, metier?: string) => void;
  supprimerDossier: (id: string) => void;
  activerDossier: (nom: string, entreesBase: EntreesMoteur) => void;
  majParametrage: (patch: Partial<ParametrageFinancier>) => void;
  /** Corrige le réalisé d'un mois à la main (factures manquantes, compte pas à jour). */
  majReelMois: (moisIndex: number, patch: Partial<LignePnlMensuelle>) => void;
  ajouterPrevisionnel: (mv: Omit<MouvementPrevisionnel, 'id'>) => void;
  supprimerPrevisionnel: (id: string) => void;
  ajouterAction: (a: Omit<ActionItem, 'id' | 'statut'>) => void;
  majStatutAction: (id: string, statut: StatutAction) => void;
  supprimerAction: (id: string) => void;
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
  const dossiers: DossierEntry[] = dossiersDemo.map((d) => ({ ...d, previsionnels: [], planActions: [] }));
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
          dossiers = [{ id, nom: 'Mon entreprise', metier: '', entreesBase: base, previsionnels: [], planActions: [] }];
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
      pnlReel: actif.entreesBase.pnl,
      previsionnels: actif.previsionnels,
      planActions: actif.planActions ?? [],
      tableauDeBord: calculerTableauDeBord(entrees),
      chargement,
      connecte: supabaseConfigured,
      ouvrirDossier: (id) => setWs((s) => ({ ...s, actifId: id })),

      ajouterDossier: async (nom, entreesBase, metier = '') => {
        if (supabaseConfigured) {
          const id = await creerDossier(nom, entreesBase, metier);
          setWs((s) => ({ ...s, dossiers: [...s.dossiers, { id, nom, metier, entreesBase, previsionnels: [], planActions: [] }], actifId: id }));
        } else {
          const id = crypto.randomUUID();
          setWs((s) => ({ ...s, dossiers: [...s.dossiers, { id, nom, metier, entreesBase, previsionnels: [], planActions: [] }], actifId: id }));
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
          setWs((s) => ({ ...s, dossiers: [...s.dossiers, { id, nom, metier: '', entreesBase, previsionnels: [], planActions: [] }], actifId: id }));
        } else {
          const id = crypto.randomUUID();
          setWs((s) => ({ ...s, dossiers: [...s.dossiers, { id, nom, metier: '', entreesBase, previsionnels: [], planActions: [] }], actifId: id }));
        }
      },

      majParametrage: (patch) => {
        majActif((d) => ({ ...d, entreesBase: { ...d.entreesBase, parametrage: { ...d.entreesBase.parametrage, ...patch } } }));
        if (supabaseConfigured) majParametrageDb(ws.actifId, patch).catch((e) => console.error('MAJ paramétrage échouée', e));
      },

      majReelMois: (moisIndex, patch) => {
        majActif((d) => ({
          ...d,
          entreesBase: {
            ...d.entreesBase,
            pnl: d.entreesBase.pnl.map((m, i) => (i === moisIndex ? { ...m, ...patch } : m)),
          },
        }));
        if (supabaseConfigured) majPnlMoisDb(ws.actifId, moisIndex, patch).catch((e) => console.error('MAJ réalisé échouée', e));
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

      ajouterAction: async (a) => {
        if (supabaseConfigured) {
          try {
            const cree = await ajouterActionDb(ws.actifId, a);
            majActif((d) => ({ ...d, planActions: [cree, ...(d.planActions ?? [])] }));
          } catch (e) {
            console.error('Ajout action échoué', e);
          }
        } else {
          majActif((d) => ({ ...d, planActions: [{ ...a, id: crypto.randomUUID(), statut: 'a_faire' }, ...(d.planActions ?? [])] }));
        }
      },

      majStatutAction: (id, statut) => {
        majActif((d) => ({ ...d, planActions: (d.planActions ?? []).map((i) => (i.id === id ? { ...i, statut } : i)) }));
        if (supabaseConfigured) majStatutActionDb(id, statut).catch((e) => console.error('MAJ statut action échouée', e));
      },

      supprimerAction: (id) => {
        majActif((d) => ({ ...d, planActions: (d.planActions ?? []).filter((i) => i.id !== id) }));
        if (supabaseConfigured) supprimerActionDb(id).catch((e) => console.error('Suppression action échouée', e));
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
