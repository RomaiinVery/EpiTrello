# Cahier des Charges Technique — EpiTrello

## 1. Contexte & Planning

**Projet :** EpiTrello (Clone Trello avec fonctionnalités Developer-First)  
**Durée :** 5 mois (1er Septembre — 31 Janvier)  
**Équipe :** 2 Développeurs  
**Rythme :** 3 jours / semaine  
**Capacité Totale Estimée :** ~130 Jours-Hommes (J/H)

---

## 2. Listes de fonctionalités

### 🔐 Auth & Gestion Utilisateur (15 J/H)
- [x] **Auth System (NextAuth v5) :** Login, Register, Gestion de session sécurisée (JWT).
- [x] **Sécurité :** Middleware de protection des routes, Hashage des mots de passe.
- [x] **Profil Utilisateur :** Changement d'avatar, mise à jour email/nom/timezone.
- [x] **Modification Mot de Passe :** Formulaire sécurisé (Ancien vs Nouveau) avec validation. 
- [x] **Préférences :** Gestion des notifications (Email/Push toggles).

### 🏛️ Architecture & Boards (20 J/H)
- [x] **Modélisation Données :** Schéma Prisma complexe (User <-> Board <-> List <-> Card).
- [x] **Workspaces (Tableaux) :** Regroupement hiérarchique des projets.
- [x] **CRUD Boards :** Création, modification, suppression et description des projets.
- [x] **Système de Membres :** Logique backend pour les relations Many-to-Many (Invitations).
- [x] **Navigation :** Sidebar dynamique contextuelle.

### ⚡ Cœur Interactif (Listes & DnD) (15 J/H)
- [x] **Gestion des Listes :** Création et édition rapide des colonnes.
- [x] **Drag & Drop Listes :** Réorganisation horizontale via `@dnd-kit`.
- [x] **Drag & Drop Cartes :** Déplacement vertical et transfert entre listes.
- [x] **Persistance :** Algorithme de recalcul des positions en base de données.
- [x] **Optimistic UI :** Feedback visuel immédiat pour une UX fluide.

### 🗂️ Détails & Contenu Riche (20 J/H)
- [x] **Modale Carte :** Interface détaillée d'édition.
- [x] **Édition In-Place :** Modification rapide du titre et description riche (multiligne).
- [x] **Système de Labels :** Création, gestion des couleurs et assignation aux cartes.
- [x] **Membres Assignés :** Liaison des utilisateurs aux tâches spécifiques.
- [x] **Cover Images :** Upload et affichage d'images de couverture (stockage local).

### 💬 Collaboration & Suivi (20 J/H)
- [x] **Checklists Avancées :** Sous-tâches avec états (coché/décoché) et persistance.
- [x] **Fil de Commentaires :** Discussion chronologique, édition et suppression.
- [x] **Journal d'Activités :** Logs automatiques ("Audit Trail") des actions sur la carte.
- [x] **Indicateurs Visuels :** Badges de progression (Checklist, Pièces jointes) sur la vue board.

### 🐙 Intégration GitHub Avancée (12 J/H)
*Objectif : Lier le code à la gestion de projet.*
- [ ] **OAuth GitHub :** Connexion du compte GitHub dans les paramètres.
- [ ] **Liaison PR <-> Carte :** Champ de saisie pour lier une Pull Request à une carte via l'API GitHub.
- [ ] **Webhooks Handler :** Endpoint API pour écouter les événements GitHub (`pull_request.merged`).
- [ ] **Automatisation (Sync) :** Déplacement automatique de la carte dans "Done" lors du merge d'une PR.

### 📊 Dashboard Analytique (10 J/H)
*Objectif : Visualisation de la productivité (Data Viz).*
- [ ] **Agrégation Backend :** Requêtes SQL complexes (GroupBy) pour calculer la vélocité.
- [ ] **Composants Graphiques :** Intégration de `Recharts` (Bar charts, Pie charts).
- [ ] **Page Analytics :** Vue dédiée par Board (Répartition des tâches par membre/label).

### 🔍 Expérience Power User (8 J/H)
*Objectif : Navigation rapide et efficacité.*
- [ ] **Recherche Globale :** Indexation et recherche full-text des cartes (Titre/Description).
- [ ] **Command Palette :** Interface type `Ctrl+K` pour navigation rapide entre boards.
- [ ] **Actions Rapides :** Création de tâche à la volée depuis la recherche.

### ⚙️ DevOps & Qualité (10 J/H)
*Objectif : Fiabilisation pour la mise en production.*
- [ ] **Dockerisation :** Création d'un `Dockerfile` optimisé (Multi-stage build).
- [ ] **CI Pipeline :** Github Actions pour Linting et Tests Unitaires.
- [ ] **Tests E2E :** Scénarios critiques (Login -> Create Board -> Move Card) via Playwright/Cypress.
