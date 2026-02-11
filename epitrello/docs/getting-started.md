# Getting Started with EpiTrello

Complete guide to get EpiTrello up and running on your local machine.

## Table of Contents
- [System Requirements](#system-requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [First Steps](#first-steps)
- [Troubleshooting](#troubleshooting)

---

## System Requirements

### Required
- **Node.js** 20.x or higher ([Download](https://nodejs.org/))
- **PostgreSQL** 14.x or higher ([Download](https://www.postgresql.org/download/))
- **npm** 10.x or higher (comes with Node.js)
- **Git** ([Download](https://git-scm.com/downloads))

### Recommended
- **VS Code** with extensions:
  - ESLint
  - Prettier
  - Prisma
  - Tailwind CSS IntelliSense
- **PostgreSQL GUI**: pgAdmin or TablePlus
- **API Testing**: Postman or Insomnia

### System Specs
- RAM: 4GB minimum, 8GB recommended
- Disk: 2GB free space
- OS: macOS, Linux, or Windows (with WSL2)

---

## Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd epitrello
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js
- React
- Prisma
- TypeScript
- And all other dependencies

---

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_URL="postgresql://postgres:password@localhost:5432/epitrello"

# NextAuth Configuration
NEXTAUTH_SECRET="your-random-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Cloudinary (Image Upload)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Email Configuration (SMTP)
EMAIL_SERVER="smtp://username:password@smtp.gmail.com:587"
EMAIL_FROM="noreply@epitrello.com"

# GitHub OAuth (Optional)
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Google Gemini AI (Optional)
GEMINI_API_KEY="your-gemini-api-key"
```

### Configuration Details

#### Database URL
Replace with your PostgreSQL credentials:
- `USER`: Your PostgreSQL username (default: `postgres`)
- `PASSWORD`: Your PostgreSQL password
- `HOST`: Database host (default: `localhost`)
- `PORT`: Database port (default: `5432`)
- `DATABASE`: Database name (e.g., `epitrello`)

#### NextAuth Secret
Generate a random secret:
```bash
openssl rand -base64 32
```

#### Cloudinary Setup
1. Sign up at [cloudinary.com](https://cloudinary.com/)
2. Get credentials from Dashboard
3. Add to `.env`

#### Email Server (Optional)
For Gmail:
1. Enable 2FA
2. Create App Password
3. Use format: `smtp://youremail@gmail.com:app-password@smtp.gmail.com:587`

#### GitHub OAuth (Optional)
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create new OAuth App
3. Set callback URL: `http://localhost:3000/api/auth/github/callback`
4. Copy Client ID and Secret

#### Google Gemini (Optional)
1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add to `.env`

---

## Database Setup

### 1. Create Database

#### Using Command Line
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE epitrello;

# Exit psql
\q
```

#### Using pgAdmin
1. Open pgAdmin
2. Right-click "Databases"
3. Create → Database
4. Name: `epitrello`

### 2. Run Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev
```

This will:
- Create all tables
- Set up relationships
- Add indexes

### 3. Verify Database

```bash
# Open Prisma Studio (GUI for your database)
npx prisma studio
```

Opens at http://localhost:5555

---

## Running the Application

### Development Mode

```bash
npm run dev
```

Server starts at http://localhost:3000

### Build for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Other Scripts

```bash
# Lint code
npm run lint

# Run tests
npm run test

# Run E2E tests
npm run test:e2e

# Type checking
npx tsc --noEmit
```

---

## First Steps

### 1. Create an Account

1. Navigate to http://localhost:3000
2. Click "Sign Up"
3. Fill in details:
   - Email
   - Password (min 8 characters)
   - Name
4. Click "Create Account"
5. Check email for verification link
6. Click verification link

### 2. Create Your First Workspace

1. After login, you'll see the dashboard
2. Click "Create Workspace"
3. Enter workspace details:
   - Name (e.g., "My Team")
   - Description (optional)
4. Click "Create"

### 3. Create Your First Board

1. In workspace, click "Create Board"
2. Enter board details:
   - Title (e.g., "Project Tasks")
   - Description (optional)
   - Background color
3. Click "Create"

### 4. Add Lists and Cards

1. On board page, click "Add List"
2. Name it (e.g., "To Do", "In Progress", "Done")
3. Click "Add Card" in a list
4. Enter card title
5. Click card to see details

### 5. Explore Features

- **Add Labels**: Board settings → Labels
- **Invite Members**: Board menu → Invite
- **Set Due Dates**: Open card → Add due date
- **Add Checklists**: Open card → Checklist
- **Upload Attachments**: Open card → Attach files
- **Create Automations**: Board settings → Automations

---

## Development Workflow

### Hot Reload
The dev server automatically reloads when you save files.

### Database Changes
When modifying the Prisma schema:
```bash
# Create migration
npx prisma migrate dev --name describe_changes

# Regenerate Prisma Client
npx prisma generate
```

### Adding Components
```bash
# shadcn/ui components
npx shadcn-ui@latest add <component-name>
```

### Debugging
- Check browser console for errors
- Check terminal for server errors
- Use React DevTools browser extension
- Use `console.log()` liberally

---

## Troubleshooting

### Port 3000 Already in Use

```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)

# Or use a different port
PORT=3001 npm run dev
```

### Database Connection Error

**Error**: `Can't reach database server`

**Solution**:
1. Check PostgreSQL is running:
```bash
# macOS (Homebrew)
brew services list

# Start if not running
brew services start postgresql

# Linux
sudo systemctl status postgresql
sudo systemctl start postgresql
```

2. Verify credentials in `.env`
3. Try connecting with psql:
```bash
psql -U postgres -h localhost
```

### Prisma Generate Error

**Error**: `Unknown type`

**Solution**:
```bash
# Clear Prisma cache
rm -rf node_modules/.prisma

# Reinstall
npm install

# Regenerate
npx prisma generate
```

### Module Not Found

**Error**: `Cannot find module '@/...'`

**Solution**:
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Restart dev server
npm run dev
```

### TypeScript Errors

**Solution**:
```bash
# Regenerate Prisma types
npx prisma generate

# Restart TS server in VS Code:
# Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

### Image Upload Not Working

**Error**: Cloudinary errors

**Solution**:
1. Verify Cloudinary credentials in `.env`
2. Check API key is active
3. Ensure upload preset exists (if using unsigned uploads)

### Email Not Sending

**Solution**:
1. Verify SMTP credentials
2. For Gmail: Use App Password, not regular password
3. Check firewall isn't blocking port 587
4. Test with a different SMTP provider

### GitHub OAuth Not Working

**Solution**:
1. Verify callback URL matches exactly: `http://localhost:3000/api/auth/github/callback`
2. Check Client ID and Secret in `.env`
3. Ensure OAuth app is active on GitHub

---

## Next Steps

- Read [Architecture Documentation](architecture.md) to understand the codebase
- Check [API Documentation](api.md) for backend endpoints
- Review [Contributing Guidelines](contributing.md) if you want to contribute
- Explore [Testing Guide](../TESTING.md) for running tests

---

## Getting Help

If you encounter issues:

1. **Check logs**: Look at terminal and browser console
2. **Search issues**: Check GitHub Issues for similar problems
3. **Documentation**: Read docs in `/docs` folder
4. **Ask for help**: Create a GitHub Issue with:
   - What you tried to do
   - What happened instead
   - Error messages (full stack trace)
   - Your environment (OS, Node version, etc.)

---

## Useful Commands Reference

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm start               # Start production server
npm run lint            # Lint code

# Database
npx prisma studio       # Open database GUI
npx prisma migrate dev  # Create migration
npx prisma generate     # Regenerate client
npx prisma db push      # Push schema changes (dev only)
npx prisma db seed      # Seed database

# Testing
npm run test            # Run unit tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Generate coverage report
npm run test:e2e        # Run E2E tests

# Cleaning
rm -rf .next            # Clear Next.js cache
rm -rf node_modules     # Remove dependencies
rm -rf prisma/migrations # Clear migrations (caution!)
```

---

**You're all set!** Start exploring EpiTrello and building amazing boards!
