'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { AssistantBulle } from '@/components/assistant-bulle';
import { ChoixDossier } from '@/components/choix-dossier';
import { ModuleDateBilan } from '@/components/date-bilan';
import { useDossier } from '@/lib/dossier-context';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { connecte, actifId, dateBilan, profilFiscal } = useDossier();
  const path = usePathname();

  // En mode connecté, tant qu'aucun dossier n'est choisi, on impose la sélection.
  // Exception : /import et /nouveau servent justement à créer un dossier.
  const horsCreation = path !== '/import' && path !== '/nouveau';
  const imposerChoix = connecte && !actifId && horsCreation;
  // Dossier choisi mais non configuré (date de bilan ou profil fiscal manquant) : on impose la config.
  const imposerDateBilan = connecte && !!actifId && (!dateBilan || !profilFiscal) && horsCreation;
  const bloque = imposerChoix || imposerDateBilan;

  return (
    <div className="relative flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden px-4 pb-10 pt-20 sm:px-6 lg:px-10 lg:py-8">
        <div className="rise mx-auto max-w-6xl">
          {imposerChoix ? <ChoixDossier /> : imposerDateBilan ? <ModuleDateBilan /> : children}
        </div>
      </main>
      {!bloque && <AssistantBulle />}
    </div>
  );
}
