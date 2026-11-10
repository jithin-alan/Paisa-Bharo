# Security Specification: Paisa Bharo

## 1. Data Invariants
1. Users can only read and write their own profile document (`/users/{userId}` where `userId == request.auth.uid`).
2. Users cannot self-escalate or arbitrarily inflate coins outside valid validated action constraints.
3. Every poll vote (`/poll_votes/{voteId}`) must have `incoming().userId == request.auth.uid`.
4. Polls (`/polls/{pollId}`) and Offers (`/offers/{offerId}`) can be read publicly or by signed in users, but can only be modified by admins.
5. User tasks (`/user_tasks/{taskId}`) must belong to the requesting user (`incoming().userId == request.auth.uid`).
6. Redemptions (`/redemptions/{redemptionId}`) must be created by the authenticated owner (`incoming().userId == request.auth.uid`) with `status == 'pending'` and positive `coinsSpent`.
7. Once created, redemptions cannot be modified by regular users to avoid double-spend or status forging.

## 2. The "Dirty Dozen" Payloads (Denial Expected)
1. Ghost field update on user document (e.g. `{ "isAdmin": true }`).
2. Forged userId on user creation (`{ "uid": "other_user_id" }`).
3. Reading another user's private profile document.
4. Non-admin modifying poll options or reward coins.
5. User submitting a poll vote on behalf of another user (`userId: "victim_id"`).
6. User submitting a redemption with negative `coinsSpent` (e.g. `{ "coinsSpent": -1000 }`).
7. User setting redemption status directly to `"completed"` without admin/server approval.
8. Injection of oversized junk payload (>128 chars in IDs or >500 chars in titles).
9. Updating an immutable `createdAt` timestamp.
10. Unauthenticated write to `/poll_votes/{voteId}`.
11. Unauthenticated write to `/redemptions/{redemptionId}`.
12. Attempting to delete public polls.
