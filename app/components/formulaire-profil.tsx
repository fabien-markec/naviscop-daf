'use client';

import { useMemo, useState } from 'react';
import {
  TAUX_MICRO_SOCIAL,
  TAUX_VERSEMENT_LIBERATOIRE,
  type ProfilFiscal,
  type StatutJuridique,
  type RegimeFiscal,
  type Periodicite,
  type NatureMicro,
} from '@naviscop/finance-engine';

const MOIS_COURT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const STATUTS: { v: StatutJuridique; label: string }[] = [
  { v: 'EI', label: 'Entreprise individuelle (EI)' },
  { v: 'SARL_EURL', label: 'SARL / EURL' },
  { v: 'SAS_SASU', label: 'SAS / SASU' },
];
const REGIMES: { v: RegimeFiscal; label: string }[] = [
  { v: 'MICRO', label: 'Micro-entreprise' },
  { v: 'REEL_IR', label: 'Réel à l’IR' },
  { v: 'REEL_IS', label: 'Réel à l’IS' },
];
const NATURES: { v: NatureMicro; label: string }[] = [
  { v: 'BIC_VENTE', label: 'BIC vente / hébergement' },
  { v: 'BIC_PRESTA', label: 'BIC prestations de service' },
  { v: 'BNC', label: 'BNC (libéral)' },
];

export interface DonneesProfil {
  nom: string;
  dirigeant: string;
  dateBilan: string;
  profil: ProfilFiscal;
  creerSuivant: boolean;
}

const cls = 'w-full rounded-xl border border-navy/15 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-brand/50';
const labelCls = 'block text-[12.5px] font-medium text-navy';

function Champ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {hint && <p className="mb-1 mt-0.5 text-[11px] text-slate-600">{hint}</p>}
      <div className={hint ? '' : 'mt-1'}>{children}</div>
    </div>
  );
}

function Pourcent({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="relative">
      <input
        type="number"
        step="0.1"
        value={Math.round(value * 1000) / 10}
        onChange={(e) => onChange((Number(e.target.value) || 0) / 100)}
        className={`${cls} pr-8`}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">%</span>
    </div>
  );
}

/** Grille de 12 montants mensuels (échéancier saisi à la main). */
function Echeancier({ valeurs, onChange }: { valeurs: number[]; onChange: (v: number[]) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i}>
          <span className="block text-[10px] font-medium uppercase text-slate-500">{MOIS_COURT[i]}</span>
          <input
            type="number"
            value={valeurs[i] ?? 0}
            onChange={(e) => {
              const copie = [...valeurs];
              copie[i] = Number(e.target.value) || 0;
              onChange(copie);
            }}
            className="mt-0.5 w-full rounded-lg border border-navy/15 bg-white px-2 py-1 text-xs text-navy outline-none focus:border-brand/50"
          />
        </div>
      ))}
    </div>
  );
}

const PERIODES: Periodicite[] = ['mensuel', 'trimestriel', 'annuel'];
function SelectPeriode({ value, onChange, sansAnnuel }: { value: Periodicite; onChange: (p: Periodicite) => void; sansAnnuel?: boolean }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as Periodicite)} className={cls}>
      {PERIODES.filter((p) => !(sansAnnuel && p === 'annuel')).map((p) => (
        <option key={p} value={p}>
          {p === 'mensuel' ? 'Mensuel' : p === 'trimestriel' ? 'Trimestriel' : 'Annuel'}
        </option>
      ))}
    </select>
  );
}

export function FormulaireProfil({
  nomInitial = '',
  dateBilanInitial = '2025-12-31',
  profilInitial,
  montrerIdentite = true,
  labelSubmit,
  onSubmit,
}: {
  nomInitial?: string;
  dateBilanInitial?: string;
  profilInitial?: ProfilFiscal;
  montrerIdentite?: boolean;
  labelSubmit: string;
  onSubmit: (d: DonneesProfil) => void;
}) {
  const [nom, setNom] = useState(nomInitial || profilInitial?.raisonSociale || '');
  const [dirigeant, setDirigeant] = useState(profilInitial?.dirigeant || '');
  const [dateBilan, setDateBilan] = useState(dateBilanInitial);
  const [creerSuivant, setCreerSuivant] = useState(false);

  const [statut, setStatut] = useState<StatutJuridique>(profilInitial?.statutJuridique ?? 'SAS_SASU');
  const [regime, setRegime] = useState<RegimeFiscal>(profilInitial?.regimeFiscal ?? 'REEL_IS');

  // Charges sociales
  const [csPeriode, setCsPeriode] = useState<Periodicite>(profilInitial?.chargesSociales.periodicite ?? 'mensuel');
  const [nature, setNature] = useState<NatureMicro>(profilInitial?.chargesSociales.natureMicro ?? 'BIC_PRESTA');
  const [tauxMicro, setTauxMicro] = useState(profilInitial?.chargesSociales.tauxMicroSocial ?? TAUX_MICRO_SOCIAL['BIC_PRESTA']);
  const [tauxTns, setTauxTns] = useState(profilInitial?.chargesSociales.tauxTnsSurRemuneration ?? 0.45);
  const [csManuel, setCsManuel] = useState(!!profilInitial?.chargesSociales.echeancierManuel?.some((v) => v > 0));
  const [csEch, setCsEch] = useState<number[]>(profilInitial?.chargesSociales.echeancierManuel ?? Array(12).fill(0));

  // Impôt
  const [impotPeriode, setImpotPeriode] = useState<Periodicite>(profilInitial?.impot.periodicite ?? 'trimestriel');
  const [vl, setVl] = useState(!!profilInitial?.impot.versementLiberatoire);
  const [tauxVl, setTauxVl] = useState(profilInitial?.impot.tauxVersementLiberatoire ?? TAUX_VERSEMENT_LIBERATOIRE['BIC_PRESTA']);
  const [impotEch, setImpotEch] = useState<number[]>(profilInitial?.impot.echeancierManuel ?? Array(12).fill(0));

  // TVA
  const [tvaAssujetti, setTvaAssujetti] = useState(profilInitial?.tva.assujetti ?? true);
  const [tvaPeriode, setTvaPeriode] = useState<Periodicite>(profilInitial?.tva.periodicite ?? 'mensuel');
  const [tvaTaux, setTvaTaux] = useState(profilInitial?.tva.taux ?? 0.2);

  // Quand la nature micro change, on ré-aligne les taux par défaut (si l'utilisateur ne les a pas touchés).
  const changerNature = (nv: NatureMicro) => {
    setNature(nv);
    setTauxMicro(TAUX_MICRO_SOCIAL[nv]);
    setTauxVl(TAUX_VERSEMENT_LIBERATOIRE[nv]);
  };

  const soumettre = () => {
    const profil: ProfilFiscal = {
      raisonSociale: nom.trim(),
      dirigeant: dirigeant.trim() || undefined,
      statutJuridique: statut,
      regimeFiscal: regime,
      chargesSociales: {
        periodicite: csPeriode,
        ...(regime === 'MICRO' ? { natureMicro: nature, tauxMicroSocial: tauxMicro } : {}),
        ...(regime === 'REEL_IS' || (regime === 'REEL_IR' && !csManuel) ? { tauxTnsSurRemuneration: tauxTns } : {}),
        ...(regime === 'REEL_IR' && csManuel ? { echeancierManuel: csEch } : {}),
      },
      impot: {
        periodicite: impotPeriode,
        ...(regime === 'MICRO' ? { versementLiberatoire: vl, tauxVersementLiberatoire: tauxVl } : {}),
        ...(regime !== 'MICRO' ? { echeancierManuel: impotEch } : {}),
      },
      tva: { assujetti: tvaAssujetti, periodicite: tvaPeriode, taux: tvaTaux },
    };
    onSubmit({ nom: nom.trim(), dirigeant: dirigeant.trim(), dateBilan, profil, creerSuivant });
  };

  const annee = Number(dateBilan.slice(0, 4)) || 0;
  const valide = useMemo(() => (!montrerIdentite || nom.trim().length > 0) && !!dateBilan, [montrerIdentite, nom, dateBilan]);

  return (
    <div className="space-y-6">
      {/* Identité */}
      {montrerIdentite && (
        <section className="rounded-2xl border border-navy/10 bg-white/60 p-5">
          <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-slate-700">Identité du dossier</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Champ label="Nom du dossier / raison sociale">
              <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. Boulangerie Martin" className={cls} />
            </Champ>
            <Champ label="Dirigeant (nom et prénom)">
              <input value={dirigeant} onChange={(e) => setDirigeant(e.target.value)} placeholder="Ex. Julie Martin" className={cls} />
            </Champ>
          </div>
        </section>
      )}

      {/* Cadre juridique & fiscal */}
      <section className="rounded-2xl border border-navy/10 bg-white/60 p-5">
        <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-slate-700">Cadre juridique & fiscal</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Champ label="Statut juridique">
            <select value={statut} onChange={(e) => setStatut(e.target.value as StatutJuridique)} className={cls}>
              {STATUTS.map((s) => (
                <option key={s.v} value={s.v}>{s.label}</option>
              ))}
            </select>
          </Champ>
          <Champ label="Régime fiscal">
            <select value={regime} onChange={(e) => setRegime(e.target.value as RegimeFiscal)} className={cls}>
              {REGIMES.map((rg) => (
                <option key={rg.v} value={rg.v}>{rg.label}</option>
              ))}
            </select>
          </Champ>
          <Champ label="Date de clôture (bilan)" hint={annee > 0 ? `Exercice ${annee}` : undefined}>
            <input type="date" value={dateBilan} onChange={(e) => setDateBilan(e.target.value)} className={cls} />
          </Champ>
        </div>
      </section>

      {/* Charges sociales */}
      <section className="rounded-2xl border border-navy/10 bg-white/60 p-5">
        <h3 className="mb-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-slate-700">Charges sociales (URSSAF)</h3>
        <p className="mb-3 text-xs text-slate-600">
          {regime === 'MICRO'
            ? 'Cotisations calculées automatiquement sur le CA saisi dans Rentabilité.'
            : regime === 'REEL_IS'
              ? 'Cotisations du dirigeant calculées sur la rémunération du mois précédent (M-1).'
              : 'Échéancier à saisir à la main, ou estimation par un taux sur la rémunération.'}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Champ label="Périodicité de paiement">
            <SelectPeriode value={csPeriode} onChange={setCsPeriode} sansAnnuel />
          </Champ>
          {regime === 'MICRO' && (
            <>
              <Champ label="Nature de l’activité">
                <select value={nature} onChange={(e) => changerNature(e.target.value as NatureMicro)} className={cls}>
                  {NATURES.map((nn) => (
                    <option key={nn.v} value={nn.v}>{nn.label}</option>
                  ))}
                </select>
              </Champ>
              <Champ label="Taux de cotisations" hint="Affinez si besoin">
                <Pourcent value={tauxMicro} onChange={setTauxMicro} />
              </Champ>
            </>
          )}
          {regime === 'REEL_IS' && (
            <Champ label="Taux de cotisations sur la rémunération" hint="TNS ≈ 45 %">
              <Pourcent value={tauxTns} onChange={setTauxTns} />
            </Champ>
          )}
          {regime === 'REEL_IR' && (
            <Champ label="Méthode">
              <select value={csManuel ? 'manuel' : 'taux'} onChange={(e) => setCsManuel(e.target.value === 'manuel')} className={cls}>
                <option value="taux">Taux sur la rémunération</option>
                <option value="manuel">Échéancier saisi à la main</option>
              </select>
            </Champ>
          )}
        </div>
        {regime === 'REEL_IR' && !csManuel && (
          <div className="mt-4 max-w-xs">
            <Champ label="Taux de cotisations sur la rémunération" hint="TNS ≈ 45 %">
              <Pourcent value={tauxTns} onChange={setTauxTns} />
            </Champ>
          </div>
        )}
        {regime === 'REEL_IR' && csManuel && (
          <div className="mt-4">
            <p className="mb-2 text-[12.5px] font-medium text-navy">Échéancier URSSAF (montant par mois)</p>
            <Echeancier valeurs={csEch} onChange={setCsEch} />
          </div>
        )}
      </section>

      {/* Impôt */}
      <section className="rounded-2xl border border-navy/10 bg-white/60 p-5">
        <h3 className="mb-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-slate-700">
          Impôt {regime === 'REEL_IS' ? '(IS)' : '(IR)'}
        </h3>
        <p className="mb-3 text-xs text-slate-600">
          {regime === 'MICRO'
            ? 'Versement libératoire calculé sur le CA, ou imposition au barème (non projetée).'
            : regime === 'REEL_IR'
              ? 'Saisissez l’IR à payer selon votre déclaration de revenus N-1, réparti dans l’échéancier.'
              : 'Saisissez l’IS / les acomptes à payer selon les bénéfices de l’an dernier.'}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Champ label="Périodicité de paiement">
            <SelectPeriode value={impotPeriode} onChange={setImpotPeriode} />
          </Champ>
          {regime === 'MICRO' && (
            <>
              <Champ label="Versement libératoire de l’IR">
                <select value={vl ? 'oui' : 'non'} onChange={(e) => setVl(e.target.value === 'oui')} className={cls}>
                  <option value="non">Non (imposition au barème)</option>
                  <option value="oui">Oui (prélevé sur le CA)</option>
                </select>
              </Champ>
              {vl && (
                <Champ label="Taux du versement libératoire">
                  <Pourcent value={tauxVl} onChange={setTauxVl} />
                </Champ>
              )}
            </>
          )}
        </div>
        {regime !== 'MICRO' && (
          <div className="mt-4">
            <p className="mb-2 text-[12.5px] font-medium text-navy">
              Échéancier {regime === 'REEL_IS' ? 'IS / acomptes' : 'IR'} (montant par mois)
            </p>
            <Echeancier valeurs={impotEch} onChange={setImpotEch} />
          </div>
        )}
      </section>

      {/* TVA */}
      <section className="rounded-2xl border border-navy/10 bg-white/60 p-5">
        <h3 className="mb-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-slate-700">TVA</h3>
        <p className="mb-3 text-xs text-slate-600">
          Si assujetti, la TVA à payer est projetée automatiquement (TVA collectée sur le CA moins TVA déductible sur les achats).
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Champ label="Assujettissement">
            <select value={tvaAssujetti ? 'oui' : 'non'} onChange={(e) => setTvaAssujetti(e.target.value === 'oui')} className={cls}>
              <option value="oui">Assujetti à la TVA</option>
              <option value="non">Franchise en base (non assujetti)</option>
            </select>
          </Champ>
          {tvaAssujetti && (
            <>
              <Champ label="Périodicité de paiement">
                <SelectPeriode value={tvaPeriode} onChange={setTvaPeriode} />
              </Champ>
              <Champ label="Taux de TVA">
                <Pourcent value={tvaTaux} onChange={setTvaTaux} />
              </Champ>
            </>
          )}
        </div>
      </section>

      {montrerIdentite && (
        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
          <input type="checkbox" checked={creerSuivant} onChange={(e) => setCreerSuivant(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-navy/20 text-brand" />
          <span>Créer aussi l’exercice suivant (N+1{annee > 0 ? ` — ${annee + 1}` : ''}) pour préparer le prévisionnel.</span>
        </label>
      )}

      <button
        onClick={soumettre}
        disabled={!valide}
        className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:opacity-40 sm:w-auto sm:px-8"
      >
        {labelSubmit}
      </button>
    </div>
  );
}
