<div align="center">

# EpiTrello

**Modern, collaborative project management platform inspired by Trello**

[![Tests](https://img.shields.io/badge/tests-passing-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)]()
[![Next.js](https://img.shields.io/badge/Next.js-16.x-black)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

[Features](#features) • [Quick Start](#quick-start) • [Tech Stack](#tech-stack) • [Documentation](#documentation) • [Contributing](#contributing)

![EpiTrello Screenshot](https://via.placeholder.com/800x400/1e293b/ffffff?text=EpiTrello+Screenshot)

</div>

---

## Features

### Core Features
- **Workspaces** - Organize your projects into separate workspaces with team members
- **Boards & Lists** - Create unlimited boards with customizable columns
- **Cards** - Rich cards with descriptions, labels, due dates, and more
- **Drag & Drop** - Intuitive interface powered by @dnd-kit
- **Member Management** - Invite team members with role-based permissions (Admin, Editor, Viewer)

### Advanced Features
- **Labels & Tags** - Colorful labels to categorize your cards
- **Checklists** - Track subtasks within cards
- **Comments** - Team discussions on cards with real-time updates
- **Attachments** - Upload files and images (powered by Cloudinary)
- **Activity Log** - Complete history of all board and card changes
- **Due Dates** - Set deadlines and get visual indicators for overdue tasks
- **Cover Images** - Beautiful card cover images
- **Search** - Powerful search across all your boards and cards
- **Filters** - Filter cards by labels, members, due dates, and more

### Automation & Integrations
- **Automation Rules** - Create custom rules to automate workflows
- **GitHub Integration** - Link cards to GitHub issues and PRs, create branches directly from cards
- **AI Chatbot** - Powered by Google Gemini for smart assistance
- **Analytics** - Track board activity and team productivity
- **Gantt View** - Visualize project timelines

### User Experience
- **Dark Mode** - Theme support (light/dark/system)
- **Mobile Responsive** - Works seamlessly on all devices
- **Notifications** - Real-time notifications for board activities
- **Profile Customization** - Custom avatars and user settings
- **Email Notifications** - Stay updated via email

---

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL database
- npm or yarn

### 1. Clone and Install
```bash
git clone <repository-url>
cd epitrello
npm install
```

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/epitrello"

# NextAuth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Email (for notifications)
EMAIL_SERVER="smtp://user:pass@smtp.gmail.com:587"
EMAIL_FROM="noreply@epitrello.com"

# GitHub OAuth (optional)
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Google Gemini AI (optional)
GEMINI_API_KEY="your-gemini-api-key"
```

### 3. Database Setup
```bash
npx prisma generate
npx prisma migrate dev
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your application.

### 5. Build for Production
```bash
npm run build
npm start
```

---

## Tech Stack

### Frontend
- **[Next.js 16](https://nextjs.org/)** - React framework with App Router
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com/)** - Beautiful UI components
- **[@dnd-kit](https://dndkit.com/)** - Drag and drop functionality
- **[Jotai](https://jotai.org/)** - Lightweight state management
- **[SWR](https://swr.vercel.app/)** - Data fetching and caching

### Backend
- **[Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)** - Serverless API endpoints
- **[Prisma](https://www.prisma.io/)** - Next-generation ORM
- **[PostgreSQL](https://www.postgresql.org/)** - Relational database
- **[NextAuth.js](https://next-auth.js.org/)** - Authentication solution

### Integrations
- **[Cloudinary](https://cloudinary.com/)** - Image and file hosting
- **[Google Gemini](https://ai.google.dev/)** - AI-powered chatbot
- **[Nodemailer](https://nodemailer.com/)** - Email sending
- **[GitHub API](https://docs.github.com/en/rest)** - GitHub integration

### Testing
- **[Vitest](https://vitest.dev/)** - Unit and integration testing
- **[Playwright](https://playwright.dev/)** - End-to-end testing
- **[@testing-library/react](https://testing-library.com/react)** - Component testing

---

## Documentation

### User Guides
- [Getting Started Guide](docs/getting-started.md)

### Developer Guides
- [Architecture Overview](docs/architecture.md)
- [API Documentation](docs/api.md)
- [Database Schema](docs/database.md)
- [Testing Guide](TESTING.md)
- [Contributing Guidelines](docs/contributing.md)

### Feature Documentation
- [Workspaces](docs/features/workspaces.md)
- [Boards & Cards](docs/features/boards.md)
- [Automation Rules](docs/features/automation.md)
- [GitHub Integration](docs/features/github.md)

---

## Project Structure

```
epitrello/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   ├── auth/              # Authentication pages
│   │   ├── boards/            # Board pages
│   │   ├── dashboard/         # Dashboard
│   │   ├── workspaces/        # Workspace pages
│   │   └── lib/               # Server-side utilities
│   ├── components/            # React components
│   │   ├── ui/                # Base UI components
│   │   ├── board/             # Board-related components
│   │   ├── card/              # Card-related components
│   │   ├── dashboard/         # Dashboard components
│   │   └── workspace/         # Workspace components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Client-side utilities
│   └── types/                 # TypeScript types
├── prisma/
│   └── schema.prisma          # Database schema
├── tests/
│   ├── unit/                  # Unit tests
│   ├── integration/           # Integration tests
│   └── e2e/                   # End-to-end tests
└── public/                    # Static assets
```

---

## Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Lint code

# Testing
npm run test            # Run unit tests
npm run test:watch      # Run tests in watch mode
npm run test:ui         # Open test UI
npm run test:coverage   # Generate coverage report
npm run test:e2e        # Run E2E tests
npm run test:e2e:ui     # Open E2E test UI
npm run test:all        # Run all tests

# Database
npx prisma studio       # Open Prisma Studio
npx prisma migrate dev  # Create migration
npx prisma generate     # Generate Prisma Client

# CI/CD
npm run ci:check        # Pre-push checks
```

---

## Contributing

We welcome contributions! Please see our [Contributing Guide](docs/contributing.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style
- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write tests for new features
- Keep components small and focused
- Document complex logic

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/epitrello/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/epitrello/discussions)

---

## Roadmap

See [FEATURE_PLAN.md](FEATURE_PLAN.md) for the complete feature roadmap and development plan.

### Upcoming Features
- Real-time collaboration with WebSockets
- Mobile app (React Native)
- Calendar view improvements
- Advanced analytics dashboard
- Custom fields for cards
- Board templates marketplace
- Third-party integrations (Slack, Discord, etc.)

---

<div align="center">

Made with ❤️ by the EpiTrello Team

[⬆ Back to top](#epitrello)

</div>
