'use client';

import { useEffect, useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

const CLE_VU = 'naviscop.tuto.onboarding.vu.v1';
const VIDEO_SRC = 'https://player.vimeo.com/video/1233397559';

/**
 * Tutoriel d'onboarding : la vidéo s'ouvre automatiquement à la première connexion
 * (mémorisée côté navigateur), et reste accessible à tout moment via le bouton « Aide ».
 */
export function Tutoriel() {
  const [ouvert, setOuvert] = useState(false);
  const [premiereFois, setPremiereFois] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(CLE_VU)) {
        setPremiereFois(true);
        setOuvert(true);
        localStorage.setItem(CLE_VU, '1');
      }
    } catch {
      /* localStorage indisponible : on n'ouvre pas automatiquement */
    }
  }, []);

  return (
    <>
      <button
        onClick={() => { setPremiereFois(false); setOuvert(true); }}
        className="fixed bottom-6 left-6 z-40 flex items-center gap-2 rounded-full border border-navy/10 bg-white/90 px-3.5 py-2 text-sm font-medium text-slate-700 shadow-lg backdrop-blur transition hover:bg-white hover:text-navy"
        aria-label="Aide et tutoriel"
      >
        <HelpCircle className="h-4 w-4 text-brand" /> Aide
      </button>

      {ouvert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4 backdrop-blur-sm"
          onClick={() => setOuvert(false)}
        >
          <div
            className="w-full max-w-3xl rounded-2xl bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-navy">
                  {premiereFois ? 'Bienvenue sur votre espace' : 'Prise en main de votre espace'}
                </h2>
                <p className="mt-0.5 text-sm text-slate-700">Une courte vidéo pour tout comprendre en quelques minutes.</p>
              </div>
              <button
                onClick={() => setOuvert(false)}
                aria-label="Fermer"
                className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-navy"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
              <iframe
                src={VIDEO_SRC}
                className="absolute inset-0 h-full w-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title="Tutoriel utilisation NAVISCOP"
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setOuvert(false)}
                className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-soft"
              >
                {premiereFois ? 'Commencer' : 'Fermer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
