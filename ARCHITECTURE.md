# NAVISCOP — Application DAF externalisé

Document d'architecture et plan de build. Transforme le cahier des charges MVP + le moteur Excel `NAVISCOP Finances v9` en une application SaaS multi-tenant construite sur le starter MakerKit.

Statut : V1 de cadrage technique. À faire relire (`/plan-eng-review`) avant de coder.

---

## 1. Décision structurante : le kit résout le point le plus dur

Le vrai enjeu du projet n'était pas de recoder des formules, c'était le **cloisonnement multi-clients** (section 13 du cahier des charges). Le MakerKit le résout nativement :

| Concept métier | Objet MakerKit | Cloisonnement |
|---|---|---|
| Un dossier client / entreprise | **Team Account** | RLS Postgres sur `account_id` |
| Le DAF (voit tous ses clients) | Membre `owner`/`admin` de chaque team account client | Accès aux dossiers affectés uniquement |
| Le dirigeant (voit sa boîte) | Membre `member` de son propre team account | Interface simplifiée, un seul dossier |
| Le collaborateur client | Membre avec rôle custom `saisie` | Droits limités à la saisie |
| L'expert-comptable / partenaire | Membre avec rôle custom `lecture` | Lecture seule + export |
| Le DAF admin de l'outil | Super Admin MakerKit | Accès transverse, paramétrage global |

Toutes les données financières portent une clé `account_id`. La RLS garantit qu'un dirigeant ne peut jamais voir les chiffres d'un autre. **Zéro check d'autorisation manuel à écrire.**

Stack confirmée : Next.js 16 (App Router) + React 19 + TypeScript + Supabase (Postgres/Auth/Storage) + Tailwind 4 + Shadcn UI + Turborepo. Déploiement Coolify (self-hosted, ta convention par défaut). Supabase self-hosted.

---

## 2. Ce que fait réellement le moteur Excel (rétro-ingénierie v9)

7 onglets. 3 de saisie alimentent 2 de calcul, agrégés dans `Analysis`, restitués dans `Mon TDB`.

```
Suivi client ─┐
              ├─> Plan de marges (compte de résultat HT) ─┐
Suivi fourn. ─┤                                            ├─> Analysis ─> Mon TDB
              └─> Plan de trésorerie (cash TTC) ──────────┘   (KPI moteur)  (dashboard)
Paramètres (listes de référence) alimente tout
```

Principe fondamental à préserver dans l'app (souligné p.9 du CdC) :
- **Plan de trésorerie = flux réels en TTC** (encaissements/décaissements datés).
- **Plan de marges = engagement en HT** (facturation, pas encaissement).
Ne jamais mélanger les deux. C'est l'erreur classique qui fausse tout.

---

## 3. Modèle de données Supabase

Toutes les tables métier ont `account_id uuid references accounts(id)` + RLS « membre du compte ». Une migration = un domaine.

### 3.1 Paramétrage (remplace l'onglet `Paramètres` + section 12 CdC)

**`company_settings`** (1:1 avec le team account)
- `account_id` (PK/FK), `activite` (enum métier : prestation_service, artisan_btp, commerce, restauration, consultant), `regime_fiscal` (voir §6), `regime_social`, `tva_regime` (franchise, reel_normal, reel_simplifie), `tva_periodicite` (mensuelle, trimestrielle), `exercice_debut` date, `exercice_fin` date, `solde_initial_tresorerie` numeric, `objectif_ca_annuel`, `objectif_remuneration_mensuelle`, `seuil_securite_tresorerie` (défaut : 2 mois de décaissement moyen).

**Tables de référence** (`products`, `suppliers`, `acquisition_channels`, `clients`) : `id`, `account_id`, `name`, `active`. Remplacent les listes en dur de l'onglet Paramètres.

**`fixed_charges`** (charges fixes récurrentes) : `account_id`, `category` (achats_marchandises, charges_externes, salaires, impots_taxes, charges_financieres), `label`, `amount_ttc`, `tva_rate`, `periodicite`, `date_debut`, `date_fin`. Remplace la colonne E figée du Plan de trésorerie (Eau, Électricité, Loyers, Personnel extérieur, etc.).

### 3.2 Saisie (remplace `Suivi client` / `Suivi fournisseurs`)

**`invoices`** (une ligne = une facture client)
- `account_id`, `client_id`, `acquisition_channel_id`, `product_id`
- `devis_number`, `statut_devis` (signe, refuse, en_cours), `duree_conversion_jours`
- `invoice_number`, `montant_ht`, `tva_rate`, `montant_ttc` (généré), `date_emission`, `date_echeance`
- `type_facture` (acompte, solde), `paid` bool, `date_encaissement`
- Le TTC et la ventilation mensuelle des encaissements sont calculés, pas saisis à la main (contrairement à l'Excel).

**`supplier_invoices`** (achats fournisseurs, pour coût par commande + décaissements)
- `account_id`, `supplier_id`, `client_invoice_ref` (rattachement pour marge/commande), `montant_ht`, `tva_rate`, `montant_ttc`
- `date_reception`, `montant_acompte`, `date_paiement_acompte`, `montant_solde`, `date_paiement_solde`, `paid` bool.

### 3.3 Financement, décisions, IA

**`financing_flows`** : apports capital, apports CC associé, prêts bancaires, prêt 0 %, investissements, remboursements (capital/CC/emprunt). `type`, `amount`, `date`, `recurrence`.

**`scenarios`** : `account_id`, `name`, `type` (realiste, prudent, optimiste, decision), `assumptions` jsonb (hausse_prix_pct, baisse_ca_pct, duree_mois, recrutement {salaire, date}, remuneration_delta, investissement {montant, financement}, decalage_fournisseur_jours, retard_encaissement_jours), `created_by`.

**`action_items`** (plan d'action, section 6/8 CdC) : `action`, `responsible`, `due_date`, `expected_impact`, `status` (a_faire, en_cours, fait), `created_by`, timestamps.

**`ai_analyses`** : `account_id`, `type` (situation, bilan, projection), `period`, `input_snapshot` jsonb, `output_md` text, `model`, `created_at`. Historise les analyses IA.

**`bilan_imports`** : upload du bilan/compte de résultat annuel (Storage) + extraction structurée pour le module d'analyse de bilan.

---

## 4. Le moteur de calcul (la brique à dérisquer en premier)

Critère de validation n°1 du CdC : *mêmes entrées → mêmes résultats que l'Excel*. On isole toute la logique dans un package pur, testable, sans I/O.

`packages/features/finance-engine/` (TypeScript pur, aucune dépendance Supabase) :
- `cashflow.ts` — plan de trésorerie 12 mois
- `pnl.ts` — plan de marges / compte de résultat
- `kpi.ts` — les 11 KPI
- `alerts.ts` — règles d'alerte
- `scenarios.ts` — application des hypothèses sur une projection de base
- `__tests__/` — les 3 cas test du CdC en fixtures (validation chiffrée)

### 4.1 Plan de trésorerie (TTC, mensuel sur 12 mois)

```
solde_debut[m]     = m === 0 ? solde_initial : solde_fin[m-1]
encaissements[m]   = ca_encaisse[m] + apports_capital[m] + apports_cc[m]
                     + prets_bancaires[m] + pret_0[m] + remboursements_recus[m] + credits_tva[m]
decaissements[m]   = achats_marchandises_mp[m] + autres_achats_charges_externes[m]
                     + salaires_bruts[m] + charges_sociales[m] + tva_a_payer[m]
                     + impots_taxes[m] + charges_financieres[m]
                     + remb_emprunts[m] + remb_cc_associe[m] + remb_capital[m] + investissements[m]
variation[m]       = encaissements[m] - decaissements[m]
solde_fin[m]       = solde_debut[m] + variation[m]
mois_critique      = argmin(solde_fin)                 // à afficher dashboard
besoin_tresorerie  = max(0, seuil_securite - solde_fin[m])   // seuil = 2 mois décaissement moyen
```

Projections des échéances (là où l'Excel triche avec des colonnes figées, l'app calcule) :
- **TVA à payer** = TVA collectée prévisionnelle − TVA déductible prévisionnelle, calée sur la périodicité (`tva_periodicite`) et décalée au mois de décaissement réel.
- **Charges sociales** = projetées selon `regime_social` + périodicité.
- **Impôts** (IS/IR) = selon `regime_fiscal` + périodicité.

### 4.2 Plan de marges / compte de résultat (HT, mensuel)

```
ca_ht[m]              = Σ factures HT du mois (par produit)
marge_brute[m]        = ca_ht[m] - achats_marchandises_et_mp[m]
resultat_net[m]       = ca_ht[m] - achats_march_mp[m] - autres_achats_charges_externes[m]
                        - remuneration[m] - dap[m] - impots_taxes_estimes[m] - charges_financieres[m]
resultat_cumule[m]    = Σ resultat_net[0..m]
```

### 4.3 Les 11 KPI (section 9 CdC, formules Analysis)

| # | KPI | Formule |
|---|---|---|
| 1 | Trésorerie disponible | Solde bancaire actualisé à date |
| 2 | Trésorerie à 3/6/12 mois | `solde_fin` projeté aux horizons |
| 3 | Marge brute / taux de marque | `marge_brute` ; `marge_brute / ca_ht` |
| 4 | Résultat prévisionnel | `resultat_net` cumulé projeté |
| 5 | Seuil de rentabilité | `charges_fixes / TMCV` avec `TMCV = marge_brute / ca_ht` |
| 6 | Capacité de rémunération | Cash distribuable après provisions URSSAF/TVA/impôts |
| 7 | Créances clients | Σ factures émises non encaissées (`paid = false`) |
| 8 | Rentabilité par activité | Marge nette/produit après clé de répartition `ca_produit / ca_total` sur charges indirectes |
| 9 | EBE | `ca_ht - achats_march_mp - autres_achats_charges_externes - remuneration - impots_taxes` |
| 10 | Cashflow généré | `EBE - charges_financieres` (approche CAF simplifiée) |
| 11 | Mois de trésorerie d'avance | `tresorerie_disponible / charges_mensuelles_moyennes` |

KPI optionnels (dashboard annuel) : top 5 clients, top 5 charges fixes, CA par canal d'acquisition, répartition CA par produit, répartition des achats par catégorie, courbe santé financière (encaissements/décaissements/solde/résultat).

### 4.4 Règles d'alerte (section 10) — seuils par défaut proposés

| Alerte | Règle | Niveau |
|---|---|---|
| Trésorerie critique | `min(solde_fin) < 0` | 🔴 |
| Trésorerie fragile | `solde_fin < 3 mois de charges` | 🟠 |
| Marge insuffisante | `taux_marque < objectif_marge` | 🟠/🔴 |
| Charges fixes lourdes | `charges_fixes > 30 % du CA` (défaut, personnalisable) | 🟠 |
| Rémunération insuffisante | `remuneration_reelle < objectif_remuneration` | 🟠 |
| Risque fiscal/social | échéance TVA/URSSAF sans cash suffisant le mois M | 🔴 |
| Rentabilité faible | `resultat_previsionnel < objectif_net` | 🟠 |

Les seuils vivent dans `company_settings` (80 % standardisé / 20 % personnalisable, règle p.11).

### 4.5 Scénarios (section 11)

Une projection de base (réaliste) + une fonction pure `applyScenario(base, assumptions) → projection`. Les 8 simulations prioritaires du CdC sont des presets d'`assumptions`. Chaque scénario réaffiche l'impact sur trésorerie **et** compte de résultat, comparé à la base.

---

## 5. Écrans → routes MakerKit

Les features par dossier client vivent sous `apps/web/app/[locale]/home/[account]/` (workspace team account). Interface dirigeant = même app, RLS + rôle filtrent.

| Écran (section 6 CdC) | Route |
|---|---|
| Onboarding dossier (7 étapes, §5.1) | `home/[account]/onboarding` |
| Dashboard (situation en 30 s) | `home/[account]` |
| Plan de trésorerie 12 mois | `home/[account]/tresorerie` |
| Rentabilité / compte de résultat | `home/[account]/rentabilite` |
| Saisie / import | `home/[account]/saisie` |
| Scénarios | `home/[account]/scenarios` |
| Plan d'action | `home/[account]/plan-action` |
| Analyse de bilan | `home/[account]/bilan` |
| Chatbot IA client | Panneau latéral global (déchargement support) |
| Paramétrage | `home/[account]/settings` (étend les settings du kit) |

Contrainte UX (p.8) : mise à jour mensuelle **< 15 min**. La saisie doit être guidée, pré-remplie, avec import CSV/Excel dès la V1. L'import API compta (Pennylane, Tiime, Henrii, SAGE, Indy, EBP) est en **V2** (le CdC lui-même le classe en annexe).

---

## 6. Décision produit que je tranche pour la V1

**Régime fiscal/social V1 : société à l'IS (EURL / SASU / SAS) au régime de TVA réel.**

Raison : c'est ce que le moteur NAVISCOP calcule déjà (IS, TVA collectée/déductible, masse salariale, charges sociales dirigeant), et c'est cohérent avec les 3 cas test (cas 1 : masse salariale + charges sociales dirigeant = société). La micro-entreprise (abattement forfaitaire, cotisations en % du CA, souvent hors TVA) obéit à une logique totalement différente → **V2**.

Cible métier V1 (annexe CdC, tranchée) : **prestataire de service**. Les KPI métier spécifiques (marge chantier BTP, coût matière restaurant, TJM consultant) arrivent après validation du cœur.

Conséquence : on fige 1 moteur fiscal propre plutôt que 4 approximatifs. Extension micro/IR = migration ultérieure isolée.

---

## 7. Roadmap (traduite en jalons MakerKit)

| Jalon | Contenu | Preuve de valeur |
|---|---|---|
| **J0 — Scaffold** | Cloner le kit complet, `pnpm install`, Supabase local, custom rôles (`saisie`, `lecture`) | App tourne, auth + team accounts OK |
| **J1 — Moteur** | `finance-engine` pur + 3 cas test verts | Chiffres = Excel, écart faible (critère n°1) |
| **J2 — Données + saisie** | Migrations 3.1→3.3, RLS, formulaires guidés + import CSV | Un dossier configurable en < 30 min |
| **J3 — Dashboard + KPI + alertes** | Dashboard, 11 KPI, plan de tréso, rentabilité, alertes | Dashboard lisible sans explication |
| **J4 — Scénarios + plan d'action + export** | Simulations, plan d'action, export PDF/Excel RDV | Support de RDV DAF prêt |
| **J5 — IA** | Analyse situation « comme un DAF », analyse de bilan pédagogique, chatbot | Premier niveau d'analyse auto |
| **J6 — Pilotes** | 2-3 clients réels, ajustements adoption | Retours terrain |

L'ordre respecte le « dernier filtre » du CdC (p.16) : tréso + KPI + alertes + export RDV d'abord, le reste ensuite.

---

## 8. Points encore à trancher (avec toi ou Michael)

1. **Seuils d'alerte exacts par métier** : le CdC les laisse « à compléter ». Je propose les défauts du §4.4 ; Michael (le DAF) valide.
2. **Périmètre IA** : « analyse comme si c'était moi, DAF » = prompt système à construire avec Michael à partir de ses vrais commentaires de RDV. Sans ça, l'IA sonnera générique.
3. **Import API compta** : confirmer que c'est bien V2 (aucun de ces éditeurs n'expose d'API de scraping simple ; Pennylane a une vraie API, les autres beaucoup moins).
4. **Nom du produit et hébergement** : NAVISCOP ? domaine ? Supabase self-hosted sur ton VPS Coolify ou Supabase cloud.

---

## 9. État d'avancement

- **J1 — Moteur (`finance-engine/`) : FAIT.** TypeScript pur, 8 tests verts, parité au centime avec l'Excel (CA 202 509 €, marge brute 83 989 €, EBE −71 751 €, résultat −73 322 €, tréso fin −33 481 €). Les 3 cas test du CdC valident la couche alertes.
- **J0 — Scaffold UI (`app/`) : FAIT (sans BDD).** App Next.js 15 + Tailwind + recharts, branchée sur le moteur avec les données de démo MB SAS. Écrans opérationnels : dashboard (11 KPI + alertes + courbe tréso), plan de trésorerie (flux + tableau mensuel, mois critique surligné), rentabilité (compte de résultat mensuel + courbe), scénarios (interactif, recalcul en direct). Stubs : plan d'action, analyse de bilan. Lancer : `cd app && pnpm dev` (port 3100).

- **Import FEC : FAIT.** Parseur FEC (`finance-engine/src/fec/`) : lecture (séparateurs tab/pipe/`;`, dates AAAAMMJJ ou JJ/MM/AAAA, virgule décimale, variante Débit-Crédit ou Montant-Sens), mapping des comptes PCG vers les catégories NAVISCOP, reconstitution du compte de résultat + trésorerie + créances + solde initial (à-nouveau). 13 tests verts. Page `/import` dans l'app : dépôt de fichier ou collage → tableau de bord calculé en direct (vérifié navigateur, exemple « DEMO CONSEIL » 76 écritures). **Stratégie tranchée : FEC = colonne vertébrale V1 (un format = tous les logiciels), API Pennylane = confort V2.**

### État de l'application (démo sans BDD) — COMPLÈTE
19 tests moteur verts, build production vert (11 routes). Tous les modules fonctionnels du CdC sont livrés et vérifiés dans le navigateur :

| Module | État |
|---|---|
| Tableau de bord (11 KPI + alertes + courbe) | ✅ |
| Plan de trésorerie (flux + tableau, mois critique) | ✅ |
| Rentabilité (compte de résultat mensuel) | ✅ |
| Scénarios (interactif, impact live) | ✅ |
| Import FEC (réalisé, tous logiciels) | ✅ |
| Saisie prévisionnelle (factures/charges à venir, investissements) | ✅ |
| Analyse « comme un DAF » + encadré enfant 5 ans | ✅ |
| Plan d'action (CRUD persisté) | ✅ |
| Rapport / Export (PDF imprimable + CSV Excel) | ✅ |
| Paramétrage (objectifs/seuils → alertes en direct) | ✅ |

État global : contexte React + localStorage (`naviscop.workspace.v1`), espace de travail multi-dossiers. Import FEC → « Activer ce dossier » (crée un nouveau dossier client).

**Deux vues (section 13 du CdC) — FAIT (démo, sans auth) :**
- **Vue DAF** : portefeuille `/clients` (tous les dossiers avec CA / résultat / tréso / alertes), sélecteur de client dans le sidebar, tous les modules. 3 clients de démo aux profils distincts (artisan, consultant, commerce).
- **Vue Client** : verrouillée sur sa seule entreprise (« Mon entreprise »), pas de portefeuille ni de sélecteur.
- Bascule de rôle DAF/Client dans le sidebar (démo). Le cloisonnement réel par authentification viendra avec Supabase (RLS multi-tenant).

### Reste à faire — nécessite une décision de Fabien / Michael
- **Chatbot IA** : besoin d'une clé LLM (OpenAI/Anthropic) + décision coût/secret.
- **Supabase + multi-tenant** : brancher la persistance (hébergement à choisir), migrer dans le monorepo MakerKit (`packages/features/finance-engine/` + routes `home/[account]/*`), câbler la RLS.
- **Déploiement démo** : anonymisation faite ; reste à déployer sur Coolify `peduzzi.sbs` protégé par mot de passe.
- **Validation** : un vrai FEC anonymisé pour caler le mapping des comptes ; validation des calculs et seuils par Michael (le DAF).
