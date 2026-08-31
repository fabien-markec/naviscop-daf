'use client';

import { CalendarCheck } from 'lucide-react';
import { useDossier } from '@/lib/dossier-context';
import { FormulaireProfil } from '@/components/formulaire-profil';

/**
 * Module bloquant affiché à la première connexion sur un dossier : le client
 * DOIT renseigner son identité, sa date de clôture (bilan) et son profil fiscal
 * (statut, régime, URSSAF/impôt/TVA) avant d'accéder au pilotage.
 */
export function ModuleDateBilan() {
  const { nom, profilFiscal, dateBilan, majDateBilan, majProfilFiscal, renommerDossier, creerExerciceSuivant } = useDossier();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <CalendarCheck className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-lg font-semibold text-navy">Configurer le dossier</h1>
          <p className="text-sm text-slate-700">
            Renseignez l’identité et le profil fiscal du dossier. Cette étape est obligatoire pour piloter la trésorerie.
          </p>
        </div>
      </div>

      <FormulaireProfil
        nomInitial={nom}
        dateBilanInitial={dateBilan || '2025-12-31'}
        profilInitial={profilFiscal}
        montrerIdentite
        labelSubmit="Valider et accéder au pilotage"
        onSubmit={({ nom: nouveauNom, dateBilan: date, profil, creerSuivant }) => {
          if (nouveauNom && nouveauNom !== nom) renommerDossier(nouveauNom);
          majProfilFiscal(profil);
          majDateBilan(date);
          if (creerSuivant) setTimeout(() => creerExerciceSuivant(), 0);
        }}
      />
    </div>
  );
}
