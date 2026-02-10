# EpiTrello Documentation

Welcome to the complete documentation for EpiTrello!

## Quick Links

### Getting Started
- [Getting Started Guide](getting-started.md) - Installation and setup
- [Quick Start](#quick-start) - 5-minute setup
- [Configuration](#configuration) - Environment setup

### User Guides
- [Workspaces](features/workspaces.md) - Organize your teams
- [Boards & Cards](features/boards.md) - Create and manage boards
- [Automation Rules](features/automation.md) - Automate workflows
- [GitHub Integration](features/github.md) - Connect with GitHub
- [AI Chatbot](features/ai-chatbot.md) - Use AI assistant

### Developer Guides
- [Architecture Overview](architecture.md) - System design
- [API Documentation](api.md) - REST API reference
- [Database Schema](database.md) - Database structure
- [Contributing Guide](contributing.md) - How to contribute
- [Testing Guide](../TESTING.md) - Testing practices

---

## Quick Start

### 1. Prerequisites

```bash
# Check versions
node -v  # Should be 20+
psql --version  # Should be 14+
```

### 2. Install

```bash
# Clone repository
git clone <repo-url>
cd epitrello

# Install dependencies
npm install
```

### 3. Configure

```bash
# Copy environment file
cp .env.example .env

# Edit with your credentials
nano .env
```

### 4. Setup Database

```bash
# Create database
createdb epitrello

# Run migrations
npx prisma migrate dev
```

### 5. Run

```bash
npm run dev
```

Visit http://localhost:3000

---

## Configuration

### Required Environment Variables

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/epitrello"
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### Optional Integrations

```env
# Cloudinary (file uploads)
CLOUDINARY_CLOUD_NAME="your-cloud"
CLOUDINARY_API_KEY="your-key"
CLOUDINARY_API_SECRET="your-secret"

# GitHub OAuth
GITHUB_CLIENT_ID="your-client-id"
GITHUB_CLIENT_SECRET="your-secret"

# Email (notifications)
EMAIL_SERVER="smtp://user:pass@smtp.gmail.com:587"
EMAIL_FROM="noreply@epitrello.com"

# Google Gemini (AI chatbot)
GEMINI_API_KEY="your-api-key"
```

---

## Features Overview

### Core Features

#### Workspaces
Organize your projects into separate workspaces with team collaboration.

**Key capabilities:**
- Create unlimited workspaces
- Invite team members
- Role-based permissions (Admin, Editor, Viewer)
- Workspace-level settings

[Read more →](features/workspaces.md)

#### Boards
Kanban-style boards for visual project management.

**Features:**
- Drag-and-drop lists and cards
- Custom backgrounds
- Board templates
- Member management
- Activity history

[Read more →](features/boards.md)

#### Cards
Rich task cards with comprehensive features.

**Includes:**
- Descriptions and markdown support
- Labels and tags
- Due dates and reminders
- Assigned members
- Cover images
- Checklists
- Comments
- File attachments
- Activity log

### Advanced Features

#### Automation
Automate repetitive tasks with custom rules.

**Examples:**
- Auto-archive completed cards
- Add labels when moved to list
- Assign members based on labels
- Send notifications on due dates

[Read more →](features/automation.md)

#### GitHub Integration
Seamless integration with GitHub repositories.

**Capabilities:**
- Link cards to issues
- Create issues from cards
- Create branches and PRs
- Sync status bidirectionally
- Track development progress

[Read more →](features/github.md)

#### AI Chatbot
Google Gemini-powered assistant for productivity.

**Use cases:**
- Natural language queries
- Task creation via chat
- Smart suggestions
- Board insights

[Read more →](features/ai-chatbot.md)

#### Analytics
Track team productivity and project progress.

**Metrics:**
- Cards completed over time
- Team member activity
- List distribution
- Overdue tasks
- Time tracking

#### Search
Powerful search across all your content.

**Search by:**
- Card titles and descriptions
- Labels
- Members
- Due dates
- Board names

---

## Architecture

### Tech Stack

**Frontend:**
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui

**Backend:**
- Next.js API Routes
- Prisma ORM
- PostgreSQL
- NextAuth.js

**Integrations:**
- Cloudinary (files)
- GitHub API
- Google Gemini
- Nodemailer (email)

### Project Structure

```
epitrello/
├── src/
│   ├── app/              # Pages & API routes
│   ├── components/       # React components
│   ├── lib/             # Utilities
│   └── types/           # TypeScript types
├── prisma/
│   └── schema.prisma    # Database schema
├── tests/               # Test files
├── docs/                # Documentation
└── public/              # Static assets
```

[Read full architecture →](architecture.md)

---

## API Reference

### Base URL
```
http://localhost:3000/api
```

### Authentication
All endpoints require authentication via session cookie (except auth endpoints).

### Key Endpoints

```
# Auth
POST /api/register
POST /api/auth/forgot-password

# Workspaces
GET    /api/workspaces
POST   /api/workspaces
PUT    /api/workspaces/{id}
DELETE /api/workspaces/{id}

# Boards
GET    /api/boards
POST   /api/boards
GET    /api/boards/{id}
PUT    /api/boards/{id}
DELETE /api/boards/{id}

# Cards
POST   /api/boards/{boardId}/lists/{listId}/cards
GET    /api/boards/{boardId}/lists/{listId}/cards/{cardId}
PUT    /api/boards/{boardId}/lists/{listId}/cards/{cardId}
DELETE /api/boards/{boardId}/lists/{listId}/cards/{cardId}
```

[Full API documentation →](api.md)

---

## Database

### Schema Overview

```
User
├── Workspaces
│   └── Boards
│       ├── Lists
│       │   └── Cards
│       ├── Labels
│       └── Automations
└── Assignments
```

### Key Models
- **User** - Accounts and authentication
- **Workspace** - Project containers
- **Board** - Kanban boards
- **List** - Board columns
- **Card** - Tasks/items
- **Label** - Tags for cards
- **Comment** - Card discussions
- **Attachment** - File uploads
- **Activity** - Audit log

[Full database documentation →](database.md)

---

## Development

### Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm start               # Start production server

# Database
npx prisma studio       # Open database GUI
npx prisma migrate dev  # Create migration

# Testing
npm run test            # Unit tests
npm run test:e2e        # E2E tests
npm run test:coverage   # Coverage report

# Code Quality
npm run lint            # Lint code
npm run lint -- --fix   # Auto-fix issues
```

### Debugging

**Enable verbose logging:**
```typescript
// In development
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

**React DevTools:**
Install browser extension for debugging React components.

---

## Testing

### Unit Tests (Vitest)

```bash
npm run test
```

Test utilities, hooks, and business logic.

### Component Tests (Testing Library)

```bash
npm run test
```

Test React component rendering and interactions.

### E2E Tests (Playwright)

```bash
npm run test:e2e
```

Test full user workflows across browsers.

[Full testing guide →](../TESTING.md)

---

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Docker

```bash
# Build image
docker build -t epitrello .

# Run container
docker run -p 3000:3000 epitrello
```

### Environment Variables

Set in deployment platform:
- Vercel: Settings → Environment Variables
- Docker: Use `.env` file or `-e` flags

---

## Contributing

We welcome contributions!

### Process
1. Fork repository
2. Create feature branch
3. Make changes
4. Write tests
5. Submit pull request

### Guidelines
- Follow code style
- Write tests
- Update documentation
- Keep PRs focused

[Full contributing guide →](contributing.md)

---

## Support

### Documentation
- Browse [docs/](.) folder
- Check [API reference](api.md)
- Read [troubleshooting](getting-started.md#troubleshooting)

### Community
- GitHub Issues - Bug reports
- GitHub Discussions - Questions
- Discord - Community chat (if available)

### Commercial Support
Contact us for enterprise support and customization.

---

## License

MIT License - see [LICENSE](../LICENSE) file.

---

## Roadmap

See [FEATURE_PLAN.md](../FEATURE_PLAN.md) for complete roadmap.

### Coming Soon
- Real-time collaboration (WebSockets)
- Mobile app (React Native)
- Advanced analytics
- Custom fields
- Board templates marketplace
- More integrations (Slack, Discord, etc.)

---

## Changelog

### Latest Release

See [GitHub Releases](https://github.com/yourusername/epitrello/releases) for full changelog.

---

<div align="center">

**[⬆ Back to Top](#epitrello-documentation)**

Made with ❤️ by the EpiTrello Team

</div>
