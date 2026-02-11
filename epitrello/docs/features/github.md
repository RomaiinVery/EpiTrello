# GitHub Integration

Seamlessly connect your boards with GitHub repositories for enhanced project management.

## Table of Contents
- [Overview](#overview)
- [Setup](#setup)
- [Features](#features)
- [Linking Cards to Issues](#linking-cards-to-issues)
- [Creating Pull Requests](#creating-pull-requests)
- [Syncing](#syncing)
- [Best Practices](#best-practices)

---

## Overview

EpiTrello's GitHub integration allows you to:
- Link boards to GitHub repositories
- Create GitHub issues from cards
- Create branches and pull requests
- Sync issue status with cards
- Track development progress

---

## Setup

### 1. Connect Your GitHub Account

**Via UI:**
1. Go to Settings → Integrations
2. Click "Connect GitHub"
3. Authorize EpiTrello on GitHub
4. Select repositories to grant access

**What's stored:**
- GitHub username
- Access token (encrypted)
- Avatar URL

### 2. Link Repository to Board

**Via Board Settings:**
1. Open board settings
2. Go to "GitHub" tab
3. Select repository from dropdown
4. Choose default branch (e.g., `main`)
5. Save settings

**Result:**
- Board is now linked to repo
- Can create issues/PRs from cards
- Sync capabilities enabled

---

## Features

### Card → GitHub Issue

Convert any card into a GitHub issue.

**How:**
1. Open card modal
2. Click "GitHub" → "Create Issue"
3. Review/edit title and description
4. Click "Create"

**What happens:**
- Issue created on GitHub
- Issue URL linked to card
- Issue number displayed on card
- Card and issue synced

**Example:**
```
Card: "Add user authentication"
↓
GitHub Issue #42: "Add user authentication"
Description: [Card content]
Labels: [Card labels mapped to GitHub labels]
```

### Card → GitHub Branch

Create a feature branch from a card.

**How:**
1. Open card
2. Click "GitHub" → "Create Branch"
3. Enter branch name (auto-suggested)
4. Select base branch
5. Click "Create"

**Naming convention:**
```
feature/card-title-kebab-case
fix/card-title-kebab-case
```

**Example:**
```
Card: "Fix login bug"
→ Branch: "fix/fix-login-bug"
```

### Card → Pull Request

Create a PR linked to the card.

**How:**
1. Open card
2. Click "GitHub" → "Create Pull Request"
3. Select source branch
4. Select target branch (default: main)
5. Edit PR title/description
6. Click "Create"

**PR Template:**
```markdown
## Description
[Card description]

## Related Card
[Link to EpiTrello card]

## Checklist
- [ ] Tests added
- [ ] Documentation updated
```

---

## Linking Cards to Issues

### Auto-Link on Creation

When creating an issue from a card:
- Card stores issue number and URL
- Issue stores card link in description
- Bidirectional link established

### Manual Linking

Link existing GitHub issue to card:

**Method 1: Via Card**
1. Open card
2. Click "GitHub" → "Link Issue"
3. Enter issue number
4. Click "Link"

**Method 2: Via Issue Description**
Add to issue description:
```markdown
EpiTrello Card: https://epitrello.com/boards/xxx/cards/yyy
```

### Unlinking

Remove link between card and issue:
1. Open card
2. Click issue badge
3. Click "Unlink"

---

## Creating Pull Requests

### From Card

**Prerequisites:**
- Branch created from card or manually
- Commits pushed to branch

**Steps:**
1. Open card
2. Click "Create Pull Request"
3. Fill PR details:
   - Title (auto-filled from card)
   - Description (includes card content)
   - Base branch (e.g., `main`)
   - Head branch (your feature branch)
4. Create PR

**PR Description Template:**
```markdown
## Summary
[Card title]

## Description
[Card description]

## Changes
- List of changes

## Testing
How to test

## Related Card
[Card link]

## Screenshots
(if applicable)
```

### PR Status on Card

Once PR is created:
- PR badge appears on card
- Shows PR status (open, merged, closed)
- Click to open PR on GitHub

**Status Indicators:**
- 🟢 Open
- 🟣 Merged
- 🔴 Closed

---

## Syncing

### Issue → Card Sync

When GitHub issue is updated:
- Issue title → Card title (optional)
- Issue status → Card status
- Issue closed → Card archived (optional)

**Enable sync:**
Board Settings → GitHub → Enable issue sync

### Card → Issue Sync

When card is updated:
- Card moved to "Done" → Close issue
- Card archived → Close issue
- Card title changed → Update issue

**Configure:**
Board Settings → GitHub → Sync preferences

### Webhooks (Advanced)

For real-time sync:
1. Go to GitHub repo settings
2. Add webhook: `https://your-domain.com/api/webhooks/github`
3. Select events:
   - Issues
   - Pull requests
4. Save

**Events handled:**
- Issue opened/closed
- PR opened/merged
- Comments added

---

## Best Practices

### 1. Consistent Naming

**Branch names:**
```
feature/add-user-auth
fix/login-redirect-bug
chore/update-dependencies
```

**PR titles:**
```
feat: add user authentication
fix: resolve login redirect bug
docs: update API documentation
```

### 2. Link Early

Link cards to issues at the start:
- Better tracking
- Easier collaboration
- Clearer development flow

### 3. Use Labels

Map EpiTrello labels to GitHub labels:
- Bug → bug
- Feature → enhancement
- Urgent → priority: high

### 4. Automation

Set up automations:
```typescript
// When card labeled "Ready for Dev" → Create issue
{
  triggerType: "CARD_LABELED",
  triggerVal: "ready-for-dev-label",
  actions: [
    { type: "CREATE_GITHUB_ISSUE" }
  ]
}
```

### 5. Team Workflow

Example workflow:
1. Create card for new feature
2. Discuss in card comments
3. Label as "Ready for Dev"
4. Create GitHub issue from card
5. Developer creates branch
6. Code, commit, push
7. Create PR from card
8. Code review
9. Merge PR
10. Card auto-moved to "Done"

---

## Permissions

### Required GitHub Permissions

EpiTrello OAuth app requires:
- Read repository metadata
- Read/write issues
- Read/write pull requests
- Read/write repository contents (for branches)

### Board-Level Permissions

- **Admins**: Can link/unlink repos, create issues/PRs
- **Editors**: Can create issues/PRs from cards
- **Viewers**: Can view linked issues/PRs

---

## Troubleshooting

### Can't Create Issue

**Error:** "Permission denied"

**Solutions:**
1. Reconnect GitHub account
2. Check repository permissions
3. Ensure repo is selected in OAuth

### Branch Creation Failed

**Error:** "Branch already exists"

**Solutions:**
1. Use different branch name
2. Delete existing branch on GitHub
3. Pull latest changes

### PR Creation Failed

**Error:** "No commits between branches"

**Solutions:**
1. Ensure you've pushed commits
2. Check base branch is correct
3. Verify branch exists on GitHub

### Sync Not Working

**Issues:**
- Card updates not reflecting on GitHub
- GitHub updates not syncing to card

**Solutions:**
1. Check sync is enabled in board settings
2. Verify webhook is configured (if using)
3. Check GitHub token is valid
4. Re-link repository

---

## API Reference

### Get Linked Repositories

```http
GET /api/user/github/repos
```

**Response:**
```json
[
  {
    "id": 123,
    "name": "my-repo",
    "full_name": "username/my-repo",
    "private": false
  }
]
```

### Create Issue from Card

```http
POST /api/boards/{boardId}/lists/{listId}/cards/{cardId}/github/issue
```

**Request:**
```json
{
  "repo": "username/repo",
  "title": "Card title",
  "body": "Card description",
  "labels": ["bug", "enhancement"]
}
```

### Create PR from Card

```http
POST /api/boards/{boardId}/lists/{listId}/cards/{cardId}/github/pr
```

**Request:**
```json
{
  "repo": "username/repo",
  "title": "PR title",
  "body": "PR description",
  "head": "feature/branch-name",
  "base": "main"
}
```

### Get Branches

```http
GET /api/boards/{boardId}/github/branches?repo=username/repo
```

---

## Examples

### Example 1: Bug Tracking

**Workflow:**
1. User reports bug → Card created
2. Label card as "Bug"
3. Create GitHub issue
4. Developer creates branch
5. Fixes bug
6. Creates PR from card
7. Merge PR → Card auto-archived

### Example 2: Feature Development

**Workflow:**
1. Plan feature in card
2. Add checklist of tasks
3. Create GitHub issue
4. Break into multiple branches
5. Create PRs for each part
6. Track progress on card
7. Mark done when all merged

### Example 3: Sprint Planning

**Workflow:**
1. Create cards for sprint backlog
2. Bulk create issues from cards
3. Developers pick issues
4. Create branches from cards
5. Daily standup: check PR status on cards
6. Sprint end: Archive completed cards

---

## Advanced: GitHub Actions Integration

Trigger EpiTrello actions from GitHub Actions:

```yaml
# .github/workflows/epitrello-sync.yml
name: EpiTrello Sync
on:
  pull_request:
    types: [opened, closed]

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Update EpiTrello Card
        run: |
          curl -X POST https://epitrello.com/api/webhooks/github \
            -H "Content-Type: application/json" \
            -d '{"action": "pr_${{ github.event.action }}", "pr": "${{ github.event.pull_request.number }}"}'
```

---

## Related Documentation

- [API Documentation](../api.md#github-integration)
- [Automation Rules](automation.md)
- [Architecture](../architecture.md)
