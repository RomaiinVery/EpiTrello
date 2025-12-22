# Cahier des Charges Technique — EpiTrello

Ce document détaille les spécifications fonctionnelles et techniques de la plateforme **EpiTrello**, un outil de gestion de projet collaboratif inspiré de Trello, enrichi de fonctionnalités pour développeurs.

---

## 1. Vue d'Ensemble du Projet

### 1.1 Objectifs
- Fournir une interface intuitive de gestion de tâches par colonnes (Kanban).
- Permettre une collaboration temps réel (Assignation, Commentaires).
- Intégrer des flux de travail "Developer-First" (Liaison GitHub, Markdown).

### 1.2 Stack Technique
- **Frontend :** Next.js 15 (App Router), React 19, TailwindCSS, Lucide Icons.
- **Backend :** Next.js API Routes, Prisma ORM.
- **Base de Données :** PostgreSQL.
- **Authentification :** NextAuth v5 (Auth.js).
- **Interactivité :** `@dnd-kit` pour le Drag & Drop.

### 1.3 Planning & Ressources
- **Durée :** 5 mois (1er Septembre — 31 Janvier).
- **Équipe :** 2 Développeurs (Rythme 3j/semaine).
- **Charge Estimée :** ~130 Jours-Hommes.

---

## 2. Spécifications Fonctionnelles & Techniques

### 2.1 Authentification & Comptes Utilisateurs
*État : Implémenté*

*   **Inscription (Register)**
    *   **Fonctionnalité :** Création de compte avec Nom, Email, Mot de passe.
    *   **Validation :** Unicité email, hashage `bcrypt`.
    *   **API Route :** `POST /api/register`
    *   **Modèle :** `User.create`

*   **Connexion (Login)**
    *   **Fonctionnalité :** Authentification par Email/Mot de passe via Credentials Provider.
    *   **Session :** JWT sécurisé (HttpOnly).
    *   **API Route :** `GET/POST /api/auth/[...nextauth]`

*   **Gestion de Profil (Avatar)**
    *   **Fonctionnalité :** Upload et mise à jour de la photo de profil.
    *   **Stockage :** Local (`public/uploads/profiles`).
    *   **API Route :** `POST /api/user/profile-image`

### 2.2 Structure Organisationnelle (Workspaces)
*État : Implémenté*

*   **Gestion des Tableaux (Workspaces)**
    *   **Fonctionnalité :** Lister, créer, renommer et supprimer des espaces de travail.
    *   **API Routes :**
        *   Liste : `GET /api/tableaux`
        *   Création : `POST /api/tableaux`
        *   Modification : `PUT /api/tableaux/[tableauId]`
        *   Suppression : `DELETE /api/tableaux/[tableauId]`
    *   **Modèle :** `Tableau`

*   **Membres du Tableau**
    *   **Fonctionnalité :** Inviter (par email), lister et retirer des membres d'un espace de travail.
    *   **API Routes :**
        *   Lister : `GET /api/tableaux/[tableauId]/members`
        *   Inviter : `POST /api/tableaux/[tableauId]/members`
        *   Retirer : `DELETE /api/tableaux/[tableauId]/members`

*   **Gestion des Projets (Boards)**
    *   **Fonctionnalité :** CRUD complet des boards au sein d'un tableau.
    *   **API Routes :**
        *   Liste : `GET /api/boards`
        *   Création : `POST /api/boards` (Initialise listes par défaut)
        *   Détails : `GET /api/boards/[boardId]`
        *   Modification : `PUT /api/boards/[boardId]`
        *   Suppression : `DELETE /api/boards/[boardId]`
    *   **Modèle :** `Board`

*   **Membres du Board**
    *   **Fonctionnalité :** Gestion des membres spécifiques à un board (hérités du tableau ou invités directs).
    *   **API Routes :**
        *   Lister : `GET /api/boards/[boardId]/members`
        *   Inviter : `POST /api/boards/[boardId]/members`

### 2.3 Gestion des Tâches (Kanban)
*État : Implémenté*

*   **Listes (Colonnes)**
    *   **Fonctionnalité :** Créer, modifier, supprimer et réordonner les colonnes.
    *   **API Routes :**
        *   Création : `POST /api/boards/[boardId]/lists`
        *   Modification : `PUT /api/boards/[boardId]/lists/[listId]`
        *   Suppression : `DELETE /api/boards/[boardId]/lists/[listId]`
        *   Réordonnancement : `PUT /api/boards/[boardId]/lists/reorder`

*   **Cartes (Structure)**
    *   **Fonctionnalité :** Création rapide, suppression et déplacement (DnD).
    *   **API Routes :**
        *   Création : `POST /api/boards/[boardId]/lists/[listId]/cards`
        *   Détail complet : `GET /api/boards/[boardId]/lists/[listId]/cards/[cardId]`
        *   Modification (Titre/Desc) : `PUT /api/boards/[boardId]/lists/[listId]/cards/[cardId]`
        *   Suppression : `DELETE /api/boards/[boardId]/lists/[listId]/cards/[cardId]`
        *   Réordonnancement : `PUT /api/boards/[boardId]/cards/reorder`

### 2.4 Détails d'une Carte (Modale d'Édition)
*État : Implémenté*

*   **Système d'Étiquettes (Labels)**
    *   **Fonctionnalité :** Création de labels globaux au board et assignation aux cartes.
    *   **API Routes (Gestion Labels Board) :**
        *   Lister : `GET /api/boards/[boardId]/labels`
        *   Créer : `POST /api/boards/[boardId]/labels`
        *   Modifier : `PUT /api/boards/[boardId]/labels/[labelId]`
        *   Supprimer : `DELETE /api/boards/[boardId]/labels/[labelId]`
    *   **API Routes (Assignation Carte) :**
        *   Lister sur carte : `GET /api/boards/[boardId]/cards/[cardId]/labels`
        *   Ajouter : `POST /api/boards/[boardId]/cards/[cardId]/labels`
        *   Retirer : `DELETE /api/boards/[boardId]/cards/[cardId]/labels`

*   **Membres Assignés**
    *   **Fonctionnalité :** Assigner ou retirer un utilisateur d'une tâche spécifique.
    *   **API Routes :**
        *   Assigner : `POST /api/boards/[boardId]/lists/[listId]/cards/[cardId]/members`
        *   Désassigner : `DELETE /api/boards/[boardId]/lists/[listId]/cards/[cardId]/members`

*   **Checklists (Sous-tâches)**
    *   **Fonctionnalité :** Gestion des listes de contrôle et de leurs éléments.
    *   **API Routes (Checklists) :**
        *   Lister : `GET /api/boards/[boardId]/lists/[listId]/cards/[cardId]/checklists`
        *   Créer : `POST /api/boards/[boardId]/lists/[listId]/cards/[cardId]/checklists`
        *   Modifier : `PUT /api/boards/[boardId]/lists/[listId]/cards/[cardId]/checklists/[checklistId]`
        *   Supprimer : `DELETE /api/boards/[boardId]/lists/[listId]/cards/[cardId]/checklists/[checklistId]`
    *   **API Routes (Items) :**
        *   Ajouter Item : `POST /api/.../checklists/[checklistId]/items`
        *   Modifier/Cocher Item : `PUT /api/.../checklists/[checklistId]/items/[itemId]`
        *   Supprimer Item : `DELETE /api/.../checklists/[checklistId]/items/[itemId]`

*   **Pièces Jointes (Cover)**
    *   **Fonctionnalité :** Upload d'une image de couverture (Max 5MB).
    *   **API Routes :**
        *   Upload : `POST /api/boards/[boardId]/lists/[listId]/cards/[cardId]/cover`
        *   Supprimer : `DELETE /api/boards/[boardId]/lists/[listId]/cards/[cardId]/cover`

*   **Commentaires**
    *   **Fonctionnalité :** Discussion sur la carte.
    *   **API Routes :**
        *   Ajouter : `POST /api/boards/[boardId]/lists/[listId]/cards/[cardId]/comments`
        *   Modifier : `PUT /api/boards/[boardId]/lists/[listId]/cards/[cardId]/comments/[commentId]`
        *   Supprimer : `DELETE /api/boards/[boardId]/lists/[listId]/cards/[cardId]/comments/[commentId]`

*   **Historique d'Activité**
    *   **Fonctionnalité :** Visualisation des actions passées.
    *   **API Route :** `GET /api/boards/[boardId]/activities`

### 2.5 Routes Utilitaires
*   **Test API :** `GET /api/test-route`

---

## 3. Spécifications des Fonctionnalités à Venir (Roadmap)

### 3.1 Intégration GitHub Avancée
*Priorité : Haute*

*   **Liaison de Compte (OAuth)**
    *   **Fonctionnalité :** Permettre à l'utilisateur de lier son compte GitHub pour accéder à ses repos/PRs.
    *   **Implémentation Technique :** Ajout d'un provider GitHub à NextAuth ou gestion manuelle de token.
    *   **Évolution Modèle :** Ajout de `githubId` et `githubAccessToken` au modèle `User`.
    *   **API Prévues :**
        *   `POST /api/integrations/github/connect` : Initier le flux OAuth.
        *   `GET /api/integrations/github/callback` : Callback de validation.

*   **Liaison Pull Request <-> Carte**
    *   **Fonctionnalité :** Champ dédié dans la modale carte pour coller une URL de PR.
    *   **Implémentation Technique :** Parsing de l'URL, appel API GitHub via `octokit` pour récupérer statut/titre.
    *   **Évolution Modèle :** Ajout de `githubPrUrl`, `githubPrId`, `githubPrStatus` au modèle `Card`.
    *   **API Prévues :**
        *   `POST /api/boards/[boardId]/cards/[cardId]/github/link` : Associer une PR.
        *   `GET /api/boards/[boardId]/cards/[cardId]/github/status` : Rafraîchir le statut.

*   **Webhooks & Automatisation**
    *   **Fonctionnalité :** Déplacement automatique de la carte (ex: vers "Done") quand la PR est mergée.
    *   **Implémentation Technique :** Création d'un endpoint public pour recevoir les événements GitHub. Vérification de la signature (HMAC).
    *   **API Prévues :**
        *   `POST /api/webhooks/github` : Réception des événements `pull_request`.

### 3.2 Dashboard & Analytique
*Priorité : Moyenne*

*   **Métriques de Productivité**
    *   **Fonctionnalité :** Calcul de la vélocité (cartes complétées / semaine) et temps de cycle.
    *   **Implémentation Technique :** Agrégation SQL complexe sur la table `Activity` (différence de temps entre création et passage à "Done").
    *   **API Prévues :**
        *   `GET /api/boards/[boardId]/analytics/velocity`
        *   `GET /api/boards/[boardId]/analytics/cycle-time`

*   **Visualisation Graphique**
    *   **Fonctionnalité :** Affichage de graphiques (Pie Charts, Bar Charts) dans un onglet dédié du board.
    *   **Librairie :** `Recharts` (React).
    *   **API Prévues :**
        *   `GET /api/boards/[boardId]/analytics/distribution` (Répartition par label/membre).

### 3.3 Expérience Power User
*Priorité : Basse*

*   **Recherche Globale (Command Palette)**
    *   **Fonctionnalité :** Modal `Ctrl+K` pour chercher cartes et boards instantanément.
    *   **Implémentation Technique :** Indexation simple via `ILike` (Postgres) ou mise en place d'un index Full-Text Search (tsvector).
    *   **API Prévues :**
        *   `GET /api/search?q={query}` : Retourne cartes et boards matchant la requête.

*   **Filtres Avancés**
    *   **Fonctionnalité :** Filtrage dynamique du board sans rechargement.
    *   **Implémentation Technique :** Gestion d'état local (Frontend) + Query Params URL pour partage.
    *   **Pas de nouvelle API nécessaire** (Filtrage côté client sur les données déjà chargées).

### 3.4 DevOps & Qualité
*Priorité : Continue*

*   **CI/CD Pipeline**
    *   **Fonctionnalité :** Tests automatiques à chaque push.
    *   **Fichiers :** `.github/workflows/ci.yml`
    *   **Étapes :** `npm install`, `npm run lint`, `npm run build`, `npm run test`.

*   **Tests E2E**
    *   **Fonctionnalité :** Simulation parcours utilisateur critique.
    *   **Framework :** Playwright.
    *   **Scénarios :** Login, Création Board, DnD Carte.

*   **Conteneurisation**
    *   **Fonctionnalité :** Déploiement portable.
    *   **Fichier :** `Dockerfile`
    *   **Stratégie :** Multi-stage build (Builder vs Runner) pour image légère (Alpine).
