# @naviscop/finance-engine

Moteur de calcul financier de NAVISCOP. TypeScript pur, aucune I/O, aucune dépendance runtime. C'est la brique qui garantit le **critère de validation n°1** du cahier des charges : *mêmes entrées → mêmes résultats que l'Excel*.

## Ce qu'il calcule

- **Plan de trésorerie** 12 mois (TTC) — `cashflow.ts`
- **Compte de résultat / plan de marges** (HT) — `pnl.ts`
- **11 KPI essentiels** — `kpi.ts`
- **Règles d'alerte** (7 règles, seuils paramétrables) — `alerts.ts`
- **Scénarios de projection** (impact d'une décision sur tréso + résultat) — `scenarios.ts`

Point d'entrée : `calculerTableauDeBord(entrees)` dans `src/index.ts`.

## Parité prouvée

Le moteur est validé contre l'Excel `NAVISCOP Finances v9` sur la société MB SAS
(`test/fixtures/mb-sas.ts` = séries mensuelles réelles extraites de l'Excel) :

| Sortie | Excel | Moteur |
|---|---|---|
| CA HT annuel | 202 509 € | 202 509 € |
| Marge brute | 83 989 € (41,5 %) | 83 989 € (41,5 %) |
| EBE | −71 751 € | −71 751 € |
| Résultat | −73 322 € | −73 322 € |
| Trésorerie fin d'année | −33 481 € | −33 481 € |
| Résultat net mensuel (12 mois) | — | identique au centime |
| Solde de fin de mois (12 mois) | — | identique (±0,02 €, arrondi) |

Les 3 cas test du CdC (artisan / consultant / commerce, section 15) valident la couche
signaux : marge, alertes, et impact d'une embauche simulée.

## Commandes

```bash
node --test        # lance les 8 tests (Node 24, TypeScript natif)
node demo.ts       # affiche le tableau de bord calculé pour MB SAS
```

## À venir

- Projection fine des échéances TVA / URSSAF / IS selon le régime (aujourd'hui fournies
  en entrée agrégée ; à générer depuis le paramétrage — cf. ARCHITECTURE §4.1).
- Clé de répartition des charges indirectes pour la rentabilité par activité (KPI 8).
- Ce package sera déplacé sous `packages/features/finance-engine/` du monorepo au scaffold (J0).
