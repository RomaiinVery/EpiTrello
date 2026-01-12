# EpiTrello - Feature Development Plan

## Current State Analysis

### ✅ Already Implemented
- **Authentication**: NextAuth.js with email/password
- **Boards**: Create, read, update, delete, share
- **Lists**: Create, rename, delete, reorder (drag & drop)
- **Cards**: Create, rename, delete, reorder (drag & drop), basic content
- **Card Details Modal**: Full card modal with title, description editing
- **Card Labels/Tags**: Create labels, assign to cards, display on cards
- **Assigned Members**: Assign board members to cards, display avatars
- **Card Cover Images**: Upload and display cover images on cards
- **Database**: User, Board, List, Card, Label, CardLabel, CardMember models with relationships
- **UI Components**: Basic shadcn/ui components (Button, Dialog, Input, Card, Dropdown)
- **Drag & Drop**: @dnd-kit for lists and cards

### ❌ Missing Core Features
- Due dates (skipped/removed)
- Workspaces/Teams
- Comments system
- Checklists
- Attachments
- Search and filtering
- Board customization (backgrounds, colors)
- Activity/History tracking
- Real-time updates
- Better mobile experience

---

## Feature Roadmap

### 🎯 Phase 1: Core Card Features (HIGH PRIORITY)
**Goal**: Make cards functional and informative like Trello

#### 1.1 Card Details Modal
- [x] **Backend**: Create card detail API endpoint (`GET /api/boards/[boardId]/cards/[cardId]`)
- [x] **Backend**: Update card API to handle full card data
- [x] **Frontend**: Create `CardModal` component
- [x] **Frontend**: Click card to open modal
- [x] **Frontend**: Modal layout with sidebar for actions
- [x] **UI**: Add close button, backdrop, animations

#### 1.2 Card Description
- [x] **Database**: Already have `content` field (can use as description)
- [x] **Frontend**: Rich text editor in card modal (or textarea for now)
- [x] **Frontend**: Show description preview on card (truncated)
- [x] **Frontend**: Edit description in modal

#### 1.3 Card Labels/Tags
- [x] **Database**: Create `Label` model (id, name, color, boardId)
- [x] **Database**: Create `CardLabel` junction table
- [x] **Backend**: API for labels (CRUD)
- [x] **Backend**: API to add/remove labels from cards
- [x] **Frontend**: Label picker component in card modal
- [x] **Frontend**: Display labels on card (colored chips)
- [x] **Frontend**: Create/edit labels in board settings

#### 1.4 Due Dates
- [x] **Database**: Add `dueDate` field to Card model
- [x] **Backend**: Update card API to handle due dates
- [x] **Frontend**: Date picker in card modal
- [x] **Frontend**: Show due date on card with visual indicator (overdue = red)
- [x] **Frontend**: Calendar icon with date

#### 1.5 Assigned Members
- [x] **Database**: Create `CardMember` junction table (cardId, userId)
- [x] **Backend**: API to assign/unassign members to cards
- [x] **Frontend**: Member picker in card modal (show board members)
- [x] **Frontend**: Display member avatars on card
- [x] **Frontend**: Show "Assigned to" in card modal

#### 1.6 Card Cover Images
- [x] **Database**: Add `coverImage` field to Card (URL or file path)
- [x] **Backend**: File upload API (or use external service like Cloudinary)
- [x] **Frontend**: Image upload in card modal
- [x] **Frontend**: Display cover image at top of card
- [x] **Frontend**: Remove/change cover image

---

### 🎯 Phase 2: Collaboration Features (HIGH PRIORITY)
**Goal**: Enable team collaboration

#### 2.1 Comments System
- [ ] **Database**: Create `Comment` model (id, content, cardId, userId, createdAt)
- [ ] **Backend**: API for comments (POST, GET, DELETE)
- [ ] **Frontend**: Comments section in card modal
- [ ] **Frontend**: Add comment form
- [ ] **Frontend**: Display comments with author, timestamp
- [ ] **Frontend**: Edit/delete own comments

#### 2.2 Activity Log
- [ ] **Database**: Create `Activity` model (id, type, description, cardId, boardId, userId, createdAt)
- [ ] **Backend**: Log activities (card created, moved, assigned, etc.)
- [ ] **Backend**: API to fetch activity for card/board
- [ ] **Frontend**: Activity feed in card modal
- [ ] **Frontend**: Activity feed in board view (optional sidebar)

#### 2.3 Checklists
- [ ] **Database**: Create `Checklist` model (id, title, cardId, position)
- [ ] **Database**: Create `ChecklistItem` model (id, text, checked, checklistId, position)
- [ ] **Backend**: API for checklists (CRUD)
- [ ] **Backend**: API for checklist items (CRUD, toggle)
- [ ] **Frontend**: Checklist component in card modal
- [ ] **Frontend**: Add/edit/delete checklists
- [ ] **Frontend**: Add/edit/delete items, toggle checked state
- [ ] **Frontend**: Show progress on card (e.g., "3/5")

#### 2.4 Attachments
- [ ] **Database**: Create `Attachment` model (id, name, url, type, cardId, userId, createdAt)
- [ ] **Backend**: File upload API (handle images, PDFs, etc.)
- [ ] **Backend**: API to manage attachments
- [ ] **Frontend**: Attachments section in card modal
- [ ] **Frontend**: Upload files (drag & drop or button)
- [ ] **Frontend**: Display attachments (preview images, download links)
- [ ] **Frontend**: Delete attachments

---

### 🎯 Phase 3: Board Enhancement (MEDIUM PRIORITY)
**Goal**: Make boards more customizable and functional

#### 3.1 Board Backgrounds
- [ ] **Database**: Add `background` field to Board (color or image URL)
- [ ] **Backend**: Update board API
- [ ] **Frontend**: Background picker in board settings
- [ ] **Frontend**: Apply background to board view
- [ ] **Frontend**: Preset colors and patterns

#### 3.2 Board Settings
- [ ] **Frontend**: Board settings modal/page
- [ ] **Frontend**: Change board title/description
- [ ] **Frontend**: Change background
- [ ] **Frontend**: Manage members (add/remove)
- [ ] **Frontend**: Board visibility (private/workspace/public)
- [ ] **Frontend**: Archive board
- [ ] **Frontend**: Delete board

#### 3.3 Board Templates
- [ ] **Database**: Add `isTemplate` field to Board
- [ ] **Backend**: API to create board from template
- [ ] **Frontend**: Template gallery
- [ ] **Frontend**: Create board from template

---

### 🎯 Phase 4: Workspaces/Teams (MEDIUM PRIORITY)
**Goal**: Organize boards into workspaces

#### 4.1 Workspace Model
- [ ] **Database**: Create `Workspace` model (id, name, description, ownerId)
- [ ] **Database**: Create `WorkspaceMember` model (workspaceId, userId, role)
- [ ] **Database**: Add `workspaceId` to Board model
- [ ] **Backend**: Workspace CRUD APIs
- [ ] **Backend**: Workspace member management APIs

#### 4.2 Workspace UI
- [ ] **Frontend**: Workspace switcher in sidebar/navbar
- [ ] **Frontend**: Workspace page (list boards in workspace)
- [ ] **Frontend**: Create workspace
- [ ] **Frontend**: Workspace settings
- [ ] **Frontend**: Invite members to workspace

#### 4.3 Workspace Roles
- [ ] **Backend**: Role-based permissions (Owner, Admin, Member, Guest)
- [ ] **Backend**: Permission checks in APIs
- [ ] **Frontend**: Show role badges
- [ ] **Frontend**: Role management UI

---

### 🎯 Phase 5: Search & Filtering (MEDIUM PRIORITY)
**Goal**: Help users find cards quickly

#### 5.1 Search
- [ ] **Backend**: Search API (search cards by title, content, labels)
- [ ] **Frontend**: Search bar in navbar
- [ ] **Frontend**: Search results page
- [ ] **Frontend**: Highlight search terms

#### 5.2 Filters
- [ ] **Frontend**: Filter by label
- [ ] **Frontend**: Filter by member
- [ ] **Frontend**: Filter by due date
- [ ] **Frontend**: Filter by checklist completion
- [ ] **Frontend**: Clear filters button

#### 5.3 Board Views
- [ ] **Frontend**: List view (all cards in one list)
- [ ] **Frontend**: Calendar view (cards by due date)
- [ ] **Frontend**: Table view (spreadsheet-like)

---

### 🎯 Phase 6: UI/UX Enhancements (MEDIUM PRIORITY)
**Goal**: Polish the interface

#### 6.1 Card Design Improvements
- [ ] **Frontend**: Better card styling (shadows, hover effects)
- [ ] **Frontend**: Show labels on card preview
- [ ] **Frontend**: Show member avatars on card
- [ ] **Frontend**: Show due date badge on card
- [ ] **Frontend**: Show checklist progress on card
- [ ] **Frontend**: Card hover preview (quick view)

#### 6.2 Drag & Drop Enhancements
- [ ] **Frontend**: Better visual feedback during drag
- [ ] **Frontend**: Drop zones highlight
- [ ] **Frontend**: Smooth animations
- [ ] **Frontend**: Drag multiple cards (optional)

#### 6.3 Keyboard Shortcuts
- [ ] **Frontend**: Keyboard shortcuts modal (press `?`)
- [ ] **Frontend**: Shortcuts: `n` (new card), `e` (edit), `Esc` (close), etc.

#### 6.4 Mobile Responsiveness
- [ ] **Frontend**: Better mobile layout
- [ ] **Frontend**: Touch-friendly drag & drop
- [ ] **Frontend**: Mobile-optimized card modal
- [ ] **Frontend**: Responsive sidebar

#### 6.5 Sidebar Enhancement
- [ ] **Frontend**: Functional sidebar with board list
- [ ] **Frontend**: Recent boards
- [ ] **Frontend**: Favorites
- [ ] **Frontend**: Workspace navigation

---

### 🎯 Phase 7: Advanced Features (LOW PRIORITY)
**Goal**: Power user features

#### 7.1 Real-time Updates
- [ ] **Backend**: WebSocket server (or use Pusher/Ably)
- [ ] **Backend**: Broadcast card/list changes
- [ ] **Frontend**: WebSocket client
- [ ] **Frontend**: Real-time card updates
- [ ] **Frontend**: Show "user is typing" indicators

#### 7.2 Notifications
- [ ] **Database**: Create `Notification` model
- [ ] **Backend**: Notification system
- [ ] **Backend**: Email notifications (optional)
- [ ] **Frontend**: Notification bell in navbar
- [ ] **Frontend**: Notification center

#### 7.3 Automation
- [ ] **Database**: Create `Automation` model (rules)
- [ ] **Backend**: Automation engine
- [ ] **Frontend**: Automation builder UI
- [ ] **Frontend**: Pre-built automation templates

#### 7.4 Power-ups/Integrations
- [ ] **Backend**: Integration framework
- [ ] **Frontend**: Integration marketplace
- [ ] **Examples**: GitHub, Slack, Google Drive

---

## Database Schema Updates Needed

### New Models to Create:
```prisma
model Label {
  id        String   @id @default(cuid())
  name      String
  color     String   
  boardId   String
  board     Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)
  cards     CardLabel[]
  createdAt DateTime @default(now())
}

model CardLabel {
  id      String @id @default(cuid())
  cardId  String
  card    Card   @relation(fields: [cardId], references: [id], onDelete: Cascade)
  labelId String
  label   Label  @relation(fields: [labelId], references: [id], onDelete: Cascade)
  
  @@unique([cardId, labelId])
}

model CardMember {
  id     String @id @default(cuid())
  cardId String
  card   Card   @relation(fields: [cardId], references: [id], onDelete: Cascade)
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([cardId, userId])
}

model Comment {
  id        String   @id @default(cuid())
  content   String
  cardId    String
  card      Card     @relation(fields: [cardId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Checklist {
  id        String         @id @default(cuid())
  title     String
  cardId    String
  card      Card           @relation(fields: [cardId], references: [id], onDelete: Cascade)
  position  Int
  items     ChecklistItem[]
  createdAt DateTime       @default(now())
}

model ChecklistItem {
  id          String    @id @default(cuid())
  text        String
  checked     Boolean   @default(false)
  checklistId String
  checklist   Checklist @relation(fields: [checklistId], references: [id], onDelete: Cascade)
  position    Int
  createdAt   DateTime  @default(now())
}

model Attachment {
  id        String   @id @default(cuid())
  name      String
  url       String
  type      String   // 'image', 'pdf', 'file'
  cardId    String
  card      Card     @relation(fields: [cardId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
}

model Activity {
  id          String   @id @default(cuid())
  type        String   // 'card_created', 'card_moved', 'member_added', etc.
  description String
  cardId      String?
  card        Card?    @relation(fields: [cardId], references: [id], onDelete: Cascade)
  boardId     String
  board       Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
}

model Workspace {
  id          String            @id @default(cuid())
  name        String
  description String?
  ownerId     String
  owner       User              @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  members     WorkspaceMember[]
  boards      Board[]
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
}

model WorkspaceMember {
  id          String    @id @default(cuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  role        String    // 'owner', 'admin', 'member', 'guest'
  createdAt   DateTime  @default(now())
  
  @@unique([workspaceId, userId])
}
```

### Updates to Existing Models:
```prisma
model User {
  // ... existing fields
  comments      Comment[]
  attachments   Attachment[]
  activities    Activity[]
  cardMembers   CardMember[]
  workspaces    Workspace[]      @relation("WorkspaceOwner")
  workspaceMembers WorkspaceMember[]
}

model Board {
  // ... existing fields
  background    String?
  workspaceId   String?
  workspace     Workspace?        @relation(fields: [workspaceId], references: [id], onDelete: SetNull)
  labels        Label[]
  activities    Activity[]
}

model Card {
  // ... existing fields
  dueDate       DateTime?
  coverImage    String?
  labels        CardLabel[]
  members       CardMember[]
  comments      Comment[]
  checklists    Checklist[]
  attachments   Attachment[]
  activities    Activity[]
}
```

---

## API Endpoints Needed

### Card Details
- `GET /api/boards/[boardId]/cards/[cardId]` - Get full card details
- `PUT /api/boards/[boardId]/cards/[cardId]` - Update card (description, dueDate, etc.)

### Labels
- `GET /api/boards/[boardId]/labels` - Get all labels for board
- `POST /api/boards/[boardId]/labels` - Create label
- `PUT /api/boards/[boardId]/labels/[labelId]` - Update label
- `DELETE /api/boards/[boardId]/labels/[labelId]` - Delete label
- `POST /api/boards/[boardId]/cards/[cardId]/labels` - Add label to card
- `DELETE /api/boards/[boardId]/cards/[cardId]/labels/[labelId]` - Remove label from card

### Members
- `POST /api/boards/[boardId]/cards/[cardId]/members` - Assign member to card
- `DELETE /api/boards/[boardId]/cards/[cardId]/members/[userId]` - Unassign member

### Comments
- `GET /api/boards/[boardId]/cards/[cardId]/comments` - Get comments
- `POST /api/boards/[boardId]/cards/[cardId]/comments` - Add comment
- `PUT /api/boards/[boardId]/cards/[cardId]/comments/[commentId]` - Update comment
- `DELETE /api/boards/[boardId]/cards/[cardId]/comments/[commentId]` - Delete comment

### Checklists
- `GET /api/boards/[boardId]/cards/[cardId]/checklists` - Get checklists
- `POST /api/boards/[boardId]/cards/[cardId]/checklists` - Create checklist
- `PUT /api/boards/[boardId]/checklists/[checklistId]` - Update checklist
- `DELETE /api/boards/[boardId]/checklists/[checklistId]` - Delete checklist
- `POST /api/boards/[boardId]/checklists/[checklistId]/items` - Add item
- `PUT /api/boards/[boardId]/checklist-items/[itemId]` - Update item (toggle, rename)
- `DELETE /api/boards/[boardId]/checklist-items/[itemId]` - Delete item

### Attachments
- `GET /api/boards/[boardId]/cards/[cardId]/attachments` - Get attachments
- `POST /api/boards/[boardId]/cards/[cardId]/attachments` - Upload attachment
- `DELETE /api/boards/[boardId]/attachments/[attachmentId]` - Delete attachment

### Activity
- `GET /api/boards/[boardId]/activity` - Get board activity
- `GET /api/boards/[boardId]/cards/[cardId]/activity` - Get card activity

### Workspaces
- `GET /api/workspaces` - Get user's workspaces
- `POST /api/workspaces` - Create workspace
- `GET /api/workspaces/[workspaceId]` - Get workspace
- `PUT /api/workspaces/[workspaceId]` - Update workspace
- `DELETE /api/workspaces/[workspaceId]` - Delete workspace
- `GET /api/workspaces/[workspaceId]/members` - Get members
- `POST /api/workspaces/[workspaceId]/members` - Add member
- `DELETE /api/workspaces/[workspaceId]/members/[userId]` - Remove member

### Search
- `GET /api/search?q=query&boardId=...` - Search cards

---

## UI Components Needed

### New Components to Create:
1. **CardModal** - Full card details view
2. **LabelPicker** - Select/create labels
3. **MemberPicker** - Select members to assign
4. **DatePicker** - Choose due dates
5. **CommentList** - Display and add comments
6. **ChecklistComponent** - Manage checklists
7. **AttachmentList** - Display and upload attachments
8. **ActivityFeed** - Show activity log
9. **SearchBar** - Global search
10. **FilterPanel** - Filter cards
11. **WorkspaceSwitcher** - Switch between workspaces
12. **BoardSettings** - Board configuration

### Components to Enhance:
1. **CardItem** - Add labels, members, due date badges
2. **Sidebar** - Make functional with board list
3. **Navbar** - Add search, notifications

---

## Implementation Priority

### 🔴 Critical (Do First)
1. Card Details Modal
2. Card Description editing
3. Labels on cards
4. Due dates
5. Assigned members

### 🟡 Important (Do Second)
6. Comments
7. Checklists
8. Attachments
9. Activity log
10. Board backgrounds

### 🟢 Nice to Have (Do Third)
11. Workspaces
12. Search & filters
13. Real-time updates
14. Notifications
15. Automation

---

## Estimated Timeline

- **Phase 1**: 2-3 weeks
- **Phase 2**: 2-3 weeks
- **Phase 3**: 1-2 weeks
- **Phase 4**: 2 weeks
- **Phase 5**: 1-2 weeks
- **Phase 6**: 2-3 weeks
- **Phase 7**: 3-4 weeks (optional)

**Total**: ~12-18 weeks for full feature set

---

## Next Steps

1. **Start with Phase 1.1**: Create Card Details Modal
2. **Then Phase 1.2-1.6**: Add all card features
3. **Then Phase 2**: Add collaboration features
4. **Iterate**: Get user feedback and adjust priorities

---

## Notes

- Focus on one feature at a time
- Test each feature before moving to next
- Keep UI consistent with existing design
- Use existing shadcn/ui components when possible
- Follow existing code patterns
- Write clean, maintainable code

