# Contributing to EpiTrello

Thank you for considering contributing to EpiTrello! This guide will help you get started.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)

---

## Code of Conduct

### Our Standards

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards others

### Unacceptable Behavior

- Harassment or discriminatory language
- Trolling or inflammatory comments
- Publishing private information
- Unprofessional conduct

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Git
- Code editor (VS Code recommended)

### Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/epitrello.git
cd epitrello

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/epitrello.git
```

### Install Dependencies

```bash
npm install
```

### Setup Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your credentials
```

### Setup Database

```bash
# Create database
createdb epitrello

# Run migrations
npx prisma migrate dev

# (Optional) Seed with test data
npx prisma db seed
```

### Run Development Server

```bash
npm run dev
```

---

## Development Workflow

### 1. Create a Branch

```bash
# Update main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name

# Or bug fix branch
git checkout -b fix/bug-description
```

### Branch Naming Convention

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/updates
- `chore/` - Maintenance tasks

Examples:
- `feature/add-card-templates`
- `fix/drag-drop-mobile-bug`
- `docs/update-api-docs`

### 2. Make Changes

- Write clean, readable code
- Follow coding standards (see below)
- Add tests for new features
- Update documentation if needed

### 3. Commit Changes

```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add card template feature"
```

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting (no code change)
- `refactor` - Code restructuring
- `test` - Adding tests
- `chore` - Maintenance

**Examples:**
```
feat(cards): add cover image upload
fix(auth): resolve login redirect issue
docs(api): update endpoint documentation
refactor(board): simplify drag-drop logic
test(cards): add unit tests for card actions
```

### 4. Push Changes

```bash
git push origin feature/your-feature-name
```

### 5. Create Pull Request

1. Go to your fork on GitHub
2. Click "Compare & pull request"
3. Fill out PR template
4. Link related issues
5. Wait for review

---

## Coding Standards

### TypeScript

- **Use TypeScript** for all new code
- **Explicit types** over `any`
- **Interface** over `type` for objects
- **Proper null checks**

```typescript
// Good
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): User | null {
  return users.find(u => u.id === id) ?? null;
}

// Bad
function getUser(id: any): any {
  return users.find(u => u.id === id);
}
```

### React Components

- **Functional components** with hooks
- **Named exports** for clarity
- **Props interface** for all components
- **Keep components small** (< 200 lines)

```typescript
// Good
interface CardProps {
  card: Card;
  onUpdate: (card: Card) => void;
}

export function CardItem({ card, onUpdate }: CardProps) {
  // Component logic
}

// Bad
export default function Card(props: any) {
  // Component logic
}
```

### File Naming

- **Components**: PascalCase (`CardItem.tsx`)
- **Utilities**: camelCase (`formatDate.ts`)
- **API routes**: kebab-case (`forgot-password/route.ts`)

### Code Organization

```typescript
// 1. Imports (external first, then internal)
import { useState } from 'react';
import { Card } from '@/types';

// 2. Type/Interface definitions
interface Props {
  // ...
}

// 3. Component or function
export function MyComponent({ props }: Props) {
  // 4. Hooks
  const [state, setState] = useState();

  // 5. Event handlers
  const handleClick = () => {
    // ...
  };

  // 6. Render helpers
  const renderContent = () => {
    // ...
  };

  // 7. Return JSX
  return (
    <div>{/* ... */}</div>
  );
}
```

### ESLint

Follow ESLint rules:

```bash
# Lint code
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

### Styling

- **Tailwind CSS** for all styling
- **No inline styles** unless absolutely necessary
- **Use semantic class names**
- **Responsive design** (mobile-first)

```tsx
// Good
<div className="flex items-center gap-4 p-4 bg-gray-100 rounded-lg">
  <span className="text-lg font-semibold">{title}</span>
</div>

// Bad
<div style={{ display: 'flex', padding: '16px' }}>
  <span style={{ fontSize: '18px' }}>{title}</span>
</div>
```

---

## Testing Guidelines

### Unit Tests (Vitest)

- Test all utility functions
- Test complex business logic
- Mock external dependencies

```typescript
import { describe, it, expect, vi } from 'vitest';
import { calculateProgress } from './checklist-utils';

describe('calculateProgress', () => {
  it('should return 0 for empty checklist', () => {
    expect(calculateProgress([])).toBe(0);
  });

  it('should calculate percentage correctly', () => {
    const items = [
      { checked: true },
      { checked: true },
      { checked: false },
      { checked: false }
    ];
    expect(calculateProgress(items)).toBe(50);
  });
});
```

### Component Tests

- Test rendering
- Test user interactions
- Test conditional rendering

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { CardItem } from './CardItem';

describe('CardItem', () => {
  it('should render card title', () => {
    render(<CardItem card={{ title: 'Test Card' }} />);
    expect(screen.getByText('Test Card')).toBeInTheDocument();
  });

  it('should call onUpdate when clicked', () => {
    const onUpdate = vi.fn();
    render(<CardItem card={{ id: '1' }} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onUpdate).toHaveBeenCalled();
  });
});
```

### E2E Tests (Playwright)

- Test critical user flows
- Test across browsers
- Keep tests deterministic

```typescript
import { test, expect } from '@playwright/test';

test('user can create a board', async ({ page }) => {
  await page.goto('/dashboard');
  await page.click('text=Create Board');
  await page.fill('input[name="title"]', 'Test Board');
  await page.click('button:has-text("Create")');

  await expect(page.locator('text=Test Board')).toBeVisible();
});
```

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

### Test Coverage

- Aim for > 80% coverage
- Focus on critical paths
- Don't test external libraries

---

## Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Tests added/updated
- [ ] Tests passing
- [ ] Documentation updated
- [ ] No console errors
- [ ] Branch up to date with main

### PR Title Format

Follow commit message format:

```
feat(scope): add new feature
fix(scope): resolve bug
```

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Fixes #123

## Testing
How to test these changes

## Screenshots (if applicable)
Add screenshots

## Checklist
- [ ] Tests pass
- [ ] Code reviewed
- [ ] Documentation updated
```

### Review Process

1. **Automated checks** run (tests, lint)
2. **Manual review** by maintainers
3. **Requested changes** (if needed)
4. **Approval** from 1+ maintainers
5. **Merge** to main branch

### After Merge

- Delete your feature branch
- Update your fork:
```bash
git checkout main
git pull upstream main
git push origin main
```

---

## Project Structure

```
epitrello/
├── src/
│   ├── app/              # Next.js pages and API routes
│   ├── components/       # React components
│   ├── hooks/           # Custom hooks
│   ├── lib/             # Utilities
│   └── types/           # TypeScript types
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── migrations/      # Database migrations
├── tests/
│   ├── unit/           # Unit tests
│   └── e2e/            # E2E tests
├── public/             # Static assets
└── docs/               # Documentation
```

### Adding New Features

1. **Backend** (if needed):
   - Update Prisma schema
   - Create migration
   - Add API route
   - Add validation

2. **Frontend**:
   - Create components
   - Add hooks
   - Update UI

3. **Tests**:
   - Unit tests
   - Component tests
   - E2E tests

4. **Documentation**:
   - Update API docs
   - Update user docs
   - Add code comments

---

## Common Issues

### Database Connection Error

```bash
# Check PostgreSQL is running
pg_ctl status

# Reset database
npx prisma migrate reset
```

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### TypeScript Errors

```bash
# Regenerate Prisma client
npx prisma generate

# Restart TS server in VS Code
Cmd+Shift+P → "TypeScript: Restart TS Server"
```

---

## Getting Help

- **Documentation**: Check [docs/](../docs/)
- **GitHub Issues**: Search existing issues
- **Discussions**: Ask questions in GitHub Discussions
- **Discord**: Join our Discord server (if available)

---

## Recognition

Contributors will be recognized in:
- GitHub contributors page
- Release notes
- CONTRIBUTORS.md file

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to EpiTrello!
