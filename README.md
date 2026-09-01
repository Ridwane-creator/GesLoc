# GesLoc

Gestion simplifiée des loyers et locataires — projet développé dans le cadre d'un mini hackathon (2-3 jours).

## Le problème

Les propriétaires de logements, en particulier ceux qui gèrent plusieurs biens, suivent encore les loyers manuellement (cahier, mémoire). Résultat : erreurs de calcul, oublis, litiges avec les locataires, aucune preuve fiable en cas de désaccord.

## La solution

Une plateforme web où le propriétaire ajoute ses logements et locataires, enregistre chaque paiement en un clic, et où le statut de chaque locataire (payé / en retard / en avance) est calculé automatiquement, avec un bilan mensuel clair.

## Stack technique

- **Frontend** : React (Vite), Tailwind CSS
- **Backend / Base de données** : Supabase (PostgreSQL, authentification incluse, sécurité au niveau des lignes — RLS)

## Installation et démarrage

```bash
# 1. Cloner le repo
git clone <url-du-repo>
cd gesloc

# 2. Installer les dépendances
npm install

# 3. Copier le fichier d'environnement et renseigner les clés Supabase
cp .env.example .env

# 4. Lancer le projet en local
npm run dev
```

### Variables d'environnement (`.env`)

```
VITE_SUPABASE_URL=<url-du-projet-supabase>
VITE_SUPABASE_ANON_KEY=<clé-publique-anon>
```

> Ces clés sont transmises par Ridwane (backend fondations) dès que le projet Supabase est créé. Ne jamais utiliser la clé `service_role` côté frontend.

## Arborescence du projet

```
src/
├── main.jsx
├── App.jsx                    → routes principales
├── lib/
│   └── supabaseClient.js      → connexion Supabase
├── styles/
│   └── index.css              → Tailwind + variables de couleurs
├── components/                → composants partagés (StatusBadge, Button, Layout)
├── pages/
│   ├── auth/                  → connexion / inscription
│   ├── logements/             → gestion des logements
│   ├── locataires/            → gestion des locataires
│   ├── paiements/             → enregistrement des paiements
│   └── dashboard/              → tableau de bord + bilan mensuel
├── hooks/                      → appels Supabase (logements, paiements, soldes)
└── routes.jsx
```

## Schéma de la base de données (Supabase)

### Table `proprietaires`
| Champ | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique (géré par Supabase Auth) |
| nom | text | Nom du propriétaire |
| email / telephone | text | Identifiant de connexion |

### Table `logements`
| Champ | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| proprietaire_id | UUID | Référence au propriétaire |
| nom | text | Nom / désignation du logement |
| adresse | text | Adresse |

### Table `locataires`
| Champ | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| logement_id | UUID | Référence au logement |
| nom | text | Nom du locataire |
| telephone | text | Contact |
| loyer_mensuel_du | numeric | Montant du loyer mensuel (FCFA) |
| date_echeance | date | Jour du mois où le loyer est dû |
| rappels_actifs | boolean | Active/désactive les rappels automatiques pour ce locataire (fonctionnalité hors MVP, colonne prévue à l'avance) |

### Table `paiements`
| Champ | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| locataire_id | UUID | Référence au locataire |
| montant | numeric | Montant versé (FCFA) |
| date_paiement | date | Date du versement |
| mois_concerne | date | Mois auquel le paiement est rattaché |

### Table `abonnements`
| Champ | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| proprietaire_id | UUID | Référence au propriétaire (auth.users.id) |
| plan | text | `gratuit`, `pro`, ou `agence` |
| mode_paiement | text | `mobile_money` ou `carte` (simulation, aucune vraie transaction) |
| statut | text | `actif` ou `annule` |
| date_souscription | timestamptz | Date de souscription au plan |
| date_fin | timestamptz | Date de fin (si applicable) |

> Paiement simulé pour la démo hackathon — aucune transaction réelle, aucune donnée bancaire n'est envoyée ni stockée. Pour une vraie mise en production, il faudrait intégrer un vrai prestataire de paiement (ex. Kkiapay pour le Mobile Money en Afrique de l'Ouest, ou Stripe pour la carte bancaire).

> Row Level Security (RLS) est activé sur toutes les tables : un `select` retourne automatiquement uniquement les données du propriétaire connecté, pas besoin de filtrer manuellement par `proprietaire_id` côté frontend.

## Logique de calcul du solde

Pour chaque locataire et chaque mois :

```
total_payé_du_mois = somme des paiements du mois
solde = loyer_mensuel_du - total_payé_du_mois + report_du_mois_précédent

solde > 0  → statut "en retard"
solde = 0  → statut "payé"
solde < 0  → statut "avance"
```

⚠️ Attention à la convention de signe (contre-intuitive) : solde **positif** = retard, solde **négatif** = avance. Toute l'équipe doit utiliser cette même formule.

## Équipe et répartition

| Membre | Rôle |
|---|---|
| ADEBOYE-SENAN Ridwane (chef de groupe) | Backend — Fondations (Supabase, tables, auth, RLS) |
| Prince Freddy | Backend — Logique métier (calcul du solde, CRUD, agrégats) |
| OUSSOU Anaïs | Frontend — Écrans principaux (auth, logements, locataires, paiement) |
| AGO Clotilde | Frontend — Tableau de bord (vue d'ensemble, filtres, bilan mensuel) |

Détail complet des tâches : voir `GesLoc_Fiche_Equipe.docx`.

## Convention Git

- Une branche par fonctionnalité : `feature/ecrans-principaux`, `feature/dashboard`, `feature/backend-fondations`, `feature/logique-metier`
- Pull request avant de fusionner sur `main`, même en hackathon — ça évite les conflits de dernière minute
- Commits courts et clairs (ex. `feat: ajout formulaire paiement`, `fix: calcul solde mois précédent`)

## Points de synchronisation

- **Fin jour 1** : schéma, authentification et palette de couleurs validés par toute l'équipe
- **Milieu jour 2** : fonction de calcul du solde branchée sur le tableau de bord
- **Fin jour 2** : premier assemblage complet de l'application
- **Jour 3** : plus aucune nouvelle fonctionnalité — uniquement correction de bugs et tests croisés

## Démonstration prévue

1. Création d'un logement et de plusieurs locataires en direct
2. Enregistrement de paiements (complet, partiel, avance) → calcul automatique du statut
3. Présentation du tableau de bord avec statuts en temps réel
4. Présentation du bilan mensuel
5. Présentation du modèle économique (gratuit / abonnement / agence)
