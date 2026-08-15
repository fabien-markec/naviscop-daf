/**
 * Dossiers de démonstration ANONYMES et synthétiques.
 * Cohérence compte de résultat / trésorerie : encaissements décalés d'un mois.
 */
import type {
  EntreesMoteur,
  LignePnlMensuelle,
  LigneCashMensuelle,
  PosteCharge,
  ClientCa,
} from '@naviscop/finance-engine';

interface ConfigDossier {
  caHt: number[];
  ratioAchats: number;
  chargesExternes: number[];
  salaires: number[];
  impots: number[];
  chargesFin: number[];
  soldeInitial: number;
  caMoisPrecedent: number;
  objectifCaAnnuel: number;
  objectifRemunerationMensuelle: number;
  objectifTauxMarque: number;
  objectifResultatNetAnnuel: number;
}

function genererEntrees(c: ConfigDossier): EntreesMoteur {
  const achatsMp = c.caHt.map((v) => Math.round(v * c.ratioAchats));

  const pnl: LignePnlMensuelle[] = c.caHt.map((_, i) => ({
    caHt: c.caHt[i],
    achatsMarchandisesMp: achatsMp[i],
    autresAchatsChargesExternes: c.chargesExternes[i],
    salairesEtCharges: c.salaires[i],
    impotsEtTaxes: c.impots[i],
    chargesFinancieres: c.chargesFin[i],
    chargesExceptionnelles: 0,
    amortissements: 0,
  }));

  const cash: LigneCashMensuelle[] = c.caHt.map((_, i) => {
    const caTtcPrec = (i === 0 ? c.caMoisPrecedent : c.caHt[i - 1]) * 1.2;
    const tvaTrim = i === 2 || i === 5 || i === 8 || i === 11 ? (c.caHt[i] + c.caHt[i - 1] + c.caHt[i - 2]) * 0.2 * 0.55 : 0;
    const dec = (achatsMp[i] + c.chargesExternes[i]) * 1.2 + c.salaires[i] + c.impots[i] + c.chargesFin[i] + tvaTrim;
    return { encaissements: Math.round(caTtcPrec), decaissements: Math.round(dec) };
  });

  // Détail synthétique (charges par poste + clients) pour illustrer les blocs du tableau de bord.
  // En production, ce détail provient du FEC importé.
  const somme = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const aace = somme(c.chargesExternes);
  const charges: PosteCharge[] = [
    { compte: '641000', libelle: 'Salaires et charges sociales', montant: Math.round(somme(c.salaires)), fixe: true },
    { compte: '613000', libelle: 'Loyer et charges locatives', montant: Math.round(aace * 0.42), fixe: true },
    { compte: '607000', libelle: 'Achats et sous-traitance', montant: Math.round(somme(achatsMp)), fixe: false },
    { compte: '606000', libelle: 'Fournitures et énergie', montant: Math.round(aace * 0.26), fixe: true },
    { compte: '616000', libelle: 'Assurances', montant: Math.round(aace * 0.17), fixe: true },
    { compte: '626000', libelle: 'Téléphonie et logiciels', montant: Math.round(aace * 0.15), fixe: true },
    { compte: '635000', libelle: 'Impôts et taxes', montant: Math.round(somme(c.impots)), fixe: true },
    { compte: '661000', libelle: "Intérêts d'emprunt", montant: Math.round(somme(c.chargesFin)), fixe: true },
  ]
    .filter((p) => p.montant > 0)
    .sort((a, b) => b.montant - a.montant);

  const caAnnuel = somme(c.caHt);
  const repartition: { nom: string; part: number }[] = [
    { nom: 'SARL Durand & Fils', part: 0.41 },
    { nom: 'Groupe Lefèvre', part: 0.29 },
    { nom: 'Cabinet Martin', part: 0.18 },
    { nom: 'Autres clients', part: 0.12 },
  ];
  const clients: ClientCa[] = repartition
    .map((x, i) => ({ id: `C${i + 1}`, nom: x.nom, caHt: Math.round(caAnnuel * x.part) }))
    .filter((x) => x.caHt > 0);

  return {
    parametrage: {
      soldeInitialTresorerie: c.soldeInitial,
      objectifCaAnnuel: c.objectifCaAnnuel,
      objectifRemunerationMensuelle: c.objectifRemunerationMensuelle,
      moisSecuriteTresorerie: 2,
      objectifTauxMarque: c.objectifTauxMarque,
      seuilChargesFixesPctCa: 0.3,
      objectifResultatNetAnnuel: c.objectifResultatNetAnnuel,
      // Provisions (saisies à la main en production) pour illustrer le cash réellement disponible.
      tvaAProvisionner: Math.round(caAnnuel * 0.028),
      chargesSocialesAProvisionner: Math.round(somme(c.salaires) * 0.12),
      impotsAProvisionner: Math.round(Math.max(0, c.objectifResultatNetAnnuel) * 0.15),
      securiteTresorerieCible: 4000,
      investissementsAProvisionner: 2000,
      saisonnaliteAProvisionner: 1500,
    },
    pnl,
    cash,
    creancesClients: Math.round(c.caHt[11] * 1.2),
    detail: { charges, clients },
  };
}

export interface DossierDemo {
  id: string;
  nom: string;
  metier: string;
  entreesBase: EntreesMoteur;
}

export const dossiersDemo: DossierDemo[] = [
  {
    id: 'demo-atelier-moreau',
    nom: 'ATELIER MOREAU',
    metier: 'Artisan menuisier',
    entreesBase: genererEntrees({
      caHt: [18000, 21000, 25000, 23000, 19000, 16000, 12000, 14000, 20000, 24000, 22000, 17000],
      ratioAchats: 0.4,
      chargesExternes: [2800, 2800, 3200, 2900, 2800, 2800, 2600, 2600, 3000, 3200, 2900, 2800],
      salaires: [6500, 6500, 6500, 6500, 6800, 6800, 6800, 6800, 6800, 6800, 6800, 6800],
      impots: [120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 1400],
      chargesFin: [180, 176, 172, 168, 164, 160, 156, 152, 148, 144, 140, 136],
      soldeInitial: 22000,
      caMoisPrecedent: 15000,
      objectifCaAnnuel: 260000,
      objectifRemunerationMensuelle: 3500,
      objectifTauxMarque: 0.5,
      objectifResultatNetAnnuel: 20000,
    }),
  },
  {
    id: 'demo-conseil-co',
    nom: 'CONSEIL & CO',
    metier: 'Consultant',
    entreesBase: genererEntrees({
      caHt: [8000, 9000, 7000, 9500, 8500, 6000, 4000, 5000, 9000, 10000, 9500, 9500],
      ratioAchats: 0,
      chargesExternes: [1400, 1400, 1400, 1400, 1400, 1400, 1400, 1400, 1400, 1400, 1400, 1400],
      salaires: [4200, 4200, 4200, 4200, 4200, 4200, 4200, 4200, 4200, 4200, 4200, 4200],
      impots: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 900],
      chargesFin: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      soldeInitial: 25000,
      caMoisPrecedent: 8000,
      objectifCaAnnuel: 110000,
      objectifRemunerationMensuelle: 2750,
      objectifTauxMarque: 0.6,
      objectifResultatNetAnnuel: 5000,
    }),
  },
  {
    id: 'demo-boutique-centre',
    nom: 'BOUTIQUE DU CENTRE',
    metier: 'Commerce',
    entreesBase: genererEntrees({
      caHt: [4500, 5000, 5500, 5200, 5000, 6000, 4000, 4500, 5500, 6500, 7000, 8500],
      ratioAchats: 0.62,
      chargesExternes: [1800, 1800, 1800, 1800, 1800, 1800, 1800, 1800, 1800, 1800, 1800, 1800],
      salaires: [1100, 1100, 1100, 1100, 1100, 1100, 1100, 1100, 1100, 1100, 1100, 1100],
      impots: [110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 400],
      chargesFin: [40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40],
      soldeInitial: 20500,
      caMoisPrecedent: 5000,
      objectifCaAnnuel: 75000,
      objectifRemunerationMensuelle: 1500,
      objectifTauxMarque: 0.45,
      objectifResultatNetAnnuel: 3000,
    }),
  },
];

export const dossierDemoAnonyme = dossiersDemo[0].entreesBase;
export const nomDossierDemo = dossiersDemo[0].nom;
