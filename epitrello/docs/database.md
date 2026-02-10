# Database Schema Documentation

Complete documentation of the EpiTrello PostgreSQL database schema.

## Table of Contents
- [Entity Relationship Diagram](#entity-relationship-diagram)
- [Tables](#tables)
- [Relationships](#relationships)
- [Indexes](#indexes)
- [Migrations](#migrations)

---

## Entity Relationship Diagram

```
┌──────────────┐
│     User     │
└──────┬───────┘
       │
       ├─────────┬────────────┬─────────────┬──────────────┐
       │         │            │             │              │
       ▼         ▼            ▼             ▼              ▼
┌────────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌────────────┐
│Workspace│ │BoardMember│ │CardMember│ │ Comment  │ │ Attachment │
└───┬────┘ └────┬─────┘ └────┬────┘ └────┬─────┘ └─────┬──────┘
    │           │            │           │             │
    ▼           ▼            ▼           ▼             ▼
┌───────────────────────────────────────────────────────┐
│                       Board                           │
└───────────┬───────────────────────────────────────────┘
            │
            ├────────────┬─────────────┬────────────┐
            ▼            ▼             ▼            ▼
       ┌────────┐   ┌───────┐    ┌─────────┐  ┌─────────┐
       │  List  │   │ Label │    │Activity │  │Automation│
       └───┬────┘   └───┬───┘    └─────────┘  └─────────┘
           │            │
           ▼            ▼
       ┌───────────────────┐
       │       Card        │
       └───┬───────────────┘
           │
           ├────────┬─────────┬──────────┐
           ▼        ▼         ▼          ▼
      ┌─────────┐ ┌────┐ ┌────────┐ ┌────────┐
      │Checklist│ │Label│ │ Comment│ │Activity│
      └────┬────┘ └────┘ └────────┘ └────────┘
           │
           ▼
    ┌──────────────┐
    │ChecklistItem │
    └──────────────┘
```

---

## Tables

### User

Stores user account information and authentication data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Unique user identifier |
| email | String | UNIQUE, NOT NULL | User email address |
| password | String | NOT NULL | Hashed password (bcrypt) |
| name | String | NULLABLE | Display name |
| profileImage | String | NULLABLE | Profile picture URL |
| emailVerified | DateTime | NULLABLE | Email verification timestamp |
| pendingEmail | String | NULLABLE | Email change pending verification |
| verificationCode | String | NULLABLE | Email verification code |
| resetToken | String | NULLABLE | Password reset token |
| resetTokenExpiry | DateTime | NULLABLE | Reset token expiration |
| theme | String | DEFAULT 'system' | UI theme preference |
| githubId | String | UNIQUE, NULLABLE | GitHub OAuth ID |
| githubAccessToken | String | NULLABLE | GitHub API token |
| githubUsername | String | NULLABLE | GitHub username |
| githubAvatarUrl | String | NULLABLE | GitHub avatar URL |
| createdAt | DateTime | DEFAULT now() | Account creation date |
| updatedAt | DateTime | AUTO UPDATE | Last update timestamp |

**Relations:**
- Has many Workspaces (owner)
- Has many WorkspaceMembers
- Has many Boards (owner)
- Has many BoardMembers
- Has many CardMembers
- Has many Comments
- Has many Activities
- Has many Attachments

---

### Workspace

Logical container for boards and team members.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | cuid | PRIMARY KEY | Unique workspace identifier |
| title | String | NOT NULL | Workspace name |
| description | String | NULLABLE | Workspace description |
| userId | String | FOREIGN KEY → User.id | Owner ID |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |

**Relations:**
- Belongs to User (owner)
- Has many WorkspaceMembers
- Has many Boards

**Cascade:** Deleting workspace deletes all boards and members.

---

### WorkspaceMember

Junction table for workspace membership and roles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | cuid | PRIMARY KEY | Unique member record ID |
| workspaceId | String | FOREIGN KEY → Workspace.id | Workspace ID |
| userId | String | FOREIGN KEY → User.id | User ID |
| role | Role | DEFAULT VIEWER | Member role |
| joinedAt | DateTime | DEFAULT now() | Join timestamp |

**Unique Constraint:** (workspaceId, userId) - One membership per user per workspace

**Roles:**
- `ADMIN` - Full workspace access
- `EDITOR` - Can edit boards
- `VIEWER` - Read-only access

---

### Board

Kanban board within a workspace.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | cuid | PRIMARY KEY | Unique board identifier |
| title | String | NOT NULL | Board name |
| description | String | NULLABLE | Board description |
| background | String | NULLABLE | Background color/image |
| githubRepo | String | NULLABLE | Linked GitHub repo |
| githubBranch | String | NULLABLE | Default GitHub branch |
| workspaceId | String | FOREIGN KEY → Workspace.id | Parent workspace |
| userId | String | FOREIGN KEY → User.id | Creator ID |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |

**Relations:**
- Belongs to Workspace
- Belongs to User (creator)
- Has many Lists
- Has many Labels
- Has many Activities
- Has many BoardMembers
- Has many AutomationRules

**Cascade:** Deleting board deletes all lists, cards, labels, etc.

---

### BoardMember

Junction table for board access.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | cuid | PRIMARY KEY | Unique member record ID |
| boardId | String | FOREIGN KEY → Board.id | Board ID |
| userId | String | FOREIGN KEY → User.id | User ID |
| role | Role | DEFAULT VIEWER | Member role |
| joinedAt | DateTime | DEFAULT now() | Join timestamp |

**Unique Constraint:** (boardId, userId)

---

### Invitation

Pending board/workspace invitations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | cuid | PRIMARY KEY | Unique invitation ID |
| email | String | NOT NULL | Invitee email |
| token | String | UNIQUE | Invitation token |
| role | Role | DEFAULT VIEWER | Invited role |
| workspaceId | String | NULLABLE | Target workspace |
| boardId | String | NULLABLE | Target board |
| inviterId | String | NOT NULL | Inviter user ID |
| status | String | DEFAULT 'PENDING' | PENDING or ACCEPTED |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| expiresAt | DateTime | NOT NULL | Expiration date |

**Index:** token (for fast lookup)

---

### List

Column within a board.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | cuid | PRIMARY KEY | Unique list identifier |
| title | String | NOT NULL | List name (e.g., "To Do") |
| position | Int | NOT NULL | Display order |
| boardId | String | FOREIGN KEY → Board.id | Parent board |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |

**Relations:**
- Belongs to Board
- Has many Cards

---

### Card

Task/item within a list.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | cuid | PRIMARY KEY | Unique card identifier |
| title | String | NOT NULL | Card title |
| content | String | NULLABLE | Description/notes |
| position | Int | NOT NULL | Order within list |
| archived | Boolean | DEFAULT false | Soft delete flag |
| coverImage | String | NULLABLE | Cover image URL |
| startDate | DateTime | NULLABLE | Start date |
| dueDate | DateTime | NULLABLE | Due date |
| isDone | Boolean | DEFAULT false | Completion status |
| githubIssueNumber | Int | NULLABLE | Linked GitHub issue # |
| githubIssueUrl | String | NULLABLE | GitHub issue URL |
| listId | String | FOREIGN KEY → List.id | Parent list |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | AUTO UPDATE | Last update |

**Relations:**
- Belongs to List
- Has many CardLabels
- Has many CardMembers
- Has many Comments
- Has many Checklists
- Has many Attachments
- Has many Activities

---

### Label

Reusable tag for cards.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | cuid | PRIMARY KEY | Unique label identifier |
| name | String | NOT NULL | Label name |
| color | String | NOT NULL | Hex color code |
| boardId | String | FOREIGN KEY → Board.id | Parent board |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |

**Unique Constraint:** (boardId, name) - No duplicate names per board

**Relations:**
- Belongs to Board
- Has many CardLabels

---

### CardLabel

Junction table for card-label relationships.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | cuid | PRIMARY KEY | Unique relation ID |
| cardId | String | FOREIGN KEY → Card.id | Card ID |
| labelId | String | FOREIGN KEY → Label.id | Label ID |

**Unique Constraint:** (cardId, labelId)

---

### CardMember

Junction table for card assignments.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | cuid | PRIMARY KEY | Unique assignment ID |
| cardId | String | FOREIGN KEY → Card.id | Card ID |
| userId | String | FOREIGN KEY → User.id | Assigned user |

**Unique Constraint:** (cardId, userId)

---

### Comment

Comments on cards.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | cuid | PRIMARY KEY | Unique comment identifier |
| content | String | NOT NULL | Comment text |
| cardId | String | FOREIGN KEY → Card.id | Parent card |
| userId | String | FOREIGN KEY → User.id | Author |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | AUTO UPDATE | Last edit |

**Relations:**
- Belongs to Card
- Belongs to User (author)

---

### Attachment

File attachments on cards.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | cuid | PRIMARY KEY | Unique attachment identifier |
| name | String | NOT NULL | Original filename |
| url | String | NOT NULL | Cloudinary URL |
| type | String | NOT NULL | MIME type |
| size | Int | NOT NULL | File size (bytes) |
| cardId | String | FOREIGN KEY → Card.id | Parent card |
| userId | String | FOREIGN KEY → User.id | Uploader |
| createdAt | DateTime | DEFAULT now() | Upload timestamp |

**Relations:**
- Belongs to Card
- Belongs to User (uploader)

---

### Activity

Activity log for boards and cards.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | cuid | PRIMARY KEY | Unique activity identifier |
| type | String | NOT NULL | Activity type |
| description | String | NOT NULL | Human-readable text |
| metadata | String | NULLABLE | JSON data |
| cardId | String | NULLABLE, FK → Card.id | Related card |
| boardId | String | FOREIGN KEY → Board.id | Parent board |
| userId | String | FOREIGN KEY → User.id | Actor |
| createdAt | DateTime | DEFAULT now() | Activity timestamp |

**Activity Types:**
- CARD_CREATED, CARD_UPDATED, CARD_MOVED
- CARD_ARCHIVED, CARD_DELETED
- MEMBER_ADDED, MEMBER_REMOVED
- LABEL_ADDED, LABEL_REMOVED
- COMMENT_ADDED
- ATTACHMENT_ADDED

**Relations:**
- Belongs to Board
- Optionally belongs to Card
- Belongs to User (actor)

---

### Checklist

Checklist on a card.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | cuid | PRIMARY KEY | Unique checklist identifier |
| title | String | NOT NULL | Checklist name |
| position | Int | NOT NULL | Display order |
| cardId | String | FOREIGN KEY → Card.id | Parent card |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | AUTO UPDATE | Last update |

**Relations:**
- Belongs to Card
- Has many ChecklistItems

---

### ChecklistItem

Item within a checklist.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | cuid | PRIMARY KEY | Unique item identifier |
| text | String | NOT NULL | Item text |
| checked | Boolean | DEFAULT false | Completion status |
| position | Int | NOT NULL | Display order |
| checklistId | String | FOREIGN KEY → Checklist.id | Parent checklist |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | AUTO UPDATE | Last update |

**Relations:**
- Belongs to Checklist

---

### AutomationRule

Automation rules for boards.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | cuid | PRIMARY KEY | Unique rule identifier |
| boardId | String | FOREIGN KEY → Board.id | Parent board |
| triggerType | String | NOT NULL | Trigger condition |
| triggerVal | String | NOT NULL | Trigger value |
| isActive | Boolean | DEFAULT true | Enable/disable rule |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | AUTO UPDATE | Last update |

**Trigger Types:**
- CARD_MOVED_TO_LIST
- CARD_DUE_DATE_REACHED
- CARD_LABELED

**Relations:**
- Belongs to Board
- Has many AutomationActions
- Has many AutomationLogs

---

### AutomationAction

Actions executed by automation rules.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | cuid | PRIMARY KEY | Unique action identifier |
| ruleId | String | FOREIGN KEY → AutomationRule.id | Parent rule |
| type | String | NOT NULL | Action type |
| value | String | NULLABLE | Action parameter |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |

**Action Types:**
- ARCHIVE_CARD
- ADD_LABEL
- REMOVE_LABEL
- ASSIGN_MEMBER

**Relations:**
- Belongs to AutomationRule

---

### AutomationLog

Execution logs for automation rules.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | cuid | PRIMARY KEY | Unique log identifier |
| ruleId | String | FOREIGN KEY → AutomationRule.id | Parent rule |
| status | String | NOT NULL | SUCCESS or FAILURE |
| message | String | NULLABLE | Error/success message |
| createdAt | DateTime | DEFAULT now() | Execution timestamp |

**Relations:**
- Belongs to AutomationRule

---

## Relationships

### One-to-Many
- User → Workspaces
- User → Boards
- Workspace → Boards
- Board → Lists
- Board → Labels
- List → Cards
- Card → Comments
- Card → Checklists
- Checklist → ChecklistItems
- Card → Attachments

### Many-to-Many
- Users ↔ Workspaces (via WorkspaceMember)
- Users ↔ Boards (via BoardMember)
- Users ↔ Cards (via CardMember)
- Cards ↔ Labels (via CardLabel)

---

## Indexes

### Automatic Indexes (Primary Keys)
All primary keys are automatically indexed.

### Explicit Indexes

```prisma
@@index([token]) // Invitation.token
@@unique([workspaceId, userId]) // WorkspaceMember
@@unique([boardId, userId]) // BoardMember
@@unique([cardId, labelId]) // CardLabel
@@unique([cardId, userId]) // CardMember
@@unique([boardId, name]) // Label
```

### Recommended Additional Indexes

For performance optimization:

```sql
-- Board queries by workspace
CREATE INDEX idx_boards_workspace ON "Board"("workspaceId");

-- Card queries by list
CREATE INDEX idx_cards_list ON "Card"("listId");

-- Activity queries by board
CREATE INDEX idx_activities_board ON "Activity"("boardId", "createdAt" DESC);

-- Card search by title
CREATE INDEX idx_cards_title ON "Card" USING gin(to_tsvector('english', "title"));
```

---

## Migrations

### Running Migrations

```bash
# Create a new migration
npx prisma migrate dev --name add_new_field

# Apply migrations in production
npx prisma migrate deploy

# Reset database (DEV ONLY!)
npx prisma migrate reset
```

### Migration History

View migrations in `prisma/migrations/` directory.

### Schema Updates

1. Update `schema.prisma`
2. Run `npx prisma migrate dev`
3. Commit migration files
4. Deploy to production with `npx prisma migrate deploy`

---

## Prisma Studio

Interactive database GUI:

```bash
npx prisma studio
```

Opens on http://localhost:5555

---

## Database Backup

### Backup Commands

```bash
# Full backup
pg_dump -U postgres epitrello > backup.sql

# Restore
psql -U postgres epitrello < backup.sql

# Backup with compression
pg_dump -U postgres epitrello | gzip > backup.sql.gz
```

### Automated Backups

Recommended setup:
- Daily automated backups
- Retention: 30 days
- Off-site storage (S3, etc.)

---

## Query Optimization Tips

### Use `select` Instead of `include`

```typescript
// Bad - Fetches all fields
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: { boards: true }
});

// Good - Only fetch needed fields
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    name: true,
    boards: {
      select: { id: true, title: true }
    }
  }
});
```

### Filter at Database Level

```typescript
// Bad - Fetch all, filter in JS
const cards = await prisma.card.findMany({ where: { listId } });
const activeCards = cards.filter(c => !c.archived);

// Good - Filter in database
const activeCards = await prisma.card.findMany({
  where: { listId, archived: false }
});
```

### Use Connection Pooling

Already configured in `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Connection pooling enabled by default
}
```

---

## Performance Monitoring

### Prisma Query Logging

Enable in development:

```typescript
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

### Slow Query Analysis

```sql
-- Enable slow query logging in PostgreSQL
ALTER DATABASE epitrello SET log_min_duration_statement = 1000;

-- View slow queries
SELECT * FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```
