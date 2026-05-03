# Colony v1 Test Report

**Test Date:** [DATE]
**Commit:** [HASH]
**Tester:** [NAME]

---

## Build Verification

- [ ] Build succeeds
- [ ] TypeScript passes
- [ ] Lint passes

---

## Core Flows

### 1. Create Colony
- [ ] Colony creates with 3 seats (Planner, Worker, Reviewer)
- [ ] Grammar strip shows correctly

### 2. Session Binding
- [ ] Create session for Planner → Link appears
- [ ] Create session for Worker → Link appears  
- [ ] Create session for Reviewer → Link appears
- [ ] Open session buttons work

### 3. Model Selection
- [ ] Model dropdown appears on each seat card
- [ ] Selecting model updates seat preference
- [ ] Linked session model updates when synced

### 4. Task Management
- [ ] Create task → Appears in task board
- [ ] Assign task to seat → Assignment badge appears
- [ ] Change task status → Status badge updates
- [ ] Delete task → Removed from board

### 5. Handoff Creation
- [ ] Create Planner → Worker handoff
- [ ] Context load badge appears (Light/Medium/Heavy)
- [ ] Copy prompt → Copies to clipboard
- [ ] Status changes to "Copied"

### 6. Reviewer Workflow
- [ ] Create Worker → Reviewer handoff
- [ ] Copy prompt
- [ ] Approve button appears (only after copy)
- [ ] Click Approve → Badge shows "Approved"
- [ ] Reject with note → Badge shows "Rejected" + note appears

### 7. Evidence/Activity
- [ ] Activity logs events correctly
- [ ] Click activity row → Evidence panel opens
- [ ] Panel shows: event type, timestamp, role, task, details, handoff ID

### 8. Context Budget
- [ ] Handoff shows Light/Medium/Heavy badge
- [ ] Task trace shows context load

### 9. Reset Colony
- [ ] Reset clears all tasks
- [ ] Reset clears all handoffs
- [ ] Reset clears activity
- [ ] Seats return to unbound state

---

## Bugs Found

| # | Description | Severity | Status |
|---|-------------|----------|--------|
|   |               |          |        |

---

## Test Notes

<!-- Add free-form notes here -->

---

## Final Verdict

- [ ] **PASS** - Ready for use
- [ ] **FAIL** - Needs fixes before release

---

## Screenshots

<!-- Add screenshots of key flows -->