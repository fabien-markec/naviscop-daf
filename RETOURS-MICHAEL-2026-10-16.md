# Retours Michaël — NaviScope / DAF de poche (16/10/2026)

Source : retours transmis par Fabien. À traiter en local (port 3100) puis déployer en STABLE sur le VPS de Michaël (« on est sur un client »).

## 1. Accès client : mail de connexion manquant
Le client n'a pas reçu de mail avec l'URL de connexion + ses identifiants une fois le compte créé (id + mdp). On ne sait pas comment il peut se connecter.
> État actuel : invitation par **lien** (pas d'email/SMTP, choix antérieur de Fabien). Le DAF génère un lien `/invite/<token>` à envoyer à la main. → DÉCISION À PRENDRE : (a) vrai email automatique (nécessite SMTP) ou (b) rendre le flux « lien » clair/visible pour le DAF. 

## 2. Paramètres différents selon l'année
Faire un menu paramètres différent par année : les objectifs et les appels à cotisation changent d'une année à l'autre.
> Multi-exercice existe déjà (date_bilan, exercice, pilules N/N+1). Vérifier que le **paramétrage (objectifs + provisions cotisations) est bien propre à chaque exercice** et éditable par année.

## 3. Date du solde initial de trésorerie
Dans les paramètres, pouvoir mettre une **date** pour la saisie du solde initial de tréso (si on démarre l'appli en cours d'année).

## 4. HT / TTC à la saisie (Rentabilité)
Dans la saisie des charges et produits (renta), ajouter un **bloc pour indiquer si le montant est TTC ou HT** (certains entrepreneurs ne suivent que le TTC).

## 5. Compte de résultat : montants éditables par mois + fixe/variable modifiable
Dans le tableau récap du compte de résultat :
- pouvoir **modifier chaque montant de ligne de charge, mois par mois** (ex. rémunération fixe 2500 € mais seulement 1000 € en juin → override mensuel rapide) ;
- pouvoir **modifier le choix « fixe / variable »** après coup.

## 6. Plan de trésorerie : opérations bancaires hors compte de résultat
Dans le plan de trésorerie, prévoir une **ligne de saisie sous le tableau** (comme dans la renta) pour des opérations bancaires hors compte de résultat : versement de dividendes, épargne sur un autre compte, remboursement d'emprunt (souvent fixe), investissement, obtention d'un prêt bancaire…
> Nouveau type « mouvement de trésorerie pur » qui touche la tréso mais PAS le compte de résultat.
