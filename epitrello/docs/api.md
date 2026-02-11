# API Documentation

Complete reference for EpiTrello REST API endpoints.

## Table of Contents
- [Authentication](#authentication)
- [Workspaces](#workspaces)
- [Boards](#boards)
- [Lists](#lists)
- [Cards](#cards)
- [Labels](#labels)
- [Comments](#comments)
- [Checklists](#checklists)
- [Attachments](#attachments)
- [Activities](#activities)
- [Automations](#automations)
- [User](#user)
- [Search](#search)

---

## Base URL

```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

## Authentication

All API requests (except auth endpoints) require authentication via NextAuth session cookie.

### Error Responses

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

Common status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## Authentication

### Register

```http
POST /api/register
```

**Request Body**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe"
}
```

**Response** `201`
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "message": "Verification email sent"
}
```

### Verify Email

```http
GET /api/verify?code=verification-code&email=user@example.com
```

### Forgot Password

```http
POST /api/auth/forgot-password
```

**Request Body**
```json
{
  "email": "user@example.com"
}
```

### Reset Password

```http
POST /api/auth/reset-password
```

**Request Body**
```json
{
  "token": "reset-token",
  "password": "newpassword123"
}
```

---

## Workspaces

### Get All Workspaces

```http
GET /api/workspaces
```

**Response** `200`
```json
[
  {
    "id": "workspace-id",
    "title": "My Workspace",
    "description": "Team workspace",
    "createdAt": "2025-01-01T00:00:00Z",
    "userId": "owner-id",
    "members": [
      {
        "id": "member-id",
        "userId": "user-id",
        "role": "ADMIN",
        "user": {
          "id": "user-id",
          "name": "John Doe",
          "email": "john@example.com"
        }
      }
    ]
  }
]
```

### Create Workspace

```http
POST /api/workspaces
```

**Request Body**
```json
{
  "title": "New Workspace",
  "description": "Optional description"
}
```

**Response** `201`
```json
{
  "id": "workspace-id",
  "title": "New Workspace",
  "description": "Optional description",
  "createdAt": "2025-01-01T00:00:00Z",
  "userId": "owner-id"
}
```

### Get Workspace

```http
GET /api/workspaces/{workspaceId}
```

### Update Workspace

```http
PUT /api/workspaces/{workspaceId}
```

**Request Body**
```json
{
  "title": "Updated Title",
  "description": "Updated description"
}
```

### Delete Workspace

```http
DELETE /api/workspaces/{workspaceId}
```

### Add Workspace Member

```http
POST /api/workspaces/{workspaceId}/members
```

**Request Body**
```json
{
  "email": "newmember@example.com",
  "role": "EDITOR"
}
```

Roles: `ADMIN`, `EDITOR`, `VIEWER`

### Remove Workspace Member

```http
DELETE /api/workspaces/{workspaceId}/members/{memberId}
```

---

## Boards

### Get All Boards

```http
GET /api/boards
```

**Query Parameters**
- `workspaceId` (optional) - Filter by workspace

**Response** `200`
```json
[
  {
    "id": "board-id",
    "title": "Project Board",
    "description": "Main project board",
    "background": "#1e293b",
    "createdAt": "2025-01-01T00:00:00Z",
    "workspaceId": "workspace-id",
    "workspace": {
      "id": "workspace-id",
      "title": "My Workspace"
    }
  }
]
```

### Create Board

```http
POST /api/boards
```

**Request Body**
```json
{
  "title": "New Board",
  "description": "Optional description",
  "workspaceId": "workspace-id",
  "background": "#1e293b"
}
```

### Get Board

```http
GET /api/boards/{boardId}
```

**Response** `200`
```json
{
  "id": "board-id",
  "title": "Project Board",
  "lists": [
    {
      "id": "list-id",
      "title": "To Do",
      "position": 0,
      "cards": [
        {
          "id": "card-id",
          "title": "Task 1",
          "position": 0,
          "labels": [...],
          "members": [...]
        }
      ]
    }
  ],
  "labels": [...],
  "members": [...]
}
```

### Update Board

```http
PUT /api/boards/{boardId}
```

**Request Body**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "background": "#3b82f6"
}
```

### Delete Board

```http
DELETE /api/boards/{boardId}
```

### Add Board Member

```http
POST /api/boards/{boardId}/members
```

**Request Body**
```json
{
  "email": "member@example.com",
  "role": "EDITOR"
}
```

### Get Board Analytics

```http
GET /api/boards/{boardId}/analytics
```

**Query Parameters**
- `startDate` (optional) - ISO date
- `endDate` (optional) - ISO date

**Response** `200`
```json
{
  "totalCards": 45,
  "completedCards": 30,
  "overdueCards": 3,
  "cardsPerList": {
    "To Do": 10,
    "In Progress": 5,
    "Done": 30
  },
  "activityChart": [
    { "date": "2025-01-01", "cards": 5 },
    { "date": "2025-01-02", "cards": 8 }
  ]
}
```

### Export Analytics

```http
GET /api/boards/{boardId}/analytics/export
```

Returns CSV file.

---

## Lists

### Create List

```http
POST /api/boards/{boardId}/lists
```

**Request Body**
```json
{
  "title": "New List",
  "position": 0
}
```

### Update List

```http
PUT /api/boards/{boardId}/lists/{listId}
```

**Request Body**
```json
{
  "title": "Updated Title"
}
```

### Delete List

```http
DELETE /api/boards/{boardId}/lists/{listId}
```

### Reorder Lists

```http
POST /api/boards/{boardId}/lists/reorder
```

**Request Body**
```json
{
  "listIds": ["list-1", "list-2", "list-3"]
}
```

---

## Cards

### Create Card

```http
POST /api/boards/{boardId}/lists/{listId}/cards
```

**Request Body**
```json
{
  "title": "New Task",
  "content": "Task description",
  "position": 0,
  "dueDate": "2025-02-01T00:00:00Z",
  "startDate": "2025-01-15T00:00:00Z"
}
```

### Get Card

```http
GET /api/boards/{boardId}/lists/{listId}/cards/{cardId}
```

**Response** `200`
```json
{
  "id": "card-id",
  "title": "Task",
  "content": "Description",
  "position": 0,
  "dueDate": "2025-02-01T00:00:00Z",
  "coverImage": "https://...",
  "labels": [...],
  "members": [...],
  "comments": [...],
  "checklists": [...],
  "attachments": [...],
  "activities": [...]
}
```

### Update Card

```http
PUT /api/boards/{boardId}/lists/{listId}/cards/{cardId}
```

**Request Body** (all fields optional)
```json
{
  "title": "Updated Title",
  "content": "Updated content",
  "coverImage": "https://...",
  "dueDate": "2025-02-01T00:00:00Z",
  "isDone": true
}
```

### Move Card

```http
PATCH /api/boards/{boardId}/lists/{listId}/cards/{cardId}
```

**Request Body**
```json
{
  "listId": "new-list-id",
  "position": 2
}
```

### Delete Card

```http
DELETE /api/boards/{boardId}/lists/{listId}/cards/{cardId}
```

### Archive Card

```http
POST /api/boards/{boardId}/lists/{listId}/cards/{cardId}/archive
```

### Reorder Cards

```http
POST /api/boards/{boardId}/lists/{listId}/cards/reorder
```

**Request Body**
```json
{
  "cardIds": ["card-1", "card-2", "card-3"]
}
```

---

## Labels

### Create Label

```http
POST /api/boards/{boardId}/labels
```

**Request Body**
```json
{
  "name": "Bug",
  "color": "#ef4444"
}
```

### Update Label

```http
PUT /api/boards/{boardId}/labels/{labelId}
```

### Delete Label

```http
DELETE /api/boards/{boardId}/labels/{labelId}
```

### Add Label to Card

```http
POST /api/boards/{boardId}/lists/{listId}/cards/{cardId}/labels
```

**Request Body**
```json
{
  "labelId": "label-id"
}
```

### Remove Label from Card

```http
DELETE /api/boards/{boardId}/lists/{listId}/cards/{cardId}/labels/{labelId}
```

---

## Comments

### Get Comments

```http
GET /api/boards/{boardId}/lists/{listId}/cards/{cardId}/comments
```

### Create Comment

```http
POST /api/boards/{boardId}/lists/{listId}/cards/{cardId}/comments
```

**Request Body**
```json
{
  "content": "This is a comment"
}
```

### Update Comment

```http
PUT /api/boards/{boardId}/lists/{listId}/cards/{cardId}/comments/{commentId}
```

**Request Body**
```json
{
  "content": "Updated comment"
}
```

### Delete Comment

```http
DELETE /api/boards/{boardId}/lists/{listId}/cards/{cardId}/comments/{commentId}
```

---

## Checklists

### Create Checklist

```http
POST /api/boards/{boardId}/lists/{listId}/cards/{cardId}/checklists
```

**Request Body**
```json
{
  "title": "Checklist Title",
  "position": 0
}
```

### Update Checklist

```http
PUT /api/boards/{boardId}/lists/{listId}/cards/{cardId}/checklists/{checklistId}
```

### Delete Checklist

```http
DELETE /api/boards/{boardId}/lists/{listId}/cards/{cardId}/checklists/{checklistId}
```

### Add Checklist Item

```http
POST /api/boards/{boardId}/lists/{listId}/cards/{cardId}/checklists/{checklistId}/items
```

**Request Body**
```json
{
  "text": "Item text",
  "position": 0
}
```

### Update Checklist Item

```http
PUT /api/boards/{boardId}/lists/{listId}/cards/{cardId}/checklists/{checklistId}/items/{itemId}
```

**Request Body**
```json
{
  "text": "Updated text",
  "checked": true
}
```

### Delete Checklist Item

```http
DELETE /api/boards/{boardId}/lists/{listId}/cards/{cardId}/checklists/{checklistId}/items/{itemId}
```

---

## Attachments

### Upload Attachment

```http
POST /api/boards/{boardId}/lists/{listId}/cards/{cardId}/attachments
Content-Type: multipart/form-data
```

**Form Data**
- `file` - File to upload (max 10MB)

**Response** `201`
```json
{
  "id": "attachment-id",
  "name": "file.pdf",
  "url": "https://res.cloudinary.com/...",
  "type": "application/pdf",
  "size": 1024567,
  "createdAt": "2025-01-01T00:00:00Z"
}
```

### Delete Attachment

```http
DELETE /api/boards/{boardId}/lists/{listId}/cards/{cardId}/attachments/{attachmentId}
```

---

## Activities

### Get Board Activities

```http
GET /api/boards/{boardId}/activities
```

**Query Parameters**
- `limit` (default: 50) - Number of activities
- `offset` (default: 0) - Pagination offset

**Response** `200`
```json
[
  {
    "id": "activity-id",
    "type": "CARD_CREATED",
    "description": "John created card 'Task 1'",
    "createdAt": "2025-01-01T00:00:00Z",
    "user": {
      "id": "user-id",
      "name": "John Doe"
    },
    "card": {
      "id": "card-id",
      "title": "Task 1"
    }
  }
]
```

Activity types:
- `CARD_CREATED`
- `CARD_UPDATED`
- `CARD_MOVED`
- `CARD_ARCHIVED`
- `COMMENT_ADDED`
- `MEMBER_ADDED`
- `LABEL_ADDED`
- etc.

---

## Automations

### Get Automation Rules

```http
GET /api/boards/{boardId}/automations
```

### Create Automation Rule

```http
POST /api/boards/{boardId}/automations
```

**Request Body**
```json
{
  "triggerType": "CARD_MOVED_TO_LIST",
  "triggerVal": "done-list-id",
  "actions": [
    {
      "type": "ARCHIVE_CARD"
    },
    {
      "type": "ADD_LABEL",
      "value": "label-id"
    }
  ]
}
```

Trigger types:
- `CARD_MOVED_TO_LIST`
- `CARD_DUE_DATE_REACHED`
- `CARD_LABELED`

Action types:
- `ARCHIVE_CARD`
- `ADD_LABEL`
- `REMOVE_LABEL`
- `ASSIGN_MEMBER`

### Update Automation Rule

```http
PUT /api/boards/{boardId}/automations/{ruleId}
```

### Delete Automation Rule

```http
DELETE /api/boards/{boardId}/automations/{ruleId}
```

### Get Automation Logs

```http
GET /api/boards/{boardId}/automations/logs
```

---

## User

### Get Profile

```http
GET /api/user/profile
```

### Update Profile

```http
PUT /api/user/profile
```

**Request Body**
```json
{
  "name": "John Doe",
  "theme": "dark"
}
```

### Upload Profile Image

```http
POST /api/user/profile-image
Content-Type: multipart/form-data
```

**Form Data**
- `file` - Image file

### Get Notifications

```http
GET /api/user/notifications
```

**Response** `200`
```json
[
  {
    "id": "notif-id",
    "type": "CARD_ASSIGNED",
    "message": "You were assigned to 'Task 1'",
    "read": false,
    "createdAt": "2025-01-01T00:00:00Z",
    "card": { ... }
  }
]
```

### Mark Notification as Read

```http
PATCH /api/user/notifications/{notificationId}
```

### Get User Stats

```http
GET /api/user/stats
```

**Response** `200`
```json
{
  "totalBoards": 5,
  "totalCards": 42,
  "cardsAssigned": 12,
  "cardsCompleted": 8,
  "activityLast7Days": 23
}
```

### Get User Tasks

```http
GET /api/user/tasks
```

Returns all cards assigned to the user.

---

## Search

### Global Search

```http
GET /api/search
```

**Query Parameters**
- `q` (required) - Search query
- `type` (optional) - `boards`, `cards`, `all` (default)
- `workspaceId` (optional) - Limit to workspace

**Response** `200`
```json
{
  "boards": [
    {
      "id": "board-id",
      "title": "Matching Board",
      "workspace": { ... }
    }
  ],
  "cards": [
    {
      "id": "card-id",
      "title": "Matching Card",
      "board": { ... }
    }
  ]
}
```

---

## GitHub Integration

### Connect GitHub

```http
GET /api/auth/github/authorize
```

Redirects to GitHub OAuth.

### Get GitHub Repositories

```http
GET /api/user/github/repos
```

### Create GitHub Issue from Card

```http
POST /api/boards/{boardId}/lists/{listId}/cards/{cardId}/github/issue
```

**Request Body**
```json
{
  "repo": "owner/repo",
  "title": "Issue title",
  "body": "Issue description"
}
```

### Create Pull Request

```http
POST /api/boards/{boardId}/lists/{listId}/cards/{cardId}/github/pr
```

**Request Body**
```json
{
  "repo": "owner/repo",
  "branch": "feature-branch",
  "baseBranch": "main",
  "title": "PR title",
  "body": "PR description"
}
```

---

## AI Chatbot

### Send Message to Bot

```http
POST /api/bot
```

**Request Body**
```json
{
  "message": "What tasks are due this week?",
  "boardId": "board-id"
}
```

**Response** `200`
```json
{
  "response": "You have 3 tasks due this week: ...",
  "suggestions": [
    "Show overdue tasks",
    "Create a new task"
  ]
}
```

---

## Rate Limiting

Currently not implemented. Planned limits:
- 100 requests/minute per user
- 1000 requests/hour per user

---

## Webhooks (Planned)

```http
POST /api/webhooks
```

**Request Body**
```json
{
  "url": "https://your-server.com/webhook",
  "events": ["CARD_CREATED", "CARD_UPDATED"],
  "boardId": "board-id"
}
```
