# EpiTrello Documentation

**EpiTrello** is a collaborative project management tool inspired by Trello, designed with a "Developer-First" approach. It provides an intuitive Kanban interface for managing tasks, assigning members, and tracking progress.

---

## Features

### Core Functionality
-   **Kanban Boards**: Create and manage boards with customizable lists (columns).
-   **Drag & Drop**: Smooth drag-and-drop experience for cards and lists using `@dnd-kit`.
-   **Task Management**: Create cards with titles, rich text descriptions, and due dates.
-   **Labels**: Tag cards with custom color-coded labels.
-   **Members**: Assign team members to specific cards.
-   **Cover Images**: Add visual flair to cards with cover images.

### Advanced Features
-   **Gantt View**: Timeline visualization for project scheduling and task duration management.
-   **Real-time Updates**: Live updates for seamless collaboration across users.
-   **GitHub Integration**: Connect boards to GitHub repositories and link cards to GitHub issues for status synchronization.

### Technical Highlights
-   **Modern Stack**: Built with Next.js 15 (App Router) and React 19.
-   **Authentication**: Secure user authentication using NextAuth v5 (Auth.js).
-   **Database**: Robust data modeling with Prisma ORM and PostgreSQL.
-   **Styling**: Beautiful, responsive UI built with TailwindCSS and `shadcn/ui`.
-   **Optimistic UI**: Instant feedback for user actions.

---

## Tech Stack

-   **Frontend**: Next.js 15, React 19, TailwindCSS, Lucide Icons, `@dnd-kit`.
-   **Backend**: Next.js API Routes, Prisma ORM, Google Gemini AI.
-   **Database**: PostgreSQL.
-   **Auth**: NextAuth.js v5.

---

## Installation & Setup

### Prerequisites
git clone git@github.com:RomaiinVery/EpiTrello.git
```bash
cd EpiTrello/epitrello
npm install
```

### 3. Configure Environment
Create a `.env` file in the `epitrello` directory based on `.env.example`

### 4. Setup Database
Run the Prisma migrations to create the database schema:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Run the Application
Start the development server:
```bash
npm run dev
```
The app will be available at [http://localhost:3000](http://localhost:3000).

---

## Architecture & Data Model

### Key Entities
-   **User**: Application users who can own workspaces and be members of boards.
-   **Tableau (Workspace)**: A high-level container for multiple boards.
-   **Board**: A specific project containing lists.
-   **List**: A vertical column in a kanban board (e.g., "To Do", "Doing", "Done").
-   **Card**: An individual task item within a list.

### API Structure
-   `/api/auth`: Authentication routes (NextAuth).
-   `/api/register`: User registration endpoint.
-   `/api/verify`: Email/Account verification.
-   `/api/user`: User profile and management.
-   `/api/github`: GitHub integration endpoints.
-   `/api/tableaux`: Workspace (Tableau) management.
-   `/api/workspaces`: Alternative workspace endpoints.
-   `/api/boards`: Board CRUD and details.
-   `/api/boards/[boardId]/lists`: List management.
-   `/api/boards/[boardId]/lists/[listId]/cards`: Card management.

---

## Future Roadmap (Hyper-Dev)

-   **Mobile App**: Native mobile experience.
-   **Advanced Reporting**: Burndown charts and velocity tracking.
-   **SaaS Features**: Billing and subscription management.
