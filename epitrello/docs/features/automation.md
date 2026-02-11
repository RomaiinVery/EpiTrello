# Automation Rules

Automate repetitive tasks with EpiTrello's powerful automation engine.

## Table of Contents
- [Overview](#overview)
- [Creating Rules](#creating-rules)
- [Triggers](#triggers)
- [Actions](#actions)
- [Examples](#examples)
- [API Reference](#api-reference)

---

## Overview

Automation rules allow you to:
- Automatically move or archive cards
- Apply labels based on conditions
- Assign team members
- Track card progress
- Reduce manual work

### How It Works

```
Trigger → Condition → Action(s)
```

Example: "When a card is moved to 'Done', archive it and add 'Completed' label"

---

## Creating Rules

### Via UI

1. Open board settings
2. Go to "Automations" tab
3. Click "Create Rule"
4. Select trigger
5. Add actions
6. Save rule

### Anatomy of a Rule

```typescript
{
  triggerType: "CARD_MOVED_TO_LIST",
  triggerVal: "list-id",
  isActive: true,
  actions: [
    { type: "ARCHIVE_CARD" },
    { type: "ADD_LABEL", value: "label-id" }
  ]
}
```

---

## Triggers

### Card Moved to List

Trigger when a card is moved to a specific list.

**Use cases:**
- Archive completed cards
- Auto-label cards in "Review"
- Notify team when card reaches "Done"

**Configuration:**
```json
{
  "triggerType": "CARD_MOVED_TO_LIST",
  "triggerVal": "list-id"
}
```

### Card Labeled

Trigger when a specific label is added to a card.

**Use cases:**
- Move urgent cards to top
- Assign specific members to labeled cards
- Create GitHub issues for bugs

**Configuration:**
```json
{
  "triggerType": "CARD_LABELED",
  "triggerVal": "label-id"
}
```

### Card Due Date Reached

Trigger when a card's due date is reached.

**Use cases:**
- Send notifications
- Move to "Overdue" list
- Add "Late" label

**Configuration:**
```json
{
  "triggerType": "CARD_DUE_DATE_REACHED",
  "triggerVal": "0" // 0 = due today, 1 = due tomorrow, etc.
}
```

---

## Actions

### Archive Card

Automatically archive a card.

```json
{
  "type": "ARCHIVE_CARD"
}
```

**Example:** Archive cards moved to "Done"

### Add Label

Add a specific label to the card.

```json
{
  "type": "ADD_LABEL",
  "value": "label-id"
}
```

**Example:** Add "Completed" label when moved to "Done"

### Remove Label

Remove a specific label from the card.

```json
{
  "type": "REMOVE_LABEL",
  "value": "label-id"
}
```

**Example:** Remove "In Progress" when moved to "Done"

### Assign Member

Assign a team member to the card.

```json
{
  "type": "ASSIGN_MEMBER",
  "value": "user-id"
}
```

**Example:** Auto-assign QA lead to cards in "Testing"

---

## Examples

### Example 1: Auto-Complete Workflow

**Goal:** When card moves to "Done", mark as complete and archive.

```typescript
{
  triggerType: "CARD_MOVED_TO_LIST",
  triggerVal: "done-list-id",
  actions: [
    { type: "ADD_LABEL", value: "completed-label-id" },
    { type: "ARCHIVE_CARD" }
  ]
}
```

### Example 2: Bug Triage

**Goal:** When "Bug" label is added, move to "To Do" and assign QA.

```typescript
{
  triggerType: "CARD_LABELED",
  triggerVal: "bug-label-id",
  actions: [
    { type: "ASSIGN_MEMBER", value: "qa-user-id" },
    // Note: Moving cards requires custom action (future feature)
  ]
}
```

### Example 3: Urgent Priority

**Goal:** When "Urgent" label added, also add "High Priority".

```typescript
{
  triggerType: "CARD_LABELED",
  triggerVal: "urgent-label-id",
  actions: [
    { type: "ADD_LABEL", value: "high-priority-label-id" }
  ]
}
```

### Example 4: Overdue Alerts

**Goal:** When due date reached, add "Overdue" label.

```typescript
{
  triggerType: "CARD_DUE_DATE_REACHED",
  triggerVal: "0", // 0 days = today
  actions: [
    { type: "ADD_LABEL", value: "overdue-label-id" }
  ]
}
```

---

## API Reference

### Get Rules

```http
GET /api/boards/{boardId}/automations
```

**Response:**
```json
[
  {
    "id": "rule-id",
    "triggerType": "CARD_MOVED_TO_LIST",
    "triggerVal": "list-id",
    "isActive": true,
    "actions": [
      { "type": "ARCHIVE_CARD" }
    ]
  }
]
```

### Create Rule

```http
POST /api/boards/{boardId}/automations
```

**Request Body:**
```json
{
  "triggerType": "CARD_MOVED_TO_LIST",
  "triggerVal": "done-list-id",
  "actions": [
    { "type": "ADD_LABEL", "value": "completed-label-id" }
  ]
}
```

### Update Rule

```http
PUT /api/boards/{boardId}/automations/{ruleId}
```

### Delete Rule

```http
DELETE /api/boards/{boardId}/automations/{ruleId}
```

### View Logs

```http
GET /api/boards/{boardId}/automations/logs
```

**Response:**
```json
[
  {
    "id": "log-id",
    "ruleId": "rule-id",
    "status": "SUCCESS",
    "message": "Archived card 'Task 1'",
    "createdAt": "2025-01-01T00:00:00Z"
  }
]
```

---

## Best Practices

### 1. Test Rules First
- Create rule with `isActive: false`
- Test manually
- Enable once verified

### 2. Avoid Conflicts
- Don't create contradicting rules
- Example: Don't auto-archive AND auto-move same card

### 3. Keep It Simple
- One trigger per rule
- Max 3-4 actions per rule
- Break complex workflows into multiple rules

### 4. Monitor Logs
- Check automation logs regularly
- Debug failed automations
- Adjust rules based on logs

### 5. Use Clear Names
- Name rules descriptively
- Document complex workflows
- Comment on purpose

---

## Limitations

### Current Limitations
- No conditional logic (if/else)
- No custom scripts
- Limited to predefined actions
- No time-based triggers (except due dates)
- No cross-board automations

### Future Features
- Custom JavaScript actions
- Complex conditions (AND/OR)
- Multi-board automations
- Time-based triggers (daily, weekly)
- Integration triggers (GitHub, Slack)

---

## Troubleshooting

### Rule Not Triggering

**Check:**
- Rule is active (`isActive: true`)
- Trigger condition matches exactly
- Board ID is correct
- Permissions are correct

### Action Failed

**Common causes:**
- Invalid label/user ID
- Card already archived
- Permission issues

**Solution:**
- Check automation logs
- Verify IDs in actions
- Test manually

### Performance Issues

**If automations are slow:**
- Reduce number of rules
- Simplify actions
- Check database indexes

---

## Examples by Use Case

### Sprint Management

**Close Sprint:**
```typescript
// Move to "Done" → Archive + Label "Sprint 1"
{
  triggerType: "CARD_MOVED_TO_LIST",
  triggerVal: "done-list-id",
  actions: [
    { type: "ADD_LABEL", value: "sprint-1-label" },
    { type: "ARCHIVE_CARD" }
  ]
}
```

### Support Tickets

**Assign Support:**
```typescript
// Label "Support" → Assign support team
{
  triggerType: "CARD_LABELED",
  triggerVal: "support-label-id",
  actions: [
    { type: "ASSIGN_MEMBER", value: "support-lead-id" }
  ]
}
```

### Code Review

**Ready for Review:**
```typescript
// Move to "Review" → Add "Needs Review" label
{
  triggerType: "CARD_MOVED_TO_LIST",
  triggerVal: "review-list-id",
  actions: [
    { type: "ADD_LABEL", value: "needs-review-label" }
  ]
}
```

---

## Advanced: Custom Automations

Want more control? Use the API to create custom automation workflows:

```typescript
// Example: Custom automation with webhook
async function customAutomation(card: Card) {
  // Your custom logic
  if (card.title.includes('[URGENT]')) {
    await addLabel(card.id, 'urgent-label-id');
    await assignMember(card.id, 'manager-id');
    await sendSlackNotification(card);
  }
}
```

---

## Related Documentation

- [API Documentation](../api.md#automations)
- [Database Schema](../database.md#automationrule)
- [Architecture](../architecture.md)
