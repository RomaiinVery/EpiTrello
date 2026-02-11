# Configuration CI/CD - EpiTrello

## 🚀 Configuration Rapide

### 1️⃣ Configurer les Secrets GitHub

Allez dans **Settings → Secrets and variables → Actions** de votre repository et ajoutez :

#### Secrets Obligatoires :
```
NEXTAUTH_SECRET          # Générez avec: openssl rand -base64 32
CODECOV_TOKEN           # Depuis https://codecov.io (optionnel pour repos publics)
```

#### Secrets pour Tests E2E (optionnels mais recommandés) :
```
CLOUDINARY_CLOUD_NAME   # Votre compte Cloudinary
CLOUDINARY_API_KEY      # API Key Cloudinary
CLOUDINARY_API_SECRET   # API Secret Cloudinary
EMAIL_USER              # Email pour les tests
EMAIL_PASSWORD          # Mot de passe email
GITHUB_ID               # GitHub OAuth App ID
GITHUB_SECRET           # GitHub OAuth App Secret
```

---

### 2️⃣ Configurer Codecov (Optionnel)

1. Allez sur https://codecov.io
2. Connectez votre repository GitHub
3. Copiez le `CODECOV_TOKEN`
4. Ajoutez-le dans les secrets GitHub

**Note** : Pour les repositories publics, le token n'est pas obligatoire.

---

## 📊 Workflows CI

### Workflow Principal (`ci.yml`)

Se déclenche sur :
- Push vers `main` ou `develop`
- Pull Requests vers `main` ou `develop`

**4 Jobs en parallèle** :

#### 1. **Unit Tests & Coverage** ✅
- Exécute : `npm run test:coverage`
- Upload vers Codecov
- Génère un rapport HTML
- Seuils : 82% lines, 77% functions, 80% branches, 82% statements

#### 2. **E2E Tests** 🎭
- Lance une base de données PostgreSQL
- Build l'application
- Exécute les tests Playwright
- Timeout : 20 minutes

#### 3. **Build Check** 🏗️
- Vérifie que l'application build sans erreur
- Génère le client Prisma

#### 4. **Lint** 🔍
- Vérifie le code avec ESLint
- `continue-on-error: true` (ne bloque pas la CI)

---

## 🎯 Seuils de Coverage

### Configuration Actuelle

| Métrique | Seuil Vitest | Seuil Codecov | Tolérance |
|----------|--------------|---------------|-----------|
| Lines | 82% | 82% | ±2% |
| Functions | 77% | - | - |
| Branches | 80% | - | - |
| Statements | 82% | - | - |

### Augmenter les Seuils

Pour augmenter progressivement vers 90% :

**1. Modifier `vitest.config.ts`** :
```typescript
thresholds: {
  lines: 85,      // +3%
  functions: 80,  // +3%
  branches: 83,   // +3%
  statements: 85, // +3%
}
```

**2. Modifier `codecov.yml`** :
```yaml
coverage:
  status:
    project:
      default:
        target: 85%  # Nouvelle cible
```

**3. Ajouter plus de tests** :
```bash
npm run test:coverage
open coverage/index.html  # Identifier les zones non couvertes
```

---

## 🔧 Commandes Locales

Avant de push, testez localement :

```bash
# Tous les tests (comme la CI)
npm run test:all

# Coverage uniquement
npm run test:coverage

# Voir le rapport HTML
npm run test:coverage:open

# Tests E2E
npm run test:e2e
```

---

## 🛡️ Protection des Branches

Recommandé pour `main` :

1. **Settings → Branches → Add rule**
2. Branch name pattern : `main`
3. ✅ Require status checks to pass
   - ✅ Unit Tests & Coverage
   - ✅ E2E Tests
   - ✅ Build Check
4. ✅ Require branches to be up to date

---

## 📈 Badges pour README

Ajoutez dans votre `README.md` :

```markdown
[![CI](https://github.com/VOTRE-USERNAME/EpiTrello/actions/workflows/ci.yml/badge.svg)](https://github.com/VOTRE-USERNAME/EpiTrello/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/VOTRE-USERNAME/EpiTrello/branch/main/graph/badge.svg)](https://codecov.io/gh/VOTRE-USERNAME/EpiTrello)
[![Tests](https://img.shields.io/badge/tests-727%20passing-success)](https://github.com/VOTRE-USERNAME/EpiTrello)
[![Coverage](https://img.shields.io/badge/coverage-82%25-green)](https://github.com/VOTRE-USERNAME/EpiTrello)
```

---

## 🐛 Debugging

### La CI échoue sur les tests unitaires ?

```bash
# Reproduire localement
npm run test:coverage

# Vérifier les variables d'environnement
cat vitest.setup.ts
```

### La CI échoue sur les tests E2E ?

```bash
# Installer Playwright
npx playwright install --with-deps

# Lancer en mode headed
npm run test:e2e:headed

# Voir le rapport
npx playwright show-report
```

### Le coverage baisse ?

```bash
# Voir le rapport détaillé
npm run test:coverage:open

# Identifier les fichiers avec faible coverage
npm run test:coverage | grep -E "^\s+\w.*\s+[0-7][0-9]"
```

---

## ⚡ Optimisations

### Cache NPM
Déjà configuré avec `cache: 'npm'` dans le workflow.

### Parallélisation
Les 4 jobs s'exécutent en parallèle pour gagner du temps.

### Timeout E2E
Limité à 20 minutes pour éviter les jobs qui bloquent.

---

## 📝 Checklist Avant de Push

- [ ] `npm run test:coverage` passe ✅
- [ ] `npm run test:e2e` passe ✅
- [ ] `npm run build` fonctionne ✅
- [ ] Coverage ≥ 82% ✅
- [ ] Pas de secrets dans le code ✅

---

## 🆘 Support

En cas de problème :
1. Vérifier les logs dans **Actions → Workflow → Job**
2. Reproduire localement avec `npm run test:all`
3. Vérifier les variables d'environnement dans les secrets GitHub
