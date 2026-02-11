# Guide de Test - EpiTrello

Ce guide explique comment exécuter et maintenir les tests pour EpiTrello.

## Table des Matières

- [Prérequis](#prérequis)
- [Installation](#installation)
- [Exécution des Tests](#exécution-des-tests)
- [Structure des Tests](#structure-des-tests)
- [Écrire de Nouveaux Tests](#écrire-de-nouveaux-tests)
- [CI/CD](#cicd)
- [Troubleshooting](#troubleshooting)

## Prérequis

- Node.js 20+
- npm 10+

## Installation

Les dépendances de test sont déjà installées. Si ce n'est pas le cas :

```bash
npm install
```

## Exécution des Tests

### Tests Unitaires

```bash
# Exécuter tous les tests unitaires
npm run test

# Mode watch (re-exécution automatique)
npm run test:watch

# Interface UI interactive
npm run test:ui
```

### Tests avec Couverture

```bash
# Générer le rapport de couverture
npm run test:coverage

# Ouvrir le rapport HTML
open coverage/index.html
```

### Tests End-to-End

```bash
# Exécuter les tests E2E (headless)
npm run test:e2e

# Mode UI (debugger interactif)
npm run test:e2e:ui

# Avec navigateur visible
npm run test:e2e:headed
```

### Tous les Tests

```bash
# Exécuter unitaires + E2E
npm run test:all
```

## Structure des Tests

```
tests/
├── unit/              # Tests unitaires
│   ├── activity-logger.test.ts
│   └── board-utils.test.ts
├── integration/       # Tests d'intégration (à venir)
└── e2e/              # Tests end-to-end
    ├── auth.spec.ts
    └── board-navigation.spec.ts

coverage/             # Rapports de couverture (généré)
playwright-report/    # Rapports E2E (généré)
```

## Écrire de Nouveaux Tests

### Test Unitaire

Créer un fichier `tests/unit/<nom>.test.ts` :

```typescript
import { describe, it, expect, vi } from 'vitest';
import { myFunction } from '@/app/lib/my-module';

describe('My Module', () => {
  it('should do something', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });
});
```

### Test E2E

Créer un fichier `tests/e2e/<nom>.spec.ts` :

```typescript
import { test, expect } from '@playwright/test';

test('should perform action', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
});
```

## Mocking

### Prisma

```typescript
vi.mock('@/app/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));
```

### Next.js Router

```typescript
// Déjà configuré dans vitest.setup.ts
import { useRouter } from 'next/navigation';
// Le router est automatiquement mocké
```

## CI/CD

Les tests s'exécutent automatiquement sur GitHub Actions :

- ✅ Tests unitaires + couverture
- ✅ Tests E2E
- ✅ Build de production

Les rapports sont disponibles en tant qu'artifacts pendant 30 jours.

## Troubleshooting

### Les tests Playwright échouent

```bash
# Réinstaller les navigateurs
npx playwright install --with-deps
```

### Erreur "Cannot find module"

```bash
# Nettoyer et réinstaller
rm -rf node_modules package-lock.json
npm install
```

### Tests lents

- Utiliser `test.only()` pour exécuter un seul test
- Désactiver les tests E2E pendant le développement
- Utiliser `npm run test:watch` pour les tests incrémentaux

## Bonnes Pratiques

1. **Toujours écrire des tests pour les nouvelles fonctionnalités**
2. **Garder les tests simples et lisibles**
3. **Un test = un concept testé**
4. **Utiliser des noms de test descriptifs**
5. **Éviter les dépendances entre tests**
6. **Mock les dépendances externes (API, DB)**

## Ressources

- [Documentation Vitest](https://vitest.dev/)
- [Documentation Playwright](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
