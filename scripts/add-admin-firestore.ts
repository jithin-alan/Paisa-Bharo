/**
 * Simple script to add admin user to Firestore admins collection
 *
 * Usage:
 *   node --env NODE_OPTIONS='--experimental-specifier-resolution=node' scripts/add-admin-firestore.ts <uid>
 *
 * Or use the Firebase console directly:
 * 1. Go to Firebase Console > Firestore Database
 * 2. Create collection "admins"
 * 3. Add document with ID = user's UID (empty document)
 */

// This file documents how to add admin users
export const ADMIN_SETUP_INSTRUCTIONS = `
===========================================
ADMIN SETUP INSTRUCTIONS
===========================================

Option 1: Firebase Console (Recommended)
----------------------------------------
1. Go to Firebase Console
2. Navigate to Firestore Database
3. Create collection named "admins"
4. Create a document with ID = your Firebase Auth user UID
5. Add any fields (or leave empty - just existence matters)

Example:
  Collection: admins
  Document ID: abc123xyz456 (your user's UID from Firebase Auth)
  Fields: (optional, can be empty)

===========================================
Option 2: Via this script (requires setup)
-----------------------------------------
This requires:
1. Firebase Admin SDK credentials
2. Environment: GOOGLE_APPLICATION_CREDENTIALS

Then run:
  node scripts/set-admin-claims.js admin@paisabharo.com

===========================================
Option 3: Email-based detection (Development)
-------------------------------------------
The useIsAdmin hook checks email 'admin@paisabharo.com'
by default. This is useful for development/testing.

===========================================
`;

console.log(ADMIN_SETUP_INSTRUCTIONS);

// Export the admin UIDs that should be recognized
export const ADMIN_UIDS: string[] = [];

// Export admin emails (development mode)
export const ADMIN_EMAILS = ['admin@paisabharo.com'];