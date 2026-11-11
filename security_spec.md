# Security Specification: Paisa Bharo

## 1. Data Invariants
1. **User Profile Isolation**: Users can only read and write their own profile document (`/users/{userId}` where `userId == request.auth.uid`). Non-owners and unauthenticated users cannot read user profiles.
2. **Privilege Escalation Prevention**: Users cannot self-escalate (`isAdmin`, `role`, `isSuperadmin`, `permissions` fields are strictly forbidden from incoming client payloads).
3. **Wallet Field Tamper-Proofing**: Clients cannot write or update wallet fields (`coinsBalance`, `lifetimeEarnings`, `streakDays`, `lastCheckInDate`). All coin allocations, deductions, and streak computations are executed strictly server-side inside Firestore transactions.
4. **Ledger Audit Immutability**: All client writes to `/user_transactions/{txId}` are denied (`allow write: if false;`). Users can only read transactions where `resource.data.userId == request.auth.uid`. Admins can read all transactions.
5. **Redemption Lockdown**: All client writes (`create`, `update`, `delete`) to `/redemptions/{redemptionId}` are denied (`allow write: if false;`). Redemptions are created exclusively through the callable `requestRedemption` Cloud Function with server-side atomic balance verification, and reviewed exclusively through `reviewRedemption`.
6. **Trusted Rejection Refund Process**: When an admin rejects a redemption via `reviewRedemption`, the spent coins are atomically refunded back to the user's `coinsBalance`, an audit credit is recorded in `user_transactions` with `reason: "redemption_refund"`, and `refunded: true` is locked on the redemption document.
7. **Referral Uniqueness**: Referral codes cannot be applied more than once per user. Uniqueness is enforced atomically using dedicated durable lock documents in `/referral_claims/{userId}`. Client direct writes to `/referral_claims` are completely blocked (`allow write: if false;`).
8. **Rate Limiting**: Sliding-window rate limiters defend the Express API against brute force and replay attacks: 120 req/min for general `/api/*`, 30 req/min for `/api/callbacks/*` and `/api/postbacks/*`, and 25 req/min for `/api/deals/click`.

## 2. The "Dirty Dozen" Payloads (Denial Expected)
1. **Ghost Field Escalation**: Client update with `{ "isAdmin": true }` or `{ "role": "admin" }` on `/users/{userId}` -> *DENIED*.
2. **Direct Wallet Balance Manipulation**: Client creating or updating `/users/{userId}` with `{ "coinsBalance": 999999 }` -> *DENIED*.
3. **Forged Profile Ownership**: Client setting `{ "uid": "other_user_id" }` in user creation -> *DENIED*.
4. **Cross-Tenant PII Read**: Authenticated user attempting to read another user's document at `/users/{otherId}` -> *DENIED*.
5. **Unauthorized Ledger Injection**: Direct client write to `/user_transactions/{txId}` -> *DENIED*.
6. **Direct Redemption Document Creation**: Direct client create payload to `/redemptions/{redemptionId}` -> *DENIED*.
7. **Redemption State Forging**: Client updating pending redemption to `{ "status": "completed" }` -> *DENIED*.
8. **Replay Referral Claim**: User attempting to claim referral reward multiple times or forge claim document in `/referral_claims` -> *DENIED*.
9. **Direct Scratch Card Claim Forging**: Direct client write to `/scratch_cards/{cardId}` -> *DENIED*.
10. **Public Content Vandalism**: Non-admin attempting to delete or edit public polls in `/polls/{pollId}` -> *DENIED*.
11. **Spoofed Poll Vote**: User submitting vote with `userId` of another user -> *DENIED*.
12. **System Settings Modification**: Non-admin attempting to modify `/system_settings/global_config` -> *DENIED*.

## 3. Automated Test Verification
Automated test suites in `tests/` verify both rules and functions:
- `tests/firestore.rules.test.ts`: Asserts default-deny, write locks on transactions, redemptions, scratch cards, referral claims, and profile isolation.
- `tests/cloudFunctions.test.ts`: Asserts daily check-in consecutive streak rules, timezone normalization, poll voting bounds, redemption deduction, rejection refunds, admin coin adjustments, and referral uniqueness.
- `tests/rateLimiter.test.ts`: Asserts memory rate limiter sliding window, 429 status code handling, headers, and reset timing.
