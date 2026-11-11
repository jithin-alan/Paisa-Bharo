import * as admin from "firebase-admin";
export declare const db: admin.firestore.Firestore;
/**
 * Helper to get user document reference
 */
export declare function getUserRef(userId: string): admin.firestore.DocumentReference<admin.firestore.DocumentData, admin.firestore.DocumentData>;
/**
 * Helper to check if user is admin via custom claims
 * @param context - The auth context (request.auth from callable functions)
 */
export declare function isAdminUser(context: {
    token: any;
} | null | undefined): boolean;
/**
 * Checks if a string is a valid IANA timezone name.
 */
export declare function isValidTimezone(tz: any): boolean;
/**
 * Resolves the appropriate timezone for a user request
 */
export declare function resolveTimezone(requestedTz?: any, userProfileTz?: any, userCountry?: any): string;
/**
 * Formats a Date object into YYYY-MM-DD in the specified timezone
 */
export declare function getDateInTimezone(date: Date, timeZone: string): string;
/**
 * Calculates calendar day difference (dateStr2 - dateStr1) in integer days.
 * E.g., ('2026-11-10', '2026-11-11') => 1 day
 */
export declare function getDaysDifference(dateStr1: string, dateStr2: string): number;
//# sourceMappingURL=helpers.d.ts.map