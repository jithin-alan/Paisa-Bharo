/**
 * Script to grant/revoke admin access via Firebase Auth custom claims
 *
 * This is the ONLY authorized way to grant admin access to users.
 * Admin access is determined by the 'admin' custom claim in the Firebase ID token.
 *
 * Usage:
 *   node scripts/set-admin-claims.js <email>        # Grant admin access
 *   node scripts/set-admin-claims.js <email> --remove  # Revoke admin access
 *
 * Prerequisites:
 * - Firebase Admin SDK initialized with service account credentials
 * - Set GOOGLE_APPLICATION_CREDENTIALS environment variable
 *
 * Security Note:
 * - This script sets custom claims server-side (secure)
 * - The 'useIsAdmin' hook and Firestore rules check these claims
 * - Do NOT use email-based admin detection - only custom claims are trusted
 * - The 'loginAsAdmin()' function has been removed from the frontend
 *   as it was insecure (allowed bypassing Firebase Auth entirely)
 */

import { initializeApp, credential } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK
// You need to have a service account key file or use application default credentials
// Option 1: Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS env var)
// Option 2: Service account key file path

const app = initializeApp({
  credential: credential.applicationDefault(),
  // Or use a service account key file:
  // credential: credential.cert(require('./service-account-key.json')),
});

const auth = getAuth(app);

async function setAdminClaim(email, makeAdmin = true) {
  try {
    // Get user by email
    const userRecord = await auth.getUserByEmail(email);

    const claims = {
      ...userRecord.customClaims,
      admin: makeAdmin,
    };

    // Set the custom claims
    await auth.setCustomUserClaims(userRecord.uid, claims);

    console.log(`✅ Successfully ${makeAdmin ? 'granted' : 'revoked'} admin access for: ${email}`);
    console.log(`   User UID: ${userRecord.uid}`);
    console.log(`   Admin claim: ${makeAdmin}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting admin claim:', error.message);
    process.exit(1);
  }
}

async function main() {
  const [, , email, action] = process.argv;

  if (!email) {
    console.log('Usage: node scripts/set-admin-claims.js <email> [--remove]');
    console.log('');
    console.log('Options:');
    console.log('  --remove    Revoke admin access');
    process.exit(1);
  }

  const makeAdmin = action !== '--remove';
  await setAdminClaim(email, makeAdmin);
}

main();