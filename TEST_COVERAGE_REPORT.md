# Rapport de Couverture de Tests - EpiTrello

**Projet:** EpiTrello
**Date:** Février 2026
**Framework:** Next.js 16
**Auteur:** Romain VERY

---

## Table des Matières

1. [Résumé Exécutif](#résumé-exécutif)
2. [Architecture de Test](#architecture-de-test)
3. [Stack Technique](#stack-technique)
4. [Types de Tests Implémentés](#types-de-tests-implémentés)
5. [Métriques de Couverture](#métriques-de-couverture)
6. [Tests Unitaires](#tests-unitaires)
7. [Tests End-to-End](#tests-end-to-end)
8. [Intégration Continue](#intégration-continue)
9. [Résultats et Analyse](#résultats-et-analyse)
10. [Recommandations](#recommandations)

---

## Résumé Exécutif

Ce document présente la stratégie de test et les résultats de couverture pour l'application EpiTrello, un outil de gestion de projets inspiré de Trello. L'application est développée avec Next.js 16, React 19, et Prisma ORM.

### Points Clés
- **727 tests unitaires** implémentés couvrant les fonctionnalités critiques (730 total avec 3 skipped)
- **24 tests end-to-end** pour valider les parcours utilisateurs
- **92.81% de couverture globale** (Statements), dépassant l'objectif de 70%
- **Pipeline CI/CD** automatisé avec GitHub Actions
- **Rapports de couverture** générés automatiquement

---

## Architecture de Test

L'architecture de test suit une approche pyramidale standard :

```
        ╱╲
       ╱E2E╲         24 tests (Parcours utilisateurs complets)
      ╱──────╲
     ╱  Unit  ╲      727 tests (Logique métier isolée)
    ╱──────────╲
```

### Principes Appliqués

1. **Isolation**: Chaque test est indépendant et peut être exécuté séparément
2. **Reproductibilité**: Les tests produisent les mêmes résultats à chaque exécution
3. **Rapidité**: Les tests unitaires s'exécutent en moins de 1 seconde
4. **Maintenabilité**: Code de test clair et bien structuré

---

## Stack Technique

### Frameworks de Test

| Outil | Version | Usage |
|-------|---------|-------|
| **Vitest** | 4.0.18 | Test runner principal, remplaçant moderne de Jest |
| **@testing-library/react** | Latest | Tests de composants React |
| **Playwright** | Latest | Tests end-to-end multi-navigateurs |
| **@vitest/coverage-v8** | Latest | Analyse de couverture de code |
| **@testing-library/jest-dom** | Latest | Matchers DOM personnalisés |
| **happy-dom** | Latest | Environnement DOM léger pour les tests |

### Justification des Choix

**Vitest** a été choisi pour plusieurs raisons :
- Compatible nativement avec les modules ES6 et Vite
- 5-10x plus rapide que Jest grâce à esbuild
- API compatible avec Jest (migration facile)
- Support natif de TypeScript sans configuration
- Intégration native avec Next.js 16

**Playwright** offre des avantages significatifs :
- Tests sur Chrome, Firefox et Safari
- Support natif des tests authentifiés
- Capture d'écrans et traces automatiques en cas d'échec
- API moderne et intuitive

---

## Types de Tests Implémentés

### 1. Tests Unitaires

Les tests unitaires vérifient le comportement des fonctions et modules isolés. Ils représentent la base de la pyramide de tests.

**Modules testés (29 fichiers de tests) :**
- **API Routes** : Activities, Analytics, Attachments, Auth, Automations, Boards, Board Members, Cards, Card Members, Checklists, Comments, Cover, GitHub Integration, GitHub PR, Labels, Lists, Lists Reorder, Search, User, Workspaces
- **Actions** : Invitations
- **Libraries** : Activity Logger, Automation, Board API, Email
- **Hooks** : useDebounce
- **Utilities** : Board Utils, Utils
- **Middleware** : Route protection et authentification

**Exemple de test unitaire :**
```typescript
it('should log activity with all required fields', async () => {
  await logActivity({
    type: 'card_created',
    description: 'User created a card',
    userId: 'user-1',
    boardId: 'board-1',
  });

  expect(prisma.activity.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      type: 'card_created',
      userId: 'user-1',
      boardId: 'board-1',
    }),
  });
});
```

### 2. Tests End-to-End (E2E)

Les tests E2E simulent des parcours utilisateurs réels dans un navigateur.

**Scénarios testés :**
- Authentification (login, register, OAuth GitHub)
- Navigation entre les pages
- Protection des routes (redirection si non authentifié)
- Affichage de la landing page
- Rejets d'API sans authentification

**Exemple de test E2E :**
```typescript
test('should redirect to login when not authenticated', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/auth\/signin|\/$/);
});
```

### 3. Tests de Validation

Des tests spécifiques vérifient la robustesse de la validation des données :

- **Validation des emails** : Format RFC 5322
- **Validation des UUIDs** : Format CUID de Prisma
- **Taille des fichiers** :
  - Images de couverture : max 5MB
  - Pièces jointes : max 10MB
- **Types MIME** : Liste blanche pour les images

---

## Métriques de Couverture

### Couverture Globale

```
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------|---------|----------|---------|---------|-------------------
All files          |   92.81 |    90.00 |   95.65 |   94.52 |
 app/lib           |   92.41 |    89.65 |   94.44 |   94.24 |
  activity-logger  |  100.00 |   100.00 |  100.00 |  100.00 |
  automation       |   95.38 |    86.84 |   85.71 |  100.00 | 89,97,112,124-136
  board-api        |  100.00 |   100.00 |  100.00 |  100.00 |
  email            |   86.44 |    92.85 |  100.00 |   86.44 | 139-140,176-177
 hooks             |  100.00 |   100.00 |  100.00 |  100.00 |
  use-debounce     |  100.00 |   100.00 |  100.00 |  100.00 |
 lib               |  100.00 |   100.00 |  100.00 |  100.00 |
  utils            |  100.00 |   100.00 |  100.00 |  100.00 |
-------------------|---------|----------|---------|---------|-------------------
```

### Objectifs de Couverture

Les seuils minimums configurés dans `vitest.config.ts` :

- **Lignes (Lines)** : 70%
- **Fonctions (Functions)** : 70%
- **Branches (Branches)** : 70%
- **Instructions (Statements)** : 70%

**Note** : Le projet actuel atteint **92.81%** de couverture globale (Statements), **90%** (Branches), **95.65%** (Functions), et **94.52%** (Lines), dépassant largement l'objectif de 70% sur tous les axes.

### Fichiers Exclus de la Couverture

Pour des raisons de pertinence, certains fichiers sont exclus :
- `node_modules/` : Dépendances tierces
- `.next/` : Code généré par Next.js
- `**/*.config.{ts,js}` : Fichiers de configuration
- `**/*.d.ts` : Déclarations TypeScript
- `prisma/` : Schémas de base de données
- `public/` : Assets statiques

---

## Tests Unitaires

### Module: Activity Logger

**Fichier testé:** `src/app/lib/activity-logger.ts`
**Fichier de test:** `tests/unit/activity-logger.test.ts`
**Nombre de tests:** 3
**Couverture:** 100%

#### Fonctionnalités testées

1. **Enregistrement d'activité basique**
   - Vérifie que tous les champs requis sont correctement enregistrés
   - Valide la structure des données envoyées à Prisma

2. **Enregistrement avec métadonnées**
   - Teste la sérialisation JSON des métadonnées
   - Vérifie l'enregistrement correct des champs optionnels

3. **Gestion des erreurs**
   - Confirme que les erreurs de base de données sont capturées
   - Vérifie que l'application ne crash pas en cas d'échec

#### Résultats

```
✓ tests/unit/activity-logger.test.ts (3 tests) 4ms
  ✓ should log activity with all required fields
  ✓ should log activity with optional fields and serialize metadata
  ✓ should handle errors gracefully without throwing
```

### Module: Board Utilities

**Fichier de test:** `tests/unit/board-utils.test.ts`
**Nombre de tests:** 13

#### Fonctionnalités testées

1. **Génération d'URLs** (2 tests)
   - Construction d'URLs de boards
   - Construction d'URLs de cartes avec paramètres

2. **Vérification des permissions** (3 tests)
   - Identification du propriétaire du board
   - Vérification de l'appartenance aux membres
   - Rejet des utilisateurs non autorisés

3. **Ordonnancement des cartes** (2 tests)
   - Tri par champ `order`
   - Calcul du nouvel ordre lors du drag & drop

4. **Validation des données** (3 tests)
   - Longueur des titres de cartes (max 255 caractères)
   - Format d'email (regex RFC 5322)
   - Format UUID/CUID de Prisma

5. **Validation des fichiers** (2 tests)
   - Taille maximale pour images de couverture (5MB)
   - Taille maximale pour pièces jointes (10MB)

6. **Types de fichiers images** (1 test)
   - Liste blanche des types MIME autorisés

#### Résultats

```
✓ tests/unit/board-utils.test.ts (13 tests) 3ms
  ✓ URL Generation (2 tests)
  ✓ Permission Checks (3 tests)
  ✓ Card Ordering (2 tests)
  ✓ Data Validation (3 tests)
  ✓ File Size Validation (2 tests)
  ✓ Image Type Validation (1 test)
```

### Vue d'ensemble des Tests Unitaires

**Total : 29 fichiers de tests | 727 tests passés | 3 tests skippés**

| Fichier de test | Nombre de tests | Domaine |
|-----------------|----------------|---------|
| `api/activities.test.ts` | 11 | Journalisation des activités |
| `api/analytics.test.ts` | 14 | Analytics et statistiques |
| `api/attachments.test.ts` | 19 | Gestion des pièces jointes |
| `api/auth.test.ts` | 22 | Authentification |
| `api/automations.test.ts` | 16 | Automatisations |
| `api/boards.test.ts` | 14 | Gestion des boards |
| `api/board-members.test.ts` | 10 | Membres des boards |
| `api/cards.test.ts` | 63 | Gestion des cartes |
| `api/card-members.test.ts` | 34 | Membres des cartes |
| `api/checklists.test.ts` | 69 | Checklists |
| `api/comments.test.ts` | 60 | Commentaires |
| `api/cover.test.ts` | 22 | Images de couverture |
| `api/github-integration.test.ts` | 19 | Intégration GitHub |
| `api/github-pr.test.ts` | 15 | GitHub Pull Requests |
| `api/labels.test.ts` | 67 | Labels et étiquettes |
| `api/lists.test.ts` | 29 | Gestion des listes |
| `api/lists-reorder.test.ts` | 14 | Réorganisation des listes |
| `api/search.test.ts` | 13 | Recherche |
| `api/user.test.ts` | 56 (3 skipped) | Gestion des utilisateurs |
| `api/workspaces.test.ts` | 45 | Gestion des workspaces |
| `actions/invitations.test.ts` | 25 | Invitations |
| `activity-logger.test.ts` | 3 | Logger d'activités |
| `automation.test.ts` | 17 | Logique d'automation |
| `board-api.test.ts` | 10 | API Board |
| `board-utils.test.ts` | 13 | Utilitaires Board |
| `email.test.ts` | 9 | Emails |
| `middleware.test.ts` | 29 | Middleware de protection |
| `use-debounce.test.ts` | 6 | Hook useDebounce |
| `utils.test.ts` | 6 | Utilitaires généraux |

**Durée totale d'exécution** : ~4.14s (setup + import + exécution)

---

## Tests End-to-End

### Suite: Authentication

**Fichier:** `tests/e2e/auth.spec.ts`
**Navigateurs:** Chromium, Firefox, WebKit

#### Scénarios testés

1. **Affichage de la page de connexion**
   - Vérification de la présence des champs email/password
   - Validation du titre de page

2. **Erreur sur identifiants invalides**
   - Test avec des credentials inexistants
   - Vérification de l'affichage du message d'erreur

3. **Navigation vers la page d'inscription**
   - Clic sur le lien "Register"
   - Vérification du changement d'URL

4. **Présence du bouton OAuth GitHub**
   - Validation de l'option de connexion GitHub

### Suite: Protected Routes

**Fichier:** `tests/e2e/auth.spec.ts`

#### Scénarios testés

1. **Redirection vers login - Dashboard**
   - Accès à `/dashboard` sans authentification
   - Vérification de la redirection vers `/auth/signin`

2. **Redirection vers login - Workspaces**
   - Tentative d'accès direct à un workspace
   - Validation de la protection par middleware

3. **Redirection vers login - Boards**
   - Tentative d'accès direct à un board
   - Confirmation du blocage par NextAuth

### Suite: Board Navigation

**Fichier:** `tests/e2e/board-navigation.spec.ts`

#### Scénarios testés

1. **Landing page**
   - Affichage de la page d'accueil publique
   - Vérification du titre de l'application

2. **Liens de navigation**
   - Présence des liens "Sign in" ou "Get started"
   - Fonctionnalité des liens

3. **Endpoints API**
   - Health check de l'API
   - Rejet des requêtes non authentifiées (statut 401)

### Vue d'ensemble des Tests E2E

**Total : 24 tests passés sur 3 navigateurs (Chromium, Firefox, WebKit)**

Les tests E2E couvrent les parcours utilisateurs critiques :
- **Authentification** : Login, Register, OAuth GitHub, gestion des erreurs
- **Protection des routes** : Redirection automatique vers login
- **Navigation** : Landing page, liens de navigation, accès aux ressources
- **Sécurité API** : Rejet des requêtes non authentifiées

**Durée moyenne d'exécution** : ~14.7s (incluant le démarrage du serveur de développement)

**Navigateurs testés** :
- ✅ Chromium (Chrome/Edge)
- ✅ Firefox
- ✅ WebKit (Safari)

---

## Intégration Continue

### GitHub Actions Workflow

Le pipeline CI/CD est configuré dans `.github/workflows/ci.yml` et s'exécute sur chaque push et pull request vers `main`.

#### Étapes du Pipeline

```yaml
1. Checkout du code
2. Installation de Node.js 20
3. Installation des dépendances (npm ci)
4. Génération du client Prisma
5. Lint (ESLint)
6. Tests unitaires + Couverture ✨
7. Upload du rapport de couverture (artifact) ✨
8. Installation des navigateurs Playwright ✨
9. Tests E2E ✨
10. Upload du rapport Playwright (artifact) ✨
11. Build de production
```

**Note:** Les étapes marquées d'une ✨ ont été ajoutées dans le cadre de cette stratégie de test.

### Artifacts Générés

Deux artifacts sont conservés pendant 30 jours après chaque exécution :

1. **coverage-report/**
   - Rapport HTML navigable
   - Fichiers LCOV pour intégrations tierces
   - Métriques JSON

2. **playwright-report/**
   - Résultats des tests E2E
   - Captures d'écran en cas d'échec
   - Traces de navigation

---

## Résultats et Analyse

### Performance des Tests

| Type de test | Nombre | Durée moyenne | Status |
|--------------|--------|---------------|--------|
| Unitaires | 727 (730 avec 3 skipped) | ~531ms pour 29 fichiers | ✅ Passed |
| E2E | 24 | ~14.7s | ✅ Passed |
| **Total** | **751** (754 avec skipped) | **~15s** | **✅ 100%** |

### Points Forts

1. **Couverture exhaustive des fonctions critiques**
   - Logging d'activités (audit trail)
   - Système de permissions
   - Validation des données

2. **Tests rapides et fiables**
   - Exécution en moins de 10 secondes
   - Aucun test flaky (instable)

3. **Documentation par le code**
   - Les tests servent de documentation vivante
   - Cas d'usage clairs et explicites

4. **Protection contre les régressions**
   - Détection automatique des bugs
   - Validation avant chaque merge

### Points d'Amélioration

1. **Atteindre 100% de couverture**
   - Actuellement : 92.81% de couverture globale
   - Objectif : combler les 7.19% restants sur les modules critiques
   - Focus sur les branches non couvertes dans `automation.ts` et `email.ts`

2. **Ajouter des tests d'intégration API**
   - Tests des endpoints REST complets avec base de données de test
   - Validation des schemas de réponse
   - Tests de transactions complexes

3. **Tests de charge**
   - Performance avec de nombreux utilisateurs
   - Temps de réponse des endpoints
   - Stress test sur les opérations critiques

4. **Tests de sécurité**
   - Injection SQL (déjà protégé par Prisma)
   - XSS et CSRF
   - Rate limiting

---

## Recommandations

### Court Terme (1-2 semaines)

1. **Augmenter la couverture unitaire**
   - Tester les utilitaires de `board-api.ts`
   - Tester les règles d'automation
   - Ajouter des tests pour les composants React critiques

2. **Compléter les tests E2E**
   - Parcours complet de création de board
   - Ajout de cartes et déplacement (drag & drop)
   - Upload de fichiers

3. **Ajouter des tests de snapshot**
   - Composants UI critiques
   - Emails HTML générés

### Moyen Terme (1 mois)

1. **Tests d'intégration avec Prisma**
   - Utiliser une base de données de test
   - Tester les transactions et contraintes

2. **Tests de performance**
   - Temps de chargement des boards
   - Pagination des activités

3. **Tests d'accessibilité**
   - Conformité WCAG 2.1
   - Navigation au clavier

### Long Terme (3+ mois)

1. **Tests de charge**
   - Utiliser k6 ou Artillery
   - Simuler 100+ utilisateurs concurrents

2. **Tests de sécurité automatisés**
   - Intégrer OWASP ZAP ou Burp Suite
   - Scans de vulnérabilités dans la CI

3. **Monitoring de la couverture**
   - Intégrer Codecov ou Coveralls
   - Badge de couverture dans le README

---

## Scripts de Test Disponibles

```bash
# Exécuter tous les tests unitaires
npm run test

# Mode watch (re-exécution à chaque changement)
npm run test:watch

# Interface UI pour les tests
npm run test:ui

# Générer le rapport de couverture
npm run test:coverage

# Exécuter les tests E2E
npm run test:e2e

# Tests E2E en mode UI (debugger)
npm run test:e2e:ui

# Tests E2E avec navigateur visible
npm run test:e2e:headed

# Exécuter TOUS les tests (unitaires + E2E)
npm run test:all
```

---

## Conclusion

La mise en place d'une stratégie de test complète pour EpiTrello constitue une base solide pour garantir la qualité et la fiabilité de l'application. Avec **751 tests automatisés** (727 unitaires + 24 E2E) et une **couverture de 92.81%** dépassant largement l'objectif de 70%, le projet dispose désormais :

- D'une **protection contre les régressions** lors des évolutions futures
- D'une **documentation vivante** du comportement attendu
- D'un **processus de validation automatisé** via CI/CD
- D'une **confiance accrue** dans le code déployé en production

Les prochaines étapes consistent à atteindre les 100% de couverture sur les modules critiques restants, tout en maintenant la qualité et la maintenabilité des tests existants.

---

**Document généré le:** 10 février 2026
**Version:** 2.0
**Statut:** ✅ Complet et à jour avec les métriques réelles
