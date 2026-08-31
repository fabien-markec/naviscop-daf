'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';
import { PageHeader } from '@/components/ui';
import { FormulaireProfil } from '@/components/formulaire-profil';
import { useDossier } from '@/lib/dossier-context';

export default function NouveauDossierPage() {
  const { creerDossierVierge, creerExerciceSuivant } = useDossier();
  const router = useRouter();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Nouveau dossier"
        subtitle="Renseignez l’identité du client et son profil fiscal. Vous importerez ou saisirez les données comptables ensuite."
      />

      <div className="rounded-xl border border-navy/10 bg-brand/5 px-4 py-3 text-sm text-slate-700">
        Vous partez d’un fichier comptable ?{' '}
        <Link href="/import" className="inline-flex items-center gap-1 font-medium text-brand hover:underline">
          <Upload className="h-3.5 w-3.5" /> Importer un FEC ou une balance
        </Link>{' '}
        (le profil fiscal sera demandé juste après).
      </div>

      <FormulaireProfil
        montrerIdentite
        labelSubmit="Créer le dossier"
        onSubmit={({ nom, profil, dateBilan, creerSuivant }) => {
          creerDossierVierge(nom, profil, dateBilan);
          if (creerSuivant) setTimeout(() => creerExerciceSuivant(), 0);
          router.push('/');
        }}
      />
    </div>
  );
}
