# Boards & Cards

Complete guide to working with boards and cards in EpiTrello.

## Table of Contents
- [Boards](#boards)
- [Lists](#lists)
- [Cards](#cards)
- [Labels](#labels)
- [Members](#members)
- [Views](#views)

---

## Boards

### Creating a Board

**Via UI:**
1. Navigate to workspace
2. Click "Create Board"
3. Fill in details:
   - Title (required)
   - Description (optional)
   - Background color/image
4. Click "Create"

**Via API:**
```http
POST /api/boards
Content-Type: application/json

{
  "title": "My Project",
  "description": "Project management board",
  "workspaceId": "workspace-id",
  "background": "#1e293b"
}
```

### Board Settings

Access via board menu → Settings

**General:**
- Board title
- Description
- Background
- Visibility

**Members:**
- Invite team members
- Manage roles (Admin, Editor, Viewer)
- Remove members

**GitHub:**
- Link repository
- Configure sync settings
- Default branch

**Automations:**
- Create automation rules
- View automation logs
- Enable/disable rules

**Danger Zone:**
- Archive board
- Delete board (permanent)

### Board Backgrounds

**Solid Colors:**
- Slate, Gray, Zinc, Neutral
- Red, Orange, Yellow, Green, Blue, Purple

**Gradients:**
- Twilight (purple-blue)
- Ocean (blue-cyan)
- Sunset (orange-pink)
- Forest (green-emerald)

**Custom:**
- Upload image
- Use URL
- Cloudinary integration

### Board Templates

Create reusable board templates:

**Popular templates:**
- Kanban Board
- Sprint Planning
- Bug Tracking
- Content Calendar
- Personal Tasks

**Create template:**
1. Set up board structure
2. Board menu → Save as Template
3. Name and describe template
4. Share with workspace

---

## Lists

### Creating Lists

**Via UI:**
1. Click "Add List" on board
2. Enter title (e.g., "To Do", "In Progress", "Done")
3. Press Enter or click "Add"

**Common list names:**
- Backlog → To Do → In Progress → Review → Done
- Ideas → Planning → Doing → Testing → Deployed
- New → Active → Resolved → Closed

### Reordering Lists

**Drag & Drop:**
1. Click and hold list header
2. Drag to new position
3. Release to drop

**Keyboard:**
1. Focus list
2. Press Alt + ← / → to move

### List Actions

**Menu options:**
- Rename list
- Copy list
- Move all cards
- Archive all cards
- Delete list

### List Limits

**Recommended:**
- 3-7 lists per board
- Keep names short (< 15 chars)
- Use consistent naming

---

## Cards

### Creating Cards

**Quick create:**
1. Click "Add Card" in list
2. Type title
3. Press Enter

**Full create:**
1. Click "Add Card"
2. Enter title
3. Press Shift + Enter to open modal
4. Add details (description, labels, due date, etc.)
5. Save

### Card Details

#### Title
- Click to edit
- Auto-saves on blur
- Max 255 characters

#### Description
- Markdown supported
- Rich text editor
- @mentions (coming soon)
- Preview mode

**Markdown examples:**
```markdown
# Heading
**bold** *italic*
- List item
[Link](https://example.com)
`code`
```

#### Cover Image
- Upload from computer
- Max 10MB
- Supported: JPG, PNG, GIF
- Stored on Cloudinary

**Add cover:**
1. Open card
2. Click "Cover" in actions
3. Upload or paste URL
4. Position and zoom

#### Labels
- Color-coded tags
- Create at board level
- Assign multiple per card
- Click to filter

**Label colors:**
- Red, Orange, Yellow, Green
- Blue, Purple, Pink, Gray

#### Due Date
- Set deadline
- Visual indicators:
  - 🟢 Not due yet
  - 🟡 Due soon (< 24h)
  - 🔴 Overdue

**Set due date:**
1. Open card
2. Click "Due Date"
3. Select date/time
4. Save

#### Members
- Assign team members
- Multiple assignees
- Shows avatars on card

**Assign member:**
1. Open card
2. Click "Members"
3. Select from list
4. Save

### Checklists

Track subtasks within cards.

**Create checklist:**
1. Open card
2. Click "Checklist"
3. Name checklist (e.g., "Implementation")
4. Add items

**Checklist features:**
- Mark items complete
- Show progress (3/5)
- Reorder items
- Delete items
- Multiple checklists per card

**Example:**
```
Implementation
☑ Setup database schema
☑ Create API endpoints
☐ Build UI components
☐ Write tests
☐ Deploy to staging
Progress: 2/5 (40%)
```

### Comments

Discuss cards with your team.

**Add comment:**
1. Open card
2. Scroll to comments
3. Type comment (markdown supported)
4. Click "Comment" or press Cmd/Ctrl + Enter

**Features:**
- Edit your comments
- Delete your comments
- @mention members (coming soon)
- Emoji reactions (coming soon)

### Attachments

Attach files to cards.

**Upload file:**
1. Open card
2. Click "Attach"
3. Select file or drag & drop
4. Wait for upload

**Limits:**
- Max 10MB per file
- Unlimited attachments per card
- Supported: images, PDFs, docs, etc.

**Actions:**
- Download
- Delete
- Set as cover image (images only)

### Activity Log

View complete history of card changes.

**Tracked events:**
- Card created/updated
- Moved between lists
- Member assigned/removed
- Label added/removed
- Comment added
- Due date changed
- Attachment added/removed

**Filter by:**
- All activity
- Comments only
- Updates only

### Card Actions

**Available actions:**
- Move to list
- Copy card
- Archive card
- Delete card
- Subscribe to notifications
- Create GitHub issue
- Create branch/PR

---

## Labels

### Creating Labels

**Via board settings:**
1. Board menu → Labels
2. Click "Create Label"
3. Choose color
4. Enter name (e.g., "Bug", "Feature")
5. Save

**Predefined colors:**
```
🔴 Red      - Urgent, Critical
🟠 Orange   - High Priority
🟡 Yellow   - Medium Priority
🟢 Green    - Low Priority, Enhancement
🔵 Blue     - Information, Documentation
🟣 Purple   - Design, UI/UX
🌸 Pink     - Testing, QA
⚫ Gray     - Blocked, On Hold
```

### Managing Labels

**Edit label:**
1. Board menu → Labels
2. Click label
3. Update name/color
4. Save

**Delete label:**
- Removes from all cards
- Cannot be undone
- Use with caution

### Using Labels

**Add to card:**
1. Open card
2. Click "Labels"
3. Select labels
4. Close picker

**Filter by label:**
1. Click label anywhere on board
2. Board shows only cards with that label
3. Click again to clear filter

### Label Best Practices

**Naming:**
- Keep names short
- Use consistent naming
- Consider using prefixes:
  - `Priority: High`
  - `Type: Bug`
  - `Status: Blocked`

**Color coding:**
- Use colors consistently
- Red = urgent/important
- Green = done/approved
- Yellow = warning/in-progress

---

## Members

### Adding Members to Board

**Via invite:**
1. Board menu → Members
2. Click "Invite"
3. Enter email
4. Select role
5. Send invite

**Via workspace:**
- Workspace members can be added
- Inherit permissions

### Member Roles

**Admin:**
- Full board access
- Manage settings
- Add/remove members
- Delete board

**Editor:**
- Create/edit cards
- Add comments
- Upload attachments
- Cannot delete board

**Viewer:**
- View board
- View cards
- Cannot edit

### Member Actions

**Assign to card:**
1. Open card
2. Click "Members"
3. Select member
4. Save

**Remove from board:**
1. Board menu → Members
2. Click member
3. Click "Remove"
4. Confirm

---

## Views

### Kanban View (Default)

Traditional board view with lists and cards.

**Features:**
- Drag and drop
- Horizontal scrolling
- Card previews
- Quick actions

### Gantt View

Timeline visualization of cards with dates.

**Access:**
Board menu → Gantt View

**Features:**
- Timeline chart
- Date ranges
- Dependencies (coming soon)
- Milestones (coming soon)

**Requires:**
- Cards must have start/due dates
- Shows cards with dates only

### Calendar View (Coming Soon)

Cards displayed on calendar by due date.

**Planned features:**
- Month/week/day views
- Drag to change dates
- Color-coded by label
- Recurring tasks

### Table View (Coming Soon)

Spreadsheet-like view of all cards.

**Planned features:**
- Sortable columns
- Filterable rows
- Bulk edit
- Export to CSV

---

## Keyboard Shortcuts

### Navigation
- `B` - Open boards menu
- `?` - Show shortcuts
- `Esc` - Close modal
- `/` - Focus search

### Card Actions
- `N` - New card
- `E` - Edit card
- `T` - Edit title
- `D` - Set due date
- `L` - Add label
- `M` - Add member
- `C` - Archive card

### Drag & Drop
- `Drag` - Move card
- `Alt + Drag` - Copy card
- Hold `Shift` - Select multiple

---

## Filtering & Sorting

### Filter Cards

**By label:**
- Click label on board
- Or use filter menu

**By member:**
- Filter menu → Members
- Select member

**By due date:**
- No due date
- Overdue
- Due next day
- Due next week

**By status:**
- Active cards
- Archived cards
- Completed cards

### Sort Cards

**Sort options:**
- Manual (drag & drop)
- Newest first
- Oldest first
- Due date
- Alphabetical

---

## Best Practices

### Board Organization

**Keep it simple:**
- 3-7 lists maximum
- Clear list names
- Logical flow

**Regular maintenance:**
- Archive completed cards
- Update labels
- Review overdue tasks
- Clean up old boards

### Card Management

**Descriptive titles:**
✅ Good: "Fix login redirect bug"
❌ Bad: "Bug"

**Use checklists:**
- Break down complex tasks
- Track progress
- Stay organized

**Set due dates:**
- For time-sensitive tasks
- Set reminders
- Review regularly

**Add details:**
- Clear description
- Acceptance criteria
- Links to resources

### Team Collaboration

**Communication:**
- Use comments for discussions
- @mention team members
- Keep everyone in loop

**Assignments:**
- Assign responsible person
- Don't overload team members
- Balance workload

**Labels:**
- Consistent usage
- Clear meanings
- Document label system

---

## Common Workflows

### Sprint Planning

1. Create lists: Backlog, Sprint, In Progress, Review, Done
2. Add sprint goals as cards in Backlog
3. Move cards to Sprint list
4. Team picks cards (In Progress)
5. Complete work
6. Move to Review
7. After review → Done
8. At sprint end: Archive Done cards

### Bug Tracking

1. Create lists: New, Confirmed, In Progress, Testing, Resolved
2. New bug reported → Create card in New
3. Triage: Label severity, assign owner
4. Move to Confirmed if valid
5. Developer fixes → In Progress
6. QA tests → Testing
7. Verified → Resolved
8. Archive after release

### Content Calendar

1. Create lists: Ideas, Drafts, Review, Scheduled, Published
2. Brainstorm → Ideas
3. Start writing → Drafts
4. Peer review → Review
5. Add publish date → Scheduled
6. After publish → Published
7. View in Gantt for timeline

---

## Troubleshooting

### Card won't drag

**Solutions:**
- Refresh page
- Check permissions (need Editor role)
- Try keyboard shortcuts

### Images not loading

**Solutions:**
- Check internet connection
- Verify Cloudinary credentials
- Try different browser

### Can't edit card

**Possible causes:**
- Viewer role (no edit permission)
- Card archived
- Board locked

**Solutions:**
- Ask admin for Editor role
- Unarchive card
- Check board settings

---

## API Reference

### Boards

```http
# List boards
GET /api/boards

# Get board
GET /api/boards/{boardId}

# Create board
POST /api/boards

# Update board
PUT /api/boards/{boardId}

# Delete board
DELETE /api/boards/{boardId}
```

### Cards

```http
# Create card
POST /api/boards/{boardId}/lists/{listId}/cards

# Get card
GET /api/boards/{boardId}/lists/{listId}/cards/{cardId}

# Update card
PUT /api/boards/{boardId}/lists/{listId}/cards/{cardId}

# Delete card
DELETE /api/boards/{boardId}/lists/{listId}/cards/{cardId}
```

[Full API docs →](../api.md)

---

## Related Documentation

- [Architecture](../architecture.md)
- [Database Schema](../database.md)
- [Automation Rules](automation.md)
- [GitHub Integration](github.md)
