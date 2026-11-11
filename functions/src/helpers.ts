import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
export const db = admin.firestore();

/**
 * Helper to get user document reference
 */
export function getUserRef(userId: string) {
  return db.collection("users").doc(userId);
}

/**
 * Helper to check if user is admin via custom claims
 * @param context - The auth context (request.auth from callable functions)
 */
export function isAdminUser(context: { token: any } | null | undefined): boolean {
  return context?.token?.admin === true;
}