import * as admin from "firebase-admin";
export declare const db: admin.firestore.Firestore;
/**
 * Helper to get user document reference
 */
export declare function getUserRef(userId: string): admin.firestore.DocumentReference<admin.firestore.DocumentData, admin.firestore.DocumentData>;
/**
 * Helper to check if user is admin
 */
export declare function isAdminUser(userId: string): Promise<boolean>;
//# sourceMappingURL=helpers.d.ts.map