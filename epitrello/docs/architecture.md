# Architecture Overview

## Table of Contents
- [System Architecture](#system-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [Database Design](#database-design)
- [Authentication Flow](#authentication-flow)
- [Real-time Features](#real-time-features)

---

## System Architecture

EpiTrello follows a modern **monolithic architecture** with Next.js serving both frontend and backend:

```
┌─────────────────────────────────────────────┐
│           Client (Browser)                  │
│  ┌────────────────────────────────────────┐ │
│  │  React Components (Next.js App Router) │ │
│  │  - State Management (Jotai)            │ │
│  │  - Data Fetching (SWR)                 │ │
│  │  - UI (Tailwind + shadcn/ui)           │ │
│  └────────────────────────────────────────┘ │
└─────────────┬───────────────────────────────┘
              │ HTTP/WebSocket
┌─────────────▼───────────────────────────────┐
│         Next.js Server (Node.js)            │
│  ┌────────────────────────────────────────┐ │
│  │  API Routes (/api/*)                   │ │
│  │  - Authentication (NextAuth)           │ │
│  │  - Business Logic                      │ │
│  │  - Validation (Zod)                    │ │
│  └────────────┬───────────────────────────┘ │
└───────────────┼─────────────────────────────┘
                │
┌───────────────▼─────────────────────────────┐
│          Database Layer                     │
│  ┌────────────────────────────────────────┐ │
│  │  Prisma ORM                            │ │
│  │  PostgreSQL Database                   │ │
│  └────────────────────────────────────────┘ │
└───────────────┬─────────────────────────────┘
                │
┌───────────────▼─────────────────────────────┐
│       External Services                     │
│  - Cloudinary (file storage)                │
│  - Google Gemini (AI chatbot)               │
│  - GitHub API (integration)                 │
│  - SMTP (email notifications)               │
└─────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Component Structure

```
components/
├── ui/                    # Base UI components (shadcn/ui)
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   └── ...
├── board/                 # Board-specific components
│   ├── SettingsModal.tsx
│   ├── FilterPopover.tsx
│   ├── AnalyticsModal.tsx
│   └── GanttView.tsx
├── card/                  # Card-specific components
│   ├── CardActions.tsx
│   ├── CommentSection.tsx
│   ├── ChecklistSection.tsx
│   └── AttachmentSection.tsx
├── dashboard/             # Dashboard components
│   ├── StatsOverview.tsx
│   ├── RecentActivity.tsx
│   └── TaskSummary.tsx
└── workspace/             # Workspace components
    └── WorkspaceMembersMenu.tsx
```

### State Management

We use a **hybrid approach**:

1. **Server State** (SWR) - For data fetching and caching
2. **Local State** (React useState/useReducer) - For component-specific state
3. **Global State** (Jotai) - For shared UI state

```typescript
// Example: SWR for data fetching
const { data: board, mutate } = useSWR(
  `/api/boards/${boardId}`,
  fetcher
);

// Example: Jotai for global state
const [isCardModalOpen, setCardModalOpen] = useAtom(cardModalAtom);
```

### Routing

Using **Next.js App Router** (v13+):
- File-based routing
- Server Components by default
- Client Components when needed (`'use client'`)
- API routes in `/app/api/`

---

## Backend Architecture

### API Structure

```
app/api/
├── auth/
│   ├── [...nextauth]/route.ts    # NextAuth configuration
│   ├── forgot-password/route.ts
│   └── reset-password/route.ts
├── boards/
│   ├── route.ts                  # GET (list), POST (create)
│   └── [boardId]/
│       ├── route.ts              # GET, PUT, DELETE
│       ├── lists/
│       │   └── [listId]/
│       │       └── cards/
│       │           └── [cardId]/
│       │               ├── route.ts
│       │               ├── comments/route.ts
│       │               └── attachments/route.ts
│       ├── analytics/route.ts
│       └── automations/route.ts
├── workspaces/
│   ├── route.ts
│   └── [workspaceId]/
│       ├── route.ts
│       └── members/route.ts
└── user/
    ├── profile/route.ts
    ├── notifications/route.ts
    └── tasks/route.ts
```

### Request Flow

```
1. Client sends request →
2. Middleware (authentication check) →
3. API Route Handler →
4. Permission Check →
5. Business Logic →
6. Database Query (Prisma) →
7. Activity Logging →
8. Response
```

### Error Handling

```typescript
try {
  // Business logic
  const result = await prisma.board.create({ ... });
  return NextResponse.json(result);
} catch (error) {
  console.error('Error:', error);
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
```

---

## Database Design

### Entity Relationship Diagram

```
User ──┬─── Workspace ──── Board ──┬─── List ──── Card
       │                            │
       ├─── BoardMember             ├─── Label
       ├─── WorkspaceMember         ├─── Activity
       ├─── CardMember              └─── AutomationRule
       ├─── Comment
       ├─── Attachment
       └─── Activity

Card ──┬─── CardLabel (Label)
       ├─── CardMember (User)
       ├─── Comment
       ├─── Checklist ──── ChecklistItem
       ├─── Attachment
       └─── Activity
```

### Key Design Decisions

1. **Soft Delete** - Cards have `archived` flag instead of hard delete
2. **Cascade Delete** - Deleting a board deletes all lists, cards, etc.
3. **Many-to-Many** - Cards ↔ Labels, Cards ↔ Users (via junction tables)
4. **Denormalization** - Some data duplicated for performance (e.g., GitHub data on cards)
5. **Indexing** - Indexes on frequently queried fields (boardId, userId, etc.)

See [Database Schema Documentation](database.md) for full details.

---

## Authentication Flow

### Sign Up Flow

```
1. User fills registration form
2. POST /api/register
3. Password hashed (bcrypt)
4. User created in database
5. Verification email sent
6. User verifies email via link
7. Account activated
```

### Sign In Flow (Email/Password)

```
1. User enters credentials
2. NextAuth processes request
3. Credentials provider validates password
4. JWT token created
5. Session stored (JWT or database)
6. User redirected to dashboard
```

### Sign In Flow (GitHub OAuth)

```
1. User clicks "Sign in with GitHub"
2. Redirected to GitHub OAuth
3. User authorizes app
4. GitHub callback with code
5. Exchange code for access token
6. Fetch user profile from GitHub
7. Create/update user in database
8. Create session
9. Redirect to dashboard
```

### Session Management

- **JWT-based sessions** (default)
- Token stored in secure HTTP-only cookie
- Auto-refresh on API calls
- Session expires after 30 days of inactivity

---

## Real-time Features

### Current Implementation

- **Polling** - SWR auto-refetches data periodically
- **Optimistic Updates** - UI updates before server confirms

```typescript
// Optimistic update example
const { mutate } = useSWR(`/api/boards/${boardId}`);

async function moveCard(cardId, newListId) {
  // Update UI immediately
  mutate(
    (currentData) => ({
      ...currentData,
      lists: updateListsOptimistically(currentData.lists, cardId, newListId)
    }),
    false // Don't revalidate yet
  );

  // Send request to server
  await fetch(`/api/cards/${cardId}`, {
    method: 'PATCH',
    body: JSON.stringify({ listId: newListId })
  });

  // Revalidate from server
  mutate();
}
```

### Future: WebSocket Integration

Planned architecture for real-time updates:

```
Client ←→ WebSocket Server ←→ Redis Pub/Sub ←→ API Servers
```

Features:
- Live cursor tracking
- Real-time card updates
- Presence indicators
- Typing indicators in comments

---

## Security

### Authentication Security
- Passwords hashed with bcrypt (salt rounds: 12)
- JWT tokens signed with secret key
- CSRF protection enabled
- Rate limiting on auth endpoints

### Authorization
- Role-based access control (RBAC)
- Permission checks on every API route
- Board/workspace membership verification
- Owner-only operations protected

### Input Validation
- Zod schemas for request validation
- SQL injection protection (Prisma)
- XSS prevention (React escapes by default)
- File upload validation (size, type)

### API Security
- CORS configured
- HTTP-only cookies
- Secure headers (Next.js security headers)
- API rate limiting (planned)

---

## Performance Optimizations

### Frontend
- **Code Splitting** - Dynamic imports for modals and heavy components
- **Image Optimization** - Next.js Image component + Cloudinary
- **Lazy Loading** - Components loaded on demand
- **Memoization** - React.memo for expensive renders
- **Virtual Scrolling** - For long lists (planned)

### Backend
- **Database Indexes** - On frequently queried fields
- **Query Optimization** - Prisma select only needed fields
- **Caching** - SWR caches API responses client-side
- **Connection Pooling** - Prisma connection pool

### Example: Optimized Query

```typescript
// Bad - Fetches all fields and relations
const board = await prisma.board.findUnique({
  where: { id: boardId },
  include: { lists: { include: { cards: true } } }
});

// Good - Only fetch what's needed
const board = await prisma.board.findUnique({
  where: { id: boardId },
  select: {
    id: true,
    title: true,
    lists: {
      select: {
        id: true,
        title: true,
        cards: {
          select: { id: true, title: true, position: true },
          where: { archived: false }
        }
      },
      orderBy: { position: 'asc' }
    }
  }
});
```

---

## Deployment

### Production Environment

- **Hosting**: Vercel (recommended) or any Node.js host
- **Database**: PostgreSQL (managed service recommended)
- **File Storage**: Cloudinary
- **Environment Variables**: Securely stored

### CI/CD Pipeline

```
1. Push to main branch
2. GitHub Actions triggered
3. Run linter (ESLint)
4. Run unit tests (Vitest)
5. Run E2E tests (Playwright)
6. Build Next.js app
7. Deploy to Vercel
8. Run smoke tests
```

---

## Monitoring & Logging

### Current Logging
- Console logs in development
- Error boundaries catch React errors
- API errors logged to console

### Planned Monitoring
- Error tracking (Sentry)
- Performance monitoring (Vercel Analytics)
- User analytics (PostHog or similar)
- Uptime monitoring

---

## Future Architecture Improvements

1. **Microservices** - Split into smaller services if needed
2. **GraphQL** - Replace REST APIs with GraphQL
3. **WebSockets** - Real-time updates
4. **Redis** - Caching layer
5. **CDN** - Static asset delivery
6. **Kubernetes** - Container orchestration
7. **Message Queue** - For background jobs (Bull/RabbitMQ)
