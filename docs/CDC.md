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

## 2. Spécifications Fonctionnelles Détaillées

### 2.1 Authentification & Comptes Utilisateurs
*État : Implémenté*

L'accès à l'application est sécurisé et nécessite un compte utilisateur.

*   **Inscription (Register) :**
    *   Formulaire : Nom, Email, Mot de passe.
    *   Validation : Unicité de l'email, complexité minimale du mot de passe.
    *   Sécurité : Hashage des mots de passe via `bcrypt` avant stockage.
*   **Connexion (Login) :**
    *   Méthode : Email / Mot de passe (Credentials Provider).
    *   Session : Gestion via JWT (JSON Web Tokens) sécurisés (HttpOnly cookies).
*   **Gestion de Profil :**
    *   **Avatar :** Upload d'une image de profil (stockage local `public/uploads/profiles`).
    *   **Informations :** Modification du Nom, Email.
    *   **Sécurité :** Changement de mot de passe (vérification de l'ancien mot de passe requise).

### 2.2 Structure Organisationnelle (Workspaces)
*État : Implémenté*

L'application est structurée de manière hiérarchique pour organiser les projets.

*   **Espaces de Travail (Tableaux Globaux) :**
    *   Entité parente regroupant plusieurs projets ("Boards").
    *   **Champs :** Titre, Description, Date de création.
    *   **Actions :** Créer, Renommer, Supprimer un espace de travail.
    *   **Vue Liste :** Affichage des espaces avec le nombre de boards associés.
*   **Projets (Boards) :**
    *   Conteneur principal des tâches.
    *   **Création :** Nécessite un Titre et un lien vers un Espace de Travail parent.
    *   **Initialisation :** Création automatique des listes par défaut ("To Do", "Doing", "Done").
    *   **Membres :** Gestion des permissions (Propriétaire / Invité).

### 2.3 Gestion des Tâches (Kanban)
*État : Implémenté*

Le cœur de l'application repose sur une interface fluide et réactive.

*   **Listes (Colonnes) :**
    *   Conteneurs verticaux pour les cartes.
    *   **Actions :** Ajouter une liste, Renommer (Double-clic ou Menu), Supprimer, Réordonner (DnD horizontal).
*   **Cartes (Tâches) :**
    *   Unités de travail individuelles.
    *   **Actions Rapides (Vue Board) :**
        *   Création rapide (Titre uniquement).
        *   Réordonnancement vertical (au sein d'une liste).
        *   Transfert (d'une liste à une autre).
        *   Menu contextuel : Renommer, Supprimer, Modifier.
    *   **Indicateurs Visuels :** Badges pour Description, Commentaires, Pièces jointes, Membres assignés.

### 2.4 Détails d'une Carte (Modale d'Édition)
*État : Implémenté*

Lorsqu'une carte est ouverte, une modale complète permet d'enrichir le contenu.

*   **En-tête :**
    *   **Titre :** Éditable en place.
    *   **Fil d'Ariane :** Rappel de la liste et du board d'appartenance.
*   **Description Riche :**
    *   Zone de texte multiligne pour spécifier le besoin.
    *   Support du formatage (texte brut pour l'instant, Markdown prévu).
*   **Système d'Étiquettes (Labels) :**
    *   Création de labels personnalisés (Nom + Couleur).
    *   Assignation multiple par carte.
    *   Gestion des contrastes (texte blanc/noir automatique selon la couleur de fond).
*   **Membres Assignés :**
    *   Sélecteur de membres (parmi les membres du board).
    *   Affichage des avatars des assignés.
*   **Checklists (Sous-tâches) :**
    *   Création de multiples checklists nommées.
    *   Ajout d'items avec cases à cocher.
    *   Barre de progression visuelle (% d'avancement).
    *   Suppression d'items ou de la checklist entière.
*   **Pièces Jointes (Cover) :**
    *   Upload d'image de couverture (Drag & Drop ou Sélecteur).
    *   Affichage en en-tête de la modale et sur la miniature dans le board.
    *   Support : JPEG, PNG, GIF, WEBP (Max 5MB).
*   **Dates & Échéances :** *(En cours de finalisation)*
    *   Sélection d'une date de fin (Due Date).
    *   Indicateur couleur selon l'urgence (Bientôt, En retard, Complété).
*   **Commentaires & Activités :**
    *   **Fil de discussion :** Ajout de commentaires, Édition, Suppression.
    *   **Audit Trail :** Log automatique des actions (ex: "Rob a déplacé la carte dans Done").

---

## 3. Fonctionnalités à Venir (Roadmap)

### 3.1 Intégration GitHub Avancée
*Priorité : Haute*
*   **Liaison de Compte :** OAuth GitHub dans les paramètres utilisateur.
*   **Pull Requests :** Champ dédié pour lier une URL de PR à une carte.
*   **Automatisation :** Webhooks pour déplacer automatiquement une carte (ex: "Doing" -> "Done") lors du merge d'une PR liée.

### 3.2 Dashboard & Analytique
*Priorité : Moyenne*
*   **Métriques :** Vélocité de l'équipe, Temps moyen de résolution.
*   **Visualisation :** Graphiques (Pie charts des labels, Burn-down charts) via `Recharts`.

### 3.3 Expérience Power User
*Priorité : Basse*
*   **Recherche Globale (Ctrl+K) :** Recherche full-text traversant tous les boards.
*   **Filtres Avancés :** Filtrer le board par Membre, Label ou Date.

### 3.4 DevOps & Qualité
*Priorité : Continue*
*   **CI/CD :** Pipeline GitHub Actions pour tests et linting.
*   **Tests E2E :** Scénarios critiques via Playwright.
*   **Conteneurisation :** Dockerfile optimisé pour le déploiement.
