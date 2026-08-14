'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { AssistantBulle } from '@/components/assistant-bulle';
import { ChoixDossier } from '@/components/choix-dossier';
import { useDossier } from '@/lib/dossier-context';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { connecte, actifId } = useDossier();
  const path = usePathname();

  // En mode connecté, tant qu'aucun dossier n'est choisi, on impose la sélection.
  // Exception : /import sert justement à créer un dossier.
  const imposerChoix = connecte && !actifId && path !== '/import';

  return (
    <div className="relative flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden px-4 pb-10 pt-20 sm:px-6 lg:px-10 lg:py-8">
        <div className="rise mx-auto max-w-6xl">{imposerChoix ? <ChoixDossier /> : children}</div>
      </main>
      {!imposerChoix && <AssistantBulle />}
    </div>
  );
}
