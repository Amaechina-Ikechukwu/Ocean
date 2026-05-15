# Security Spec

## Data Invariants
- A workspace can only be read or written by its `ownerId`.
- A page belongs to a workspace and can only be modified by the workspace owner.
- A block belongs to a page and can only be modified by the workspace owner.
- `ownerId` must correspond to `request.auth.uid`.

## Dirty Dozen Payloads
1. Create workspace with `ownerId` of another user (Identity spoofing).
2. Update workspace `ownerId` to someone else (Privilege Escalation).
3. Create page in another user's workspace.
4. Add block to another user's page.
5. Create workspace with missing `ownerId`.
6. Update a `deleted` page to a non-boolean value (Value Poisoning).
7. Create block with 1.5MB string content (Resource poisoning).
8. Read workspace without being signed in (Unauthorized read).
9. Read page without owning the workspace (Unauthorized read).
10. Update block without `type` field (Shadow update).
11. Update workspace adding a ghost field `isAdmin` (Shadow update).
12. Attempt to list pages without specifying `workspaceId` matching current user (Query trust violation).

## Test Runner
See `firestore.rules.test.ts`.
