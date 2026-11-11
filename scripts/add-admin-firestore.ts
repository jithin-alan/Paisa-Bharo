/**
 * Admin Access Management Documentation
 *
 * SECURITY NOTE: Admin access is now controlled exclusively via Firebase Auth custom claims.
 * The 'admin' custom claim must be set server-side using the set-admin-claims.js script.
 *
 * Admin authentication mechanisms (in order of precedence):
 * 1. Firebase Auth custom claims (admin: true) - AUTHORITATIVE SOURCE
 * 2. (Email-based detection and local override have been REMOVED as security vulnerabilities)
 *
 * ============================================
 * GRANTING ADMIN ACCESS
 * ============================================
 *
 * Use the set-admin-claims.js script:
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json \
 *   node scripts/set-admin-claims.js admin@example.com
 *
 * This will:
 * 1. Look up the user by email in Firebase Auth
 * 2. Set the 'admin' custom claim to true
 * 3. The user will have admin access on next token refresh
 *
 * ============================================
 * REVOKE ADMIN ACCESS
 * ============================================
 *
 *   node scripts/set-admin-claims.js admin@example.com --remove
 *
 * ============================================
 * ADMIN FUNCTIONS
 * ============================================
 *
 * The following Cloud Functions now check custom claims:
 * - awardCoins: Checks `request.auth.token.admin === true`
 *
 * Firestore rules check custom claims:
 * - `isAdmin()` function checks `request.auth.token.admin == true`
 *
 * Frontend uses the useIsAdmin() hook:
 * - Checks `user.getIdTokenResult().claims.admin === true`
 * - This hook is used to protect admin features and data listeners
 *
 * ============================================
 * REMOVED INSECURE MECHANISMS
 * ============================================
 *
 * The following have been REMOVED for security:
 * 1. Hardcoded admin email detection in Firestore rules
 *    (was: request.auth.token.email == 'admin@paisabharo.com')
 *
 * 2. Admin checks via Firestore admins collection
 *    (was: exists(/databases/$(database)/documents/admins/$(request.auth.uid))
 *
 * 3. Local loginAsAdmin() override in frontend
 *    (was: creating admin session via localStorage, bypassing Firebase Auth)
 *
 * 4. ADMIN_EMAILS constant in frontend code
 *    (was: hardcoded email list, not configurable or auditable)
 *
 * ============================================
 * AUDITING ADMIN ACCESS
 * ============================================
 *
 * To audit who has admin access:
 *
 * 1. Firebase Console > Authentication > Users
 *    - Look for users with custom claims
 *
 * 2. Or use TypeScript to list admin users:
 *
 *   import { initializeApp } from 'firebase-admin/app';
 *   import { getAuth } from 'firebase-admin/auth';
 *
 *   const app = initializeApp();
 *   const auth = getAuth(app);
 *
 *   const listAllUsers = async () => {
 *     const users = [];
 *     let nextPageToken = null;
 *
 *     do {
 *       const batch = await auth.listUsers(1000, nextPageToken);
 *       batch.users.forEach(userRecord => {
 *         if (userRecord.customClaims?.admin === true) {
 *           users.push({
 *             uid: userRecord.uid,
 *             email: userRecord.email,
 *             displayName: userRecord.displayName,
 *           });
 *         }
 *       });
 *       nextPageToken = batch.pageToken;
 *     } while (nextPageToken);
 *
 *     console.log('Admin users:', users);
 *     return users;
 *   };
 */

// This file documents how admin access should be managed
// Actual admin user creation is done via set-admin-claims.js
export const ADMIN_ACCESS_DOCUMENTATION = {
  primaryMethod: 'Firebase Auth custom claims (admin: true)',
  script: 'node scripts/set-admin-claims.js <email>',
  revokeScript: 'node scripts/set-admin-claims.js <email> --remove'
};

console.log(ADMIN_ACCESS_DOCUMENTATION);