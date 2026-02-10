# Workspaces

Organize your projects and teams with EpiTrello workspaces.

## Table of Contents
- [Overview](#overview)
- [Creating Workspaces](#creating-workspaces)
- [Managing Members](#managing-members)
- [Roles & Permissions](#roles--permissions)
- [Settings](#settings)
- [Best Practices](#best-practices)

---

## Overview

Workspaces help you:
- Organize boards by team or project
- Manage team members and permissions
- Separate work contexts
- Control access to boards

### When to Use Workspaces

**Use separate workspaces for:**
- Different teams (Engineering, Marketing, Sales)
- Different clients/projects
- Personal vs. work projects
- Public vs. private boards

**Example structure:**
```
Personal Workspace
├── Personal Tasks
└── Side Projects

Work Workspace
├── Q1 Sprint
├── Bug Tracking
└── Documentation

Client Projects
├── Client A - Website
└── Client B - App
```

---

## Creating Workspaces

### Via UI

1. Click workspace switcher (top left)
2. Click "Create Workspace"
3. Fill in details:
   - **Title** (required) - e.g., "Engineering Team"
   - **Description** (optional) - Brief description
4. Click "Create"

### Via API

```http
POST /api/workspaces
Content-Type: application/json

{
  "title": "Engineering Team",
  "description": "Software development workspace"
}
```

**Response:**
```json
{
  "id": "workspace-id",
  "title": "Engineering Team",
  "description": "Software development workspace",
  "userId": "owner-id",
  "createdAt": "2025-01-01T00:00:00Z"
}
```

---

## Managing Members

### Inviting Members

**Via email:**
1. Open workspace settings
2. Go to "Members" tab
3. Click "Invite Member"
4. Enter email address
5. Select role (Admin, Editor, or Viewer)
6. Click "Send Invite"

**Via invite link:**
1. Workspace settings → Members
2. Click "Get Invite Link"
3. Set link expiration
4. Copy and share link

### Accepting Invitations

**For invitees:**
1. Check email for invitation
2. Click "Accept Invitation" link
3. Sign in or create account
4. Access workspace

### Viewing Members

**Members list shows:**
- Name and email
- Profile picture
- Role
- Join date
- Last active

**Filter members by:**
- Role
- Active/Inactive
- Join date

### Removing Members

**As admin:**
1. Workspace settings → Members
2. Find member
3. Click menu (⋯)
4. Click "Remove"
5. Confirm removal

**Effects:**
- Removed from workspace
- Removed from all boards in workspace
- Cannot access workspace boards
- Workspace data preserved

---

## Roles & Permissions

### Role Overview

| Permission | Admin | Editor | Viewer |
|------------|-------|--------|--------|
| View boards | ✅ | ✅ | ✅ |
| Create boards | ✅ | ✅ | ❌ |
| Edit boards | ✅ | ✅ | ❌ |
| Delete boards | ✅ | ❌ | ❌ |
| Invite members | ✅ | ❌ | ❌ |
| Change roles | ✅ | ❌ | ❌ |
| Workspace settings | ✅ | ❌ | ❌ |
| Delete workspace | ✅ | ❌ | ❌ |

### Admin Role

**Full workspace control:**
- Manage all boards
- Add/remove members
- Change member roles
- Configure workspace settings
- Delete workspace

**Use for:**
- Workspace owners
- Project managers
- Team leads

### Editor Role

**Can create and edit:**
- Create new boards
- Edit existing boards
- Add cards, lists, labels
- Invite members to boards
- Cannot delete workspace

**Use for:**
- Team members
- Contributors
- Regular users

### Viewer Role

**Read-only access:**
- View all boards
- View cards and details
- View comments
- Cannot make changes

**Use for:**
- Stakeholders
- Clients
- External observers
- Read-only access needs

### Changing Roles

**As admin:**
1. Workspace settings → Members
2. Find member
3. Click current role
4. Select new role
5. Confirm change

**Note:** Only admins can change roles

---

## Settings

### General Settings

**Workspace name:**
- Update anytime
- Visible to all members

**Description:**
- Optional workspace description
- Explain purpose/scope

**Workspace ID:**
- Unique identifier
- Used in URLs and API calls
- Cannot be changed

### Member Management

**Default role:**
- Role for new invitations
- Can be overridden per invite

**Member approval:**
- Require admin approval for invites
- Auto-approve trusted domains

**Member limits:**
- Set maximum members (if needed)
- Upgrade for unlimited

### Board Settings

**Default board visibility:**
- Workspace (default)
- Private
- Public (coming soon)

**Board permissions:**
- Who can create boards
- Who can delete boards
- Who can invite to boards

### Integrations

**Available integrations:**
- GitHub (link repositories)
- Slack (coming soon)
- Discord (coming soon)

**Configure:**
1. Settings → Integrations
2. Enable integration
3. Authenticate
4. Configure options

### Danger Zone

**Archive workspace:**
- Hide workspace
- Preserve all data
- Can be restored

**Delete workspace:**
- Permanent deletion
- Deletes all boards and cards
- Cannot be undone
- Requires confirmation

---

## Switching Workspaces

### Workspace Switcher

**Access:**
- Click workspace name (top left)
- Or press `W` (keyboard shortcut)

**Displays:**
- All your workspaces
- Recent workspaces
- Create new workspace option

**Quick switch:**
1. Open switcher
2. Click workspace name
3. Dashboard updates

---

## Best Practices

### Workspace Organization

**Keep it simple:**
- 1-5 workspaces per user
- Clear workspace names
- Document workspace purpose

**Naming conventions:**
```
✅ Good:
- "ACME Corp - Engineering"
- "Personal Projects"
- "Client: XYZ Inc"

❌ Avoid:
- "Workspace 1"
- "My Workspace"
- "Test"
```

### Member Management

**Invite intentionally:**
- Only invite necessary members
- Use appropriate roles
- Review members regularly

**Role assignment:**
- Start with Viewer role
- Promote to Editor as needed
- Limit Admins to trusted users

**Regular audits:**
- Review member list monthly
- Remove inactive members
- Update roles as needed

### Board Organization

**Categorize boards:**
- Group related boards
- Use consistent naming
- Archive old boards

**Examples:**
```
Product Team Workspace
├── Active Boards
│   ├── Sprint 2025-Q1
│   ├── Bug Tracking
│   └── Roadmap Planning
└── Archived
    └── Sprint 2024-Q4
```

### Security

**Access control:**
- Review permissions regularly
- Use least privilege principle
- Remove members promptly when needed

**Sensitive data:**
- Consider separate workspaces
- Limit access to admins
- Use appropriate board visibility

---

## Common Workflows

### Team Onboarding

1. **Create workspace** for team
2. **Set up boards:**
   - Team tasks
   - Onboarding checklist
   - Resources
3. **Invite team members** as Viewers initially
4. **Promote to Editor** after onboarding
5. **Assign Admin role** to team leads

### Client Projects

1. **Create dedicated workspace** per client
2. **Invite client** as Viewer
3. **Create project boards:**
   - Project timeline
   - Deliverables
   - Feedback
4. **Regular reviews** with client
5. **Archive workspace** when project complete

### Department Organization

1. **One workspace per department:**
   - Engineering
   - Marketing
   - Sales
2. **Department admins** manage boards
3. **Cross-functional boards** in shared workspace
4. **Regular sync** between departments

---

## API Reference

### List Workspaces

```http
GET /api/workspaces
```

**Response:**
```json
[
  {
    "id": "workspace-id",
    "title": "Engineering Team",
    "description": "Dev workspace",
    "createdAt": "2025-01-01T00:00:00Z",
    "members": [...]
  }
]
```

### Create Workspace

```http
POST /api/workspaces
Content-Type: application/json

{
  "title": "New Workspace",
  "description": "Workspace description"
}
```

### Update Workspace

```http
PUT /api/workspaces/{workspaceId}
Content-Type: application/json

{
  "title": "Updated Title",
  "description": "Updated description"
}
```

### Delete Workspace

```http
DELETE /api/workspaces/{workspaceId}
```

**Warning:** Deletes all boards and cards.

### Get Members

```http
GET /api/workspaces/{workspaceId}/members
```

**Response:**
```json
[
  {
    "id": "member-id",
    "userId": "user-id",
    "role": "ADMIN",
    "joinedAt": "2025-01-01T00:00:00Z",
    "user": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
]
```

### Add Member

```http
POST /api/workspaces/{workspaceId}/members
Content-Type: application/json

{
  "email": "newmember@example.com",
  "role": "EDITOR"
}
```

### Remove Member

```http
DELETE /api/workspaces/{workspaceId}/members/{memberId}
```

[Full API documentation →](../api.md)

---

## Troubleshooting

### Can't Create Workspace

**Possible causes:**
- Reached workspace limit
- Invalid workspace name
- Network error

**Solutions:**
- Check workspace limit
- Use different name
- Retry request

### Can't Invite Members

**Possible causes:**
- Not an admin
- Invalid email
- Member already invited

**Solutions:**
- Contact workspace admin
- Verify email address
- Check existing invitations

### Member Can't Access Workspace

**Possible causes:**
- Invitation not accepted
- User not logged in
- Removed from workspace

**Solutions:**
- Resend invitation
- Verify login
- Re-invite user

---

## Related Documentation

- [Boards & Cards](boards.md)
- [Roles & Permissions](../architecture.md#permissions)
- [API Reference](../api.md#workspaces)
- [Database Schema](../database.md#workspace)
