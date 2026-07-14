'use client';

import { useEffect, useState } from 'react';

export type StatutAction = 'a_faire' | 'en_cours' | 'fait';

export interface ActionItem {
  id: string;
  action: string;
  responsable: string;
  echeance: string;
  impact: string;
  statut: StatutAction;
}

const CLE = 'naviscop.plan-action.v1';

export function usePlanAction() {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [charge, setCharge] = useState(false);

  useEffect(() => {
    try {
      const brut = window.localStorage.getItem(CLE);
      if (brut) setItems(JSON.parse(brut) as ActionItem[]);
    } catch {
      /* ignore */
    }
    setCharge(true);
  }, []);

  useEffect(() => {
    if (!charge) return;
    try {
      window.localStorage.setItem(CLE, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, charge]);

  const ajouter = (a: Omit<ActionItem, 'id' | 'statut'>) =>
    setItems((s) => [{ ...a, id: crypto.randomUUID(), statut: 'a_faire' }, ...s]);

  const majStatut = (id: string, statut: StatutAction) =>
    setItems((s) => s.map((i) => (i.id === id ? { ...i, statut } : i)));

  const supprimer = (id: string) => setItems((s) => s.filter((i) => i.id !== id));

  return { items, ajouter, majStatut, supprimer };
}
