import * as admin from "firebase-admin";
admin.initializeApp();
export const db = admin.firestore();
/**
 * Helper to get user document reference
 */
export function getUserRef(userId) {
    return db.collection("users").doc(userId);
}
/**
 * Helper to check if user is admin
 */
export async function isAdminUser(userId) {
    const adminDoc = await db.collection("admins").doc(userId).get();
    return adminDoc.exists;
}
//# sourceMappingURL=helpers.js.map